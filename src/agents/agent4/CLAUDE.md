# Agent 4: guidance for Claude Code

The rules in the root `CLAUDE.md` apply. This file adds what is specific to this agent. **Fill in the blanks first**; every later Claude session starts from this file.

## Scope

- You may edit: files in `src/agents/agent4/`, this agent's entry in `src/agents/registry.ts`, and this agent's specs in `e2e/`.
- You may not edit: other agents, `src/components/ui`, `src/auth`, `src/shell`, `src/home`, `src/styles`. If you need a change there, stop and propose it.
- Import only from this folder, `@/components/ui`, `@/auth`, `@/styles`.

## Migration source

This folder receives Team 4's **existing UI**. The old UI is read only: never edit it.

- Old UI location: _path or repository_. Run it with: _command_.
- Backend it calls: _base URL_ and how to run it locally.
- Screen list and progress: `MIGRATION.md` (keep it current).

## What this agent does

_One paragraph: who uses it and what for. Then rename the card in `registry.ts`._

## Roles and pages

Only a landing page exists so far. Roles are strictly separate: put pages under `trainee/` and `admin/` and choose them from `useAuth().user.role` in `index.tsx`, as `src/agents/agent3` does.

## Backend

_None yet._ Follow `src/agents/agent3/api/` (interface + real client + mock) and use `useAuth().getAuthHeaders()`. Add a proxy entry for your backend in `vite.config.ts`.

## Run and test

`npm run dev`, sign in, open the Agent 4 card. Tests: `npm test`, `npm run test:e2e`.

## Notes for Claude

- Port the old UI's **behaviour** exactly; build the **look** from the UI kit and tokens, never from the old styling.
- Streamlit-to-React mapping and a worked example: `docs/building-with-claude-code.md`. Reference code: `src/agents/agent3`. Use `/migrate-screen agent4 <old screen>`.
- Keep this folder's `README.md` and `MIGRATION.md` up to date.
