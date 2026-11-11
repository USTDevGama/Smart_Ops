import { ApiError, type Agent3Api, type UploadResult } from './api';
import type {
  ConfigKeySummary,
  DemandDetail,
  DemandOut,
  PersonaConfig,
  PersonaSummary,
  ProfileDetail,
  ProfileOut,
  ReportStatus,
  ScenarioImportResult,
  SessionDetail,
  SessionOut,
  TurnDone,
  TurnOut,
  VersionOut,
} from './types';

/** Vite proxies this prefix to the FastAPI (vite.config.ts), so there is no CORS to configure. */
const BASE = '/agent3-api';
const V1 = `${BASE}/api/v1`;

/** Flatten FastAPI error bodies ({detail: string | [{loc, msg}]}) into readable text. */
export function errorDetail(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) {
      return d
        .map((e: { loc?: unknown[]; msg?: string }) => {
          const loc = Array.isArray(e.loc) ? e.loc.filter((p) => p !== 'body').join('.') : '';
          return loc ? `${loc}: ${e.msg ?? ''}` : (e.msg ?? '');
        })
        .join('\n');
    }
  }
  return fallback;
}

/** Parse a text/event-stream body into events. */
export function parseSse(text: string): { event: string; data: string }[] {
  return text
    .split(/\r?\n\r?\n/)
    .map((block) => {
      let event = 'message';
      const data: string[] = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      return { event, data: data.join('\n') };
    })
    .filter((e) => e.data !== '');
}

export function createHttpApi(getHeaders: () => Record<string, string>): Agent3Api {
  async function raw(path: string, init: RequestInit = {}): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(path, { ...init, headers: { ...getHeaders(), ...init.headers } });
    } catch {
      throw new ApiError(0, 'The API is not reachable.');
    }
    if (!res.ok) {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(res.status, errorDetail(body, `${res.status} ${res.statusText}`));
    }
    return res;
  }

  async function json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await raw(path, init);
    return (await res.json()) as T;
  }

  const body = (data: unknown): RequestInit => ({
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  async function upload<T>(path: string, file: File): Promise<UploadResult<T>> {
    const form = new FormData();
    form.append('file', file);
    const res = await raw(path, { method: 'POST', body: form });
    // 200 = same file uploaded before (existing record returned); 202 = new record.
    return { item: (await res.json()) as T, reused: res.status === 200 };
  }

  const cfg = (kind: string, key: string, n: number) =>
    `${V1}/admin/config/${kind}/${encodeURIComponent(key)}/versions/${n}`;

  return {
    async health() {
      try {
        await raw(`${BASE}/readyz`);
      } catch {
        return { ok: false };
      }
      try {
        const meta = await json<{ version: string }>(`${V1}/meta`);
        return { ok: true, version: meta.version };
      } catch {
        return { ok: true };
      }
    },

    listPersonas: () => json<PersonaSummary[]>(`${V1}/personas`),

    listConfig: (kind) => json<ConfigKeySummary[]>(`${V1}/admin/config/${kind}`),
    getVersion: (kind, key, n) => json(cfg(kind, key, n)),
    createPersona: (key, config) =>
      json<VersionOut<PersonaConfig>>(`${V1}/admin/config/persona`, {
        method: 'POST',
        ...body({ key, config }),
      }),
    newPersonaVersion: (key) =>
      json<VersionOut<PersonaConfig>>(
        `${V1}/admin/config/persona/${encodeURIComponent(key)}/versions`,
        { method: 'POST' },
      ),
    saveDraft: (key, n, config) =>
      json<VersionOut<PersonaConfig>>(cfg('persona', key, n), {
        method: 'PUT',
        ...body({ config }),
      }),
    publish: (key, n) =>
      json<VersionOut<PersonaConfig>>(`${cfg('persona', key, n)}/publish`, { method: 'POST' }),
    importScenarios: (scenarios) =>
      json<ScenarioImportResult>(`${V1}/admin/scenarios/import`, {
        method: 'POST',
        ...body({ scenarios }),
      }),

    uploadProfile: (file) => upload<ProfileDetail>(`${V1}/profiles`, file),
    listProfiles: () => json<ProfileOut[]>(`${V1}/profiles`),
    getProfile: (id) => json<ProfileDetail>(`${V1}/profiles/${id}`),
    async deleteProfile(id) {
      await raw(`${V1}/profiles/${id}`, { method: 'DELETE' });
    },

    uploadDemand: (file) => upload<DemandDetail>(`${V1}/admin/demand`, file),
    listDemand: () => json<DemandOut[]>(`${V1}/admin/demand`),
    getDemand: (id) => json<DemandDetail>(`${V1}/admin/demand/${id}`),
    async deleteDemand(id) {
      await raw(`${V1}/admin/demand/${id}`, { method: 'DELETE' });
    },

    startSession: (persona_key, profile_id) =>
      json<SessionDetail>(`${V1}/sessions`, {
        method: 'POST',
        ...body({ persona_key, profile_id }),
      }),
    listSessions(filter) {
      const q = new URLSearchParams();
      if (filter?.status) q.set('status', filter.status);
      if (filter?.traineeRef) q.set('trainee_ref', filter.traineeRef);
      const qs = q.toString();
      return json<SessionOut[]>(`${V1}/sessions${qs ? `?${qs}` : ''}`);
    },
    getSession: (id) => json<SessionDetail>(`${V1}/sessions/${id}`),
    async sendTurn(sessionId, content, ticket) {
      const res = await raw(`${V1}/sessions/${sessionId}/turns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': ticket },
        body: JSON.stringify({ content }),
      });
      // One response carrying two events: `message` (the reply) then `done` (counters).
      // POST + custom headers rule out EventSource, so read the whole body.
      const events = parseSse(await res.text());
      const message = events.find((e) => e.event === 'message');
      const done = events.find((e) => e.event === 'done');
      if (!message || !done) throw new ApiError(502, 'The reply was cut off. Try again.');
      return {
        message: JSON.parse(message.data) as TurnOut,
        done: JSON.parse(done.data) as TurnDone,
      };
    },
    endSession: (id) => json<SessionDetail>(`${V1}/sessions/${id}/end`, { method: 'POST' }),

    getReport: (id) => json<ReportStatus>(`${V1}/sessions/${id}/report`),
    requestReport: (id) => json<ReportStatus>(`${V1}/sessions/${id}/report`, { method: 'POST' }),
    async downloadReport(id, format) {
      const res = await raw(`${V1}/admin/sessions/${id}/report/${format}`);
      return res.blob();
    },
  };
}
