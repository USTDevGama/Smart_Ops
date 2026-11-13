import { ApiError, type Agent1Api } from './api';
import type { ReviewBody, SessionStatus } from './types';

/**
 * Vite proxies this prefix to the Pod 1 API (vite.config.ts) in dev, and nginx proxies it in
 * production (deploy/nginx.conf.template). The prefix is stripped before the request reaches the
 * backend, so paths below keep the backend's own `/api` prefix (e.g. `/agent1-api/api/curricula`).
 */
const BASE = '/agent1-api';

/** Flattens the server's error body ({detail: string | [{loc, msg}]}) into readable text. */
function messageOf(data: unknown, status: number): string {
  if (typeof data === 'string' && data) return data;
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => `${(e?.loc ?? []).slice(1).join('.')}: ${e?.msg}`).join('; ');
  }
  return `Request failed (${status})`;
}

/** Creates the real API client. Auth headers come from useAuth().getAuthHeaders(). */
export function createHttpApi(getAuthHeaders: () => Record<string, string>): Agent1Api {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    for (const [key, value] of Object.entries(getAuthHeaders())) headers.set(key, value);

    let response: Response;
    try {
      response = await fetch(`${BASE}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
    }

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!response.ok) {
      throw new ApiError(response.status, messageOf(data, response.status));
    }
    return data as T;
  }

  const sessionPath = (id: string) => `/api/sessions/${encodeURIComponent(id)}`;

  return {
    createCurriculum: (body) =>
      request('/api/curricula', { method: 'POST', body: JSON.stringify(body) }),
    getCurriculum: (id) => request(`/api/curricula/${id}`),
    getTracks: (id) => request(`/api/curricula/${id}/tracks`),
    startIntake: (curriculumId) =>
      request('/api/intake', {
        method: 'POST',
        body: JSON.stringify({ consent: true, curriculum_id: curriculumId }),
      }),
    getSessionState: (id) => request(`${sessionPath(id)}/state`),
    postTurn: (id, body) =>
      request(`${sessionPath(id)}/turns`, { method: 'POST', body: JSON.stringify(body) }),
    endSession: (id) => request(`${sessionPath(id)}/end`, { method: 'POST' }),
    listSessions: (status: SessionStatus | 'all' = 'all', limit = 100) => {
      const qs = status === 'all' ? '' : `status=${status}&`;
      return request(`/api/sessions?${qs}limit=${limit}`);
    },
    getReport: (id) => request(`${sessionPath(id)}/report`),
    submitReview: (id, body: ReviewBody) =>
      request(`${sessionPath(id)}/review`, { method: 'POST', body: JSON.stringify(body) }),
    getAdminCurricula: () => request('/api/admin/curricula'),
  };
}
