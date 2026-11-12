# Architecture

## Goals

1. One login, one home page, four agents.
2. Four teams work in parallel without stepping on each other.
3. Same look everywhere, from the design spec.
4. Easy to replace dev login with Zitadel.

## Request flow

```
Browser
  main.tsx -> App -> AuthProvider -> routes
    /login                         LoginPage
    /                              HomePage      (cards from agents/registry.ts, filtered by role)
    /agents/:agentId/*             AgentRoute -> lazy agent component (agents/<id>/index.tsx)
```

- `ProtectedRoute` sends signed-out visitors to `/login` and brings them back to the page they wanted.
- `AgentRoute` looks the agent up in the registry and checks `roles`. The agent then decides which pages each role gets.

## Agent isolation

Each agent is a folder under `src/agents/` with its own routes, components, API client, mocks and README.

| Rule                                                                       | How it is enforced                                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| An agent imports only from itself, `@/components/ui`, `@/auth`, `@/styles` | ESLint `no-restricted-imports` (see `eslint.config.js`)                             |
| An agent is loaded only when opened                                        | `lazy(() => import('./agentN'))` in the registry; each agent is its own build chunk |
| A team edits only its folder                                               | `CODEOWNERS`                                                                        |
| The shell never imports agent internals                                    | The shell reads `registry.ts` only                                                  |

If two teams need the same component, put it in `components/ui` through a small pull request that all teams review. Do not import from a sibling agent.

## Roles

Two roles: `trainee` and `admin` (type `Role` in `src/auth/types.ts`). They are strictly separate: each agent shows each role only its own pages. The registry's `roles` array controls who sees an agent card.

Role checks in the browser only decide what to show. The backend must enforce permissions again.

## Auth seam

`useAuth()` returns `{ user, login, logout, getAuthHeaders }`. Agents call `getAuthHeaders()` for backend requests and never read storage or tokens themselves. Today it returns the dev headers (`X-Dev-User`, `X-Dev-Role`). With Zitadel it will return `Authorization: Bearer ...`. See [auth-zitadel.md](auth-zitadel.md).

## Data and backend

Each agent owns its API client. Agent 3 uses an `Agent3Api` interface with two implementations: real HTTP (through the Vite proxy `/agent3-api`) and in-memory mocks. See [agent3-api-and-mocks.md](agent3-api-and-mocks.md).

## Technology choices

| Choice                                 | Why                                                           |
| -------------------------------------- | ------------------------------------------------------------- |
| Vite + React + TypeScript              | Fast, standard, typed contracts between teams                 |
| Plain CSS + CSS modules + `tokens.css` | Matches the spec's CSS variables, no extra framework to learn |
| React Router                           | Nested routes per agent                                       |
| Vitest + Testing Library               | Same config as Vite                                           |
| System font stack                      | No font download. Roboto in the Figma render is not bundled   |

## Out of scope for now

Zitadel login, dark mode, the `integrator` role from the backend, the backend's planned endpoints (review queue, integration signals), and any Smart Genie / AI-entry-point visuals.
