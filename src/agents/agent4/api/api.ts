import type { ReviewBody, RunStatus, Summary, TraineeRow } from './types';

/**
 * The calls this agent makes to the Pod 4 API. Pages depend on this interface only.
 * Real calls: httpApi.ts. In-memory stand-in: mockApi.ts. Keep both in step.
 */
export interface Agent4Api {
  listTrainees(): Promise<TraineeRow[]>;
  getSummary(traineeId: string): Promise<Summary>;
  /**
   * The persisted report for the trainee. Never runs the agent. 404 with code REPORT_NOT_FOUND
   * means nothing is stored yet; any other error is a real failure.
   */
  getStoredSummary(traineeId: string): Promise<Summary>;
  /** The trainee's current report: their latest approved run. 404 means no approved report yet. */
  getApprovedSummary(traineeId: string): Promise<Summary>;
  /** Starts an assessment from the trainee database. 404 when the trainee is unknown. */
  assess(traineeId: string): Promise<{ run_id: string; status: RunStatus }>;
  /** The summary as a PDF file. The server does not call the agent again. 503: no PDF engine. */
  downloadReport(summary: Summary): Promise<Blob>;
  submitReview(runId: string, body: ReviewBody): Promise<{ run_id: string; status: RunStatus }>;
}

export const REPORT_NOT_FOUND = 'REPORT_NOT_FOUND';

export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable error code from the server, e.g. REPORT_NOT_FOUND, when it sent one. */
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
