# Bias Flagging Agent (agent2): guidance for Claude Code

The rules in the root `CLAUDE.md` apply. This file adds what is specific to this agent.

## Scope

- You may edit: files in `src/agents/agent2/`, this agent's entry in `src/agents/registry.ts`, `tailwind.config.js` and this agent's proxy entry in `vite.config.ts`.
- You may not edit: other agents, `src/components/ui`, `src/auth`, `src/shell`, `src/home`, `src/styles`.
- Import only from this folder, `@/auth` (only `host/useHostAuth.ts` does) and the tokens in `src/styles`.

## What it does

Checks feedback text against admin-managed bias flags, with human review of low-confidence findings. Source of truth for the
contract: `api/types.ts` and `Smart_Ops_Pod2/contracts/ui_api.openapi.yaml`.

## Roles and pages (strictly separate)

| Role                | Page                                                       |
| ------------------- | ---------------------------------------------------------- |
| admin               | `pages/Admin.tsx` (flag management)                        |
| any other (trainee) | `pages/User.tsx` (add input, run, review, output, history) |

`index.tsx` decides from `useHostAuth()`. The backend enforces roles again (401/403).

## Rules specific to this folder

- All backend access goes through `api/client.ts`. Components never call `fetch`. Everything under `api/mock/` is mock only.
- Auth only through `host/`: never read storage, tokens or headers elsewhere. `host/useHostAuth.ts` is the only file that imports `@/auth`.
- The UI never decides which findings need review; it renders `Run.review_items` as given.
- Styling: Tailwind utilities that map to the design tokens (`text-heading`, `bg-surface`, `border-line`, `bg-primary`, status sets). No hex values. Status is icon + text + colour. Do not use `text-accent`, `warning` or `neu-500` for text on white.
- A contract change = edit `api/types.ts` together with the OpenAPI file and samples in `Smart_Ops_Pod2`.

## Run and test

`npm run dev`, sign in, open the card. Tests: `npm test`.
