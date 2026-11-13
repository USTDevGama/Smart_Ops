/** Response shapes for the Pod 1 (Viva Agent) API. Kept close to the FastAPI response bodies. */

export type CurriculumStatus = 'ingesting' | 'ready' | 'failed';

export interface Curriculum {
  curriculum_id: number;
  name: string;
  status: CurriculumStatus;
  status_detail?: string | null;
}

export interface Topic {
  topic_id: number;
  topic_name: string;
}

export interface Track {
  track_key: string;
  track_name: string;
  topics: Topic[];
}

export interface IntakeSession {
  session_id: string;
}

export interface Turn {
  turn_no: number;
  role: 'agent' | 'candidate';
  kind?: string;
  text: string;
}

export interface SessionState {
  next_turn_no: number;
  remaining_min: number;
  agent_turns: Turn[];
  closed: boolean;
}

export type SessionStatus =
  'active' | 'pending_review' | 'finalizing' | 'accepted' | 'rejected' | 'failed';

export interface SessionRow {
  session_id: string;
  candidate_id: string;
  curriculum_id: number;
  status: SessionStatus;
  started_at: string;
  overall_score?: number | null;
  assessment_confidence?: number | null;
}

export interface AdminSessionItem {
  session_id: string;
  candidate_id: string;
  curriculum_id: number;
  status: SessionStatus;
  started_at: string;
  ended_at?: string | null;
  overall_score?: number | null;
}

export interface AdminCurriculumItem {
  curriculum_id: number;
  name: string;
  version?: string | null;
  status: CurriculumStatus;
  ingested_at: string;
  sessions: AdminSessionItem[];
}

export interface Evidence {
  quote: string;
  turn: number;
}

export interface KeyIdea {
  id: string;
  text: string;
}

export interface TopicResult {
  question_id: string;
  topic: string;
  level: number;
  score: number;
  kind?: 'standard' | 'integration';
  follow_ups_asked: number;
  solid: string[];
  shaky: string[];
  evidence: Evidence[];
  expected_output: { reference_answer: string; key_ideas: KeyIdea[] };
  key_ideas_covered: string[];
}

export interface GoalScore {
  goal_id: string;
  goal: string;
  score: number | null;
  reasoning?: string;
  relevant_topics: string[];
}

export interface ReportTranscriptTurn {
  turn: number;
  role: 'agent' | 'candidate';
  kind?: string;
  text: string;
  reason?: string;
}

export interface Report {
  session_id: string;
  overall: {
    score: number;
    assessment_confidence: number;
    summary: string;
    confidence_reasons: string[];
  };
  tracks: { track_key: string; name: string; score: number | null; level_reached: number | null }[];
  coverage: { tracks_covered: string[]; tracks_total: number; unscored_questions?: unknown[] };
  integration: { attempted: boolean; score?: number; note?: string };
  topic_results: TopicResult[];
  turns: ReportTranscriptTurn[];
}

export interface Review {
  reviewer_id: string;
  decision: 'accepted' | 'rejected';
  reason?: string | null;
  decided_at: string;
}

export interface SessionReport {
  status: SessionStatus;
  report: Report;
  review: Review | null;
  goal_scores?: GoalScore[];
}

export interface ReviewBody {
  reviewer_id: string;
  decision: 'accepted' | 'rejected';
  reason: string | null;
}
