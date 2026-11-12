# Migrating your UI into this app with Claude Code

This guide is for a team that already has its own UI (for example a Streamlit app) and is moving it into its agent folder here: `src/agents/agent1`, `agent2` or `agent4`. The shell, login, home page, shared UI kit and the four agent folders already exist, and Agent 3 is a finished migration you can copy from. **You are not building an app; you are porting screens.**

[Claude Code](https://claude.com/claude-code) does most of the typing. This page explains how to set it up, a workflow that works, prompts to copy, and mistakes to avoid. The rules are already written in `CLAUDE.md`, so you do not have to repeat them each time.

## 1. What is already done, and what is yours

| Done for you                                                                                                        | Yours                                                              |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Login page (dev login now, Zitadel later), home page with the four agent cards                                      | Port your screens into `src/agents/<your id>/`                     |
| Role handling: `trainee` and `admin`, strictly separate                                                             | Decide which of your screens belong to which role                  |
| Shared UI kit (`Button`, `Input`, `Alert`, `Table`, `Tabs`, `Modal`, `FilePicker`, ...), design tokens, base styles | Rebuild your screens from the UI kit; do not copy your old styling |
| Agent isolation (lint rule), `CODEOWNERS`, test setup, browser tests                                                | Keep your agent's API client, mock and tests                       |
| Agent 3, a complete migration of a Streamlit UI                                                                     | Use it as your worked example (section 8)                          |

The look comes from `DESIGN_SPEC.md`, not from your old UI. The **behaviour** (what each screen does, its rules, its error handling) should match your old UI.

## 2. What Claude already knows

When Claude Code starts in this repository it reads these automatically:

| File                                 | What it gives Claude                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `CLAUDE.md` (root)                   | Commands, layout, the rules that must hold, gotchas, definition of done |
| `src/agents/<id>/CLAUDE.md`          | Your agent's scope and notes. Read when Claude works in that folder     |
| `.claude/commands/check.md`          | `/check`: run every quality gate                                        |
| `.claude/commands/migrate-screen.md` | `/migrate-screen <agent> <old screen>`: port one screen                 |

Claude does not know your old UI. **Fill in the "Migration source" section of your agent's `CLAUDE.md` first** (where the old code lives, how to run it, which screens exist). Every later session starts from it.

## 3. Set up

```bash
git clone <repo> && cd Main_UI
npm install
cp .env.example .env.local        # PowerShell: Copy-Item .env.example .env.local
npx playwright install chromium    # once, for browser tests
npm run dev                        # http://localhost:5173
```

Needs Node 20 or newer. Sign in with any name; pick Trainee or Admin. Your agent's card opens your folder. Optional: [uv](https://docs.astral.sh/uv/) and a Smart_Ops_Pod3 checkout if you want to run the real Agent 3 backend ([how](agent3-api-and-mocks.md)).

**Let Claude read your old UI.** Start Claude Code from this repo (`claude`) and give it access to the old code's folder, for example `claude --add-dir ../YourOldUI`, or `/add-dir ../YourOldUI` inside a session. Read access is enough; Claude never needs to change the old code. Run the old UI too, so you can compare screens side by side.

## 4. The migration workflow

Work in small slices: **inventory, map, data layer, port one screen, compare, record, commit.** Do not port everything in one go.

1. **Inventory** the old UI: every screen, the components on each, shared state, every backend call, the roles, and any special styling or rules. Ask Claude to write this into `src/agents/<id>/MIGRATION.md` as a table with a status column (todo, ported, verified). This file is your tracker and your handover.
2. **Map** screens to roles and routes. Roles are strictly separate here, so a screen that both roles use in the old UI becomes two pages or a page that renders differently by role. Decide route names (relative to `/agents/<id>`).
3. **Data layer first.** From the old UI's API client, create types, an API interface, a real client and a mock that behaves like the real server (same status codes and error text). Add a Vite proxy entry for your backend. Copy the pattern in `src/agents/agent3/api/`.
4. **Port one screen at a time**, smallest or most central first. For each: reproduce the behaviour, rebuild the layout with the UI kit and tokens, handle loading, empty and error states, and keep non-visual rules (retry logic, validation, state machines) in plain `.ts` files with unit tests.
5. **Compare** the new screen with the old one running side by side: same inputs give the same results, same error messages, same edge cases. List differences and decide each one on purpose.
6. **Test in a real browser** (Playwright) for both roles, then record the status in `MIGRATION.md`.
7. **Check and commit**: `/check`, then a pull request ([contributing.md](contributing.md)).

## 5. Streamlit to React cheat sheet

Most pods migrate from Streamlit. These are the usual translations; the "In this repo" column is what to use.

| Streamlit                                                                       | In this repo                                                                                                    |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `st.sidebar` login and role picker                                              | Already done: login page and `useAuth()`                                                                        |
| `st.navigation` / pages                                                         | `SubNav` plus `<Routes>` in your agent's `index.tsx`, per role                                                  |
| `st.session_state`                                                              | React state, or a small hook/class; shared across pages only if truly needed                                    |
| `st.rerun()` and polling (`st.fragment`, autorefresh)                           | `useAsync(...).reload()` and `usePolling(active, ms, tick)` (see `agent3/hooks/useAsync.ts`)                    |
| `st.tabs`                                                                       | `Tabs`                                                                                                          |
| `st.expander`                                                                   | `<details>` with **explicit open state**                                                                        |
| `st.columns`, `st.container`                                                    | CSS (flex or grid) in a CSS module, using the `--space-*` tokens                                                |
| `st.text_input`, `st.text_area`, `st.selectbox`, `st.number_input`, `st.slider` | `Input`, `Textarea`, `Select`; a native range input for sliders                                                 |
| `st.file_uploader` + upload button                                              | `FilePicker` (see `agent3/components/FileUploader.tsx`)                                                         |
| `st.button`                                                                     | `Button` (`primary` or `secondary`)                                                                             |
| `st.info/success/warning/error`, `st.toast`                                     | `Alert` with the matching `kind`                                                                                |
| `st.dataframe`, `st.table`                                                      | `Table`                                                                                                         |
| `st.metric`, `st.progress`                                                      | Text plus a native `<progress>` (see `agent3/components/MoodMeter.tsx`)                                         |
| `st.chat_message`, `st.chat_input`                                              | Transcript list and a `Textarea` where Enter sends, Shift+Enter adds a line (see `agent3/trainee/ChatRoom.tsx`) |
| `st.download_button`                                                            | Fetch a blob, then click a temporary link (see `agent3/components/ReportPanel.tsx`)                             |
| `st.status` / spinners                                                          | `Spinner`                                                                                                       |
| Dialogs / confirmation reruns                                                   | `Modal`                                                                                                         |
| Custom CSS and `st.markdown(unsafe_allow_html=True)`                            | Do not port. Use the UI kit and tokens; render markdown safely as React elements                                |

Other frameworks follow the same idea: keep the behaviour, rebuild the look from the UI kit.

## 6. Prompts to copy

**Kickoff (once per agent)**

> Read CLAUDE.md, src/agents/agent2/CLAUDE.md and docs/building-with-claude-code.md. Our existing UI is in `<path>` (read only) and runs with `<command>`. Make an inventory of every screen, component, backend call, role and special rule, and write it to src/agents/agent2/MIGRATION.md as a table with a status column. Do not write any React yet. Then list the questions you need answered.

**Plan the mapping**

> Using MIGRATION.md, propose which screens belong to trainees and which to admins (roles are strictly separate), the route for each, and the order to port them. Wait for my OK.

**Data layer**

> Port the API client from `<old path>` into src/agents/agent2/api following src/agents/agent3/api: types, an interface, a real client and a mock that mirrors the real server's status codes and error text. Add a Vite proxy for `<url>` in vite.config.ts. Use useAuth().getAuthHeaders() for headers.

**Port one screen**

> /migrate-screen agent2 `<path to the old screen file or its name>`

**Compare with the old UI**

> Run the old screen and the new one. For the `<screen>` flow, list every difference in behaviour, text, validation and error handling. Do not fix anything yet.

**Fix a bug**

> Bug: `<what you did, what happened, what you expected>`. First reproduce it with a failing Playwright or Vitest test. Then find the root cause and fix it. Do not just hide the symptom.

**Browser test**

> Write a Playwright test in e2e/ for the `<role>` flow on the `<screen>` page using the mock, run it, and fix what it finds. If it fails, look at the page (screenshot and console errors) before changing code.

**Review before you commit**

> Review my diff against CLAUDE.md: agent isolation, design tokens (no raw hex), roles strictly separate, labels and keyboard use, loading/empty/error states, and that the mock matches the real server. List problems; do not fix anything yet.

## 7. Keeping Claude on the rails

Say it out loud when a task invites a shortcut:

- "**Only edit src/agents/agent2.**" If Claude says it needs a shared change (`components/ui`, `auth`, `shell`, `styles`), make it a separate small pull request that the other teams review.
- "**Port behaviour, not styling.**" Do not copy old CSS or markup. Use the UI kit and `var(--color-*)` tokens; `DESIGN_SPEC.md` is the source of truth.
- "**No new dependencies.**" If it proposes one, ask what the plain version would cost.
- "**Don't weaken a test to make it pass.**" If a test is wrong, say why first.
- "**Tell me what you did not verify.**" Good answers separate "ran and passed" from "should work".

The ESLint rule `no-restricted-imports` in `eslint.config.js` makes cross-agent imports a build error, so isolation holds even when a prompt forgets it.

## 8. Worked example: how Agent 3 was migrated

Agent 3 came from the Streamlit UI in `Smart_Ops_Pod3/ui/`. Use this as the model for your own mapping.

| Old (Streamlit)                                                                      | New (React)                                                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `ui/streamlit_app.py` login sidebar, role select, `st.navigation`                    | `src/auth`, `src/shell`, and role routes in `agent3/index.tsx`                                         |
| `ui/client.py` (httpx client, errors, SSE parsing)                                   | `agent3/api/api.ts` (interface), `httpApi.ts` (real), `mockApi.ts` (mock), `types.ts`                  |
| `ui/chat.py` `ChatController` (idempotency ticket, pending message, retry vs refuse) | `agent3/hooks/chatController.ts` (plain TypeScript, unit tested)                                       |
| `ui/widgets.py` (status labels, polling, transcript, report panel, persona editor)   | `agent3/components/` (`StatusBadge`, `DocumentRow`, `Transcript`, `ReportPanel`, `PersonaEditor`, ...) |
| `ui/views/trainee_profile.py`                                                        | `agent3/trainee/ResumePage.tsx`                                                                        |
| `ui/views/trainee_chat.py`                                                           | `agent3/trainee/ChatPage.tsx` and `ChatRoom.tsx`                                                       |
| `ui/views/admin_setup.py` (3 tabs)                                                   | `agent3/admin/SetupPage.tsx`, `PersonaTab`, `SituationsTab`, `DemandTab`                               |
| `ui/views/sessions_review.py`                                                        | `agent3/admin/ReviewPage.tsx`                                                                          |
| Streamlit default theme                                                              | `DESIGN_SPEC.md` tokens through the UI kit                                                             |

Two deliberate changes: the Streamlit admin also saw the trainee pages, but here roles are strictly separate; and the dev login moved from a sidebar form to the shared login page. Its API contract and the rules it kept are in [agent3-api-and-mocks.md](agent3-api-and-mocks.md).

## 9. Checking your work

```bash
npm run lint && npm run typecheck && npm test && npm run build   # or: /check
npm run test:e2e                                                   # real browser
```

`npm run test:e2e` has two projects on their own dev servers: `mock` (always runs) and `real` (needs the Pod3 backend on :8000, skips itself otherwise). Add your own spec in `e2e/` for the mock, and a `real` one only if your backend can run locally. Run one project with `npx playwright test --project=mock`.

**Looking at a screen.** Ask Claude: "Write a throwaway Playwright test that signs in as a trainee, opens agent2, takes a screenshot to test-results/, and look at it." `test-results/` is git-ignored. Delete throwaway tests afterwards.

**A blank page** almost always means a React error. Ask Claude to capture `pageerror` and `console` events in a Playwright run; the message names the component.

## 10. Mistakes we already made (so you can skip them)

| Mistake                                                | What happened                                                          | Do this instead                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `useEffect(() => el?.scrollIntoView(), [])`            | Returning a value makes React treat it as cleanup; the page went blank | Block body: `useEffect(() => { el?.scrollIntoView(); }, [])` |
| `<details open={versions.length === 1}>`               | The card collapsed when data changed                                   | Keep `open` in state                                         |
| `overflow-x: auto` on a tab row with a negative margin | A stray vertical scrollbar appeared                                    | Use `flex-wrap: wrap`                                        |
| Test waited for text that also shows while sending     | It passed before the work finished                                     | Wait on a result (a counter, a status), not an early label   |
| Showing the server's raw error next to our own message | Two overlapping alerts                                                 | Show the message once, in the user's words                   |
| Trusting typecheck and unit tests                      | A chat page crashed on open                                            | Run the flow in a browser                                    |
| Test picked the "first" item in a list                 | It broke once other tests added items                                  | Select by name, not position                                 |
| Copying a screen's behaviour from memory               | Subtle rules were lost (retries, 409 handling)                         | Read the old code and port its rules; test them              |

## 11. Backends, auth and data

- **Pattern**: an interface (`api.ts`), a real client, and a mock. Pages use the interface. See `src/agents/agent3/api/`.
- **Proxy, not CORS**: add a `/your-api` entry in `vite.config.ts` that forwards to your service, and call that path from the browser.
- **Auth**: only `useAuth().getAuthHeaders()`. Today it sends dev headers; with Zitadel it will send a bearer token. Your code does not change ([auth-zitadel.md](auth-zitadel.md)). Replace any login, role picker or header code from your old UI with this.
- **Secrets**: nothing secret goes in this repo. `VITE_*` variables are bundled into the browser and are public. `.env.local` is git-ignored.
- **No personal data**: never paste real resumes, names, ID numbers, card numbers or patient records into prompts, mocks, tests, docs or screenshots. Use obviously fake data.

## 12. Troubleshooting

| Symptom                                     | Check                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Blank page                                  | Browser console, or a Playwright run that prints `pageerror`                                            |
| "The API is not reachable" in Agent 3       | `VITE_USE_MOCKS=false` but no backend on :8000. Start it, or set `VITE_USE_MOCKS=true`                  |
| Backend endpoints hang, `/readyz` times out | The API is trying Postgres. Set `PODC_DATABASE_URL` to a SQLite file ([steps](agent3-api-and-mocks.md)) |
| `real` browser tests are skipped            | Expected when the backend is not running                                                                |
| Changes to `.env.local` ignored             | Restart `npm run dev`                                                                                   |
| `Port 518x is already in use`               | A previous test server is still running; stop it                                                        |
| ESLint: "import is restricted"              | You imported from another agent or the shell. Import from your own folder or the UI kit                 |
| Claude cannot see the old UI                | Add its folder: `claude --add-dir <path>` or `/add-dir <path>`                                          |

## 13. Before you open a pull request

- [ ] `/check` is green (or you know exactly why not)
- [ ] Each ported screen behaves like the old one (differences are listed and deliberate)
- [ ] Works in a browser for the role it belongs to, and the other role cannot reach it
- [ ] Loading, empty and error states exist and show the server's message
- [ ] Design tokens only, UI kit used, labels and focus visible, status not by colour alone
- [ ] Only your agent folder (plus your registry entry and e2e specs) changed, or the shared change is its own pull request
- [ ] `MIGRATION.md`, your agent's `README.md` and `CLAUDE.md` describe what exists now
- [ ] No secrets or personal data anywhere in the diff
