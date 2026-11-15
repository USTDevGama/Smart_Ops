import { ApiError, type Agent4Api } from './api';
import type { RunStatus, ScoreRow, Summary, TraineeRow } from './types';

/**
 * In-memory stand-in for the Pod 4 API (VITE_USE_MOCKS=true). It uses the same status codes as
 * the real server: 404 for a trainee with no scores. A trainee with only some sections gets a
 * partial summary with pending_sections (no 409).
 * The shape and the goal, exercise and outcome codes are the real ones; the trainee, the scores
 * and the agent's text are made up. State resets on page reload.
 */

const LATENCY_MS = 120;
const sleep = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const GAP_THRESHOLD = 2;

const LABELS: Record<string, string> = {
  G01: 'Explaining concepts',
  G02: 'Engineering process',
  G03: 'Secure code',
  G04: 'Handling data',
  G05: 'Testing own work',
  G06: 'Clear communication',
  G07: 'Giving and receiving feedback',
  G08: 'Handling client pressure',
  G09: 'Environments and release',
  G10: 'Responding to incidents',
  G11: 'Teamwork',
  G12: 'Independent learning',
};

// Made-up scores. null is not scored; the status says why.
const MOCK_SCORES: [string, number | null][] = [
  ['G01', 4],
  ['G02', 3],
  ['G03', 2],
  ['G04', 3],
  ['G05', 4],
  ['G06', 3.5],
  ['G07', 2],
  ['G08', 3],
  ['G09', 4],
  ['G10', 3],
  ['G11', 5],
  ['G12', null],
];

// Which section each goal's score comes from in the full result (T-06). G06 has two sources.
const SOURCE_OF: Record<string, string[]> = { G06: ['B_themes', 'C_scores'], G08: ['C_scores'] };

const PENDING_BC = [
  { code: 'B', label: 'Peer feedback' },
  { code: 'C', label: 'Roleplay' },
];

// T-06: every section has data. T-01: only the interview (A) has data, so B and C are pending;
// G05 is "not covered" in the database and G12 has no entry.
function scoreRows(partial: boolean): ScoreRow[] {
  return MOCK_SCORES.map(([goal, base]): ScoreRow => {
    if (partial && goal === 'G05') {
      return { goal, label: LABELS[goal], score: null, status: 'not_covered', sources: [] };
    }
    if (base === null) {
      return { goal, label: LABELS[goal], score: null, status: 'not_available', sources: [] };
    }
    const sections = partial ? ['A_scores'] : (SOURCE_OF[goal] ?? ['A_scores']);
    return {
      goal,
      label: LABELS[goal],
      score: base,
      status: 'scored',
      sources: sections.map((section) => `${section}.${goal}=${base}`),
    };
  });
}

function summaryFor(traineeId: string, runId: string, status: RunStatus, partial = false): Summary {
  const scores = scoreRows(partial);
  const gaps = scores
    .filter((row) => row.score !== null && row.score <= GAP_THRESHOLD)
    .map((row) => {
      const isSecureCode = row.goal === 'G03';
      return {
        goal: row.goal,
        label: row.label,
        score: row.score as number,
        evidence: row.sources,
        outcome_match: 'strong',
        exercises: isSecureCode
          ? [{ id: 'EX-03', title: 'Find the injection: secure code lab', minutes: 60 }]
          : [{ id: 'EX-07', title: 'Feedback in the SBI format', minutes: 30 }],
        outcomes: isSecureCode
          ? [
              {
                id: 'O4',
                wording: 'Security, compliance and intellectual-property protection.',
                match: 'strong',
              },
            ]
          : [
              {
                id: 'O7',
                wording: 'Receiving, processing and acting on feedback.',
                match: 'strong',
              },
            ],
        why: isSecureCode
          ? 'This lab has you hunt for an injection flaw, which gives hands-on practice where the score was low.'
          : 'This exercise practises acting on feedback, which targets the low score in this goal.',
      };
    });
  const strong = scores
    .filter((row) => row.score !== null && row.score >= 4)
    .map((row) => ({ goal: row.goal, label: row.label, score: row.score }));
  const notAssessed = scores
    .filter((row) => row.score === null)
    .map((row) => ({ goal: row.goal, label: row.label, status: row.status }));

  return {
    run_id: runId,
    status,
    trainee_id: traineeId,
    overview:
      'Most goals are met. Two goals need attention: secure code (G03) and giving and receiving feedback (G07), both scored 2 out of 5. Both gaps link to strong outcomes, so they are worth prioritising.',
    assessed_count: scores.filter((row) => row.score !== null).length,
    goal_count: scores.length,
    gap_threshold: GAP_THRESHOLD,
    scores,
    gaps,
    strong,
    not_assessed: notAssessed,
    pending_sections: partial ? PENDING_BC : [],
    review_required: true,
    versions: { rules: '0.1.0', mapping: '0.2.0', content_library: 'builtin:sha256:mock' },
  };
}

type StoredRun = { status: RunStatus; summary: Summary };

// Trainees with a result. T-06 has a full result; T-01 has a partial one (B and C pending).
const store = new Map<string, StoredRun>([
  ['T-06', { status: 'pending_review', summary: summaryFor('T-06', 'run-0006', 'pending_review') }],
  [
    'T-01',
    { status: 'pending_review', summary: summaryFor('T-01', 'run-0001', 'pending_review', true) },
  ],
]);
let runCounter = 100;

// Every trainee in the trainee database, as the real list returns them. T-12 has no run yet.
const TRAINEE_DB = ['T-01', 'T-06', 'T-12'];

function rowsOf(): TraineeRow[] {
  return TRAINEE_DB.map((trainee_id) => {
    const record = store.get(trainee_id);
    return {
      trainee_id,
      status: record?.status ?? null,
      last_run_at: record ? '2026-11-01T09:00:00Z' : null,
    };
  });
}

export function createMockApi(): Agent4Api {
  return {
    async listTrainees() {
      await sleep();
      return rowsOf();
    },

    async getSummary(traineeId) {
      await sleep();
      const record = store.get(traineeId);
      if (!record) {
        throw new ApiError(404, `No results for ${traineeId}.`);
      }
      return record.summary;
    },

    async assess(traineeId) {
      await sleep();
      if (!traineeId.startsWith('T-')) {
        throw new ApiError(404, `Trainee ${traineeId} was not found in the trainee database.`);
      }
      const runId = `run-${String(++runCounter).padStart(4, '0')}`;
      store.set(traineeId, {
        status: 'pending_review',
        summary: summaryFor(traineeId, runId, 'pending_review'),
      });
      return { run_id: runId, status: 'pending_review' };
    },

    async downloadReport(summary) {
      await sleep();
      // The real server renders the PDF; the mock builds one in the browser from the same summary.
      const { buildReportPdf } = await import('../reportPdf');
      return buildReportPdf(summary);
    },

    async submitReview(runId, body) {
      await sleep();
      const entry = [...store.entries()].find(([, r]) => r.summary.run_id === runId);
      if (!entry) {
        throw new ApiError(404, 'That run was not found.');
      }
      if (body.decision === 'reject' && !body.comment) {
        throw new ApiError(422, 'A rejection needs a comment.');
      }
      const status: RunStatus = body.decision === 'approve' ? 'approved' : 'rejected';
      const [traineeId, record] = entry;
      store.set(traineeId, { status, summary: { ...record.summary, status } });
      return { run_id: runId, status };
    },
  };
}
