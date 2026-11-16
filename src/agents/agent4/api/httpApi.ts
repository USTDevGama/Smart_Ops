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
    if (detail && typeof detail === 'object' && 'message' in detail) {
      const message = (detail as { message: unknown }).message;
      if (typeof message === 'string') return message;
    }
    if (detail && typeof detail === 'object' && 'reasons' in detail) {
      const reasons = (detail as { reasons: unknown }).reasons;
      if (Array.isArray(reasons)) return `Rejected: ${reasons.join(', ')}`;
    }
  }
  return fallback;
}

/** The server's error code: {code} or {detail: {code}}. Undefined when there is none. */
export function errorCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const top = (body as { code?: unknown }).code;
  if (typeof top === 'string') return top;
  const detail = (body as { detail?: unknown }).detail;
  if (detail && typeof detail === 'object') {
    const code = (detail as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/**
 * The persisted (approved) report is built from stored data and does not carry every field of a
 * live summary: no overview, pending_sections, per-gap why, or per-goal status. Absent lists become
 * empty lists and absent text becomes empty text, so the page never reads a missing field. Nothing
 * is invented: a score row has status 'scored' only when it has a score.
 */
export function normalizeSummary(raw: Partial<Summary>): Summary {
  const list = <T>(value: T[] | undefined | null): T[] => (Array.isArray(value) ? value : []);
  return {
    ...(raw as Summary),
    overview: typeof raw.overview === 'string' ? raw.overview : '',
    scores: list(raw.scores).map((row) => ({
      ...row,
      sources: list(row.sources),
      status:
        row.status ?? (row.score === null || row.score === undefined ? 'not_available' : 'scored'),
      score: row.score ?? null,
    })),
    gaps: list(raw.gaps).map((gap) => ({
      ...gap,
      evidence: list(gap.evidence),
      exercises: list(gap.exercises),
      outcomes: list(gap.outcomes),
      why: typeof gap.why === 'string' ? gap.why : '',
    })),
    strong: list(raw.strong),
    not_assessed: list(raw.not_assessed),
    pending_sections: list(raw.pending_sections),
  };
}

/** Creates the real API client. Auth headers come from useAuth().getAuthHeaders(). */
export function createHttpApi(getAuthHeaders: () => Record<string, string>): Agent4Api {
  async function send(path: string, init: RequestInit, expect: string): Promise<Response> {
    const headers = new Headers(init.headers);
    for (const [key, value] of Object.entries(getAuthHeaders())) headers.set(key, value);

    let response: Response;
    try {
      response = await fetch(`${BASE}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(0, 'The agent service could not be reached.');
    }
    // A page of HTML here means the server did not route /agent4-api to the API.
    if (response.ok && !response.headers.get('content-type')?.includes(expect)) {
      throw new ApiError(
        response.status,
        'The agent API did not return data. The server must route /agent4-api to the Pod 4 API.',
      );
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
        errorCode(body),
      );
    }
    return response;
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await send(path, init, 'application/json');
    return (await response.json()) as T;
  }

  const traineePath = (id: string) => `/v1/trainees/${encodeURIComponent(id)}`;

  return {
    listTrainees: () => request<TraineeRow[]>('/v1/trainees'),
    getSummary: async (id) =>
      normalizeSummary(await request<Partial<Summary>>(`${traineePath(id)}/summary`)),
    getStoredSummary: async (id) =>
      normalizeSummary(await request<Partial<Summary>>(`${traineePath(id)}/stored-summary`)),
    getApprovedSummary: async (id) =>
      normalizeSummary(await request<Partial<Summary>>(`${traineePath(id)}/approved-summary`)),
    assess: (id) =>
      request<{ run_id: string; status: RunStatus }>(`${traineePath(id)}/assessments`, {
        method: 'POST',
      }),
    // Built in the browser from the report on screen: no request, no new run, same file every time.
    downloadReport: async (summary) => {
      const { buildReportPdf } = await import('../reportPdf');
      return buildReportPdf(summary);
    },
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
