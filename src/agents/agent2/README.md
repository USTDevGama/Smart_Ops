# Bias Flagging Agent

|        |                                                   |
| ------ | ------------------------------------------------- |
| Folder | `src/agents/agent2`                               |
| URL    | `/agents/agent2`                                  |
| Roles  | admin: flag management. Any other role: run page. |
| Status | Merged from the standalone `Smart_Ops_Pod2/ui`    |

An analyst adds feedback text (a JSON or text file, or pasted text), the agent checks it against the admin-managed flags,
low-confidence findings go to human review, and the output can be copied. Admins manage the flags: add, edit, merge,
delete, and activate or deactivate each one. The two pages are strictly separate.

## Run

- Mock data (no backend) is the default: `npm run dev`, sign in, open the card. The production image is mock too, for now:
  the `Dockerfile` sets `VITE_AGENT2_USE_MOCKS=true`. Agent 2 has its own switch because the shared `VITE_USE_MOCKS` is `false` in
  production for the live Agents 3 and 4.
- Real backend: `VITE_AGENT2_USE_MOCKS=false npm run dev` (or set that line to `false` in the `Dockerfile` for the server). The UI calls `/agent2-api/api/v1/...`. In development the Vite
  dev server proxies `/agent2-api` to `VITE_AGENT2_API_URL` (default `http://localhost:8001`, so it does not clash with the Agent 3
  backend on 8000). In production nginx does it, using `AGENT2_API_URL` from the server `.env`.
  Start the backend from `Smart_Ops_Pod2/backend` with `uvicorn app.main:create_app --factory --port 8001`.
- Connecting it on the server, sign-in status and troubleshooting: [docs/agent2-backend-integration.md](../../../docs/agent2-backend-integration.md).
- Tests: `npm test` (mock API rules, text-to-records parsing).

## Where things are

```
index.tsx        mount point: picks the admin or run page from the role
host/            the seam to the portal (useHostAuth.ts adapts @/auth; bridge.ts gives the API client the user and headers)
api/             types.ts (contract), client.ts, httpClient.ts, mock/ (mock only)
pages/           Admin.tsx, User.tsx
components/      this agent's pieces (Button, Alert, Modal ... are local, Tailwind-styled from the design tokens);
                 FindingCard and GoalScores show the output, ResultViewer puts them above the raw JSON
styles/          tailwind.css, bf.css (resets scoped to .bf)
```

The contract (`api/types.ts`) mirrors `Smart_Ops_Pod2/contracts/ui_api.openapi.yaml`. Change them together there.
Styling uses Tailwind utilities mapped to the portal's design tokens (`tailwind.config.js` at the repo root). Tailwind is limited
to this folder (see its `content` setting) and its reset is off.

## Before the demo: remove the mock parts

Mock data runs unless `VITE_AGENT2_USE_MOCKS=false` (the `Dockerfile` currently sets it to `true`). Before the demo:

- Remove `api/mock/` (including `mockClient.test.ts` and `seed.ts`) and the mock branch in `api/client.ts`; make the real HTTP client the only one.
- Remove the `VITE_AGENT2_USE_MOCKS` check in `api/client.ts` and the `Dockerfile` lines for it and the "Running on mock data" banner in `index.tsx`.
- Remove the mock-only paths in `e2e/agent2.spec.ts` (or point it at the real backend).
- The backend does not yet accept the portal's login (see `MIGRATION.md`, open questions). Fix that first.
