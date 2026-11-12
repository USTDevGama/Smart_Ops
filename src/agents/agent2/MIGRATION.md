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
- **Output contract changed on the portal side only.** The result now shows one card per detected flag, then goal scores, then the raw
  JSON. This follows the agent's final JSON (`detected_flags` with `flag`, `confidence`, `status`, `evidence_ids`, `explanation`, and
  `goal_scoring` per trainee). `api/types.ts` gained `Finding.evidence_ids`, optional `trainee_id`, `FindingStatus` value `pending_review`,
  and optional `RunResult.goal_scoring`. `evidence` and `location` became optional. The matching change in
  `Smart_Ops_Pod2/contracts/ui_api.openapi.yaml` and the backend response (read from the `analysis_findings` table) is still to be made there.
  Open for the backend team: whether `goal_scoring` is returned to the UI at all, and whether each finding can carry a `trainee_id`.
