# Agent 2 (Bias Flagging Agent): connecting the Pod 2 backend

For the Pod 2 team members who connect the `Smart_Ops_Pod2` backend to the common dashboard. Read this first, then follow the checklist.

- Live dashboard: <http://10.100.242.180:8086/>
- UI code: `src/agents/agent2/` (this repo). Backend: `Smart_Ops_Pod2/backend` (separate repo).
- Backend engineer: the API the UI needs is in [agent2-api-for-backend.md](agent2-api-for-backend.md).
- Same pattern as Agent 3 and Agent 4: the browser calls a same-origin path, nginx forwards it to the backend. See [deployment.md](deployment.md).

## How a request travels

```
Browser (http://10.100.242.180:8086)
   |  GET /agent2-api/api/v1/flags
   v
nginx in the dashboard container        location /agent2-api/  (deploy/nginx.conf.template)
   |  strips "/agent2-api", forwards to ${AGENT2_API_URL}
   v
Pod 2 backend                           GET /api/v1/flags
```

- The backend needs **no CORS** for this, because the browser only ever talks to the dashboard's own origin.
- `AGENT2_API_URL` is the backend's **origin only**: scheme, host and port, no path, no trailing slash. nginx adds `/` and the rest.
- The UI always uses the base path `/agent2-api/api/v1` (`src/agents/agent2/api/client.ts`).

## What is already done in this repo

| File                         | Change                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `deploy/nginx.conf.template` | New `location /agent2-api/` block that proxies to `${AGENT2_API_URL}/`          |
| `deploy/compose.prod.yml`    | Passes `AGENT2_API_URL` to the container (optional, defaults to a dead address) |
| `Dockerfile`                 | `NGINX_ENVSUBST_FILTER` is now `AGENT[234]_API_URL` so nginx fills the new one  |
| `deploy/.env.example`        | Documents `AGENT2_API_URL`                                                      |
| `vite.config.ts`             | Dev proxy `/agent2-api` (default target `http://localhost:8001`)                |

Until `AGENT2_API_URL` is set on the server, the Agent 2 screens show an error because nginx answers **502**. The rest of the dashboard is unaffected.

## Checklist: connect it on the server

1. **Find the backend address** as the dashboard container sees it. Pick one:
   - the backend published on the VM: `http://10.100.242.180:<published-port>` (what Agent 4 does), or
   - the backend container on the `shared-services` Docker network: `http://<container-name>:8000` (what Agent 3 does with `pod-c-api`).

   The backend listens on 8000 inside its container. If another pod already publishes 8000 on the VM, publish yours on a different host port.

2. **Add one line** to `/data/apps/smart-ops-dashboard/.env` on the server (it lives only there, never in git). The file then looks like this, with your own value in place of the placeholder:

   ```
   DASHBOARD_PORT=8086
   AGENT3_API_URL=http://pod-c-api:8000
   AGENT4_API_URL=http://10.100.242.180:8084
   AGENT2_API_URL=http://<pod2-host-or-container>:<port>
   ```

3. **Deploy the image that has the new nginx block.** The change must be on `main` first (a push to `main` runs the deploy job). To redeploy by hand, from the repo checkout on the server:

   ```
   IMAGE_TAG=<short-sha> docker compose -f deploy/compose.prod.yml --env-file /data/apps/smart-ops-dashboard/.env up -d --force-recreate --wait
   ```

   `--force-recreate` is needed after editing `.env`: nginx reads the value only when the container starts.

4. **Check it** (replace the host if you test from the VM):

   | Command                                                      | Good answer                              | If not                                                                                         |
   | ------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
   | `curl -i http://10.100.242.180:8086/healthz`                 | `200 ok`                                 | Dashboard is down                                                                              |
   | `curl -i http://10.100.242.180:8086/agent2-api/health`       | `200`, JSON from the backend's `/health` | **HTML** = old image without the nginx block. **502** = wrong `AGENT2_API_URL` or backend down |
   | `curl -i http://10.100.242.180:8086/agent2-api/api/v1/flags` | `401` JSON error (no token sent)         | Same as above. A 401 here is good: it proves the request reached the backend                   |

5. **Open the dashboard**, sign in, open the **Bias Flagging Agent** card. An admin sees "Flag management", anyone else sees the run page.

## What still blocks real use: sign-in

The UI and the backend do not agree on who the user is yet. This is a **backend task**; the UI needs no change.

| Dashboard sends (dev login)                          | Pod 2 backend expects                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `X-Dev-User` and `X-Dev-Role: trainee` or `admin`    | `Authorization: Bearer <JWT>` from its own `POST /api/v1/auth/login` |
| Role `trainee` (the UI maps it to `user`) or `admin` | Role read from its **database**, `user` or `admin`                   |
| Zitadel bearer token later                           | Does not accept it                                                   |

What you will see until this is fixed: every call returns **401**, the page shows the server's message, and a "Your session has expired" toast appears. That means the connection works and only sign-in is missing.

Options for the backend team:

1. **For the demo:** accept the dashboard's dev headers in a non-production setting only, like Agent 3 does (`PODC_ENV` of `local` or `dev`). Map `trainee` to `user`. Never enable it in production; anyone can pick any role.
2. **Later:** validate the Zitadel token and read the role from it. See [auth-zitadel.md](auth-zitadel.md). The UI already calls `useAuth().getAuthHeaders()`, so it will send the new header with no change.

Also note: the backend refuses admins on analyses (403 `USER_ROLE_REQUIRED`). That matches the UI, where admins only get flag management.

## What the UI expects back for a finished run

The output screen shows one card per detected flag, then the raw JSON. The field names are the agent's own. `result` (in `GET /runs/{id}` and `GET /runs/{id}/result`) is:

```json
{
  "batch_id": "B-1042",
  "detected_flags": [
    {
      "flag": "clique",
      "confidence": 0.9,
      "status": "PENDING_REVIEW",
      "subject": "R-02 <-> T-03",
      "evidence_ids": ["FB-019", "FB-020"],
      "explanation": "..."
    }
  ]
}
```

| Field          | Required | Shown as                                                                                                     |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `batch_id`     | no       | The title of each run in History and above the output. Without it the UI says "Batch ID not available yet"   |
| `flag`         | yes      | Card title (`subtle_harsh` becomes "Subtle harsh"). Also the key for the **Description**, see below          |
| `confidence`   | yes      | Confidence bar, a number from 0 to 1                                                                         |
| `status`       | yes      | `PENDING_REVIEW`, `AUTO_ACCEPTED`, `ACCEPTED` or `REJECTED` (upper case)                                     |
| `subject`      | yes      | `"<reviewer> <-> <trainee>"`. Left side is the **Source**, right side is the **Trainee**                     |
| `evidence_ids` | yes      | Not shown on the card (only in the raw JSON)                                                                 |
| `explanation`  | yes      | **Explanation**: the agent's own reasoning for this finding, never the flag's description. Long text is fine |

**Description** is not in the agent output. The UI reads it from the flags table (`GET /flags`) by matching `flag` to the flag name, ignoring case and `_` versus `-`. A flag that is no longer in the table shows "Not available".

`batch_id` is the one field the UI needs that is not in the agreed sample output. Also put it on the run (`GET /runs/{id}` and each row of `GET /runs`) so History can show it for runs that have not finished. `goal_scoring` in a response is ignored.

A review item in `run.review_items` uses the same names (`flag`, `confidence`, `subject`, `evidence_ids`, `explanation`) plus `item_id` and `decision`.

Human review has two decisions only: `accept` and `reject`. The UI has no Escalate button and no `escalated` status.

The matching update to `Smart_Ops_Pod2/contracts/ui_api.openapi.yaml` is **not done yet**.

## Mock data and live data

| Where                                     | Behaviour                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Deployed dashboard                        | **Mock** for now: the `Dockerfile` sets `VITE_AGENT2_USE_MOCKS=true`. A blue "Running on mock data" banner shows |
| `npm run dev` with no env                 | **Mock**, no backend needed                                                                                      |
| `VITE_AGENT2_USE_MOCKS=false npm run dev` | **Live**: calls `/agent2-api`, which the dev server proxies to `http://localhost:8001`                           |

Agent 2 has its own switch. The shared `VITE_USE_MOCKS` is `false` in the production image because Agents 3 and 4 are live, so it can't be used for Agent 2.

**To go live on the server** once the backend is ready: set `AGENT2_API_URL` in the server `.env`, change `ARG VITE_AGENT2_USE_MOCKS=true` to `false` in the `Dockerfile`, merge, and redeploy.

**Before the demo, remove the mock parts** (they are listed in `src/agents/agent2/README.md`, "Before the demo"): `api/mock/`, the mock branch in `api/client.ts`, and the mock-only browser test.

## Run it locally against a real backend

1. Start the Pod 2 backend on port **8001** (8000 is Agent 3's) from `Smart_Ops_Pod2` (needs PostgreSQL and its Python environment; see its README):

   ```
   cd backend
   uvicorn app.main:create_app --factory --port 8001
   ```

2. Optionally set another target in `.env.local` in this repo: `VITE_AGENT2_API_URL=http://localhost:8001` (this is already the default).
3. `npm run dev`, open <http://localhost:5173>, sign in, open the card.

Windows PowerShell blocks `npm` scripts by default. Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` once in that window, or use `npm.cmd`.

## Troubleshooting

| Symptom                                         | Likely cause and fix                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen shows a **JSON parse error**             | The request got `index.html`: the running image has no `/agent2-api/` block. Deploy the new image                                                  |
| **502 Bad Gateway** on `/agent2-api/...`        | `AGENT2_API_URL` unset (default is a dead address), wrong, or the backend is not reachable from the container. Recreate the container after fixing |
| **401** and "session has expired" toast         | Connection is fine; sign-in mismatch (see above)                                                                                                   |
| **403** `ADMIN_REQUIRED` / `USER_ROLE_REQUIRED` | Role mismatch between dashboard and backend                                                                                                        |
| **413** on upload                               | File over the backend limit (`MAX_UPLOAD_BYTES`, 2 MB by default). nginx allows 5 MB                                                               |
| Agent 2 shows a "Running on mock data" banner   | The page was built with `VITE_AGENT2_USE_MOCKS` not set to `false` (the current `Dockerfile` default)                                              |
| Works locally, not on the server                | The server `.env` value is only read at container start; run the compose command with `--force-recreate`                                           |

## Not verified when this was written

- The nginx block and the Docker image were **not** built or run (Docker and nginx were not available on the machine). The same-origin path was checked only through the Vite dev proxy, which strips the prefix the same way.
- Nothing was changed on the server, and its `.env` still needs the `AGENT2_API_URL` line.
- No real Pod 2 backend was reached, so the sign-in problem above is from reading its code, not from a live test.
