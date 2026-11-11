# CLAUDE.md

Guidance for Claude Code when working in this repository. Read this first; it is short on purpose. Human-oriented detail is in `README.md` and `docs/`.

## What this project is

A React portal: login -> home with four agent cards -> one screen set per agent. Four teams each own one agent folder under `src/agents/`. The shell, login, home page, UI kit and the four folders **already exist**; the teams are **migrating their own existing UIs** (often Streamlit) into their folder. Port the old UI's _behaviour_; build the _look_ from the UI kit and `DESIGN_SPEC.md`, never from the old styling. Agent 3 ("Stakeholder Roleplay") is a finished migration of the `Smart_Ops_Pod3` Streamlit UI and the reference to copy patterns from (`docs/building-with-claude-code.md` maps old files to new). Keep everything **simple and minimal**: no fancy animation, no extra libraries, no clever abstractions.

## Commands

```
npm run dev            # http://localhost:5173
npm run typecheck      # tsc
npm run lint           # eslint (also enforces agent isolation)
npm run format         # prettier --write   (npm run format:check to verify)
npm test               # vitest
npm run test:e2e       # playwright: `mock` project always; `real` project skips if no backend on :8000
npm run build
```

Slash commands: `/check` runs all of the above; `/migrate-screen <agent> <old screen>` ports one screen of the team's old UI. First browser-test run needs `npx playwright install chromium`.
The machine may be Windows. Prefer the dedicated file tools; in PowerShell do not use `&&`.

## Layout

```
src/auth/            AuthProvider, useAuth(), dev login, Zitadel stub   (shared, platform-owned)
src/shell/ src/home/ layout, route guards, agent picker                  (shared, platform-owned)
src/components/ui/   shared UI kit                                       (shared, platform-owned)
src/styles/          tokens.css (design tokens), base.css
src/agents/registry.ts   the list of agents; the shell reads only this
src/agents/<id>/     ONE TEAM'S AREA. agent1, agent2, agent3, agent4, _template
e2e/                 Playwright specs        docs/   documentation
```

Import alias: `@/` = `src/`.

## Rules that must hold

1. **Stay in your agent folder.** An agent may import only from itself, `@/components/ui`, `@/auth` and `@/styles`. Never import from another agent or from `@/shell` / `@/home`. ESLint fails the build if you do. If something is genuinely shared, say so and propose adding it to `components/ui` instead of copying across agents.
2. **Roles are strictly separate.** `trainee` and `admin` see different pages; an admin does not get trainee pages. Decide pages from `useAuth().user.role` inside the agent's `index.tsx`, redirect unknown routes to the role's default page, and remember the backend must enforce permissions again.
3. **Design tokens only.** Use `var(--color-*)`, `var(--space-*)`, `var(--radius-*)` from `src/styles/tokens.css`. No raw hex in components. The source of truth is `DESIGN_SPEC.md` (its colour-usage rules win). Light theme only. 1px borders, no shadows except modals and popovers.
4. **Use the UI kit before writing UI.** `Button, Input/Textarea/Select, Alert, Tag, Card, Table, Tabs, SubNav, Modal, FilePicker, Spinner, Avatar, Icon, Link`. Missing something shared? Add it to `components/ui` in its own small change.
5. **Status is never colour alone** (icon + text + colour). Every control keyboard-usable with a visible focus ring. Every field has a visible label. WCAG 2.1 AA.
6. **Auth only through `useAuth()`.** Get request headers from `getAuthHeaders()`. Never read storage, tokens or headers yourself, so Zitadel can replace the dev login without touching agents.
7. **Backend calls go behind an interface** (see `src/agents/agent3/api/`: `api.ts` interface, `httpApi.ts` real, `mockApi.ts` in-memory). Pages depend on the interface only, and the mock must behave like the real server (same status codes and errors), so the UI can be built and tested without a backend. Keep real and mock in step.
8. **No new dependencies without asking.** No `any` unless unavoidable. No `// eslint-disable` without a reason in a comment.
9. **No personal or sensitive data** (real names, resumes, ID numbers, card numbers, patient records) in code, tests, mocks, docs or screenshots. Use obviously fake data.

## Migrating an old UI (what most work here is)

- The old UI is **read only**. Never edit it. Inventory it first (screens, components, state, API calls, roles, rules) into `src/agents/<id>/MIGRATION.md`, then port one screen at a time.
- Port behaviour exactly: validation, retries, error text, polling, edge cases. Read the old code; do not rebuild from memory. List every deliberate difference.
- Drop old auth/login/role pickers and old theming. Use `useAuth()` and the UI kit.
- Streamlit equivalents (tabs, expander, file uploader, chat, polling, download) are tabulated in `docs/building-with-claude-code.md`.

## Conventions

- TypeScript strict, function components and hooks, CSS modules next to the component (`Thing.tsx` + `Thing.module.css`), Prettier formatting.
- Put non-visual rules in plain `.ts` files so they are easy to test (see `agent3/hooks/chatController.ts`).
- Every data-loading view handles loading, empty and error states, and shows the server's message text.
- Tests sit next to the code (`*.test.ts(x)`); browser tests in `e2e/`.

## Gotchas already hit in this repo

- A `useEffect` callback must not **return a value**. `useEffect(() => el?.scrollIntoView(), [])` crashed the page to blank; use a block body.
- Do not derive a `<details open>` (or any expand/collapse) from data that changes; the card collapsed when a version was added. Keep explicit `open` state.
- `overflow-x: auto` on a row whose children overlap its border with a negative margin adds a vertical scrollbar. Let it wrap instead.
- `findByText` can match a transient "pending" element before the real result renders. Wait on the thing that proves the work finished (a counter, a status), not on text that appears earlier.
- Typecheck and unit tests passing does **not** prove a screen works. Run it in a browser (Playwright) before saying it is done.

## Definition of done

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass; the affected flow is exercised in a browser test (`npm run test:e2e`); the agent's `README.md` and any changed doc are updated; loading, empty and error states and both roles are handled. Say plainly what you did not verify.

## Where to look

`docs/building-with-claude-code.md` (how to work with Claude here), `docs/adding-an-agent.md`, `docs/ui-standards.md`, `docs/architecture.md`, `docs/agent3-api-and-mocks.md` (API contract, running the real backend), `docs/auth-zitadel.md`.
