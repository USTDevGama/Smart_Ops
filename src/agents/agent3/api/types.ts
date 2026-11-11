/** Data shapes of the Smart_Ops_Pod3 FastAPI (see docs/agent3-api-and-mocks.md). */

export type ConfigKind = 'persona' | 'scenario';
export type VersionStatus = 'draft' | 'published' | 'retired';
export type IngestStatus = 'queued' | 'extracting' | 'ready' | 'failed';
export type SessionStatus = 'active' | 'ended';

export type EscalationStep = { step: number; move: string };

export type PersonaConfig = {
  name: string;
  role: string;
  style: string;
  main_concerns: string[];
  rules: string[];
  escalation_ladder: EscalationStep[];
  version?: string | null;
  dataset_ref?: string | null;
  t_escalate: number;
  t_deescalate: number;
  min_turns: number;
  max_turns: number;
  grace_turns: number;
};

export type ScenarioConfig = {
  id: string;
  title: string;
  situation: string;
  client_objections: string[];
  good_answer_contains: string[];
};

export type VersionOut<C = PersonaConfig | ScenarioConfig> = {
  id: string;
  kind: ConfigKind;
  key: string;
  version_no: number;
  status: VersionStatus;
  config: C;
  created_at: string;
};

export type ConfigKeySummary = {
  key: string;
  versions: { id: string; version_no: number; status: VersionStatus; created_at: string }[];
};

export type PersonaSummary = { key: string; version_no: number; title: string; summary: string };

export type ScenarioImportResult = { created: string[]; updated: string[]; unchanged: string[] };

export type ProfileOut = {
  id: string;
  filename: string;
  file_type: string;
  status: IngestStatus;
  error: string | null;
  created_at: string;
  owner_ref: string;
};
export type ProfileDetail = ProfileOut & { content: { text: string } | null };

export type DemandOut = {
  id: string;
  filename: string;
  file_type: string;
  status: IngestStatus;
  error: string | null;
  created_at: string;
  uploaded_by: string;
};
export type DemandDetail = DemandOut & { content: { text: string } | null };

export type Evaluation = {
  answer_quality: number;
  checklist_met: number[];
  evasive: boolean;
  composure: number;
  quote: string;
  proposed_level: number;
};

export type TurnOut = {
  id: string;
  idx: number;
  role: 'persona' | 'trainee';
  content: string;
  /** persona turns only */
  escalation_level: number | null;
  created_at: string;
  /** admins only; trainee turns */
  evaluation?: Evaluation | null;
};

export type SessionOut = {
  id: string;
  trainee_ref: string;
  profile_id: string;
  persona: { key: string; version_no: number };
  demand_id: string;
  status: SessionStatus;
  end_reason: string | null;
  started_at: string;
  ended_at: string | null;
  level: number;
  turns_used: number;
  max_turns: number;
};
export type SessionDetail = SessionOut & { turns: TurnOut[] };

export type TurnDone = {
  trainee_turn_id: string;
  persona_turn_id: string;
  level: number;
  turns_used: number;
  ended: boolean;
  end_reason: string | null;
  replayed: boolean;
};
export type TurnResult = { message: TurnOut; done: TurnDone };

export type ReportState = 'not_ended' | 'generating' | 'ready';
export type ReportStatus = {
  session_id: string;
  state: ReportState;
  model_configured: boolean;
  can_download: boolean;
  formats: string[];
  queued?: boolean;
};
export type ReportFormat = 'pdf' | 'html' | 'md';

export type Health = { ok: boolean; version?: string };
