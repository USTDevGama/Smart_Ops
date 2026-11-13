# Deployment (MyCloud, Docker Compose)

The common dashboard (shared by Pods A/B/C/D) is built into one nginx image and run with Docker Compose on the MyCloud VM. No Kubernetes, Helm or GitOps.

## Flow

- Pull request: `.github/workflows/ci-cd.yml` runs format check, lint, typecheck, unit tests, production build, then builds the image `smart-ops-dashboard:<7-char SHA>`. It never deploys.
- Push to `main`: the same CI runs, then the `deploy` job runs `docker compose -f deploy/compose.prod.yml --env-file /data/apps/smart-ops-dashboard/.env up -d --force-recreate --wait`, checks `/healthz` returns HTTP 200, and fails the job if it never does.
- Only a push to `main` can deploy. There is no manual trigger, and the images are never tagged `latest`.
- Browser (Playwright) tests are not part of CI yet: they need `npx playwright install chromium` on the runner.

## Files

| File                         | Purpose                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                 | Node build stage, then `nginx:1.27-alpine` as non-root, `dist/` on 8080                                  |
| `deploy/nginx.conf.template` | SPA fallback, `/healthz`, and the `/agent1-api/`, `/agent2-api/`, `/agent3-api/`, `/agent4-api/` proxies |
| `deploy/compose.prod.yml`    | Own Compose project `smart-ops-dashboard`, own default network                                           |
| `deploy/.env.example`        | Server-side values (copied to `/data/apps/smart-ops-dashboard/.env`)                                     |

## Runner

Jobs run on a self-hosted runner with exactly these labels: `self-hosted`, `linux`, `common-ui`. The dedicated `common-ui` label keeps this app off the other pods' runners. The runner user must be in the `docker` group, and the VM needs Docker Compose v2 (for `--wait`) and `curl`.

## Server config

`/data/apps/smart-ops-dashboard/.env` lives only on the server, outside the runner workspace, so workspace cleanup never removes it. Values:

- `DASHBOARD_PORT`: host port. Required; there is no default. Check it is free first: `ss -ltn | grep -E ':8180\b' || echo "8180 free"` (8180 is only a suggestion).
- `AGENT1_API_URL`: Pod1 backend (Viva Agent, agent 1) as seen from the container, no trailing slash. Pod1's backend publishes its own host port (`BACKEND_PORT` in that repo's `deploy/`); coordinate the port with whoever deploys Pod1.
- `AGENT2_API_URL`: Pod2 backend (Bias Flagging, agent 2), same rules as below. Optional; until it is set, agent 2 calls get a 502. Details: [agent2-backend-integration.md](agent2-backend-integration.md).
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
- Agents 1, 2, 3 and 4 all have a backend proxy (`AGENT1_API_URL`, `AGENT2_API_URL`, `AGENT3_API_URL`, `AGENT4_API_URL`). To add another, add a `location` in `deploy/nginx.conf.template`, a matching env var in `compose.prod.yml` and `deploy/.env.example`, and add it to `NGINX_ENVSUBST_FILTER` in the Dockerfile.
- Agent 1's backend (Smart_Ops_Pod1) publishes its own host port (`BACKEND_PORT` in that repo's `deploy/`); the two deploys (this dashboard and Pod1) are independent repos/runners and the chosen port must be coordinated by hand.
