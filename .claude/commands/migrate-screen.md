---
description: Port one screen of your existing UI into your agent folder (usage - /migrate-screen <agent id> <old screen file or name>)
---

Port one screen from the team's existing UI into this React app. Arguments: `$ARGUMENTS` (the agent id such as `agent2`, then the old screen's file path or name). If either is missing, ask.

1. Read `CLAUDE.md`, `docs/building-with-claude-code.md` (especially the Streamlit to React cheat sheet), the agent's `CLAUDE.md`, `README.md` and `MIGRATION.md`. Look at `src/agents/agent3/` for the pattern. The old UI is read only: never change it.
2. Read the old screen completely, including the helpers and API calls it uses. List its behaviour: inputs, outputs, validation, state, polling, error handling, and which role uses it. Show this list before coding.
3. Work only inside `src/agents/<agent id>/`. Put the screen under `trainee/` or `admin/` (roles are strictly separate; if both used it, make two pages). Port the **behaviour** faithfully, but build the **look** from the shared UI kit and design tokens, not from the old styling.
4. Put data access behind the agent's API interface with a matching mock that behaves like the real server (same status codes and error text). Keep non-visual rules in plain `.ts` files with unit tests.
5. Register the route in the agent's `index.tsx` for that role only, add it to the role's `SubNav`, and make sure the other role cannot reach it.
6. Handle loading, empty and error states and show the server's message text.
7. Add or extend a Playwright test in `e2e/` for the flow and run it in a real browser; look at the page, not just the test result.
8. Compare with the old screen running and list every remaining difference.
9. Update the screen's row in `MIGRATION.md` (todo, ported, verified), the agent's `README.md` page table, then run `/check`.

Do not touch other agents or shared code. If shared code is needed, stop and propose it. Finish by stating what you did not verify.
