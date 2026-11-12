import type {
  Decision,
  Finding,
  Flag,
  ReviewItem,
  Run,
  RunResult,
  FlagProgress,
  TraineeGoalScore,
} from '../types';

/**
 * MOCK ONLY. Stand-in for the real agent + backend worker. None of this logic belongs in the frontend
 * once the backend is connected: the REAL backend decides what is raised, the confidence, and which
 * findings need human review (confidence threshold lives in backend config).
 */

export const MOCK_REVIEW_THRESHOLD = 0.7; // findings below this need human review
export const PER_FLAG_MS = 700; // simulated time the agent spends on each flag
export const QUEUED_MS = 400; // simulated time spent in "queued"

// ───────────── seeded randomness so a run is stable across polls/reloads ─────────────
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────── pull realistic evidence strings out of whatever JSON the user uploaded ─────────────
interface TextHit {
  path: string;
  text: string;
}
export function collectStrings(value: unknown, path = '$', out: TextHit[] = []): TextHit[] {
  if (typeof value === 'string') {
    if (value.trim().length >= 12) out.push({ path, text: value.trim() });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collectStrings(v, /^[A-Za-z_]\w*$/.test(k) ? `${path}.${k}` : `${path}["${k}"]`, out);
    }
  }
  return out;
}

/** The id of the input record a JSON path points into: `$.records[3].comment` -> records[3].id, else `$.records[3]`. */
export function recordIdFor(payload: unknown, path: string): string {
  const prefix = path.match(/^.*?\[\d+\]/)?.[0] ?? path;
  let node: unknown = payload;
  for (const m of prefix.matchAll(/\.(\w+)|\["([^"]+)"\]|\[(\d+)\]/g)) {
    const key = m[1] ?? m[2] ?? Number(m[3]);
    node = (node as Record<string | number, unknown> | null | undefined)?.[key];
  }
  const id = (node as { id?: unknown } | null | undefined)?.id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : prefix;
}

export interface PlannedFinding {
  flag_id: string;
  flag_name: string;
  raised: boolean;
  confidence: number;
  evidence: string;
  location: string;
  /** Ids of up to 3 input records the finding is based on. The first one is the quoted evidence. */
  evidence_ids: string[];
  trainee_id: string;
  explanation: string;
}

const MOCK_TRAINEES = ['T-03', 'T-07'];

/** Decide up-front (deterministically) what the "agent" will find for each flag. */
export function planRun(
  runId: string,
  payload: unknown,
  flags: Pick<Flag, 'id' | 'name' | 'description'>[],
): PlannedFinding[] {
  const pool = collectStrings(payload);
  // Prefer text inside a list (records, comments) over top-level labels such as a dataset name.
  const inList = pool.filter((p) => p.path.includes('['));
  const evidencePool = inList.length ? inList : pool;
  const plan: PlannedFinding[] = flags.map((f) => {
    const rng = mulberry32(hash(`${runId}:${f.id}`));
    const raised = pool.length > 0 && rng() < 0.55;
    const hit = pool.length
      ? evidencePool[Math.floor(rng() * evidencePool.length)]
      : { path: '$', text: '' };
    const confidence = Math.round((0.35 + rng() * 0.63) * 100) / 100;
    const snippet = hit.text.length > 160 ? `${hit.text.slice(0, 157)}…` : hit.text;
    const extra = Array.from({ length: Math.floor(rng() * 3) }, () =>
      pool.length ? evidencePool[Math.floor(rng() * evidencePool.length)] : hit,
    );
    const evidence_ids = [...new Set([hit, ...extra].map((h) => recordIdFor(payload, h.path)))];
    return {
      flag_id: f.id,
      flag_name: f.name,
      raised,
      confidence,
      evidence: snippet,
      location: hit.path,
      evidence_ids,
      trainee_id: MOCK_TRAINEES[Math.floor(rng() * MOCK_TRAINEES.length)],
      explanation: `The wording here may indicate "${f.name}". ${f.description}`,
    };
  });

  // Demo guarantees so every mock run shows the review step: >= 2 findings when there are enough flags,
  // and at least one low-confidence finding whenever anything was raised.
  const raisedIdx = () => plan.map((p, i) => (p.raised ? i : -1)).filter((i) => i >= 0);
  if (plan.length >= 4 && raisedIdx().length < 2 && pool.length > 0) {
    for (const p of plan) {
      if (raisedIdx().length >= 2) break;
      p.raised = true;
    }
  }
  const r = raisedIdx();
  if (r.length && !r.some((i) => plan[i].confidence < MOCK_REVIEW_THRESHOLD)) {
    plan[r[0]].confidence = 0.52;
  }
  return plan;
}

export interface RunRecord {
  run_id: string;
  session_id: string;
  filename: string;
  created_at: string;
  started_ms: number;
  plan: PlannedFinding[];
  decisions: Record<string, Decision>; // item_id -> decision
  last_decision_ms?: number; // when the latest human decision was recorded
}

/** Moment the run's output became final: agent finished, or the last human decision, whichever is later. */
const finishedMs = (rec: RunRecord) =>
  Math.max(rec.started_ms + QUEUED_MS + rec.plan.length * PER_FLAG_MS, rec.last_decision_ms ?? 0);

export const itemIdFor = (runId: string, flagId: string) => `${runId}:${flagId}`;

/** Turn a stored record + the current time into the Run the API would return. Pure function. */
export function materialize(rec: RunRecord, nowMs: number): Run {
  const elapsed = Math.max(0, nowMs - rec.started_ms);
  const total = rec.plan.length;
  const checked =
    elapsed < QUEUED_MS ? 0 : Math.min(total, Math.floor((elapsed - QUEUED_MS) / PER_FLAG_MS));
  const finished = checked >= total && elapsed >= QUEUED_MS;

  const flags: FlagProgress[] = rec.plan.map((p, i) => ({
    flag_id: p.flag_id,
    flag_name: p.flag_name,
    state: i < checked ? 'checked' : i === checked && elapsed >= QUEUED_MS ? 'checking' : 'pending',
    raised: i < checked ? p.raised : false,
  }));

  const base = {
    run_id: rec.run_id,
    session_id: rec.session_id,
    filename: rec.filename,
    created_at: rec.created_at,
    updated_at: new Date(Math.min(nowMs, finishedMs(rec))).toISOString(),
    error: null,
  };
  const progress = {
    checked,
    total,
    current_flag_id: finished ? null : (rec.plan[checked]?.flag_id ?? null),
    flags,
  };

  if (!finished) {
    return {
      ...base,
      status: elapsed < QUEUED_MS ? 'queued' : 'running',
      progress,
      review_items: [],
      result: null,
    };
  }

  const raised = rec.plan.filter((p) => p.raised);
  const reviewItems: ReviewItem[] = raised
    .filter((p) => p.confidence < MOCK_REVIEW_THRESHOLD)
    .map((p) => ({
      item_id: itemIdFor(rec.run_id, p.flag_id),
      flag_id: p.flag_id,
      flag_name: p.flag_name,
      confidence: p.confidence,
      evidence: p.evidence,
      location: p.location,
      explanation: p.explanation,
      decision: rec.decisions[itemIdFor(rec.run_id, p.flag_id)] ?? null,
    }));
  const pending = reviewItems.some((i) => i.decision === null);

  if (pending) {
    return { ...base, status: 'needs_review', progress, review_items: reviewItems, result: null };
  }
  return {
    ...base,
    status: 'completed',
    progress,
    review_items: reviewItems,
    result: buildResult(rec, reviewItems),
  };
}

function buildResult(rec: RunRecord, reviewItems: ReviewItem[]): RunResult {
  const byFlag = new Map(reviewItems.map((i) => [i.flag_id, i]));
  const findings: Finding[] = rec.plan
    .filter((p) => p.raised)
    .map((p, idx) => {
      const review = byFlag.get(p.flag_id);
      const status: Finding['status'] = !review
        ? 'auto_accepted'
        : review.decision === 'accept'
          ? 'accepted'
          : review.decision === 'reject'
            ? 'rejected'
            : 'escalated';
      return {
        finding_id: `${rec.run_id}:f${idx + 1}`,
        flag_id: p.flag_id,
        flag_name: p.flag_name,
        confidence: p.confidence,
        evidence: p.evidence,
        location: p.location,
        evidence_ids: p.evidence_ids,
        trainee_id: p.trainee_id,
        explanation: p.explanation,
        status,
        reviewed_by_human: !!review,
      };
    });
  const count = (s: Finding['status']) => findings.filter((f) => f.status === s).length;
  return {
    run_id: rec.run_id,
    generated_at: new Date(finishedMs(rec)).toISOString(), // stable across repeated GETs
    input_filename: rec.filename,
    summary: {
      flags_checked: rec.plan.length,
      findings_total: findings.length,
      auto_accepted: count('auto_accepted'),
      human_reviewed: findings.filter((f) => f.reviewed_by_human).length,
      accepted: count('accepted'),
      rejected: count('rejected'),
      escalated: count('escalated'),
    },
    findings,
    goal_scoring: mockGoalScoring(rec.run_id),
  };
}

/** Stable fake goal scores for two trainees. G12 is always "not enough evidence", as in the agreed sample output. */
function mockGoalScoring(runId: string): TraineeGoalScore[] {
  return MOCK_TRAINEES.map((trainee_id) => {
    const rng = mulberry32(hash(`${runId}:${trainee_id}`));
    const score = () => 2 + Math.floor(rng() * 3);
    return {
      trainee_id,
      B_themes: {
        G05: score(),
        G06: score(),
        G07: score(),
        G11: score(),
        G12: 'INSUFFICIENT_EVIDENCE' as const,
      },
    };
  });
}
