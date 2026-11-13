# Agent 1: guidance for Claude Code

The rules in the root `CLAUDE.md` apply. This file adds what is specific to this agent. **Fill in the blanks first**; every later Claude session starts from this file.

## Scope

- You may edit: files in `src/agents/agent1/`, this agent's entry in `src/agents/registry.ts`, and this agent's specs in `e2e/`.
- You may not edit: other agents, `src/components/ui`, `src/auth`, `src/shell`, `src/home`, `src/styles`. If you need a change there, stop and propose it.
- Import only from this folder, `@/components/ui`, `@/auth`, `@/styles`.

## Migration source

This folder receives Team 1's **existing UI**. The old UI is read only: never edit it.

- Old UI location: `Smart_Ops_Pod1/frontend` (sibling repo). Run it with `docker compose up` from that repo's root.
- Backend it calls: Pod1's own FastAPI ("Viva Agent"), `http://localhost:8000` locally (same `docker compose up`).
- Screen list and progress: `MIGRATION.md` (keep it current).

## What this agent does

Upload or paste a curriculum; the backend derives tracks, an admin starts a candidate session and
shares the link, the candidate takes an adaptive spoken/typed interview, and an admin accepts or
rejects the agent-scored report (human-in-the-loop). See `registry.ts` for the card text.

## Roles and pages

Roles are strictly separate: admin gets `admin/IntakePage.tsx` (upload + tracks + start) and
`admin/ReviewPage.tsx` (HITL review); trainee gets `trainee/LandingPage.tsx`,
`trainee/BriefingPage.tsx` and `trainee/InterviewPage.tsx`, chosen from `useAuth().user.role` in
`index.tsx`, as `src/agents/agent3` does. See `MIGRATION.md` for an open question about how the old
UI's unauthenticated candidate flow maps onto the shell's login.

## Backend

`api/api.ts` (`Agent1Api` interface), `api/httpApi.ts` (real client), `api/mockApi.ts` (in-memory
stand-in) - same shape as `src/agents/agent3/api/` and `src/agents/agent4/api/`. Auth headers come
from `useAuth().getAuthHeaders()`. The dev proxy entry (`/agent1-api` in `vite.config.ts`) and the
prod nginx `location` (`deploy/nginx.conf.template`) already exist.

## Run and test

`npm run dev`, sign in, open the Agent 1 card. Tests: `npm test`, `npm run test:e2e`.

## Notes for Claude

- Port the old UI's **behaviour** exactly; build the **look** from the UI kit and tokens, never from the old styling.
- Streamlit-to-React mapping and a worked example: `docs/building-with-claude-code.md`. Reference code: `src/agents/agent3`. Use `/migrate-screen agent1 <old screen>`.
- Keep this folder's `README.md` and `MIGRATION.md` up to date.
