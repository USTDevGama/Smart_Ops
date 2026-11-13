#!/usr/bin/env bash
# Read-only diagnosis of the Agent 2 (Bias Flagging) connection on the dashboard VM.
# It changes nothing: it only reads container state, calls a few URLs and prints logs.
#
# Run on the VM, from anywhere:
#   bash deploy/diagnose-agent2.sh                      # auto-detects the Pod 2 backend container
#   bash deploy/diagnose-agent2.sh -b <backend-container-name>
#   bash deploy/diagnose-agent2.sh -n 500               # show more log lines (default 150)
#
# It also writes everything it prints to agent2-diagnose-<time>.log in the current folder (git-ignored),
# so you can send that one file to whoever can help. Read docs/troubleshooting-agent2.md for what the output means.

DASH="${DASHBOARD_CONTAINER:-smart-ops-dashboard}"
LINES=150
BACKEND_CONTAINER=""
while getopts "b:n:" opt; do
  case "$opt" in
    b) BACKEND_CONTAINER="$OPTARG" ;;
    n) LINES="$OPTARG" ;;
    *) echo "usage: $0 [-b backend-container] [-n log-lines]"; exit 2 ;;
  esac
done

OUT="agent2-diagnose-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee "$OUT") 2>&1

FINDINGS=()
section() { printf '\n==== %s ====\n' "$1"; }
ok()      { printf '  [ok]    %s\n' "$1"; }
bad()     { printf '  [PROBLEM] %s\n' "$1"; FINDINGS+=("$1"); }
note()    { printf '  [info]  %s\n' "$1"; }

echo "Agent 2 diagnosis, $(date -u +%Y-%m-%dT%H:%M:%SZ), host $(hostname)"

# ---------------------------------------------------------------- 1. docker access
section "1. Docker access"
if ! command -v docker >/dev/null 2>&1; then
  bad "The docker command is not installed or not on PATH for this user."
  echo "Fix: run this on the VM that runs the containers, not on your own machine."
  exit 1
fi
D="docker"
if ! docker ps >/dev/null 2>&1; then
  err="$(docker ps 2>&1 | head -2)"
  note "docker ps failed as $(id -un): $err"
  if sudo -n docker ps >/dev/null 2>&1; then
    D="sudo docker"
    ok "Works with sudo. Using sudo for the rest of this script."
    note "To use docker without sudo: ask an admin to run 'sudo usermod -aG docker $(id -un)', then log in again."
  else
    bad "This user cannot talk to Docker (see the message above). That is why logs are not readable."
    echo "Fix: ask someone with access to run this script and send you the .log file, or get added to the 'docker' group."
    exit 1
  fi
else
  ok "docker works as $(id -un)"
fi

# ---------------------------------------------------------------- 2. dashboard container
section "2. Dashboard container ($DASH)"
if ! $D inspect "$DASH" >/dev/null 2>&1; then
  bad "No container named '$DASH'."
  echo "Running containers:"
  $D ps --format '  {{.Names}}  {{.Image}}  {{.Status}}  {{.Ports}}'
  echo "If the dashboard has another name, run: DASHBOARD_CONTAINER=<name> bash $0"
  exit 1
fi
fmt='  status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} restarts={{.RestartCount}} started={{.State.StartedAt}}
  image={{.Config.Image}}
  log driver={{.HostConfig.LogConfig.Type}}'
$D inspect "$DASH" --format "$fmt"
status="$($D inspect "$DASH" --format '{{.State.Status}}')"
[ "$status" = "running" ] && ok "container is running" || bad "container is '$status', not running. See the logs in section 8."
restarts="$($D inspect "$DASH" --format '{{.RestartCount}}')"
[ "${restarts:-0}" -gt 0 ] && bad "the container restarted $restarts time(s): it is crashing. See the logs in section 8."
driver="$($D inspect "$DASH" --format '{{.HostConfig.LogConfig.Type}}')"
case "$driver" in
  json-file|local|journald) ok "log driver '$driver' supports 'docker logs'" ;;
  *) bad "log driver '$driver' does not support 'docker logs', so logs will look empty or fail." ;;
esac

# ---------------------------------------------------------------- 3. environment
section "3. Environment inside the dashboard container"
for v in AGENT2_API_URL AGENT3_API_URL AGENT4_API_URL; do
  val="$($D exec "$DASH" printenv "$v" 2>/dev/null)"
  echo "  $v=${val:-<not set>}"
done
A2="$($D exec "$DASH" printenv AGENT2_API_URL 2>/dev/null)"
if [ -z "$A2" ]; then
  bad "AGENT2_API_URL is not set in the container."
elif [ "$A2" = "http://127.0.0.1:9" ]; then
  bad "AGENT2_API_URL is still the placeholder http://127.0.0.1:9 (the server .env has no AGENT2_API_URL, or the container was not recreated after editing it)."
else
  ok "AGENT2_API_URL is set"
  case "$A2" in
    */) bad "AGENT2_API_URL ends with '/': remove the trailing slash." ;;
    *"/api"*) bad "AGENT2_API_URL contains a path: use only scheme://host:port (nginx adds /api/v1 from the UI's own path)." ;;
  esac
fi

# ---------------------------------------------------------------- 4. nginx config
section "4. nginx inside the container"
if $D exec "$DASH" grep -n "agent2-api" /etc/nginx/conf.d/default.conf 2>/dev/null; then
  ok "the /agent2-api route is in the running nginx config"
else
  bad "no /agent2-api route in the running nginx config: the running image is older than the PR that added it."
fi
$D exec "$DASH" nginx -t 2>&1 | sed 's/^/  /'

# ---------------------------------------------------------------- 5. requests through the dashboard
section "5. Requests through the dashboard (what the browser does)"
PORT="$($D port "$DASH" 8080/tcp 2>/dev/null | head -1 | sed 's/.*://')"
if [ -z "$PORT" ]; then
  bad "could not find the published dashboard port ($D port $DASH)."
else
  BASE="http://127.0.0.1:$PORT"
  note "dashboard published on port $PORT"
  hdr=(-H "X-Dev-User: diagnose" -H "X-Dev-Role: admin" -H "X-Session-Id: 00000000-0000-4000-8000-000000000000")
  probe() { # label path
    code="$(curl -s -m 10 -o /tmp/agent2-diag-body -w '%{http_code} %{content_type}' "${hdr[@]}" "$BASE$2")"
    printf '  %-22s %s -> %s\n' "$1" "$2" "$code"
    head -c 300 /tmp/agent2-diag-body | tr '\n' ' ' | sed 's/^/      body: /'; echo
    LAST_CODE="${code%% *}"; LAST_TYPE="${code#* }"
  }
  probe "dashboard alive" /healthz
  [ "$LAST_CODE" = "200" ] && ok "dashboard answers" || bad "the dashboard did not answer /healthz with 200."
  probe "backend health" /agent2-api/health
  case "$LAST_CODE" in
    200) case "$LAST_TYPE" in text/html*) bad "200 but HTML: this is the app's index.html, so the running image has no /agent2-api route." ;; *) ok "backend /health reached" ;; esac ;;
    502|504) bad "$LAST_CODE from nginx: it cannot reach the backend at $A2. See sections 6 and 7." ;;
    404) note "404 from /health: the backend may not have a /health route at that path. Check the next call." ;;
    *) note "status $LAST_CODE" ;;
  esac
  probe "flags list" /agent2-api/api/v1/flags
  case "$LAST_CODE" in
    200) ok "flags returned: the backend accepted the dev headers" ;;
    401|403) note "$LAST_CODE: the request REACHED the backend, which refused the sign-in. Connection is fine; this is the auth task for the backend." ;;
    502|504) bad "$LAST_CODE from nginx on the API path: backend unreachable." ;;
    *) note "status $LAST_CODE" ;;
  esac
  rm -f /tmp/agent2-diag-body
fi

# ---------------------------------------------------------------- 6. container to backend
section "6. Can the dashboard container reach the backend itself?"
if [ -n "$A2" ]; then
  res="$($D exec "$DASH" wget -S -q -O /dev/null -T 5 "$A2/health" 2>&1)"
  echo "$res" | sed 's/^/  /' | head -8
  if echo "$res" | grep -q "HTTP/"; then
    ok "the container got an HTTP answer from $A2 (any status means the network path works)"
  else
    bad "the container could not connect to $A2 (refused, timed out, or the name does not resolve)."
  fi
fi

# ---------------------------------------------------------------- 7. who is the backend
section "7. Backend container"
bport="$(echo "$A2" | sed -n 's#^https\?://[^:/]*:\([0-9]*\).*#\1#p')"
[ "$A2" = "http://127.0.0.1:9" ] && bport="" # placeholder, not a real backend address
if [ -z "$BACKEND_CONTAINER" ] && [ -n "$bport" ]; then
  cand="$($D ps --filter "publish=$bport" --format '{{.Names}}')"
  if [ "$(echo "$cand" | grep -c .)" = "1" ]; then
    BACKEND_CONTAINER="$cand"
    ok "container publishing port $bport: $BACKEND_CONTAINER"
  elif [ -z "$cand" ]; then
    bad "no running container publishes port $bport. Nothing on this VM is serving the backend there."
  else
    note "several containers publish $bport: $(echo "$cand" | tr '\n' ' '). Pick one with -b <name>."
  fi
fi
echo "Containers whose name or image looks like pod 2:"
$D ps --format '  {{.Names}}  {{.Image}}  {{.Status}}  {{.Ports}}' | grep -iE "pod2|pod-2|bias|agent2" || echo "  (none matched)"
if [ -n "$bport" ] && command -v ss >/dev/null 2>&1; then
  echo "Listener on port $bport on this VM:"
  (ss -ltn 2>/dev/null | grep -E ":$bport\b") || echo "  nothing is listening on $bport"
fi

# ---------------------------------------------------------------- 8. logs
section "8. Dashboard (nginx) logs: last $LINES lines, filtered"
echo "-- lines about /agent2-api, and any error/crit/emerg/upstream line (newest last):"
$D logs --tail "$LINES" --timestamps "$DASH" 2>&1 | grep -E "agent2-api|\[error\]|\[crit\]|\[emerg\]|upstream" | tail -40 | sed 's/^/  /'
echo "-- last 10 lines unfiltered:"
$D logs --tail 10 --timestamps "$DASH" 2>&1 | sed 's/^/  /'

if [ -n "$BACKEND_CONTAINER" ]; then
  section "9. Backend container logs ($BACKEND_CONTAINER): last $LINES lines"
  echo "-- errors and warnings:"
  $D logs --tail "$LINES" --timestamps "$BACKEND_CONTAINER" 2>&1 | grep -iE "error|exception|traceback|critical|warn|401|403|500" | tail -40 | sed 's/^/  /'
  echo "-- last 25 lines unfiltered:"
  $D logs --tail 25 --timestamps "$BACKEND_CONTAINER" 2>&1 | sed 's/^/  /'
else
  section "9. Backend container logs"
  note "backend container not identified. Re-run with: bash $0 -b <container-name>"
fi

# ---------------------------------------------------------------- summary
section "SUMMARY"
if [ "${#FINDINGS[@]}" -eq 0 ]; then
  echo "No problems detected by these checks."
else
  for f in "${FINDINGS[@]}"; do echo "  - $f"; done
fi
echo
echo "Saved to $(pwd)/$OUT. Meaning of each line: docs/troubleshooting-agent2.md"
