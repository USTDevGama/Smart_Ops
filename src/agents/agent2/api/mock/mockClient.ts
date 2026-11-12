import type { ApiClient } from '../client';
import {
  ApiError,
  type DecisionRequest,
  type Flag,
  type FlagInput,
  type MergeFlagsRequest,
  type Run,
  type RunResult,
  type RunSummary,
  type StartRunRequest,
  type StartRunResponse,
} from '../types';
import { getHostUser, type HostUser } from '../../host/bridge';
import { getSessionId, uuid } from '../../state/session';
import { SEED_FLAGS } from './seed';
import { materialize, planRun, type RunRecord } from './mockAgent';

/**
 * MOCK ONLY. In-browser fake of the whole backend, persisted to localStorage so flags and run history
 * survive a reload. It enforces the same validation rules the contract documents; the real backend
 * should mirror them (see docs/frontend-integration.md, "Validation rules").
 */

interface StoredFlag extends Flag {
  merged_into_id: string | null; // retired by a merge
}
interface MockDb {
  flags: StoredFlag[];
  runs: Record<string, RunRecord>;
}
export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export interface MockOptions {
  store?: KeyValueStore;
  now?: () => number;
  delayMs?: number;
}

// v2: the flag set changed (4 flags). Bumping the key reseeds browsers that hold the old v1 data.
const DB_KEY = 'gama.mock.db.v2';

function defaultStore(): KeyValueStore {
  try {
    localStorage.setItem('gama.probe', '1');
    return localStorage;
  } catch {
    const mem: Record<string, string> = {};
    return { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
  }
}

export class MockClient implements ApiClient {
  private store: KeyValueStore;
  private now: () => number;
  private delayMs: number;

  constructor(opts: MockOptions = {}) {
    this.store = opts.store ?? defaultStore();
    this.now = opts.now ?? Date.now;
    this.delayMs = opts.delayMs ?? 150;
  }

  // ───────────── plumbing ─────────────
  private load(): MockDb {
    const raw = this.store.getItem(DB_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as MockDb;
      } catch {
        /* fall through to reseed */
      }
    }
    const ts = new Date(this.now()).toISOString();
    const db: MockDb = {
      flags: SEED_FLAGS.map((f) => ({
        ...f,
        id: `flg_${uuid().slice(0, 8)}`,
        created_at: ts,
        updated_at: ts,
        merged_into_id: null,
      })),
      runs: {},
    };
    this.save(db);
    return db;
  }
  private save(db: MockDb) {
    this.store.setItem(DB_KEY, JSON.stringify(db));
  }
  private async wait() {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
  }
  /** Any signed-in user, as reported by the host portal. 401 if there is none. */
  private requireUser(): HostUser {
    const u = getHostUser();
    if (!u) throw new ApiError(401, 'unauthorized', 'Please sign in');
    return u;
  }
  /** Admin accounts only. 403 for signed-in non-admins. */
  private requireAdmin() {
    if (this.requireUser().role !== 'admin')
      throw new ApiError(403, 'forbidden', 'Admin access required');
  }
  private active(db: MockDb) {
    return db.flags.filter((f) => !f.merged_into_id);
  }
  private publicFlag(f: StoredFlag): Flag {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { merged_into_id, ...rest } = f;
    return rest;
  }
  private validate(
    input: Partial<FlagInput>,
    db: MockDb,
    selfId?: string,
    ignoreIds: string[] = [],
  ) {
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new ApiError(400, 'validation_error', 'Flag name is required');
      const clash = this.active(db).some(
        (f) =>
          f.id !== selfId &&
          !ignoreIds.includes(f.id) &&
          f.name.toLowerCase() === name.toLowerCase(),
      );
      if (clash) throw new ApiError(409, 'duplicate_name', `A flag named "${name}" already exists`);
    }
  }

  // ───────────── flags ─────────────
  async listFlags(): Promise<Flag[]> {
    await this.wait();
    this.requireUser();
    return this.active(this.load()).map((f) => this.publicFlag(f));
  }

  async createFlag(input: FlagInput): Promise<Flag> {
    await this.wait();
    this.requireAdmin();
    const db = this.load();
    this.validate(input, db);
    const ts = new Date(this.now()).toISOString();
    const flag: StoredFlag = {
      ...input,
      name: input.name.trim(),
      id: `flg_${uuid().slice(0, 8)}`,
      created_at: ts,
      updated_at: ts,
      merged_into_id: null,
    };
    db.flags.push(flag);
    this.save(db);
    return this.publicFlag(flag);
  }

  async updateFlag(id: string, patch: Partial<FlagInput>): Promise<Flag> {
    await this.wait();
    this.requireAdmin();
    const db = this.load();
    const flag = this.active(db).find((f) => f.id === id);
    if (!flag) throw new ApiError(404, 'not_found', 'Flag not found');
    this.validate(patch, db, id);
    Object.assign(flag, patch, {
      name: (patch.name ?? flag.name).trim(),
      updated_at: new Date(this.now()).toISOString(),
    });
    this.save(db);
    return this.publicFlag(flag);
  }

  async deleteFlag(id: string): Promise<void> {
    await this.wait();
    this.requireAdmin();
    const db = this.load();
    if (!this.active(db).some((f) => f.id === id))
      throw new ApiError(404, 'not_found', 'Flag not found');
    db.flags = db.flags.filter((f) => f.id !== id);
    this.save(db);
  }

  async mergeFlags(req: MergeFlagsRequest): Promise<Flag> {
    await this.wait();
    this.requireAdmin();
    const db = this.load();
    const ids = Array.from(new Set(req.source_ids));
    if (ids.length < 2)
      throw new ApiError(400, 'validation_error', 'Select at least two flags to merge');
    const missing = ids.filter((id) => !this.active(db).some((f) => f.id === id));
    if (missing.length)
      throw new ApiError(404, 'not_found', `Unknown flag id(s): ${missing.join(', ')}`);
    this.validate({ name: req.target.name }, db, undefined, ids); // name may reuse a source's name
    const ts = new Date(this.now()).toISOString();
    const merged: StoredFlag = {
      ...req.target,
      name: req.target.name.trim(),
      id: `flg_${uuid().slice(0, 8)}`,
      created_at: ts,
      updated_at: ts,
      merged_into_id: null,
    };
    for (const f of db.flags) if (ids.includes(f.id)) f.merged_into_id = merged.id;
    db.flags.push(merged);
    this.save(db);
    return this.publicFlag(merged);
  }

  // ───────────── runs ─────────────
  async startRun(req: StartRunRequest): Promise<StartRunResponse> {
    await this.wait();
    this.requireUser();
    const db = this.load();
    const enabled = this.active(db).filter((f) => f.enabled);
    if (!enabled.length)
      throw new ApiError(
        409,
        'no_enabled_flags',
        'No enabled flags to check. Ask an admin to enable some.',
      );
    const run_id = uuid();
    const session_id = getSessionId();
    db.runs[run_id] = {
      run_id,
      session_id,
      filename: req.filename,
      created_at: new Date(this.now()).toISOString(),
      started_ms: this.now(),
      plan: planRun(run_id, req.payload, enabled),
      decisions: {},
    };
    this.save(db);
    return { run_id, session_id };
  }

  private getRecord(db: MockDb, runId: string): RunRecord {
    const rec = db.runs[runId];
    if (!rec || rec.session_id !== getSessionId())
      throw new ApiError(404, 'not_found', 'Run not found');
    return rec;
  }

  async getRun(runId: string): Promise<Run> {
    await this.wait();
    this.requireUser();
    return materialize(this.getRecord(this.load(), runId), this.now());
  }

  async decide(runId: string, itemId: string, req: DecisionRequest): Promise<Run> {
    await this.wait();
    this.requireUser();
    const db = this.load();
    const rec = this.getRecord(db, runId);
    const run = materialize(rec, this.now());
    if (run.status !== 'needs_review')
      throw new ApiError(409, 'run_not_reviewable', `Run is ${run.status}; decisions are closed`);
    if (!run.review_items.some((i) => i.item_id === itemId))
      throw new ApiError(404, 'not_found', 'Review item not found');
    if (!['accept', 'reject'].includes(req.decision))
      throw new ApiError(400, 'validation_error', 'Invalid decision');
    rec.decisions[itemId] = req.decision;
    rec.last_decision_ms = this.now();
    this.save(db);
    return materialize(rec, this.now());
  }

  async listRuns(): Promise<RunSummary[]> {
    await this.wait();
    this.requireUser();
    const db = this.load();
    const sid = getSessionId();
    const t = this.now();
    return Object.values(db.runs)
      .filter((r) => r.session_id === sid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((rec) => {
        const run = materialize(rec, t);
        const raised = rec.plan.filter((p) => p.raised);
        return {
          run_id: run.run_id,
          filename: run.filename,
          status: run.status,
          created_at: run.created_at,
          flags_checked: run.progress.checked,
          // only meaningful once the agent has finished
          findings_total: run.status === 'queued' || run.status === 'running' ? 0 : raised.length,
          review_total: run.review_items.length,
          review_pending: run.review_items.filter((i) => i.decision === null).length,
          top_flags:
            run.status === 'queued' || run.status === 'running'
              ? []
              : raised.slice(0, 3).map((p) => p.flag_name),
        };
      });
  }

  async getResult(runId: string): Promise<RunResult> {
    await this.wait();
    this.requireUser();
    const run = materialize(this.getRecord(this.load(), runId), this.now());
    if (!run.result)
      throw new ApiError(409, 'result_not_ready', `Run is ${run.status}; no result yet`);
    return run.result;
  }
}
