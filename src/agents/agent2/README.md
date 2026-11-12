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

- Mock data (no backend): `VITE_API_MODE=mock` (default). `npm run dev`, sign in, open the card.
- Real backend: `VITE_API_MODE=http`, `VITE_API_BASE_URL=/agent2-api/api/v1`, and `VITE_AGENT2_API_URL` = the backend
  origin (default `http://localhost:8001`, so it does not clash with the Agent 3 backend on 8000). The dev server proxies `/agent2-api` to it. Start the backend from `Smart_Ops_Pod2/backend` with `uv run uvicorn app.main:app --port 8001`.
- Tests: `npm test` (mock API rules, text-to-records parsing).

## Where things are

```
index.tsx        mount point: picks the admin or run page from the role
host/            the seam to the portal (useHostAuth.ts adapts @/auth; bridge.ts gives the API client the user and headers)
api/             types.ts (contract), client.ts, httpClient.ts, mock/ (mock only)
pages/           Admin.tsx, User.tsx
components/      this agent's pieces (Button, Alert, Modal ... are local, Tailwind-styled from the design tokens)
styles/          tailwind.css, bf.css (resets scoped to .bf)
```

The contract (`api/types.ts`) mirrors `Smart_Ops_Pod2/contracts/ui_api.openapi.yaml`. Change them together there.
Styling uses Tailwind utilities mapped to the portal's design tokens (`tailwind.config.js` at the repo root). Tailwind is limited
to this folder (see its `content` setting) and its reset is off.

## Before the demo: remove the mock parts

Mock mode is the default, so this agent currently runs on fake data. Before the demo:

- Remove `api/mock/` (including `mockClient.test.ts` and `seed.ts`) and the mock branch in `api/client.ts`; make the real HTTP client the only one.
- Remove the `VITE_API_MODE` switch and set `VITE_API_BASE_URL=/agent2-api/api/v1` for real.
- Remove the mock-only paths in `e2e/agent2.spec.ts` (or point it at the real backend).
- The backend does not yet accept the portal's login (see `MIGRATION.md`, open questions). Fix that first.
