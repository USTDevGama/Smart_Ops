/**
 * API CONTRACT v0 (proposed by frontend; backend owns the final version).
 *
 * This file is the single source of truth for every request/response shape the UI uses.
 * Mirror: contracts/ui_api.openapi.yaml, docs/api-contract.md, docs/frontend-integration.md.
 * If you change a shape on the backend, change it here AND in those docs, then run `npm run typecheck`.
 *
 * Conventions:
 *  - Timestamps are ISO-8601 UTC strings (e.g. "2026-11-06T09:30:00Z").
 *  - IDs are opaque strings (UUIDs recommended).
 *  - confidence is a float in [0, 1].
 */

// ───────────────────────── Flags (admin-managed, DB-backed) ─────────────────────────

export interface Flag {
  id: string;
  name: string;
  description: string;
  /** Disabled flags are kept in the DB but the agent does not check them. */
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** Fields an admin supplies when creating/editing a flag. */
export type FlagInput = Pick<Flag, 'name' | 'description' | 'enabled'>;

/**
 * Merge N flags into ONE new flag. The source flags are retired (soft-deleted, merged_into_id = new id)
 * and disappear from GET /flags. Past runs keep referencing the old flag names (stored on the finding).
 */
export interface MergeFlagsRequest {
  source_ids: string[]; // >= 2
  target: FlagInput;
}

// ───────────────────────── Roles ─────────────────────────

/**
 * Which page the host portal's signed-in user gets: `admin` the flag-management page, `user` the run page.
 * The host (Zitadel) owns sign-in and decides the role; the backend enforces it again (403 on admin endpoints).
 * This UI has no login request or response.
 */
export type Role = 'user' | 'admin';

// ───────────────────────── Runs ─────────────────────────

/**
 * queued -> running -> (needs_review ->) completed | failed
 *  - needs_review: the agent finished, but >= 1 finding has low confidence and awaits a human decision.
 *  - completed: no review needed, or every review item has a decision. `result` is populated.
 */
export type RunStatus = 'queued' | 'running' | 'needs_review' | 'completed' | 'failed';

export type Decision = 'accept' | 'reject';

export type FlagCheckState = 'pending' | 'checking' | 'checked';

/** Per-flag progress; drives the "flags being checked" animation on the user page. */
export interface FlagProgress {
  flag_id: string;
  flag_name: string;
  state: FlagCheckState;
  /** Only meaningful when state === 'checked': did the agent raise a finding for this flag? */
  raised: boolean;
}

export interface RunProgress {
  checked: number;
  total: number;
  current_flag_id: string | null;
  flags: FlagProgress[];
}

export interface StartRunRequest {
  /** Original file name, for display + history. */
  filename: string;
  /** The parsed uploaded JSON. Opaque to the UI. Validated server-side against contracts/run_request.schema.json. */
  payload: unknown;
}
export interface StartRunResponse {
  run_id: string;
  session_id: string;
}

/**
 * A finding the agent is NOT confident about. The BACKEND decides which findings need review
 * (confidence threshold lives in backend config). The UI only renders what is listed here.
 * Field names follow the agent's output (`detected_flags`), plus `item_id` and `decision` for the review step.
 */
export interface ReviewItem {
  item_id: string;
  /** Flag name from the agent output, e.g. "subtle_harsh". */
  flag: string;
  confidence: number;
  /** "<reviewer> <-> <trainee>", e.g. "R-02 <-> T-03". The left side is the source, the right side the trainee. */
  subject: string;
  /** Ids of the input records the finding is based on, e.g. "FB-019". */
  evidence_ids: string[];
  /** The agent's own reasoning (long text, 250-300 words in the real output). Never the flag's description. */
  explanation: string;
  /** null = not yet reviewed. */
  decision: Decision | null;
}

/**
 * PENDING_REVIEW: raised but not yet decided by a person (the status the agent writes first).
 * The rest are final: the agent was confident enough (AUTO_ACCEPTED) or a person decided.
 */
export type FindingStatus = 'PENDING_REVIEW' | 'AUTO_ACCEPTED' | 'ACCEPTED' | 'REJECTED';

/** One entry of `detected_flags` in the agent's final output. */
export interface Finding {
  flag: string;
  confidence: number;
  status: FindingStatus;
  /** "<reviewer> <-> <trainee>", e.g. "R-02 <-> T-03". */
  subject: string;
  evidence_ids: string[];
  explanation: string;
}

/**
 * Final output JSON shown to the user (one card per detected flag, then the raw JSON with a copy button).
 * The agent also returns `goal_scoring`; the UI does not show it and ignores it.
 */
export interface RunResult {
  /** Identifies the batch of feedback that was checked. Shown in History and above the output. */
  batch_id?: string;
  detected_flags: Finding[];
}

export interface Run {
  run_id: string;
  session_id: string;
  filename: string;
  /** From the output. null until the backend knows it. */
  batch_id: string | null;
  status: RunStatus;
  created_at: string;
  updated_at: string;
  progress: RunProgress;
  /** Populated once the agent finished; empty array when nothing needs review. */
  review_items: ReviewItem[];
  /** Populated only when status === 'completed'. */
  result: RunResult | null;
  /** Populated only when status === 'failed'. */
  error: string | null;
}

/** Compact row for the History tab. */
export interface RunSummary {
  run_id: string;
  /** Shown as the title of the history card. null until the backend knows it. */
  batch_id: string | null;
  status: RunStatus;
  created_at: string;
  flags_checked: number;
  findings_total: number;
  review_total: number;
  review_pending: number;
  /** Up to 3 flag names with findings, for the card preview. */
  top_flags: string[];
}

export interface DecisionRequest {
  decision: Decision;
}

// ───────────────────────── Errors ─────────────────────────

/** Every non-2xx response body. */
export interface ApiErrorBody {
  error: {
    code: string; // e.g. "unauthorized", "validation_error", "not_found"
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
