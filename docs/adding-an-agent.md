# Working in an agent folder

Each agent lives in `src/agents/<id>`. Your team owns that folder. The four folders (`agent1`, `agent2`, `agent3`, `agent4`) already exist: teams **migrate their existing UI** into them. If that is you, read [building-with-claude-code.md](building-with-claude-code.md) first; this page is the reference for the folder contract and for adding a further agent.

## The contract

1. `src/agents/<id>/index.tsx` has a **default export**: a component that renders the agent's routes. It is mounted at `/agents/<id>/*`, so route paths inside it are relative.
2. `src/agents/registry.ts` has one entry for the agent: `id`, `name`, `description`, `roles`, `component`.

That is all the shell knows about you.

## Start a new agent from the template

1. Copy `src/agents/_template` to `src/agents/<id>`.
2. Add an entry to `AGENTS` in `src/agents/registry.ts` (`component: lazy(() => import('./<id>'))`).
3. Add the folder to `eslint.config.js` (`agentIds`) and to `CODEOWNERS`.
4. Fill in your folder's `README.md`.

The four agents already exist as folders: `agent1`, `agent2`, `agent3` (done), `agent4`.

## Rename your card

Change `name` and `description` in your entry in `registry.ts`. Nothing else needs to change.

## Role-specific pages

Roles are strictly separate. Follow Agent 3:

```
agents/<id>/
  index.tsx        routes chosen by useAuth().user.role
  trainee/         pages for trainees
  admin/           pages for admins
  components/      pieces only this agent uses
  api/             types, client, mocks
```

Never rely on hiding a link for security; the backend must refuse calls the role is not allowed to make.

## Imports you may use

| Allowed                               | Not allowed                                         |
| ------------------------------------- | --------------------------------------------------- |
| Your own folder                       | Another agent (`@/agents/agentX/...`): ESLint error |
| `@/components/ui`                     | `@/shell`, `@/home` internals                       |
| `@/auth` (`useAuth`)                  | Reading storage or tokens yourself                  |
| `@/styles` tokens (via CSS variables) | Raw hex colours                                     |

Need something shared that is missing? Open a small pull request that adds it to `components/ui` and ask the other teams to review.

## Calling your backend

- Use `useAuth().getAuthHeaders()` for headers, so Zitadel works later with no change.
- Add your own proxy entry in `vite.config.ts` (see `/agent3-api`) so you do not need CORS in development.
- Keep a mock implementation behind an interface (see `agent3/api/`) so the UI works without the backend.

## Testing

Put tests next to your code (`*.test.tsx`). Run `npm test`. At minimum, test your role gating and any rule that is not obvious from the UI.

## Definition of done for a page

- Follows [ui-standards.md](ui-standards.md)
- Loading, empty and error states handled
- Works for the roles it is meant for, and is not reachable by the other role
- `npm run lint`, `npm run typecheck`, `npm test` pass
