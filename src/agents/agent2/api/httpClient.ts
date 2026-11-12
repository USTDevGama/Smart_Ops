import type { ApiClient } from './client';
import {
  ApiError,
  type ApiErrorBody,
  type DecisionRequest,
  type Flag,
  type FlagInput,
  type MergeFlagsRequest,
  type Run,
  type RunResult,
  type RunSummary,
  type StartRunRequest,
  type StartRunResponse,
} from './types';
import { getAuthHeaders, notifyUnauthorized } from '../host/bridge';
import { getSessionId } from '../state/session';

/**
 * Real backend client. Endpoint paths are relative to `baseUrl` (default `/api/v1`).
 * Headers sent on every request:
 *   X-Session-Id: <uuid>                (run history scope)
 *   ...getAuthHeaders()                 (from the host portal: Authorization: Bearer <Zitadel token>)
 * A 401 on any call is reported to the host (notifyUnauthorized) so it can renew the token or sign the person in again.
 * Error bodies must follow ApiErrorBody ({ error: { code, message, details? } }).
 */
export class HttpClient implements ApiClient {
  constructor(private baseUrl: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Session-Id': getSessionId(),
    };
    Object.assign(headers, getAuthHeaders());
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new ApiError(0, 'network_error', `Cannot reach the backend (${(e as Error).message})`);
    }

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    let data: unknown = undefined;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        /* non-JSON body */
      }
    }

    if (!res.ok) {
      if (res.status === 401) notifyUnauthorized();
      const err = (data as ApiErrorBody | undefined)?.error;
      throw new ApiError(
        res.status,
        err?.code ?? `http_${res.status}`,
        err?.message ?? (res.statusText || 'Request failed'),
        err?.details,
      );
    }
    return data as T;
  }

  listFlags() {
    return this.request<Flag[]>('GET', '/flags');
  }
  createFlag(input: FlagInput) {
    return this.request<Flag>('POST', '/flags', input);
  }
  updateFlag(id: string, patch: Partial<FlagInput>) {
    return this.request<Flag>('PATCH', `/flags/${encodeURIComponent(id)}`, patch);
  }
  deleteFlag(id: string) {
    return this.request<void>('DELETE', `/flags/${encodeURIComponent(id)}`);
  }
  mergeFlags(req: MergeFlagsRequest) {
    return this.request<Flag>('POST', '/flags/merge', req);
  }

  startRun(req: StartRunRequest) {
    return this.request<StartRunResponse>('POST', '/runs', req);
  }
  getRun(runId: string) {
    return this.request<Run>('GET', `/runs/${encodeURIComponent(runId)}`);
  }
  decide(runId: string, itemId: string, req: DecisionRequest) {
    return this.request<Run>(
      'POST',
      `/runs/${encodeURIComponent(runId)}/review-items/${encodeURIComponent(itemId)}/decision`,
      req,
    );
  }
  listRuns() {
    return this.request<RunSummary[]>('GET', '/runs');
  }
  getResult(runId: string) {
    return this.request<RunResult>('GET', `/runs/${encodeURIComponent(runId)}/result`);
  }
}
