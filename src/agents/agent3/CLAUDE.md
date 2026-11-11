# Agent 3 (Stakeholder Roleplay): guidance for Claude Code

The rules in the root `CLAUDE.md` apply. This is also the **reference agent**: other teams copy its patterns, so keep it clean.

## Scope

- You may edit: files in `src/agents/agent3/`, this agent's entry in `src/agents/registry.ts`, and `e2e/chat.spec.ts` / `e2e/real.spec.ts`.
- You may not edit: other agents, `src/components/ui`, `src/auth`, `src/shell`, `src/home`, `src/styles`.
- Import only from this folder, `@/components/ui`, `@/auth`, `@/styles`.

## What it does

A React port of the `Smart_Ops_Pod3` Streamlit UI. Trainee: upload a resume, chat with a simulated difficult client, get a report notice. Admin: set the stage (character card, situations, demand document) and review chats. Details and the API contract: `docs/agent3-api-and-mocks.md`. The backend's own code (`Smart_Ops_Pod3/ui/client.py`, `ui/chat.py`, `ui/widgets.py`) is the behavioural reference.

## Roles and pages (strictly separate)

| Role    | Route    | File                                                               |
| ------- | -------- | ------------------------------------------------------------------ |
| trainee | `resume` | `trainee/ResumePage.tsx`                                           |
| trainee | `chat`   | `trainee/ChatPage.tsx`, `trainee/ChatRoom.tsx`                     |
| admin   | `setup`  | `admin/SetupPage.tsx` (`PersonaTab`, `SituationsTab`, `DemandTab`) |
| admin   | `review` | `admin/ReviewPage.tsx`                                             |

Admins cannot send chat messages (the backend allows only the owner), so there is no admin chat page.

## Backend and mocks

`api/api.ts` is the `Agent3Api` interface. `api/httpApi.ts` calls the real API through the Vite proxy (`/agent3-api`). `api/mockApi.ts` is an in-memory stand-in. **Change all three together** and keep the mock's status codes and error text like the real server's. `VITE_USE_MOCKS=true|false` selects one. Chat rules (idempotency ticket, retry vs refuse) live in `hooks/chatController.ts` with unit tests; do not move them into components.

## Run and test

- Mocks: `VITE_USE_MOCKS=true`, `npm run dev`.
- Real: start the Pod3 backend (see `docs/agent3-api-and-mocks.md`), `VITE_USE_MOCKS=false`.
- Tests: `npm test` (chat rules, SSE parsing, mock API), `npm run test:e2e` (`mock` and `real` projects).

## Notes for Claude

- The real backend with its fake model cannot generate reports. The Report panel handles that; do not treat it as a bug.
- A 409 from `POST /sessions/{id}/report` means "not ended" or "no model"; the status already explains it, so the panel does not repeat the raw error.
- Resumes and demand documents poll every 2s while `queued`/`extracting`; reports poll every 3s while `generating`.
