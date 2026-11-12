import { beforeEach, describe, expect, it } from 'vitest';
import { MockClient, type KeyValueStore } from './mockClient';
import { PER_FLAG_MS, QUEUED_MS, recordIdFor } from './mockAgent';
import { bindHost, type HostUser } from '../../host/bridge';
import { ApiError } from '../types';

function memStore(): KeyValueStore {
  const m: Record<string, string> = {};
  return { getItem: (k) => m[k] ?? null, setItem: (k, v) => void (m[k] = v) };
}

const START = Date.parse('2026-11-09T09:00:00Z');
let clock = START;
let api: MockClient;
const input = { name: 'Test flag', description: 'd', enabled: true };
const payload = {
  records: [
    { comment: 'He is too old to learn new tooling quickly' },
    { comment: 'She is great at mentoring juniors' },
  ],
};

/** Act as the host portal's signed-in user (or nobody). There is no login call in this UI. */
function signInAs(user: HostUser | null) {
  bindHost({ user, getAuthHeaders: () => ({}) });
}
const asUser = () => signInAs({ name: 'analyst', role: 'user' });
const asAdmin = () => signInAs({ name: 'admin', role: 'admin' });

beforeEach(() => {
  clock = START;
  signInAs(null);
  api = new MockClient({ store: memStore(), now: () => clock, delayMs: 0 });
});

describe('host identity', () => {
  it('requires a user from the host for data calls (401)', async () => {
    await expect(api.listFlags()).rejects.toMatchObject({ status: 401 });
    await expect(api.startRun({ filename: 'x.json', payload })).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe('roles', () => {
  it('a user account can read flags and run, but cannot change flags (403)', async () => {
    asUser();
    await expect(api.listFlags()).resolves.toHaveLength(4);
    await expect(api.createFlag(input)).rejects.toMatchObject({ status: 403, code: 'forbidden' });
    await expect(api.deleteFlag((await api.listFlags())[0].id)).rejects.toBeInstanceOf(ApiError);
    await expect(api.startRun({ filename: 'x.json', payload })).resolves.toHaveProperty('run_id');
  });
  it('an admin account can change flags', async () => {
    asAdmin();
    await expect(api.createFlag(input)).resolves.toMatchObject({ name: 'Test flag' });
  });
});

describe('flags', () => {
  beforeEach(() => asAdmin());

  it('starts with exactly the four agreed flags', async () => {
    const names = (await api.listFlags()).map((f) => f.name).sort();
    expect(names).toEqual(['clique', 'low-information', 'other', 'subtle-harsh']);
  });

  it('lists, creates, edits and deletes', async () => {
    const before = (await api.listFlags()).length;
    const f = await api.createFlag(input);
    expect((await api.listFlags()).length).toBe(before + 1);
    const upd = await api.updateFlag(f.id, { description: 'changed' });
    expect(upd.description).toBe('changed');
    await api.deleteFlag(f.id);
    expect((await api.listFlags()).length).toBe(before);
    await expect(api.deleteFlag(f.id)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects duplicate and empty names', async () => {
    await api.createFlag(input);
    await expect(api.createFlag({ ...input, name: ' test FLAG ' })).rejects.toMatchObject({
      status: 409,
    });
    await expect(api.createFlag({ ...input, name: '  ' })).rejects.toMatchObject({ status: 400 });
  });

  it('merges flags into one new flag and retires the sources', async () => {
    const flags = await api.listFlags();
    const [a, b] = flags;
    const merged = await api.mergeFlags({
      source_ids: [a.id, b.id],
      target: { ...input, name: a.name },
    });
    const after = await api.listFlags();
    expect(after.length).toBe(flags.length - 1);
    expect(after.find((f) => f.id === merged.id)).toBeTruthy();
    expect(after.find((f) => f.id === a.id)).toBeUndefined();
    await expect(api.mergeFlags({ source_ids: [merged.id], target: input })).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('runs', () => {
  beforeEach(() => asUser());

  it('moves queued -> running -> needs_review, gates on decisions, then completes', async () => {
    const { run_id } = await api.startRun({ filename: 'a.json', payload });
    expect((await api.getRun(run_id)).status).toBe('queued');

    clock += QUEUED_MS + PER_FLAG_MS * 2;
    const mid = await api.getRun(run_id);
    expect(mid.status).toBe('running');
    expect(mid.progress.checked).toBe(2);
    expect(mid.progress.flags.filter((f) => f.state === 'checking')).toHaveLength(1);

    clock += PER_FLAG_MS * 100;
    const review = await api.getRun(run_id);
    expect(review.status).toBe('needs_review');
    expect(review.result).toBeNull();
    expect(review.review_items.length).toBeGreaterThan(0);

    await expect(api.getResult(run_id)).rejects.toMatchObject({ status: 409 });

    let last = review;
    for (const item of review.review_items)
      last = await api.decide(run_id, item.item_id, { decision: 'accept' });
    expect(last.status).toBe('completed');
    expect(last.result?.summary.human_reviewed).toBe(review.review_items.length);
    expect(last.result?.findings.every((f) => f.status !== undefined)).toBe(true);
    expect(last.result?.findings.every((f) => f.evidence_ids.length > 0)).toBe(true);
    // the explanation is the agent's reasoning about the finding, not the flag's description
    const flags = await api.listFlags();
    for (const f of last.result?.findings ?? []) {
      expect(f.explanation.length).toBeGreaterThan(0);
      for (const flag of flags) expect(f.explanation).not.toContain(flag.description);
    }
    expect(await api.getResult(run_id)).toEqual(last.result);

    await expect(
      api.decide(run_id, review.review_items[0].item_id, { decision: 'reject' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('lists history newest first with summaries', async () => {
    const r1 = await api.startRun({ filename: 'one.json', payload });
    clock += 5000;
    const r2 = await api.startRun({ filename: 'two.json', payload });
    const list = await api.listRuns();
    expect(list.map((r) => r.run_id)).toEqual([r2.run_id, r1.run_id]);
    expect(list[1].filename).toBe('one.json');
  });

  it('refuses to start when no flags are enabled', async () => {
    asAdmin();
    for (const f of await api.listFlags()) await api.updateFlag(f.id, { enabled: false });
    asUser();
    await expect(api.startRun({ filename: 'x.json', payload })).rejects.toMatchObject({
      status: 409,
      code: 'no_enabled_flags',
    });
  });
});

describe('recordIdFor', () => {
  const input = { records: [{ id: 'FB-019', comment: 'x' }, { comment: 'no id' }] };

  it('uses the id of the record a path points into', () => {
    expect(recordIdFor(input, '$.records[0].comment')).toBe('FB-019');
  });

  it('falls back to the path of the record when it has no id', () => {
    expect(recordIdFor(input, '$.records[1].comment')).toBe('$.records[1]');
  });
});
