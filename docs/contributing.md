# Contributing

## Branches and pull requests

- Work on a branch named `<agent>/<short-topic>`, for example `agent2/upload-page`.
- Keep pull requests inside your agent folder where you can. Changes to `components/ui`, `auth`, `shell`, `home`, `styles` or `registry.ts` need review from the shared-code owners (see `CODEOWNERS`).
- Before you push:
  ```bash
  npm run lint && npm run typecheck && npm test && npm run format:check
  ```

## Code style

- TypeScript strict. Prettier formats the code (`npm run format`).
- Function components and hooks. Keep rules that are not about rendering in plain `.ts` files so they are easy to test (see `agent3/hooks/chatController.ts`).
- CSS modules next to the component, using tokens only. See [ui-standards.md](ui-standards.md).
- Prefer small components. Do not add a library for something a few lines can do; ask first if you need a new dependency.

## Tests

Vitest and Testing Library. Put tests beside the code (`*.test.ts(x)`). Test behaviour (what a user sees, role gating, retry rules), not implementation details.

## Documentation

Update your agent's `README.md` and the docs when you change a route, a role, or an API contract.

## Known tooling note

`npm audit` reports issues in development tools (Vite 5, Vitest 2 and their dependencies). They are not shipped to browsers. Plan an upgrade to current major versions.
