# Adaptive Skill-Gap Diagnostic Agent (ASGD)

|            |                                                                       |
| ---------- | --------------------------------------------------------------------- |
| Folder     | `src/agents/agent4`                                                   |
| URL        | `/agents/agent4` (top bar shows "ASGD agent")                         |
| Owner team | Team 4 (set in `CODEOWNERS`)                                          |
| Roles      | trainee and admin (evaluator). The role is set at login, no switch    |
| Status     | Screens built to the UST brand template; not yet checked in a browser |

## What it shows

- **Trainee (`TraineeView.tsx`):** the trainee enters a trainee ID and sees skill gaps,
  recommendations and the skill report.
- **Evaluator (`EvaluatorView.tsx`):** a list of trainees with search and a status filter.
  Opening one shows the same results, plus the approve or reject decision for a report
  that is pending review. A trainee with no assessment can be assessed from there.

Both views use `ResultsBlock` in `SummaryView.tsx`, so the layout is the same for both roles.

There is no chat. The earlier question-and-answer screen was removed.

## Files

| File                | What it holds                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| `index.tsx`         | Provides the API and the mock-data note                                       |
| `AgentScreen.tsx`   | Picks the view from the role at login                                         |
| `TraineeView.tsx`   | Trainee lookup by ID                                                          |
| `EvaluatorView.tsx` | Trainee list and trainee detail                                               |
| `SummaryView.tsx`   | Results page: tiles, overview, score groups, exercise cards, strong areas     |
| `ReviewPanel.tsx`   | Approve or reject (a comment is required to reject)                           |
| `theme.css`         | UST brand tokens, light only, scoped to `.asgd`                               |
| `api/`              | `api.ts` interface, `httpApi.ts` real client, `mockApi.ts` in-memory stand-in |

## Brand

Colours, type and layout follow the UST brand design (`UST_Brand_Design`), in light mode only:
square corners, 1px hairlines, no shadows, one accent colour. Headings use Archivo, text
uses Figtree and figures use IBM Plex Mono. The palette is in `theme.css`, not in the shared
`src/styles/tokens.css`, so the other agents are unaffected.

## Backend

Calls go to the Pod 4 API (`Smart_Ops_Pod4`, FastAPI) through the Vite proxy `/agent4-api`,
which forwards to `VITE_AGENT4_API_URL` (default `http://localhost:8010`).

| Method | Path                              | Used for                                                                                    |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------- |
| GET    | `/v1/trainees`                    | Trainee list                                                                                |
| GET    | `/v1/trainees/{id}/summary`       | Results (404: no results; 409: a section A, B or C is missing; 503: retry)                  |
| POST   | `/v1/trainees/{id}/assessments`   | Run an assessment                                                                           |
| POST   | `/v1/diagnostics/{run_id}/review` | Approve or reject                                                                           |
| (none) | PDF                               | Built in the browser from the summary (`reportPdf.ts`); the server PDF endpoint is not used |

Auth headers come from `useAuth().getAuthHeaders()`. The Pod 4 API needs no token when
its ZITADEL settings are empty and `ASGD_ENV` is `local` or `dev` (see its `docs/sign-in.md`).
The API then ignores the dev headers, so the calls work. With ZITADEL settings filled in,
every call needs a real token, and the dev login cannot provide one.

The request and response shapes were checked by reading the Pod 4 routes (`app/api/trainees.py`,
`app/api/diagnostics.py`). They have not been run against a live API yet.

## Field mapping (what the template showed, and what the API gives)

| Template field               | Source here                          | Note                                     |
| ---------------------------- | ------------------------------------ | ---------------------------------------- |
| Trainee name, cohort         | not in the API                       | not shown; add to the API before showing |
| Overall score %              | not in the API                       | replaced by "Goals assessed"             |
| Current vs target            | `scores[].score` and `gap_threshold` | scale 0 to 5, threshold marker           |
| Recommendations              | `gaps[].exercises`                   |                                          |
| Evaluator comment, strengths | not in the API                       | not shown                                |
| Export, add note, assign     | no endpoint                          | not shown                                |

## Run and test

- Mock data (no backend): `VITE_USE_MOCKS=true npm run dev`. Trainees `T-06` (full report)
  and `T-09` (too-old assessment) are in the mock.
- Real API: start the Pod 4 API on port 8010, then `npm run dev`.
- Tests: `npm test`. Browser tests: `npm run test:e2e`.

## Open points

- The trainee view takes any ID. Production must use the trainee's own ID from sign-in,
  and the API must refuse other trainees' results.
- Not yet checked in a browser, and no Playwright spec for the ASGD flow yet.

## Deployed

`VITE_AGENT4_API_URL` is used only by the local dev server (`vite.config.ts`). A deployed
build has no dev proxy, so this variable does nothing there. The page calls `/agent4-api/...`,
and the web server that hosts Smart_Ops must forward `/agent4-api/` to the Pod 4 UI address,
stripping the prefix. Pod 4's own nginx then forwards `/v1/` to its API.

- The Pod 4 API is not published. Inside Pod 4's Docker network it is `http://api:8000`,
  which Smart_Ops cannot reach.
- The address Smart_Ops should forward to is `http://<pod4-server-host>:<UI_PORT>`. `UI_PORT`
  is in the server's `deploy/.env`, and the host is the Pod 4 server. Get both from the Pod 4
  team or DevOps.
- Smart_Ops has no deployment yet. Once it has one, its server config defines this route.
