// Shapes returned by the trainee endpoints of the Pod 4 API (Smart_Ops_Pod4: app/api/trainees.py
// and app/reports/trainee_report.py). Field names match the server exactly.

export type RunStatus = 'running' | 'pending_review' | 'failed' | 'approved' | 'rejected';

// One row per trainee in the trainee database. Status and time are null until the first run.
export type TraineeRow = {
  trainee_id: string;
  status: RunStatus | null;
  last_run_at: string | null;
};

// scored: has a number. not_covered: the database says "not covered". not_available: no entry.
export type GoalStatus = 'scored' | 'not_covered' | 'not_available';

// One goal's score. Goals come back in code order G01 to G12. score is null unless status is
// 'scored': never show a number for the other two.
export type ScoreRow = {
  goal: string;
  label: string;
  score: number | null;
  status: GoalStatus;
  // Where each score came from, e.g. "B_themes.G06=3" (A_scores, B_themes, C_scores).
  sources: string[];
};

// A section (A, B or C) that has no data yet. The summary is returned without it.
export type PendingSection = { code: string; label: string };

export type Exercise = { id: string; title: string; minutes: number };

// One outcome linked to a gap. match is the strength of this link: strong, partial, weak or none.
export type Outcome = { id: string; wording: string; match: string };

export type GapSummary = {
  goal: string;
  label: string;
  score: number;
  evidence: string[];
  outcome_match: string;
  exercises: Exercise[];
  outcomes: Outcome[];
  // Agent-written, plain text: why the exercise fits this gap. Never render it as HTML.
  why: string;
};

export type Summary = {
  run_id: string;
  status: RunStatus;
  trainee_id: string;
  // Agent-written, plain text, 2 to 3 sentences. Never render it as HTML.
  overview: string;
  assessed_count: number;
  goal_count: number;
  gap_threshold: number;
  scores: ScoreRow[];
  gaps: GapSummary[];
  strong: { goal: string; label: string; score: number | null }[];
  not_assessed: { goal: string; label: string; status: GoalStatus }[];
  // Sections still waiting for data. Empty when the summary is complete.
  pending_sections: PendingSection[];
  review_required: boolean;
  versions: { rules: string; mapping: string; content_library: string };
};

export type ReviewBody = {
  decision: 'approve' | 'reject';
  reviewer_ref: string;
  comment: string | null;
};

// What the user asked to see for a trainee.
export type View = 'report' | 'gaps' | 'recommendations';
