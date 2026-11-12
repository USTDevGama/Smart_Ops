import { ApiError, type Agent4Api } from './api';
import type { ReviewBody, RunStatus, Summary, TraineeRow } from './types';

/**
 * Vite proxies this prefix to the Pod 4 API (vite.config.ts), so there is no CORS to configure.
 * The prefix is stripped before the request leaves the dev server.
 */
const BASE = '/agent4-api';

/** Turns the server's error body ({detail: string | {reasons: string[]}}) into readable text. */
export function errorDetail(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'reasons' in detail) {
      const reasons = (detail as { reasons: unknown }).reasons;
      if (Array.isArray(reasons)) return `Rejected: ${reasons.join(', ')}`;
    }
  }
  return fallback;
}

/** Creates the real API client. Auth headers come from useAuth().getAuthHeaders(). */
export function createHttpApi(getAuthHeaders: () => Record<string, string>): Agent4Api {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    for (const [key, value] of Object.entries(getAuthHeaders())) headers.set(key, value);

    let response: Response;
    try {
      response = await fetch(`${BASE}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(0, 'The agent service could not be reached.');
    }
    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // no JSON body: keep the fallback text
      }
      throw new ApiError(
        response.status,
        errorDetail(body, `The service returned ${response.status}.`),
      );
    }
    return (await response.json()) as T;
  }

  const traineePath = (id: string) => `/v1/trainees/${encodeURIComponent(id)}`;

  return {
    listTrainees: () => request<TraineeRow[]>('/v1/trainees'),
    getSummary: (id) => request<Summary>(`${traineePath(id)}/summary`),
    assess: (id) =>
      request<{ run_id: string; status: RunStatus }>(`${traineePath(id)}/assessments`, {
        method: 'POST',
      }),
    submitReview: (runId, body: ReviewBody) =>
      request<{ run_id: string; status: RunStatus }>(
        `/v1/diagnostics/${encodeURIComponent(runId)}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),
  };
}
