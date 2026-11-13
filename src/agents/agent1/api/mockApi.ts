import { ApiError, type Agent1Api } from './api';
import type {
  AdminCurriculumItem,
  Curriculum,
  Report,
  SessionReport,
  SessionRow,
  SessionState,
  SessionStatus,
  Track,
} from './types';

/**
 * In-memory stand-in for the Pod 1 (Viva Agent) API (VITE_USE_MOCKS=true). State resets on reload.
 * Mirrors the real server's shapes closely enough that the mock pages/report render for real.
 */

const LATENCY_MS = 150;
const sleep = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_TRACKS: Track[] = [
  {
    track_key: 'fundamentals',
    track_name: 'Fundamentals',
    topics: [
      { topic_id: 1, topic_name: 'Core concepts' },
      { topic_id: 2, topic_name: 'Terminology' },
    ],
  },
  {
    track_key: 'applied',
    track_name: 'Applied practice',
    topics: [
      { topic_id: 3, topic_name: 'Worked examples' },
      { topic_id: 4, topic_name: 'Common pitfalls' },
      { topic_id: 5, topic_name: 'Edge cases' },
    ],
  },
];

const AGENT_QUESTIONS = [
  'Let us start with the fundamentals. Can you explain the core concept in your own words?',
  'Good. Now, how would you apply that to a real scenario with incomplete information?',
  'What is a common pitfall people run into here, and how would you avoid it?',
];

let curriculumCounter = 1;
const curricula = new Map<number, Curriculum>();

let sessionCounter = 1;
interface MockSession {
  session_id: string;
  candidate_id: string;
  curriculum_id: number;
  status: SessionStatus;
  started_at: string;
  turns: SessionState['agent_turns'];
  next_turn_no: number;
  remaining_min: number;
  closed: boolean;
  review: SessionReport['review'];
}
const sessions = new Map<string, MockSession>();

function reportFor(session: MockSession): Report {
  return {
    session_id: session.session_id,
    overall: {
      score: 3.6,
      assessment_confidence: 0.82,
      summary: 'Solid grasp of fundamentals; applied reasoning was a little shaky under pressure.',
      confidence_reasons: ['Answered every question', 'One follow-up needed clarification'],
    },
    tracks: [
      { track_key: 'fundamentals', name: 'Fundamentals', score: 4.2, level_reached: 2 },
      { track_key: 'applied', name: 'Applied practice', score: 3.0, level_reached: 1 },
    ],
    coverage: {
      tracks_covered: ['fundamentals', 'applied'],
      tracks_total: 2,
      unscored_questions: [],
    },
    integration: { attempted: false },
    topic_results: [
      {
        question_id: 'q-1',
        topic: 'Core concepts',
        level: 1,
        score: 4,
        follow_ups_asked: 0,
        solid: ['Explained the concept clearly with a correct example.'],
        shaky: [],
        evidence: [{ quote: 'It works by...', turn: 2 }],
        expected_output: {
          reference_answer: 'A clear definition with one worked example.',
          key_ideas: [{ id: 'k1', text: 'Mentions the core mechanism' }],
        },
        key_ideas_covered: ['k1'],
      },
      {
        question_id: 'q-2',
        topic: 'Worked examples',
        level: 1,
        score: 3,
        follow_ups_asked: 1,
        solid: [],
        shaky: ['Answer missed the edge case about incomplete information.'],
        evidence: [{ quote: 'I would just assume...', turn: 4 }],
        expected_output: {
          reference_answer: 'Names the assumption explicitly and states a fallback.',
          key_ideas: [{ id: 'k2', text: 'States the assumption' }],
        },
        key_ideas_covered: [],
      },
    ],
    turns: session.turns.map((t, i) => ({ turn: i + 1, role: t.role, kind: t.kind, text: t.text })),
  };
}

export function createMockApi(): Agent1Api {
  return {
    async createCurriculum(body) {
      await sleep();
      const curriculum_id = curriculumCounter++;
      const curriculum: Curriculum = { curriculum_id, name: body.name, status: 'ingesting' };
      curricula.set(curriculum_id, curriculum);
      // Flips to ready shortly after, like the real server's background derivation.
      setTimeout(() => curricula.set(curriculum_id, { ...curriculum, status: 'ready' }), 1500);
      return curriculum;
    },

    async getCurriculum(id) {
      await sleep();
      const curriculum = curricula.get(id);
      if (!curriculum) throw new ApiError(404, `Curriculum ${id} was not found.`);
      return curriculum;
    },

    async getTracks(id) {
      await sleep();
      if (!curricula.has(id)) throw new ApiError(404, `Curriculum ${id} was not found.`);
      return MOCK_TRACKS;
    },

    async startIntake(curriculumId) {
      await sleep();
      const session_id = `mock-session-${sessionCounter++}`;
      sessions.set(session_id, {
        session_id,
        candidate_id: `candidate-${session_id}`,
        curriculum_id: curriculumId,
        status: 'active',
        started_at: new Date().toISOString(),
        turns: [{ turn_no: 1, role: 'agent', text: AGENT_QUESTIONS[0] }],
        next_turn_no: 2,
        remaining_min: 20,
        closed: false,
        review: null,
      });
      return { session_id };
    },

    async getSessionState(id) {
      await sleep();
      const session = sessions.get(id);
      if (!session) throw new ApiError(404, 'This interview link is not valid.');
      return {
        next_turn_no: session.next_turn_no,
        remaining_min: session.remaining_min,
        agent_turns: session.turns.filter((t) => t.role === 'agent').slice(-1),
        closed: session.closed,
      };
    },

    async postTurn(id, body) {
      await sleep();
      const session = sessions.get(id);
      if (!session) throw new ApiError(404, 'This interview link is not valid.');
      session.turns.push({ turn_no: body.turn_no, role: 'candidate', text: body.text });
      const askedSoFar = session.turns.filter((t) => t.role === 'agent').length;
      const closed = askedSoFar >= AGENT_QUESTIONS.length;
      if (closed) {
        session.closed = true;
        session.status = 'pending_review';
        return {
          next_turn_no: session.next_turn_no,
          remaining_min: session.remaining_min,
          agent_turns: [],
          closed: true,
        };
      }
      const nextQuestion = AGENT_QUESTIONS[askedSoFar];
      session.next_turn_no += 1;
      const agentTurn = {
        turn_no: session.next_turn_no,
        role: 'agent' as const,
        text: nextQuestion,
      };
      session.turns.push(agentTurn);
      return {
        next_turn_no: session.next_turn_no + 1,
        remaining_min: session.remaining_min,
        agent_turns: [agentTurn],
        closed: false,
      };
    },

    async endSession(id) {
      await sleep();
      const session = sessions.get(id);
      if (!session) throw new ApiError(404, 'This interview link is not valid.');
      session.closed = true;
      session.status = 'pending_review';
      return {
        next_turn_no: session.next_turn_no,
        remaining_min: session.remaining_min,
        agent_turns: [],
        closed: true,
      };
    },

    async listSessions(status = 'all') {
      await sleep();
      const rows: SessionRow[] = [...sessions.values()]
        .filter((s) => status === 'all' || s.status === status)
        .map((s) => ({
          session_id: s.session_id,
          candidate_id: s.candidate_id,
          curriculum_id: s.curriculum_id,
          status: s.status,
          started_at: s.started_at,
          overall_score: s.closed ? 3.6 : null,
          assessment_confidence: s.closed ? 0.82 : null,
        }));
      return rows;
    },

    async getReport(id) {
      await sleep();
      const session = sessions.get(id);
      if (!session) throw new ApiError(404, 'This interview link is not valid.');
      if (!session.closed) throw new ApiError(404, 'The report is still being prepared.');
      return { status: session.status, report: reportFor(session), review: session.review };
    },

    async submitReview(id, body) {
      await sleep();
      const session = sessions.get(id);
      if (!session) throw new ApiError(404, 'That session was not found.');
      if (body.decision === 'rejected' && !body.reason) {
        throw new ApiError(422, 'A reason is required when rejecting.');
      }
      session.status = body.decision;
      session.review = {
        reviewer_id: body.reviewer_id,
        decision: body.decision,
        reason: body.reason,
        decided_at: new Date().toISOString(),
      };
    },

    async getAdminCurricula() {
      await sleep();
      const sessionsByCurriculum = new Map<number, MockSession[]>();
      for (const s of sessions.values()) {
        const list = sessionsByCurriculum.get(s.curriculum_id) ?? [];
        list.push(s);
        sessionsByCurriculum.set(s.curriculum_id, list);
      }
      const result: AdminCurriculumItem[] = [...curricula.values()]
        .sort((a, b) => b.curriculum_id - a.curriculum_id)
        .map((c) => ({
          curriculum_id: c.curriculum_id,
          name: c.name,
          status: c.status,
          ingested_at: new Date().toISOString(),
          sessions: (sessionsByCurriculum.get(c.curriculum_id) ?? []).map((s) => ({
            session_id: s.session_id,
            candidate_id: s.candidate_id,
            curriculum_id: s.curriculum_id,
            status: s.status,
            started_at: s.started_at,
            overall_score: s.closed ? 3.6 : null,
          })),
        }));
      return result;
    },
  };
}
