# <Agent name>

|            |                                   |
| ---------- | --------------------------------- |
| Folder     | `src/agents/<id>`                 |
| URL        | `/agents/<id>`                    |
| Owner team | _fill in_                         |
| Roles      | _trainee, admin_                  |
| Backend    | _API base URL / how it is called_ |

## What it does

_One paragraph._

## Pages

| Route (relative) | Role | File        |
| ---------------- | ---- | ----------- |
| `/`              | all  | `index.tsx` |

## Run it

`npm run dev`, sign in, open the agent card. Mocks: _describe the flag or file if any_.

## Rules (see `docs/adding-an-agent.md`)

- Import only from this folder, `@/components/ui`, `@/auth` and `@/styles`. Never from another agent (ESLint enforces it).
- Use semantic tokens (`var(--color-*)`), never raw hex.
- Get backend auth headers from `useAuth().getAuthHeaders()`.
- Keep role-specific pages in `trainee/` and `admin/` subfolders.
