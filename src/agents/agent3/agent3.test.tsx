import { describe, expect, it, vi } from 'vitest';
import { ApiError, type Agent3Api, type SessionDetail } from './api';
import { createMockApi, resetMockStore } from './api/mockApi';
import { errorDetail, parseSse } from './api/httpApi';
import { validatePersona, emptyPersona } from './components/PersonaEditor';
import { ChatController, endReasonText } from './hooks/chatController';

const session = { id: 's1', turns: [] } as unknown as SessionDetail;

function fakeApi(sendTurn: Agent3Api['sendTurn']): Agent3Api {
  return {
    sendTurn,
    getSession: vi.fn().mockResolvedValue(session),
    endSession: vi.fn().mockResolvedValue(session),
  } as unknown as Agent3Api;
}

const done = { ended: false, end_reason: null };

describe('ChatController', () => {
  it('ignores empty messages', async () => {
    const c = new ChatController(fakeApi(vi.fn()), session);
    expect(await c.send('   ')).toEqual({ kind: 'empty' });
    expect(c.pending).toBeNull();
  });

  it('keeps the message and re-uses the same ticket after a retryable failure', async () => {
    const sendTurn = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(0, 'offline'))
      .mockResolvedValueOnce({ done });
    const c = new ChatController(fakeApi(sendTurn), session);

    expect((await c.send(' hello ')).kind).toBe('retryable');
    expect(c.pending?.content).toBe('hello');
    const ticket = c.pending!.ticket;

    expect((await c.resend()).kind).toBe('ok');
    expect(c.pending).toBeNull();
    expect(sendTurn.mock.calls[0][2]).toBe(ticket);
    expect(sendTurn.mock.calls[1][2]).toBe(ticket);
  });

  it('treats 5xx as retryable and 4xx as refused (message dropped)', async () => {
    const c5 = new ChatController(
      fakeApi(vi.fn().mockRejectedValue(new ApiError(502, 'bad'))),
      session,
    );
    expect((await c5.send('hi')).kind).toBe('retryable');
    expect(c5.pending).not.toBeNull();

    const c4 = new ChatController(
      fakeApi(vi.fn().mockRejectedValue(new ApiError(409, 'ended'))),
      session,
    );
    expect(await c4.send('hi')).toEqual({ kind: 'refused', message: 'ended' });
    expect(c4.pending).toBeNull();
  });

  it('can discard a pending message', async () => {
    const c = new ChatController(fakeApi(vi.fn().mockRejectedValue(new ApiError(0, 'x'))), session);
    await c.send('hi');
    c.discard();
    expect(c.pending).toBeNull();
  });
});

describe('endReasonText', () => {
  it('maps known codes and falls back', () => {
    expect(endReasonText('turn_cap')).toBe('The chat reached its message limit.');
    expect(endReasonText('admin_ended')).toBe('An admin ended the chat.');
    expect(endReasonText('mystery')).toBe('The chat has ended.');
    expect(endReasonText(null)).toBe('The chat has ended.');
  });
});

describe('http helpers', () => {
  it('parses the two SSE events', () => {
    const body = 'event: message\ndata: {"a":1}\n\nevent: done\ndata: {"ended":false}\n\n';
    expect(parseSse(body)).toEqual([
      { event: 'message', data: '{"a":1}' },
      { event: 'done', data: '{"ended":false}' },
    ]);
  });

  it('flattens 422 errors to "loc: msg" lines', () => {
    const body = {
      detail: [
        { loc: ['body', 'config', 'name'], msg: 'field required' },
        { loc: ['body', 'key'], msg: 'bad key' },
      ],
    };
    expect(errorDetail(body, 'x')).toBe('config.name: field required\nkey: bad key');
    expect(errorDetail({ detail: 'nope' }, 'x')).toBe('nope');
    expect(errorDetail(null, 'fallback')).toBe('fallback');
  });
});

describe('validatePersona', () => {
  it('accepts the sample and flags broken rules', () => {
    expect(validatePersona(emptyPersona())).toEqual([]);
    const bad = {
      ...emptyPersona(),
      min_turns: 9,
      max_turns: 3,
      t_escalate: 0.9,
      t_deescalate: 0.2,
      main_concerns: [],
    };
    expect(validatePersona(bad)).toHaveLength(3);
  });
});

describe('mock API', () => {
  const as = (name: string, role: 'trainee' | 'admin') => () => ({
    'X-Dev-User': name,
    'X-Dev-Role': role,
  });

  it('replays a turn with the same idempotency key instead of saving twice', async () => {
    resetMockStore();
    const api = createMockApi(as('anna', 'trainee'));
    const { item } = await api.uploadProfile(new File(['x'], 'cv.txt', { type: 'text/plain' }));
    await new Promise((r) => setTimeout(r, 2100)); // mock extraction takes ~2s
    const s = await api.startSession('verma-strict', item.id);
    const first = await api.sendTurn(s.id, 'We are sorry and will recover by Friday.', 'k1');
    const again = await api.sendTurn(s.id, 'We are sorry and will recover by Friday.', 'k1');
    expect(again.done.replayed).toBe(true);
    expect(again.message.id).toBe(first.message.id);
    expect((await api.getSession(s.id)).turns_used).toBe(1);
  }, 10000);

  it('reports a re-upload as reused and blocks admin-only calls for trainees', async () => {
    resetMockStore();
    const api = createMockApi(as('anna', 'trainee'));
    const file = () => new File(['x'], 'cv.txt', { type: 'text/plain' });
    expect((await api.uploadProfile(file())).reused).toBe(false);
    expect((await api.uploadProfile(file())).reused).toBe(true);
    await expect(api.listDemand()).rejects.toMatchObject({ status: 403 });
  });
});
