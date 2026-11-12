---
description: Run every quality gate (format, lint, typecheck, unit tests, build, browser tests) and report
---

Run these in order from the repository root and stop to fix problems as they appear:

1. `npm run format` then `npm run format:check`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. `npm run test:e2e` (the `real` project skips itself when no backend is running on :8000; say so rather than calling it a pass)

Report one line per step with the result. If something fails, fix the cause (do not weaken a test or add an eslint-disable to get green), then re-run from the failing step. Finish by stating anything you could not verify.

$ARGUMENTS
