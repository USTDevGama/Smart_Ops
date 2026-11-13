import type {
  AdminCurriculumItem,
  Curriculum,
  IntakeSession,
  ReviewBody,
  SessionReport,
  SessionRow,
  SessionState,
  SessionStatus,
  Track,
} from './types';

/**
 * The calls this agent makes to the Pod 1 (Viva Agent) API. Pages depend on this interface only.
 * Real calls: httpApi.ts. In-memory stand-in: mockApi.ts. Keep both in step.
 */
export interface Agent1Api {
  /** Uploads/pastes a curriculum. The server derives tracks in the background (status: ingesting -> ready). */
  createCurriculum(body: { name: string; document_text: string }): Promise<Curriculum>;
  getCurriculum(curriculumId: number): Promise<Curriculum>;
  getTracks(curriculumId: number): Promise<Track[]>;
  /** Starts a candidate session for a curriculum. */
  startIntake(curriculumId: number): Promise<IntakeSession>;
  getSessionState(sessionId: string): Promise<SessionState>;
  postTurn(
    sessionId: string,
    body: {
      turn_no: number;
      text: string;
      no_response: boolean;
      stt_confidence?: number;
      response_latency_ms?: number;
    },
  ): Promise<SessionState>;
  endSession(sessionId: string): Promise<SessionState>;
  listSessions(status?: SessionStatus | 'all', limit?: number): Promise<SessionRow[]>;
  getReport(sessionId: string): Promise<SessionReport>;
  submitReview(sessionId: string, body: ReviewBody): Promise<void>;
  /** Every curriculum trainees have submitted, each with its linked sessions. Admin-only. */
  getAdminCurricula(): Promise<AdminCurriculumItem[]>;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
