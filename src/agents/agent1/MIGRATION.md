# Migration tracker

The old UI lives at: `Smart_Ops_Pod1/frontend` (read only, in the sibling `Smart_Ops_Pod1` repo).
Run it with: `docker compose up` from the `Smart_Ops_Pod1` repo root (`frontend` service, port 5173).
Backend it calls: Pod1's own FastAPI ("Viva Agent"), `http://localhost:8000` locally
(`docker compose up` starts it too), `/api/*` routes.

Status: `todo` -> `ported` (built, tests pass) -> `verified` (compared with the old screen, differences listed).

## Screens

| Old screen (file)                  | Role                 | New page (route, file)                                               | Status | Differences from the old UI                                                                                                                                                                                           |
| ---------------------------------- | -------------------- | -------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/pages/Upload.jsx`    | candidate -> trainee | `trainee/CurriculumPage.tsx` (`/agents/agent1`)                      | ported | Moved from staff to trainee: the candidate submits their own curriculum, matching the backend's `trainee_only` dependency on `POST /curricula`. Combined with the old Tracks screen into one flow.                    |
| `frontend/src/pages/Tracks.jsx`    | candidate -> trainee | folded into `trainee/CurriculumPage.tsx`                             | ported | Same content, no longer its own route.                                                                                                                                                                                |
| `frontend/src/pages/Briefing.jsx`  | candidate -> trainee | `trainee/BriefingPage.tsx` (`/agents/agent1/session/:id/briefing`)   | ported | Behaviour unchanged.                                                                                                                                                                                                  |
| `frontend/src/pages/Interview.jsx` | candidate -> trainee | `trainee/InterviewPage.tsx` (`/agents/agent1/session/:id/interview`) | ported | Behaviour unchanged (speech recognition/synthesis, timers, idempotent submit).                                                                                                                                        |
| `frontend/src/pages/Review.jsx`    | staff -> admin       | `admin/ReviewPage.tsx` (`/agents/agent1`)                            | ported | Also lists every submitted curriculum with its sessions (`GET /api/admin/curricula`, `backend/api/admin.py`) and shows which curriculum each session used, since an admin here never chose the curriculum themselves. |

None of the above have been **verified** (compared side by side with the running old UI) yet - do
that with Pod1's `docker compose up` next to `npm run dev --path @ VITE_USE_MOCKS=false` here.

## Backend calls

| Old call (via `frontend/src/api.js`)                       | New API method (`api/api.ts`) | Mock covers it | Notes                                                                                                                     |
| ---------------------------------------------------------- | ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/curricula`                                      | `createCurriculum`            | yes            | Backend-gated `trainee_only` (`backend/api/deps.py`).                                                                     |
| `GET /api/curricula/:id`                                   | `getCurriculum`               | yes            | Polled while `status === 'ingesting'`.                                                                                    |
| `GET /api/curricula/:id/tracks`                            | `getTracks`                   | yes            |                                                                                                                           |
| `POST /api/intake`                                         | `startIntake`                 | yes            |                                                                                                                           |
| `GET /api/sessions/:id/state`                              | `getSessionState`             | yes            |                                                                                                                           |
| `POST /api/sessions/:id/turns`                             | `postTurn`                    | yes            | 409 triggers a resync, matching the old client.                                                                           |
| `POST /api/sessions/:id/end`                               | `endSession`                  | yes            |                                                                                                                           |
| `GET /api/sessions?status=&limit=`                         | `listSessions`                | yes            | Admin-gated (`require_admin`).                                                                                            |
| `GET /api/sessions/:id/report`                             | `getReport`                   | yes            | 404 means "still generating" in both old and new UI. Admin-gated.                                                         |
| `POST /api/sessions/:id/review`                            | `submitReview`                | yes            | 422 on reject without a reason, matching the old client. Admin-gated.                                                     |
| `GET /api/admin/curricula` (new, was unused by the old UI) | `getAdminCurricula`           | yes            | Already existed on the backend (`backend/api/admin.py`), just never called from a frontend before this port. Admin-gated. |

## Admin auth (not wired up yet - deliberately deferred)

All admin-only routes (`require_admin`/`trainee_only` in `backend/api/deps.py`) check
`Authorization: Bearer <ADMIN_API_KEY>`, which is unset by default - the check is then skipped
entirely, so admin routes are open to anyone right now. The shell's dev login sends
`X-Dev-User`/`X-Dev-Role` instead, which this backend does not look at. Real role enforcement for
this agent (beyond the browser-only check) is intentionally **not** being wired up yet - that is a
separate piece of work for later, once the project is ready to decide how Pod1's backend should
trust the dashboard (an `ADMIN_API_KEY` the dashboard sends somehow, trusting `X-Dev-Role` the way
Pod3 does with `PODC_DEV_AUTH_ENABLED`, or waiting for Zitadel). Until then, treat this agent's
admin/trainee split as UI-only, same as every other agent before Zitadel lands.

## Things dropped on purpose

- The old UI's own header/nav (`StaffLayout`/`CandidateLayout` in `App.jsx`) - replaced by the
  shared shell's header, login and `SubNav` (admin gets none here - one page only).
- The old UI had **no login at all**; every route was open to anyone with the link. The candidate
  now signs in as `trainee` first (see below).

## Open questions

1. **Candidate login.** The old UI let an unauthenticated candidate (anyone with the link) take the
   interview from the same browser the staff member used to start it. The shared shell requires a
   login for every route (`ProtectedRoute`). This port asks the candidate to sign in as a `trainee`
   and submit their own curriculum before taking the interview. Confirm with the Pod1 team whether
   candidates are expected to have (or be given) a trainee account, or whether a different rollout
   model (e.g. one shared trainee account, or an unauthenticated exception at the shell level) is
   intended.
2. **Styling.** Ported as-is from the old UI's CSS (`theme.css`, scoped to `.viva`), not yet rebuilt
   from `@/components/ui` and the shared tokens per `docs/ui-standards.md`.
3. **Backend reachability in production.** Pod1's backend published no host port before this port;
   `deploy/compose.prod.yml` and `deploy.yml` were updated to add `BACKEND_PORT` (confirmed as 8011,
   free on the deploy VM, 2026-11-13). The `smart-ops-pod1` self-hosted runner is confirmed to exist
   with the labels `deploy.yml` needs. Still open: confirm `DEPLOY_DIR` and that the
   `shared-services` Docker network exists on that runner's host.
4. **Admin auth.** See "Admin auth" above - deferred on purpose, not an oversight.
