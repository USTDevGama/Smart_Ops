# Agent Portal (Main_UI)

One React app with a login page, a home page with four agent cards, and one folder per agent so four teams can work independently. Agent 3 (Stakeholder Roleplay) is the React port of the `Smart_Ops_Pod3` Streamlit UI.

Simple and minimal on purpose: Vite, React, TypeScript, plain CSS driven by the design tokens.

## Quick start

```bash
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
npm run dev                     # http://localhost:5173
```

Sign in with any name and the role **Trainee** or **Admin** (development login; Zitadel comes later). Out of the box Agent 3 runs on in-browser **mock data**, so nothing else is needed.

To use the real Smart_Ops_Pod3 API instead, set `VITE_USE_MOCKS=false` in `.env.local` and start the backend. The steps are in [docs/agent3-api-and-mocks.md](docs/agent3-api-and-mocks.md).

| Script                                        | What it does                                                        |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                                 | Dev server (includes the Agent 3 API proxy)                         |
| `npm run build`                               | Typecheck and production build                                      |
| `npm run typecheck` / `lint` / `format:check` | Quality checks (`npm run format` fixes formatting)                  |
| `npm test`                                    | Vitest: routing, role separation, chat rules, mock API              |
| `npm run test:e2e`                            | Playwright in a real browser: a mock project and a real-API project |

First run of the browser tests: `npx playwright install chromium`.

## Migrate your UI with Claude Code

The shell, login, home page, UI kit and the four agent folders are done. Each team **migrates its existing UI** (for example a Streamlit app) into its own folder; Agent 3 is a finished example. This repo is set up so [Claude Code](https://claude.com/claude-code) knows the rules without being told:

- [CLAUDE.md](CLAUDE.md) holds the project rules Claude reads automatically (structure, commands, design tokens, isolation, role rules, migration rules, checks).
- Each agent folder has a `CLAUDE.md` (scope and where your old UI lives) and a `MIGRATION.md` (screen-by-screen tracker).
- `/migrate-screen <agent> <old screen>` ports one screen; `/check` runs every quality gate. See `.claude/commands/`.
- **Start here: [docs/building-with-claude-code.md](docs/building-with-claude-code.md)**: the workflow, a Streamlit-to-React cheat sheet, how Agent 3 was migrated, copy-paste prompts, pitfalls to avoid.

## How it fits together

```
Login -> Home (4 agent cards) -> /agents/<id>/...  (role decides the pages)
```

- **Roles** are strictly separate. Trainees see trainee pages, admins see admin pages. An admin does not get the trainee pages.
- **Agents** are lazy-loaded from `src/agents/registry.ts`. Each agent owns its folder.
- **Auth** sits behind one interface (`src/auth`), so Zitadel replaces the dev login without touching agents.

## Where things live

```
src/
  auth/            login page, AuthProvider, dev login, Zitadel stub
  shell/           header layout, route guards
  home/            agent picker
  components/ui/   shared UI kit (Button, Input, Alert, Tag, Card, Table, Tabs, Modal, FilePicker, ...)
  styles/          tokens.css (design tokens), base.css
  assets/icons/    icons from the design kit
  agents/
    registry.ts    the list of agents (the only file the shell reads)
    agent1/ agent2/ agent4/   placeholders for the other teams
    agent3/        Stakeholder Roleplay (Pod3)
    _template/     copy this to start a new agent
e2e/               Playwright browser tests
docs/              documentation (see below)
DESIGN_SPEC.md     design source of truth;  reference/  Figma exports
```

## Documentation

| Doc                                                                    | Read it when                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| [docs/building-with-claude-code.md](docs/building-with-claude-code.md) | You migrate your existing UI into your agent with Claude Code |
| [docs/architecture.md](docs/architecture.md)                           | You want the big picture                                      |
| [docs/ui-standards.md](docs/ui-standards.md)                           | You build any UI (colours, type, components, accessibility)   |
| [docs/adding-an-agent.md](docs/adding-an-agent.md)                     | Your team starts working in its agent folder                  |
| [docs/auth-zitadel.md](docs/auth-zitadel.md)                           | You wire up single sign-on                                    |
| [docs/agent3-api-and-mocks.md](docs/agent3-api-and-mocks.md)           | You work on Agent 3, run its backend, or write browser tests  |
| [docs/contributing.md](docs/contributing.md)                           | You open a pull request                                       |
| [DESIGN_SPEC.md](DESIGN_SPEC.md)                                       | The design source of truth (colours win over everything)      |
