# Deployment (MyCloud, Docker Compose)

The common dashboard (shared by Pods A/B/C/D) is built into one nginx image and run with Docker Compose on the MyCloud VM. No Kubernetes, Helm or GitOps.

## Flow

- Pull request: `.github/workflows/ci-cd.yml` runs format check, lint, typecheck, unit tests, production build, then builds the image `smart-ops-dashboard:<7-char SHA>`. It never deploys.
- Push to `main`: the same CI runs, then the `deploy` job runs `docker compose -f deploy/compose.prod.yml --env-file /data/apps/smart-ops-dashboard/.env up -d --force-recreate --wait`, checks `/healthz` returns HTTP 200, and fails the job if it never does.
- Only a push to `main` can deploy. There is no manual trigger, and the images are never tagged `latest`.
- Browser (Playwright) tests are not part of CI yet: they need `npx playwright install chromium` on the runner.

## Files

| File                         | Purpose                                                              |
| ---------------------------- | -------------------------------------------------------------------- |
| `Dockerfile`                 | Node build stage, then unprivileged nginx serving `dist/` on 8080    |
| `deploy/nginx.conf.template` | SPA fallback, `/healthz`, and `/agent3-api/` proxy to Pod3           |
| `deploy/compose.prod.yml`    | Own Compose project `smart-ops-dashboard`, own default network       |
| `deploy/.env.example`        | Server-side values (copied to `/data/apps/smart-ops-dashboard/.env`) |

## Runner

Jobs run on a self-hosted runner with exactly these labels: `self-hosted`, `linux`, `common-ui`. The dedicated `common-ui` label keeps this app off the other pods' runners. The runner user must be in the `docker` group, and the VM needs Docker Compose v2 (for `--wait`) and `curl`.

## Server config

`/data/apps/smart-ops-dashboard/.env` lives only on the server, outside the runner workspace, so workspace cleanup never removes it. Values:

- `DASHBOARD_PORT`: host port. Required; there is no default. Check it is free first: `ss -ltn | grep -E ':8180\b' || echo "8180 free"` (8180 is only a suggestion).
- `AGENT3_API_URL`: Pod3 backend as seen from the container, no trailing slash. nginx reads it at container start. On Linux the container reaches the VM host through `host.docker.internal`, which `compose.prod.yml` maps with `extra_hosts: host-gateway`.

Nothing secret belongs in the image or this repo; `VITE_*` values are public.

## GitHub settings

- Environment `production`: deployment branches limited to `main`; required reviewers if you want approval before each deploy.
- Branch protection on `main`: require the `Build and test` check.
- Do not run this workflow for pull requests from forks on a self-hosted runner (set "Require approval for all outside collaborators").

## Manual rollback

```
IMAGE_TAG=<previous-short-sha> docker compose -f deploy/compose.prod.yml --env-file /data/apps/smart-ops-dashboard/.env up -d --force-recreate --wait
```

Older SHA-tagged images stay on the VM (`docker images smart-ops-dashboard`). Cleanup only removes dangling images labelled `app=smart-ops-dashboard`; it never prunes other pods' images.

## Known limits

- Login is still the development login (no real authentication). Do not expose the port beyond the trusted network until Zitadel is wired in ([auth-zitadel.md](auth-zitadel.md)).
- Only Agent 3 has a backend proxy. Add a `location` for each further agent API in `deploy/nginx.conf.template` and a matching env var (and add it to `NGINX_ENVSUBST_FILTER` in the Dockerfile).
