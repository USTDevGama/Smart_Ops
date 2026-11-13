# Troubleshooting Agent 2 on the VM

Use this when the Bias Flagging screens show errors after the backend was connected, or you cannot see the logs to find out why.

## 1. Run the diagnosis script (start here)

On the VM, from the repo checkout (or copy the file there):

```bash
bash deploy/diagnose-agent2.sh                          # finds the Pod 2 backend container by its published port
bash deploy/diagnose-agent2.sh -b <backend-container>   # or name it yourself
bash deploy/diagnose-agent2.sh -n 500                   # more log lines
```

It only reads: container state, the environment nginx got, the running nginx config, three test requests through the dashboard, a connection test from inside the dashboard container, and the recent logs of the dashboard and the backend. It ends with a SUMMARY of problems and saves everything to `agent2-diagnose-<time>.log` in the current folder (git-ignored). **Send that file** to whoever helps you.

No checkout on the VM? `docker inspect smart-ops-dashboard --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}'` shows the folder the stack was deployed from.

## 2. I cannot read the logs

| What you see                                         | Cause and fix                                                                                                                                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permission denied ... /var/run/docker.sock`         | Your user is not in the `docker` group. Use `sudo docker logs ...`, or ask an admin: `sudo usermod -aG docker <you>` and log in again. The script tries `sudo` for you.                         |
| `No such container: ...`                             | Wrong name. `docker ps --format '{{.Names}}  {{.Image}}  {{.Ports}}'` lists them. The dashboard is `smart-ops-dashboard`.                                                                       |
| `docker logs` prints nothing                         | The container was just recreated (logs of the old one are gone), or nothing has been requested yet. Make a request, then look again. nginx does not log `/healthz`.                             |
| `configured logging driver does not support reading` | The container uses a log driver other than `json-file`, `local` or `journald`. Read the logs where that driver sends them. The dashboard itself uses `json-file` (10 MB x 3 files).             |
| The backend's logs are not in the dashboard stack    | The backend is another team's container, in another compose project. `docker logs <its-name>` works for anyone with Docker access. If you have none, ask its owner to run the script with `-b`. |
| You have no Docker access at all                     | Ask someone who does to run the script and send you the `.log` file. Nothing else here needs access.                                                                                            |

By hand, once you have access:

```bash
docker logs --tail 200 --timestamps smart-ops-dashboard            # nginx: requests and errors
docker logs -f --tail 20 smart-ops-dashboard                       # follow live while you click in the UI
docker logs --tail 200 --timestamps <backend-container>            # the backend
docker exec smart-ops-dashboard printenv AGENT2_API_URL            # what nginx was started with
docker exec smart-ops-dashboard grep -n -A8 agent2-api /etc/nginx/conf.d/default.conf
```

## 3. Reading the nginx lines

| Line contains                                                                       | Meaning and fix                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connect() failed (111: Connection refused) ... upstream: "http://127.0.0.1:9/..."` | `AGENT2_API_URL` is the placeholder. Add the line to the server `.env` and recreate the container (see below).                                                                                       |
| `connect() failed (111: Connection refused) ... upstream: "http://<ip>:<port>/..."` | Nothing listens there. The backend is down, or it is published on a different host port. Check section 7 of the script output.                                                                       |
| `upstream timed out (110)`                                                          | The address is reachable on paper but nothing answers: a firewall, a wrong IP, or a hung backend.                                                                                                    |
| `host not found in upstream "<name>"` **at start-up**                               | `AGENT2_API_URL` uses a container name nginx cannot resolve (not on the `shared-services` network). **This stops the whole dashboard container from starting.** Use `http://<VM-ip>:<port>` instead. |
| `"GET /agent2-api/api/v1/flags HTTP/1.1" 401`                                       | The request reached the backend, which refused the sign-in. The connection is fine; the backend must accept the dashboard's headers (see `docs/agent2-api-for-backend.md`).                          |
| `"... " 403`                                                                        | Role not allowed (for example an admin calling `/runs`).                                                                                                                                             |
| `"... " 413`                                                                        | Upload too large for nginx (5 MB) or for the backend's own limit.                                                                                                                                    |
| `"... " 502` / `504`                                                                | nginx could not get an answer from the backend. The line above it in the error log says why.                                                                                                         |
| `"GET /agent2-api/health" 200` with an HTML body                                    | The running image has no `/agent2-api` route (it is older than the PR). Merge and redeploy.                                                                                                          |

## 4. Applying a fix

**Edit the server `.env` and recreate the container** (nginx reads the value only at start):

```bash
nano /data/apps/smart-ops-dashboard/.env      # AGENT2_API_URL=http://10.100.242.180:8085  (no quotes, no slash, no path)
cd "$(docker inspect smart-ops-dashboard --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')"
TAG=$(docker inspect smart-ops-dashboard --format '{{.Config.Image}}' | cut -d: -f2)
IMAGE_TAG=$TAG docker compose -f deploy/compose.prod.yml --env-file /data/apps/smart-ops-dashboard/.env up -d --force-recreate --wait
bash deploy/diagnose-agent2.sh
```

The production image builds with `VITE_USE_MOCKS=false` (a Dockerfile line), so Agent 2 is live. If the page shows the mock banner, the image was built with `true` and changing `.env` has no visible effect.

## 5. What the person sees in the browser

Open the browser's developer tools (F12), **Network** tab, and reload the Agent 2 page. Click a failed `/agent2-api/...` request to see the status and response body.

| In the UI                                       | Meaning                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Blue "Running on mock data" banner              | The build is in mock mode; no backend call is made at all.                             |
| "Unexpected token '<' ... is not valid JSON"    | The request got `index.html`: the image has no `/agent2-api` route.                    |
| "Bad Gateway" or "Cannot reach the backend"     | nginx or the network could not reach the backend (502/504, or no response).            |
| "Your session has expired" toast, red error     | The backend answered 401: sign-in mismatch. Not a network problem.                     |
| Cards say "Not available" under Description     | The flag name in the output is not in `GET /flags` (ignoring case and `_` versus `-`). |
| History titles say "Batch ID not available yet" | The backend does not send `batch_id` on the run or the history rows yet.               |

More on the connection and the API: [agent2-backend-integration.md](agent2-backend-integration.md), [agent2-api-for-backend.md](agent2-api-for-backend.md), [deployment.md](deployment.md).

## Not verified

The script and these steps were written without access to the VM. The script was run against a stand-in `docker` command and a fake dashboard that returns 502, so its checks and parsing work, but it has not run against the real containers. The nginx log lines are the standard nginx messages; the exact wording can differ slightly by version.
