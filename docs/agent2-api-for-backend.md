# Bias Flagging UI: what the backend must provide

For the engineer who owns the Pod 2 backend (`Smart_Ops_Pod2/backend`). This page lists exactly what the dashboard's Bias Flagging screens send and expect. If your API matches it, the UI works with no UI change.

Related: [agent2-backend-integration.md](agent2-backend-integration.md) covers the server side (nginx route, `.env`, deploy). This page covers the API.

- The contract in code: `src/agents/agent2/api/types.ts` (shapes) and `src/agents/agent2/api/httpClient.ts` (every call the UI makes).
- A working example of the behaviour: `src/agents/agent2/api/mock/` (the in-browser fake backend the UI runs on today). When in doubt, copy what it does.
- The mirror that still needs updating on your side: `Smart_Ops_Pod2/contracts/ui_api.openapi.yaml`.

## How the UI reaches you

```
Browser -> /agent2-api/api/v1/<path>   (dashboard origin, e.g. http://10.100.242.180:8086)
        -> nginx strips "/agent2-api"
        -> <AGENT2_API_URL>/api/v1/<path>   (your service)
```

- Serve everything under **`/api/v1`**. No CORS is needed (same origin through nginx).
- nginx allows request bodies up to **5 MB**. Your own limit can be lower; answer too-large uploads with **413** and a clear message.
- Responses are JSON. `204` with no body is fine for DELETE.

## Authentication and roles

Every request carries:

| Header                                                    | When                  | Meaning                                                                                 |
| --------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `X-Session-Id: <uuid>`                                    | always                | One random id per browser tab session. **Scope run history to it** (and to the user).   |
| `X-Dev-User: <name>` and `X-Dev-Role: trainee` or `admin` | today (dev login)     | Who is signed in. Role names are the portal's: `trainee` or `admin`.                    |
| `Authorization: Bearer <token>`                           | later (Zitadel login) | Replaces the two dev headers with no UI change. See [auth-zitadel.md](auth-zitadel.md). |

**This is the main thing to fix.** The UI does not call `/auth/login` and has no password. Your backend currently expects its own JWT from `POST /auth/login` and reads the role from its database, so every call from the dashboard gets **401** today. Options:

1. **For the demo:** in a non-production setting only (for example `ENV=local|dev`), accept `X-Dev-User` / `X-Dev-Role` and treat `trainee` as your `user` role. Never enable this in production; anyone could claim any role.
2. **Later:** validate the Zitadel bearer token and read the role from it.

Roles and what each may call (the UI also hides pages by role, but you must enforce it):

| Role     | Allowed                                                          | Otherwise                              |
| -------- | ---------------------------------------------------------------- | -------------------------------------- |
| any user | `GET /flags`, all `/runs...` calls                               | 401 with no or invalid credentials     |
| `admin`  | flag management: `POST/PATCH/DELETE /flags`, `POST /flags/merge` | 403 `forbidden` for non-admins         |
| `admin`  | **no** analyses: the UI gives admins the flag page only          | 403 on `/runs...` is fine and expected |

On any **401** the UI shows a "session expired" message and tells the portal to sign the person in again.

## Errors

Every non-2xx response must use this body. The UI shows `message` to the person as is, so write it for a human.

```json
{ "error": { "code": "validation_error", "message": "Flag name is required", "details": null } }
```

If the body is not in this shape the UI falls back to the HTTP status text, so keep to it. Codes the UI and mock already use:

| Status | `code`               | Used for                                                           |
| ------ | -------------------- | ------------------------------------------------------------------ |
| 400    | `validation_error`   | Bad input (empty flag name, fewer than 2 flags to merge, bad body) |
| 401    | `unauthorized`       | No or invalid credentials                                          |
| 403    | `forbidden`          | Role not allowed                                                   |
| 404    | `not_found`          | Unknown flag, run or review item (also another session's run)      |
| 409    | `duplicate_name`     | A flag with that name already exists (compare ignoring case)       |
| 409    | `no_enabled_flags`   | Run started but every flag is disabled                             |
| 409    | `run_not_reviewable` | Decision sent when the run is not in `needs_review`                |
| 409    | `result_not_ready`   | `GET /runs/{id}/result` before the run is completed                |
| 413    | any                  | Upload too large                                                   |

## Endpoints

Paths are relative to `/api/v1`. IDs are opaque strings. Timestamps are ISO-8601 UTC. `confidence` is a number from 0 to 1.

### Flags

A **flag** is a kind of bias the agent checks for, managed by admins.

```json
{
  "id": "flg_1a2b3c4d",
  "name": "subtle-harsh",
  "description": "Criticism that is dismissive in tone rather than constructive.",
  "enabled": true,
  "created_at": "2026-11-12T09:00:00Z",
  "updated_at": "2026-11-12T09:00:00Z"
}
```

| Call                 | Who   | Body                                                              | Returns                                                                                                                  |
| -------------------- | ----- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /flags`         | any   |                                                                   | Array of flags. **Active only**: merged or deleted flags are not listed.                                                 |
| `POST /flags`        | admin | `{ name, description, enabled }`                                  | The new flag. 409 `duplicate_name`.                                                                                      |
| `PATCH /flags/{id}`  | admin | any of `{ name, description, enabled }`                           | The updated flag. 404 / 409.                                                                                             |
| `DELETE /flags/{id}` | admin |                                                                   | `204`. 404 if unknown.                                                                                                   |
| `POST /flags/merge`  | admin | `{ source_ids: [..>=2], target: { name, description, enabled } }` | The **new** merged flag. Sources are retired and disappear from `GET /flags`. The target name may reuse a source's name. |

Names are trimmed. Past runs keep the old flag names in their output.

**Important for the output cards:** the agent's output has only the flag **name** (`"flag": "subtle_harsh"`). The UI shows the flag **description** by looking the name up in `GET /flags`, ignoring case and treating `_`, `-` and spaces as the same. So the name the agent writes must match a name in this table. A name that is not found shows "Not available" on the card. (If you would rather send the description with each finding, tell the UI side and we will read it from there instead.)

### Runs

A **run** is one analysis of one uploaded batch of feedback.

**`POST /runs`** (any signed-in user, not admin)

```json
{ "filename": "feedback.json", "payload": { "...": "the parsed JSON the person uploaded" } }
```

Returns `{ "run_id": "...", "session_id": "..." }`. Respond quickly and run the agent in the background; the UI then polls. Validate `payload` here and answer 400 with a useful message if it is not usable.

- `payload` is whatever JSON the person uploaded. If they paste or upload **plain text**, the UI turns it into `{ "dataset": "<name>", "records": [ { "id": "...", "comment": "..." } ] }` with one record per paragraph. A sample is in `public/sample-input.json`.
- If the payload has its own `batch_id`, using it as the run's batch id is a good default.

**`GET /runs/{run_id}`**: the UI polls this about every 0.7 s while `status` is `queued` or `running` (and every 2.8 s after an error). It stops when the status is anything else. Returns:

```json
{
  "run_id": "...",
  "session_id": "...",
  "filename": "feedback.json",
  "batch_id": "B-1042",
  "status": "queued | running | needs_review | completed | failed",
  "created_at": "...",
  "updated_at": "...",
  "progress": {
    "checked": 2,
    "total": 4,
    "current_flag_id": "flg_1",
    "flags": [
      {
        "flag_id": "flg_1",
        "flag_name": "clique",
        "state": "pending | checking | checked",
        "raised": false
      }
    ]
  },
  "review_items": [],
  "result": null,
  "error": null
}
```

- `progress` only drives the "checking flag 2 of 4" animation. If the agent cannot report per-flag progress, send `{ "checked": 0, "total": 0, "current_flag_id": null, "flags": [] }`; the UI then shows a plain "Agent is checking your input".
- `batch_id` is `string | null`. It is shown as the title of the run in History and above the output. Send it as soon as you know it.
- `error` is a message when `status` is `failed`, else `null`.

How `status` moves: `queued` -> `running` -> (`needs_review` ->) `completed`, or `failed` at any point.

**Review.** When the agent finishes and some findings are below your confidence threshold, set `status: "needs_review"` and list them in `review_items`. **You decide which need review; the UI never does.** Each item:

```json
{
  "item_id": "run1:flg_2",
  "flag": "subtle_harsh",
  "confidence": 0.62,
  "subject": "R-05 <-> T-07",
  "evidence_ids": ["FB-024", "FB-025"],
  "explanation": "Four feedback records from reviewer R-05 ...",
  "decision": null
}
```

`decision` is `null` until a person decides, then `"accept"` or `"reject"`. Keep already decided items in the list.

**`POST /runs/{run_id}/review-items/{item_id}/decision`** with `{ "decision": "accept" }` or `{ "decision": "reject" }`. Returns the **updated Run** (same shape as `GET /runs/{id}`). When no item is left undecided, return `status: "completed"` with `result` filled in. Errors: 404 unknown item, 409 `run_not_reviewable`, 400 for any other decision value. There is no "escalate".

**`GET /runs/{run_id}/result`**: the same `result` object as in the run, 409 `result_not_ready` until completed.

**`GET /runs`**: this session's runs, newest first. One row per run:

```json
{
  "run_id": "...",
  "batch_id": "B-1042",
  "status": "completed",
  "created_at": "...",
  "flags_checked": 4,
  "findings_total": 2,
  "review_total": 1,
  "review_pending": 0,
  "top_flags": ["clique", "subtle_harsh"]
}
```

`top_flags` is up to 3 flag names that were raised. Counts are only meaningful once the run has finished (the UI shows "..." while running).

### The result (final output)

This is the agent's own JSON, so keep its field names. `result` on a completed run:

```json
{
  "batch_id": "B-1042",
  "detected_flags": [
    {
      "flag": "clique",
      "confidence": 0.9,
      "status": "AUTO_ACCEPTED",
      "subject": "R-02 <-> T-03",
      "evidence_ids": ["FB-019", "FB-020", "FB-023"],
      "explanation": "Three feedback records from reviewer R-02 about trainee T-03 ..."
    }
  ]
}
```

| Field          | What the UI does with it                                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `batch_id`     | Optional here if it is on the run. Run title in History and the output header.                                                                                                                 |
| `flag`         | Card title ("subtle_harsh" is shown as "Subtle harsh") and the key to look up the description.                                                                                                 |
| `confidence`   | Confidence bar.                                                                                                                                                                                |
| `status`       | **Upper case**: `PENDING_REVIEW`, `AUTO_ACCEPTED`, `ACCEPTED` or `REJECTED`. After review, accepted items are `ACCEPTED` and rejected ones `REJECTED`. Any other value is shown as plain text. |
| `subject`      | `"<reviewer> <-> <trainee>"`. The part before `<->` is shown as **Source**, the part after as **Trainee**. Keep this exact format.                                                             |
| `evidence_ids` | Not shown on the card; visible in the raw JSON. Keep sending it.                                                                                                                               |
| `explanation`  | Shown in full under **Explanation**. It must be the agent's reasoning for this finding (250-300 words is fine), not the flag's description. Line breaks are kept.                              |

The card also shows the flag **description** (from `GET /flags`, see above). Anything extra in the JSON, such as `goal_scoring`, is ignored by the cards but still appears in the Raw JSON box if it is inside `result`.

## What the person sees (so you can test against it)

1. **Run page** (non-admin): upload or paste input, press "Run agent", watch progress, then decide each review item (Accept or Reject), then read the output cards and the raw JSON.
2. **History tab**: one card per run titled "Batch <batch_id>", with status and counts. Clicking a card opens the same run view.
3. **Admin page**: list, add, edit, enable or disable, delete and merge flags.

## Try it yourself

Run the UI against your backend on your machine:

1. Start your backend on port **8001** (8000 belongs to Agent 3's backend).
2. In this repo: `npm install`, then in PowerShell `$env:VITE_AGENT2_USE_MOCKS='false'; npm run dev` (bash: `VITE_AGENT2_USE_MOCKS=false npm run dev`).
3. Open <http://localhost:5173>, sign in as **Trainee** (run page) or **Admin** (flag page), open "Bias Flagging Agent".

The dev server forwards `/agent2-api/...` to `http://localhost:8001/...` (change with `VITE_AGENT2_API_URL`). Open the browser's Network tab to see each call and your response.

Quick checks with curl (add the dev headers until you support real tokens):

```bash
H='-H X-Dev-User:tester -H X-Dev-Role:admin -H X-Session-Id:11111111-1111-4111-8111-111111111111'
curl -i $H http://localhost:8001/api/v1/flags
curl -i $H -X POST http://localhost:8001/api/v1/flags -H 'Content-Type: application/json' \
  -d '{"name":"test-flag","description":"For testing","enabled":true}'
```

Through the live dashboard the same call is `http://10.100.242.180:8086/agent2-api/api/v1/flags` (nginx removes only `/agent2-api`).

## Checklist: "the UI will work when..."

- [ ] A request with the dashboard's headers is accepted (see Authentication), and roles are enforced (403 for non-admins on flag changes).
- [ ] `GET /flags` returns active flags, and the agent's `flag` names match those names (ignoring case, `_` versus `-`).
- [ ] `POST /runs` returns `{ run_id, session_id }` fast and the run progresses `queued` -> `running` -> `needs_review` or `completed`.
- [ ] `GET /runs/{id}` returns the Run shape above, with `batch_id`, and `review_items` using `flag`, `subject`, `evidence_ids`, `explanation`.
- [ ] The decision endpoint takes only `accept` or `reject` and returns the updated Run; the run becomes `completed` with `result` once nothing is pending.
- [ ] `result.detected_flags` uses upper-case `status` and `subject` as `"R-02 <-> T-03"`.
- [ ] `GET /runs` is limited to the caller's session and sorted newest first.
- [ ] Every error uses `{ "error": { code, message } }`.
- [ ] `ui_api.openapi.yaml` and the sample JSON in `Smart_Ops_Pod2` are updated to match this page.

## Questions only you can answer (please reply to the UI side)

1. Can `batch_id` be returned on the run, on each row of `GET /runs`, and in `result`? It is not in the agreed sample output.
2. Can the agent report per-flag progress, or should the UI use the plain "checking" message?
3. Is `subject` always `"<reviewer> <-> <trainee>"`? What if one finding covers several trainees?
4. Should `result` also carry `goal_scoring`? The UI ignores it today.
5. Which dev-auth option do you prefer for the demo (see Authentication)?

## Not verified

This page was written from the UI code, not from running it against your backend. I have not read your current backend code in this session, so the notes about its login and roles come from an earlier reading and may be out of date. The UI's live mode (`VITE_AGENT2_USE_MOCKS=false`) has not yet been run against a real backend.
