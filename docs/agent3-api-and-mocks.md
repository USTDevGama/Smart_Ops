# Agent 3: API contract and mocks

Agent 3 ports the `Smart_Ops_Pod3` Streamlit UI. The Streamlit client (`ui/client.py`, `ui/chat.py`, `ui/widgets.py`) is the reference for behaviour.

## Running

| Mode               | How                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Real API (default) | `VITE_USE_MOCKS=false`, `VITE_AGENT3_API_URL=http://localhost:8000`, then start the backend (see below) |
| Mocks (no backend) | `VITE_USE_MOCKS=true` in `.env.local`. State is in memory and resets on reload                          |

### Starting the Pod3 backend locally

You need [uv](https://docs.astral.sh/uv/) and a copy of the `Smart_Ops_Pod3` repo. The API defaults to Postgres, so for a local run with nothing else installed point it at a SQLite file. Use a **separate** file so you do not touch Pod3's own `local.db`; `.devdata/` in this repo is git-ignored and is a good place.

PowerShell (replace the two paths):

```powershell
$data = 'C:/path/to/Main_UI/.devdata'          # any folder; forward slashes
New-Item -ItemType Directory -Force $data | Out-Null
$env:PODC_ENV = 'local'                         # dev login is refused outside local/dev
$env:PODC_DATABASE_URL = "sqlite:///$data/pod3.db"
$env:PODC_BLOB_DIR = "$data/storage"
$env:PODC_INGEST_INLINE = 'true'                # read uploads straight away, no worker/Redis
$env:PODC_LLM_PROVIDER = 'fake'                 # scripted replies, no API key
$env:PODC_DEV_AUTH_ENABLED = 'true'

cd C:\path\to\Smart_Ops_Pod3
uv run alembic upgrade head                     # create the tables
uv run python -m app.demo_data                  # one character, one situation, one demand document
uv run uvicorn app.main:app --port 8000         # http://localhost:8000/docs
```

Git Bash or macOS/Linux: the same with `export PODC_DATABASE_URL="sqlite:///$data/pod3.db"` and so on.

Check it is up: `http://localhost:8000/api/v1/meta` should return JSON. `/readyz` hangs when the database is unreachable, which is the usual sign that `PODC_DATABASE_URL` was not set.

For a clean slate, stop the API and delete `pod3.db`, then run the three `uv run` steps again.

With the fake model the chat works (scripted client replies and scores) but **reports cannot be generated**. The Report panel then says so: trainees get a plain message, admins are told to set `PODC_LLM_PROVIDER`. To test reports, run Pod3 with a real provider (see its README).

The dev login sends `X-Dev-User` and `X-Dev-Role`, which Pod3 accepts only with `PODC_ENV=local` or `dev`.

### Browser tests

`npm run test:e2e` runs two Playwright projects, each on its own dev server (ports 5180 and 5181, so they never depend on your `.env.local`): `mock` (no backend needed) and `real` (the real API on :8000; it **skips itself** if the backend is not running). The real project runs the whole flow: resume upload and re-upload, chat, end, admin setup data, review, creating, versioning and publishing a character card, loading situations, and uploading and deleting demand documents. It leaves test data in the backend's database; start from a fresh `pod3.db` when you want a clean slate. Run one project with `npx playwright test --project=mock` or `--project=real`.

The backend has no CORS, so the Vite dev server proxies `/agent3-api/*` to `VITE_AGENT3_API_URL` (`vite.config.ts`). For deployment, serve both behind the same origin or add CORS to the backend.

Mock logins: sign in as a trainee to upload a resume (ready after about 2 seconds), then chat. The mock has one published character (`verma-strict`), one situation and one demand document. Replies get calmer when your answer is 60 characters or longer.

## Code map

```
agent3/
  index.tsx            role-based routes
  api/api.ts           Agent3Api interface + ApiError
  api/httpApi.ts       real client (fetch, SSE parsing, error flattening)
  api/mockApi.ts       in-memory client
  api/types.ts         response shapes
  hooks/chatController.ts   chat rules (no React, unit-tested)
  hooks/useAsync.ts    useAsync + usePolling
  components/          StatusBadge, DocumentRow, FileUploader, MarkdownPreview, Transcript, MoodMeter,
                       ReportPanel, PersonaEditor
  trainee/             ResumePage, ChatPage (start view), ChatRoom
  admin/               SetupPage (PersonaTab, SituationsTab, DemandTab), ReviewPage
```

## Pages by role

| Role    | Page                   | Route                   |
| ------- | ---------------------- | ----------------------- |
| Trainee | My resume              | `/agents/agent3/resume` |
| Trainee | Chat with the client   | `/agents/agent3/chat`   |
| Admin   | Set the stage (3 tabs) | `/agents/agent3/setup`  |
| Admin   | Review chats           | `/agents/agent3/review` |

Admins cannot send chat messages (the backend allows only the owner), so there is no admin chat page.

## Endpoints used (base `/api/v1`, plus `/readyz`)

| Method and path                                                                                                          | Role           | Used by       |
| ------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------- |
| `GET /readyz`, `GET /meta`                                                                                               | any            | health        |
| `GET /personas`                                                                                                          | both           | chat start    |
| `GET/POST /admin/config/persona`, `POST .../{key}/versions`, `GET/PUT .../versions/{n}`, `POST .../versions/{n}/publish` | admin          | PersonaTab    |
| `GET /admin/config/scenario`, `GET .../versions/{n}`, `POST /admin/scenarios/import`                                     | admin          | SituationsTab |
| `POST/GET /profiles`, `GET/DELETE /profiles/{id}`                                                                        | owner or admin | ResumePage    |
| `POST/GET /admin/demand`, `GET/DELETE /admin/demand/{id}`                                                                | admin          | DemandTab     |
| `POST/GET /sessions`, `GET /sessions/{id}`, `POST /sessions/{id}/end`                                                    | owner or admin | chat, review  |
| `POST /sessions/{id}/turns`                                                                                              | owner only     | chat          |
| `GET/POST /sessions/{id}/report`                                                                                         | owner or admin | ReportPanel   |
| `GET /admin/sessions/{id}/report/{pdf,html,md}`                                                                          | admin          | ReportPanel   |

Auth headers come from `useAuth().getAuthHeaders()`.

## Behaviours to keep

- **Errors** arrive as `{type, title, status, detail}`. `detail` is text, or a list of `{loc, msg}` for 422; the client flattens it to `loc: msg` lines. Status 0 means the API is unreachable.
- **Sending a message** is a POST that returns a `text/event-stream` with two events: `message` (the reply) and `done` (counters, `ended`, `end_reason`, `replayed`). `EventSource` cannot do POST with headers, so the client reads the whole body and parses it. A missing event means the reply was cut off.
- **Idempotency**: each message gets one `Idempotency-Key`. A retry re-uses it, so the server returns the saved reply (`replayed: true`) instead of saving twice. Network failure and 5xx keep the message so the user can send it again; 4xx drops it. After every attempt the session is re-fetched.
- **Uploads**: PDF, DOCX or TXT up to 10 MB. HTTP 200 means the same file was uploaded before and the earlier record is returned; 202 means a new record. Files go `queued`, `extracting`, then `ready` or `failed`; the page polls every 2 seconds while one is in progress.
- **Deleting** a resume or demand document that a chat uses returns 409; show the server's message.
- **Demand document "In use"** is the newest one with status `ready` (computed in the UI).
- **Persona versions**: only drafts can be edited. Publishing retires the previously published version. "New version" copies the latest.
- **Reports**: the trainee page asks the API to start the report once per visit; the admin review list never starts one automatically. Polling is every 3 seconds while `generating`. Only admins can download.
- **Evaluations** (`Score notes`) are only returned to admins.
- **End reasons**: `turn_cap`, `trainee_ended`, `time_limit`, `concerns_resolved`, `admin_ended` (see `endReasonText`). `time_limit` and `concerns_resolved` are not emitted by the backend today.

## Known gaps

- No endpoint returns the assessment as JSON, only the downloadable report files.
- Lists use the backend default page size (50); the UI does not page yet.
- The backend `integrator` role and the planned `501` endpoints are not used.
