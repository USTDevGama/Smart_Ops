# Agent 1: Viva Agent

|            |                                                                                     |
| ---------- | ----------------------------------------------------------------------------------- |
| Folder     | `src/agents/agent1`                                                                 |
| URL        | `/agents/agent1`                                                                    |
| Owner team | Team 1 / Pod1 (set the real team in `CODEOWNERS`)                                   |
| Roles      | trainee, admin                                                                      |
| Status     | ported (built, tests pass) - not yet verified against the old UI by the owning team |

Port of `Smart_Ops_Pod1`'s own React (Vite) frontend: an adaptive spoken oral exam (viva) on an
uploaded curriculum, scored by an LLM agent and finalized by a human reviewer.

## What this agent does

A candidate (trainee) submits or updates their own curriculum (PDF or pasted text); the backend
derives tracks and topics, then the candidate starts the interview on the same device: a briefing,
then the spoken/typed interview. When it ends, an admin reviews the agent-produced report
(curriculum, transcript, scores) and accepts or rejects it (human-in-the-loop) - they never choose
the curriculum or start the session themselves.

## Roles and pages

| Role    | Page                              | Route                                         |
| ------- | --------------------------------- | --------------------------------------------- |
| Trainee | Submit curriculum + review tracks | `/agents/agent1`                              |
| Trainee | Briefing                          | `/agents/agent1/session/:sessionId/briefing`  |
| Trainee | Interview                         | `/agents/agent1/session/:sessionId/interview` |
| Admin   | Curricula submitted + HITL review | `/agents/agent1`                              |

## Backend

Smart_Ops_Pod1's own FastAPI ("Viva Agent"), endpoints under `/api` (`curricula`, `intake`,
`sessions`). See `api/api.ts` for the `Agent1Api` interface, `httpApi.ts` for the real client and
`mockApi.ts` for the in-memory stand-in (`VITE_USE_MOCKS=true`).

- Dev: Vite proxies `/agent1-api` to `VITE_AGENT1_API_URL` (default `http://localhost:8000`, Pod1's
  `docker compose up` default). Run Pod1's own `docker-compose.yaml` to get a backend locally.
- Prod: nginx proxies `/agent1-api` to `AGENT1_API_URL` (see `deploy/nginx.conf.template` and
  `docs/deployment.md`). Pod1's backend now publishes a host port (`BACKEND_PORT`, confirmed 8011 on
  the deploy VM) and this dashboard's `AGENT1_API_URL` must point at
  `http://host.docker.internal:8011`. The two deploys are independent repos/runners and must be
  coordinated by hand.
- **Admin auth is not wired up yet, on purpose.** Pod1's admin-only routes check
  `Authorization: Bearer <ADMIN_API_KEY>`, which is unset by default, so those routes are currently
  open to anyone. The shell's dev login never sends that header. Deferred deliberately - see
  `MIGRATION.md` "Admin auth" for the real fix once the project is ready to tackle it.

## Run and test

`npm run dev`, sign in, open the Viva Agent card. Tests: `npm test`, `npm run test:e2e`.

## Notes

- Visual styling was ported as-is from Pod1's own CSS, scoped under the `.viva` class
  (`theme.css`), not yet rebuilt from the shared UI kit/tokens - see `MIGRATION.md` open questions.
- See `MIGRATION.md` for the screen-by-screen tracker and the open question about candidates having
  no login in the old UI vs. requiring a trainee login here.
