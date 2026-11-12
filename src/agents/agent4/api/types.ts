// Shapes returned by the trainee endpoints of the Pod 4 API (Smart_Ops_Pod4: app/api/trainees.py
// and app/reports/trainee_report.py). Field names match the server exactly.

export type RunStatus = 'running' | 'pending_review' | 'failed' | 'approved' | 'rejected';

export type TraineeRow = {
  trainee_id: string;
  status: RunStatus;
  last_run_at: string;
};

export type ScoreRow = {
  goal: string;
  label: string;
  score: number | null;
  sources: string[];
};

export type Exercise = { id: string; title: string; minutes: number };

export type Outcome = { id: string; wording: string };

export type GapSummary = {
  goal: string;
  label: string;
  score: number;
  severity: string;
  evidence: string[];
  outcome_match: string;
  exercises: Exercise[];
  outcomes: Outcome[];
};

export type Summary = {
  run_id: string;
  status: RunStatus;
  trainee_id: string;
  assessed_count: number;
  goal_count: number;
  gap_threshold: number;
  scores: ScoreRow[];
  gaps: GapSummary[];
  strong: { goal: string; label: string; score: number | null }[];
  not_assessed: { goal: string; label: string }[];
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
