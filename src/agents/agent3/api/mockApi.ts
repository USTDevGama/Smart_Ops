import { ApiError, type Agent3Api, type UploadResult } from './api';
import type {
  ConfigKeySummary,
  ConfigKind,
  DemandDetail,
  IngestStatus,
  PersonaConfig,
  ProfileDetail,
  ReportStatus,
  ScenarioConfig,
  SessionDetail,
  TurnOut,
  VersionOut,
  VersionStatus,
} from './types';

/**
 * In-memory stand-in for the Smart_Ops_Pod3 API (VITE_USE_MOCKS=true).
 * It mimics the real rules (draft/published/retired, idempotent turns, 200 vs 202 uploads,
 * 409 on delete-in-use, owner-only chat) so the UI can be built and tested offline.
 * State lives in module memory: it resets on page reload.
 */

const LATENCY_MS = 120;
const sleep = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));
let counter = 1000;
const nextId = (p: string) => `${p}-${++counter}`;
const nowIso = () => new Date().toISOString();

export const SAMPLE_PERSONA: PersonaConfig = {
  name: 'Ms. Verma',
  role: 'Head of Procurement at the client',
  style: 'Strict, impatient, direct. Short sentences.',
  main_concerns: ['Vendor delivery is two weeks late', 'No clear recovery plan'],
  rules: ['Never accept vague promises', 'Ask for dates and owners'],
  escalation_ladder: [
    { step: 1, move: 'Polite but firm question' },
    { step: 2, move: 'Expresses frustration' },
    { step: 3, move: 'Threatens to escalate to leadership' },
    { step: 4, move: 'Demands an immediate call with management' },
  ],
  t_escalate: 0.5,
  t_deescalate: 0.7,
  min_turns: 3,
  max_turns: 6,
  grace_turns: 0,
};

export const SAMPLE_SCENARIO: ScenarioConfig = {
  id: 'vendor-delay',
  title: 'Vendor delay',
  situation: 'A key vendor delivered two weeks late and the client wants answers.',
  client_objections: ['Why was I not told earlier?', 'What is the recovery plan?'],
  good_answer_contains: ['Acknowledges the delay', 'Gives a dated recovery plan'],
};

type Doc = {
  id: string;
  filename: string;
  file_type: string;
  created_at: string;
  createdMs: number;
  owner: string;
  text: string;
  hash: string;
  failed?: boolean;
};

type Store = {
  versions: Record<ConfigKind, VersionOut[]>;
  profiles: Doc[];
  demand: Doc[];
  sessions: (SessionDetail & { tickets: Record<string, TurnOut[]>; reportAt?: number })[];
};

function seed(): Store {
  const created = nowIso();
  const store: Store = {
    versions: {
      persona: [
        {
          id: 'ver-1',
          kind: 'persona',
          key: 'verma-strict',
          version_no: 1,
          status: 'published',
          config: SAMPLE_PERSONA,
          created_at: created,
        },
      ],
      scenario: [
        {
          id: 'ver-2',
          kind: 'scenario',
          key: 'vendor-delay',
          version_no: 1,
          status: 'published',
          config: SAMPLE_SCENARIO,
          created_at: created,
        },
      ],
    },
    profiles: [],
    demand: [
      {
        id: 'demand-1',
        filename: 'client-demand.pdf',
        file_type: 'pdf',
        created_at: created,
        createdMs: 0,
        owner: 'admin',
        text: '# Client demand\n\nDeliver the vendor recovery plan within one week.',
        hash: 'seed',
      },
    ],
    sessions: [],
  };
  return store;
}

let store = seed();
/** Test hook: reset the in-memory state. */
export function resetMockStore() {
  store = seed();
}

function ingestStatus(d: Doc): IngestStatus {
  if (d.failed) return 'failed';
  const age = Date.now() - d.createdMs;
  if (age < 800) return 'queued';
  if (age < 2000) return 'extracting';
  return 'ready';
}

const asOut = (d: Doc) => ({
  id: d.id,
  filename: d.filename,
  file_type: d.file_type,
  status: ingestStatus(d),
  error: d.failed ? 'Could not read this file.' : null,
  created_at: d.created_at,
});
const asDetail = (d: Doc) => ({
  ...asOut(d),
  content: ingestStatus(d) === 'ready' ? { text: d.text } : null,
});

function extOf(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}
function checkUpload(file: File) {
  if (!['pdf', 'docx', 'txt'].includes(extOf(file.name)))
    throw new ApiError(415, 'Only PDF, DOCX or TXT files are accepted.');
  if (file.size === 0) throw new ApiError(400, 'The file is empty.');
  if (file.size > 10 * 1024 * 1024) throw new ApiError(413, 'The file is larger than 10 MB.');
}

function personaSummary(v: VersionOut) {
  const c = v.config as PersonaConfig;
  return { key: v.key, version_no: v.version_no, title: c.name, summary: c.role };
}

const REPLIES = [
  'I need a clear answer. Why was I not told about the delay earlier?',
  'That does not tell me when it will be fixed. Give me dates and an owner.',
  'This is not good enough. I will have to raise it with my leadership.',
  'Get your manager on a call with me today.',
];
const END_REASON_CHAT = 'turn_cap';

export function createMockApi(getHeaders: () => Record<string, string>): Agent3Api {
  const me = () => getHeaders()['X-Dev-User'] ?? 'anonymous';
  const isAdmin = () => getHeaders()['X-Dev-Role'] === 'admin';
  const requireAdmin = () => {
    if (!isAdmin()) throw new ApiError(403, 'Admins only.');
  };
  const canSee = (owner: string) => isAdmin() || owner === me();

  function versionsOf(kind: ConfigKind, key: string) {
    return store.versions[kind].filter((v) => v.key === key);
  }
  function findVersion(kind: ConfigKind, key: string, n: number) {
    const v = versionsOf(kind, key).find((x) => x.version_no === n);
    if (!v) throw new ApiError(404, `Version ${n} of ${key} not found.`);
    return v;
  }

  function newDoc(file: File, owner: string): Doc {
    const text =
      extOf(file.name) === 'txt'
        ? '(text extracted from the uploaded file)'
        : `# ${file.name}\n\n- Experience: 5 years in delivery management\n- Skills: stakeholder communication, vendor management`;
    return {
      id: nextId('doc'),
      filename: file.name,
      file_type: extOf(file.name),
      created_at: nowIso(),
      createdMs: Date.now(),
      owner,
      text,
      hash: `${file.name}:${file.size}`,
    };
  }

  function reportFor(s: Store['sessions'][number]): ReportStatus {
    if (s.status !== 'ended')
      return {
        session_id: s.id,
        state: 'not_ended',
        model_configured: true,
        can_download: false,
        formats: [],
      };
    const ready = s.reportAt !== undefined && Date.now() - s.reportAt > 3000;
    return {
      session_id: s.id,
      state: ready ? 'ready' : 'generating',
      model_configured: true,
      can_download: ready && isAdmin(),
      formats: ready ? ['pdf', 'html', 'md'] : [],
    };
  }

  function getSessionRow(id: string) {
    const s = store.sessions.find((x) => x.id === id);
    if (!s || !canSee(s.trainee_ref)) throw new ApiError(404, 'Session not found.');
    return s;
  }
  const publicSession = (s: Store['sessions'][number]): SessionDetail => {
    const { tickets: _t, reportAt: _r, ...rest } = s;
    void _t;
    void _r;
    // Only admins see per-turn evaluations.
    return {
      ...rest,
      turns: rest.turns.map((t) => (isAdmin() ? t : { ...t, evaluation: undefined })),
    };
  };

  return {
    async health() {
      await sleep(50);
      return { ok: true, version: 'mock' };
    },

    async listPersonas() {
      await sleep();
      return store.versions.persona.filter((v) => v.status === 'published').map(personaSummary);
    },

    async listConfig(kind) {
      await sleep();
      requireAdmin();
      const keys = [...new Set(store.versions[kind].map((v) => v.key))];
      return keys.map<ConfigKeySummary>((key) => ({
        key,
        versions: versionsOf(kind, key).map((v) => ({
          id: v.id,
          version_no: v.version_no,
          status: v.status,
          created_at: v.created_at,
        })),
      }));
    },
    async getVersion(kind, key, n) {
      await sleep();
      requireAdmin();
      return findVersion(kind, key, n) as never;
    },
    async createPersona(key, config) {
      await sleep();
      requireAdmin();
      if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(key))
        throw new ApiError(422, 'key: use lowercase letters, digits and dashes.');
      if (versionsOf('persona', key).length)
        throw new ApiError(409, `A character card "${key}" already exists.`);
      const v: VersionOut = {
        id: nextId('ver'),
        kind: 'persona',
        key,
        version_no: 1,
        status: 'draft',
        config,
        created_at: nowIso(),
      };
      store.versions.persona.push(v);
      return v as VersionOut<PersonaConfig>;
    },
    async newPersonaVersion(key) {
      await sleep();
      requireAdmin();
      const all = versionsOf('persona', key);
      if (!all.length) throw new ApiError(404, 'No such character card.');
      const latest = all[all.length - 1];
      const v: VersionOut = {
        id: nextId('ver'),
        kind: 'persona',
        key,
        version_no: latest.version_no + 1,
        status: 'draft',
        config: structuredClone(latest.config),
        created_at: nowIso(),
      };
      store.versions.persona.push(v);
      return v as VersionOut<PersonaConfig>;
    },
    async saveDraft(key, n, config) {
      await sleep();
      requireAdmin();
      const v = findVersion('persona', key, n);
      if (v.status !== 'draft') throw new ApiError(409, 'Only a draft can be changed.');
      v.config = config;
      return v as VersionOut<PersonaConfig>;
    },
    async publish(key, n) {
      await sleep();
      requireAdmin();
      const v = findVersion('persona', key, n);
      if (v.status !== 'draft') throw new ApiError(409, 'Only a draft can be published.');
      for (const o of versionsOf('persona', key))
        if (o.status === 'published') o.status = 'retired' as VersionStatus;
      v.status = 'published';
      return v as VersionOut<PersonaConfig>;
    },
    async importScenarios(scenarios) {
      await sleep();
      requireAdmin();
      const res = { created: [] as string[], updated: [] as string[], unchanged: [] as string[] };
      for (const sc of scenarios) {
        const key = sc.id
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const all = versionsOf('scenario', key);
        const latest = all[all.length - 1];
        if (!latest) {
          store.versions.scenario.push({
            id: nextId('ver'),
            kind: 'scenario',
            key,
            version_no: 1,
            status: 'published',
            config: sc,
            created_at: nowIso(),
          });
          res.created.push(key);
        } else if (JSON.stringify(latest.config) === JSON.stringify(sc)) {
          res.unchanged.push(key);
        } else {
          latest.status = 'retired';
          store.versions.scenario.push({
            id: nextId('ver'),
            kind: 'scenario',
            key,
            version_no: latest.version_no + 1,
            status: 'published',
            config: sc,
            created_at: nowIso(),
          });
          res.updated.push(key);
        }
      }
      return res;
    },

    async uploadProfile(file): Promise<UploadResult<ProfileDetail>> {
      await sleep();
      checkUpload(file);
      const existing = store.profiles.find(
        (p) => p.owner === me() && p.hash === `${file.name}:${file.size}`,
      );
      if (existing)
        return { item: { ...asDetail(existing), owner_ref: existing.owner }, reused: true };
      const d = newDoc(file, me());
      store.profiles.push(d);
      return { item: { ...asDetail(d), owner_ref: d.owner }, reused: false };
    },
    async listProfiles() {
      await sleep();
      return store.profiles
        .filter((p) => canSee(p.owner))
        .map((p) => ({ ...asOut(p), owner_ref: p.owner }))
        .reverse();
    },
    async getProfile(id) {
      await sleep(60);
      const p = store.profiles.find((x) => x.id === id);
      if (!p || !canSee(p.owner)) throw new ApiError(404, 'Resume not found.');
      return { ...asDetail(p), owner_ref: p.owner };
    },
    async deleteProfile(id) {
      await sleep();
      const p = store.profiles.find((x) => x.id === id);
      if (!p || !canSee(p.owner)) throw new ApiError(404, 'Resume not found.');
      if (store.sessions.some((s) => s.profile_id === id))
        throw new ApiError(409, 'A chat uses this resume, so it cannot be deleted.');
      store.profiles = store.profiles.filter((x) => x.id !== id);
    },

    async uploadDemand(file): Promise<UploadResult<DemandDetail>> {
      await sleep();
      requireAdmin();
      checkUpload(file);
      const existing = store.demand.find((p) => p.hash === `${file.name}:${file.size}`);
      if (existing)
        return { item: { ...asDetail(existing), uploaded_by: existing.owner }, reused: true };
      const d = newDoc(file, me());
      store.demand.push(d);
      return { item: { ...asDetail(d), uploaded_by: d.owner }, reused: false };
    },
    async listDemand() {
      await sleep();
      requireAdmin();
      return store.demand.map((d) => ({ ...asOut(d), uploaded_by: d.owner })).reverse();
    },
    async getDemand(id) {
      await sleep(60);
      requireAdmin();
      const d = store.demand.find((x) => x.id === id);
      if (!d) throw new ApiError(404, 'Demand document not found.');
      return { ...asDetail(d), uploaded_by: d.owner };
    },
    async deleteDemand(id) {
      await sleep();
      requireAdmin();
      if (store.sessions.some((s) => s.demand_id === id))
        throw new ApiError(409, 'A chat uses this document, so it cannot be deleted.');
      store.demand = store.demand.filter((x) => x.id !== id);
    },

    async startSession(personaKey, profileId) {
      await sleep(300);
      const persona = store.versions.persona.find(
        (v) => v.key === personaKey && v.status === 'published',
      );
      if (!persona) throw new ApiError(404, 'That character is not published.');
      const profile = store.profiles.find((p) => p.id === profileId);
      if (!profile || !canSee(profile.owner) || ingestStatus(profile) !== 'ready')
        throw new ApiError(409, 'Your resume is not ready yet.');
      const demand = [...store.demand].reverse().find((d) => ingestStatus(d) === 'ready');
      if (!demand) throw new ApiError(409, 'No demand document is ready.');
      if (!store.versions.scenario.some((v) => v.status === 'published'))
        throw new ApiError(409, 'No situations are loaded.');
      const cfg = persona.config as PersonaConfig;
      const opening: TurnOut = {
        id: nextId('turn'),
        idx: 0,
        role: 'persona',
        content: `Thanks for making time. I am ${cfg.name}, and I want to hear where things stand with the delivery.`,
        escalation_level: 1,
        created_at: nowIso(),
      };
      const s = {
        id: nextId('sess'),
        trainee_ref: me(),
        profile_id: profileId,
        persona: { key: persona.key, version_no: persona.version_no },
        demand_id: demand.id,
        status: 'active' as const,
        end_reason: null,
        started_at: nowIso(),
        ended_at: null,
        level: 1,
        turns_used: 0,
        max_turns: cfg.max_turns,
        turns: [opening],
        tickets: {},
      };
      store.sessions.push(s);
      return publicSession(s);
    },
    async listSessions(filter) {
      await sleep();
      return store.sessions
        .filter((s) => canSee(s.trainee_ref))
        .filter((s) => !filter?.status || s.status === filter.status)
        .filter(
          (s) =>
            !filter?.traineeRef ||
            s.trainee_ref.toLowerCase().includes(filter.traineeRef.toLowerCase()),
        )
        .map((s) => {
          const { turns: _turns, ...rest } = publicSession(s);
          void _turns;
          return rest;
        })
        .reverse();
    },
    async getSession(id) {
      await sleep(60);
      return publicSession(getSessionRow(id));
    },
    async sendTurn(sessionId, content, ticket) {
      await sleep(400);
      const s = getSessionRow(sessionId);
      if (s.trainee_ref !== me()) throw new ApiError(403, 'Only the owner can send messages.');
      const replay = s.tickets[ticket];
      if (replay) {
        const [, p] = replay;
        return {
          message: p,
          done: {
            trainee_turn_id: replay[0].id,
            persona_turn_id: p.id,
            level: s.level,
            turns_used: s.turns_used,
            ended: s.status === 'ended',
            end_reason: s.end_reason,
            replayed: true,
          },
        };
      }
      if (s.status !== 'active') throw new ApiError(409, 'The session has ended.');
      if (content.trim().length === 0)
        throw new ApiError(422, 'content: message must not be empty.');
      const good = content.trim().length >= 60;
      s.level = Math.min(4, Math.max(1, s.level + (good ? -1 : 1)));
      s.turns_used += 1;
      const trainee: TurnOut = {
        id: nextId('turn'),
        idx: s.turns.length,
        role: 'trainee',
        content,
        escalation_level: null,
        created_at: nowIso(),
        evaluation: {
          answer_quality: good ? 0.8 : 0.3,
          checklist_met: good ? [1] : [],
          evasive: !good,
          composure: 0.7,
          quote: content.slice(0, 40),
          proposed_level: s.level,
        },
      };
      const persona: TurnOut = {
        id: nextId('turn'),
        idx: s.turns.length + 1,
        role: 'persona',
        content: REPLIES[s.level - 1],
        escalation_level: s.level,
        created_at: nowIso(),
      };
      s.turns.push(trainee, persona);
      s.tickets[ticket] = [trainee, persona];
      if (s.turns_used >= s.max_turns) {
        s.status = 'ended';
        s.end_reason = END_REASON_CHAT;
        s.ended_at = nowIso();
      }
      return {
        message: persona,
        done: {
          trainee_turn_id: trainee.id,
          persona_turn_id: persona.id,
          level: s.level,
          turns_used: s.turns_used,
          ended: s.status === 'ended',
          end_reason: s.end_reason,
          replayed: false,
        },
      };
    },
    async endSession(id) {
      await sleep();
      const s = getSessionRow(id);
      if (s.status === 'active') {
        s.status = 'ended';
        s.end_reason = s.trainee_ref === me() ? 'trainee_ended' : 'admin_ended';
        s.ended_at = nowIso();
      }
      return publicSession(s);
    },

    async getReport(id) {
      await sleep(60);
      return reportFor(getSessionRow(id));
    },
    async requestReport(id) {
      await sleep();
      const s = getSessionRow(id);
      if (s.status !== 'ended')
        throw new ApiError(409, 'The report appears once the chat has ended.');
      if (s.reportAt === undefined) s.reportAt = Date.now();
      return reportFor(s);
    },
    async downloadReport(id, format) {
      await sleep();
      requireAdmin();
      const s = getSessionRow(id);
      if (reportFor(s).state !== 'ready') throw new ApiError(404, 'The report is not ready.');
      return new Blob([`Mock ${format} report for session ${id}`], { type: 'text/plain' });
    },
  };
}
