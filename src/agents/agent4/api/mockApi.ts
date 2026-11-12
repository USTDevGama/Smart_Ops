import { ApiError, type Agent4Api } from './api';
import type { RunStatus, Summary, TraineeRow } from './types';

/**
 * In-memory stand-in for the Pod 4 API (VITE_USE_MOCKS=true). It uses the same status codes as
 * the real server: 404 for a trainee with no assessment, 409 for an assessment stored before the
 * summary existed. All names and IDs are made up. State resets on page reload.
 */

const LATENCY_MS = 120;
const sleep = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const GAP_THRESHOLD = 2;

function summaryFor(traineeId: string, runId: string, status: RunStatus): Summary {
  return {
    run_id: runId,
    status,
    trainee_id: traineeId,
    assessed_count: 3,
    goal_count: 4,
    gap_threshold: GAP_THRESHOLD,
    scores: [
      { goal: 'G1', label: 'Client listening', score: 4, sources: ['interview: Q2'] },
      { goal: 'G2', label: 'Estimation', score: 2, sources: ['feedback: F-11', 'interview: Q5'] },
      { goal: 'G3', label: 'Escalation handling', score: 3, sources: ['roleplay: R-03'] },
      { goal: 'G4', label: 'Written updates', score: null, sources: [] },
    ],
    gaps: [
      {
        goal: 'G2',
        label: 'Estimation',
        score: 2,
        severity: 'moderate',
        evidence: ['feedback: F-11', 'interview: Q5'],
        outcome_match: 'partial',
        exercises: [{ id: 'EX-07', title: 'Estimate a small change list', minutes: 30 }],
        outcomes: [{ id: 'OUT-3', wording: 'Gives a range with stated assumptions' }],
      },
    ],
    strong: [{ goal: 'G1', label: 'Client listening', score: 4 }],
    not_assessed: [{ goal: 'G4', label: 'Written updates' }],
    review_required: true,
    versions: { rules: 'r-0.3', mapping: 'm-draft-1', content_library: 'cl-2026-10' },
  };
}

type StoredRun = { status: RunStatus; summary: Summary | null };

// Trainees with an assessment. T-06 has a full report; T-09 has an old assessment with no summary.
const store = new Map<string, StoredRun>([
  ['T-06', { status: 'pending_review', summary: summaryFor('T-06', 'run-0006', 'pending_review') }],
  ['T-09', { status: 'approved', summary: null }],
]);
let runCounter = 100;

function rowsOf(): TraineeRow[] {
  return [...store.entries()].map(([trainee_id, record]) => ({
    trainee_id,
    status: record.status,
    last_run_at: '2026-11-01T09:00:00Z',
  }));
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
        throw new ApiError(404, `No assessment for ${traineeId} yet.`);
      }
      if (!record.summary) {
        throw new ApiError(409, 'The stored assessment has no exercise details.');
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

    async submitReview(runId, body) {
      await sleep();
      const entry = [...store.entries()].find(([, r]) => r.summary?.run_id === runId);
      if (!entry) {
        throw new ApiError(404, 'That run was not found.');
      }
      if (body.decision === 'reject' && !body.comment) {
        throw new ApiError(422, 'A rejection needs a comment.');
      }
      const status: RunStatus = body.decision === 'approve' ? 'approved' : 'rejected';
      const [traineeId, record] = entry;
      store.set(traineeId, { status, summary: { ...record.summary!, status } });
      return { run_id: runId, status };
    },
  };
}
