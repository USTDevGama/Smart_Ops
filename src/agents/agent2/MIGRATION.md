# Migration tracker

The old UI lives at: `Smart_Ops_Pod2/ui` (a standalone React + Tailwind app, read only). It was merged here with the merge script
`Smart_Ops_Pod2/ui/portal/merge-into-portal.mjs`, not ported screen by screen.
Backend it calls: `Smart_Ops_Pod2/backend` (FastAPI), proxied by the dev server as `/agent2-api` (default `http://localhost:8001`).

Status: `merged` (copied in, lint, typecheck, unit and mock browser tests pass). Nothing is `verified` against the real backend yet.

## Screens

| Old screen (file) | Role                    | New page (route, file)              | Status | Differences from the old UI                |
| ----------------- | ----------------------- | ----------------------------------- | ------ | ------------------------------------------ |
| `pages/User.tsx`  | trainee (any non-admin) | `/agents/agent2`, `pages/User.tsx`  | merged | Heading is "Bias Flagging Agent" (no GAMA) |
| `pages/Admin.tsx` | admin                   | `/agents/agent2`, `pages/Admin.tsx` | merged | None                                       |

## Backend calls

| Old call                                        | New API method                                  | Mock covers it | Notes         |
| ----------------------------------------------- | ----------------------------------------------- | -------------- | ------------- |
| flags: list, create, update, delete, merge      | `listFlags` ... `mergeFlags` in `api/client.ts` | yes            | Admin only    |
| runs: start, get, decide, list runs, get result | `startRun` ... `getResult`                      | yes            | Run page only |

## Things dropped on purpose

- The standalone login page and `/auth/login` call. The portal owns sign-in; `host/useHostAuth.ts` adapts `useAuth()`.
- The standalone shell and header.

## Open questions

- **Backend auth is not compatible yet.** The Pod2 backend accepts only its own JWT from `POST /auth/login` and reads the role from its
  database. It does not accept the portal's dev headers (`X-Dev-User`, `X-Dev-Role`) or a Zitadel bearer token. It also calls the
  non-admin role `user` and refuses admins on analyses. Needs a backend change before real mode works through the portal.
- Port: agent2 proxies to 8001 by default so it can run next to the Agent 3 backend on 8000.
- Production: nginx route `/agent2-api/` and `AGENT2_API_URL` are in the repo. The server `.env` still needs the `AGENT2_API_URL` line; see `docs/agent2-backend-integration.md`.
- **Output contract changed on the portal side only.** The output follows the agent's final JSON: `detected_flags` entries with `flag`,
  `confidence`, `status` (upper case), `subject` (`"R-02 <-> T-03"`: source then trainee), `evidence_ids`, `explanation`, plus `batch_id`.
  Each card shows flag title, flag description (looked up in the flags table by name, not in the agent output), trainee and source (from
  `subject`), and the explanation. History and the run header show `batch_id`, not the uploaded file name. The matching change in
  `Smart_Ops_Pod2/contracts/ui_api.openapi.yaml` and the backend response (read from the `analysis_findings` table) is still to be made there.
  Open for the backend team: `batch_id` is not in the agreed sample output; the UI needs it on the result and on the run.
- **Removed on request:** the trainee goal scores section (`goal_scoring` is ignored if the backend sends it) and the Escalate decision.
  Review is Accept or Reject only. `Decision` is `accept | reject` and `FindingStatus` has no `escalated`. The backend must not return `escalated` (the card has no style for it) and should reject an `escalate` decision.
- **Explanation** on each card is the agent's own `explanation` for that finding, never the flag's description.
