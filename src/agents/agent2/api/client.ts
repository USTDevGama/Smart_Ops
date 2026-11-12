import type {
  DecisionRequest,
  Flag,
  FlagInput,
  MergeFlagsRequest,
  Run,
  RunResult,
  RunSummary,
  StartRunRequest,
  StartRunResponse,
} from './types';
import { HttpClient } from './httpClient';
import { MockClient } from './mock/mockClient';

/**
 * The ONLY surface the React app talks to. Two implementations:
 *   MockClient  (VITE_API_MODE=mock)  in-browser fake backend
 *   HttpClient  (VITE_API_MODE=http)  real backend, see docs/frontend-integration.md
 * Both implement exactly this interface, so swapping is a config change.
 */
export interface ApiClient {
  /** GET /flags (any signed-in user) */
  listFlags(): Promise<Flag[]>;
  /** POST /flags (admin) */
  createFlag(input: FlagInput): Promise<Flag>;
  /** PATCH /flags/{id} (admin) */
  updateFlag(id: string, patch: Partial<FlagInput>): Promise<Flag>;
  /** DELETE /flags/{id} (admin) */
  deleteFlag(id: string): Promise<void>;
  /** POST /flags/merge (admin) */
  mergeFlags(req: MergeFlagsRequest): Promise<Flag>;

  /** POST /runs */
  startRun(req: StartRunRequest): Promise<StartRunResponse>;
  /** GET /runs/{id}: poll this while status is queued|running */
  getRun(runId: string): Promise<Run>;
  /** POST /runs/{id}/review-items/{item_id}/decision */
  decide(runId: string, itemId: string, req: DecisionRequest): Promise<Run>;
  /** GET /runs: history for the current session, newest first */
  listRuns(): Promise<RunSummary[]>;
  /** GET /runs/{id}/result */
  getResult(runId: string): Promise<RunResult>;
}

export const API_MODE: 'mock' | 'http' =
  (import.meta.env.VITE_API_MODE as string) === 'http' ? 'http' : 'mock';
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';

export const api: ApiClient = API_MODE === 'http' ? new HttpClient(API_BASE_URL) : new MockClient();
