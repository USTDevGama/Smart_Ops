import type { ReviewBody, RunStatus, Summary, TraineeRow } from './types';

/**
 * The calls this agent makes to the Pod 4 API. Pages depend on this interface only.
 * Real calls: httpApi.ts. In-memory stand-in: mockApi.ts. Keep both in step.
 */
export interface Agent4Api {
  listTrainees(): Promise<TraineeRow[]>;
  getSummary(traineeId: string): Promise<Summary>;
  /** Starts an assessment from the trainee database. 404 when the trainee is unknown. */
  assess(traineeId: string): Promise<{ run_id: string; status: RunStatus }>;
  submitReview(runId: string, body: ReviewBody): Promise<{ run_id: string; status: RunStatus }>;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
