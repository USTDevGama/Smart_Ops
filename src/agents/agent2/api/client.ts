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
 *   HttpClient  (default)                real backend, reached through /agent2-api (see docs/agent2-backend-integration.md)
 *   MockClient  (VITE_USE_MOCKS=true)    in-browser fake backend, for work without a backend and for browser tests
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

// Same switch as Agents 3 and 4: the real backend unless VITE_USE_MOCKS=true. The production image builds with it false.
export const API_MODE: 'mock' | 'http' =
  import.meta.env.VITE_USE_MOCKS === 'true' ? 'mock' : 'http';
// nginx (and the Vite dev proxy) strip /agent2-api, so this reaches the backend's /api/v1.
export const API_BASE_URL: string = '/agent2-api/api/v1';

export const api: ApiClient = API_MODE === 'http' ? new HttpClient(API_BASE_URL) : new MockClient();
