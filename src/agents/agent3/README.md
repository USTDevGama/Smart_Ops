# Agent 3: Stakeholder Roleplay

React port of the `Smart_Ops_Pod3` Streamlit UI. A trainee uploads a resume, then chats with a simulated difficult client and gets a report. An admin sets up the character, situations and demand document, and reviews chats.

|            |                                                              |
| ---------- | ------------------------------------------------------------ |
| Folder     | `src/agents/agent3`                                          |
| URL        | `/agents/agent3`                                             |
| Owner team | Team 3                                                       |
| Backend    | Smart_Ops_Pod3 FastAPI (`/api/v1`), proxied at `/agent3-api` |

## Pages

| Role    | Route    | File                                                                     |
| ------- | -------- | ------------------------------------------------------------------------ |
| Trainee | `resume` | `trainee/ResumePage.tsx`                                                 |
| Trainee | `chat`   | `trainee/ChatPage.tsx`, `trainee/ChatRoom.tsx`                           |
| Admin   | `setup`  | `admin/SetupPage.tsx` (tabs: `PersonaTab`, `SituationsTab`, `DemandTab`) |
| Admin   | `review` | `admin/ReviewPage.tsx`                                                   |

Roles are strictly separate; an admin does not get the trainee pages.

## Run it

`VITE_USE_MOCKS=true npm run dev` for mocks, or point `VITE_AGENT3_API_URL` at a running Pod3. Full details, endpoints and rules: [docs/agent3-api-and-mocks.md](../../../docs/agent3-api-and-mocks.md).

## Where to change what

| Change                                       | Look in                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| A backend call or response shape             | `api/api.ts`, `api/httpApi.ts`, `api/types.ts`, then `api/mockApi.ts` |
| Chat rules (retry, idempotency, end reasons) | `hooks/chatController.ts` (and its tests)                             |
| Persona form fields or validation            | `components/PersonaEditor.tsx`                                        |
| Polling intervals                            | `usePolling` call sites (2s documents, 3s reports)                    |

Keep the real and mock APIs in step: both implement `Agent3Api`.
