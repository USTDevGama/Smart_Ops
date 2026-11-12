import { ApiError, type Agent3Api, type SessionDetail } from '../api';

/** Mirrors Smart_Ops_Pod3 `ui/chat.py` END_REASONS. */
const END_REASON_TEXT: Record<string, string> = {
  turn_cap: 'The chat reached its message limit.',
  trainee_ended: 'You ended the chat.',
  time_limit: 'The chat reached its time limit.',
  concerns_resolved: "The client's concerns were resolved.",
  admin_ended: 'An admin ended the chat.',
};

export function endReasonText(code: string | null | undefined): string {
  return (code && END_REASON_TEXT[code]) || 'The chat has ended.';
}

export const MAX_LEVEL = 4;

export type Pending = { content: string; ticket: string };

export type SendOutcome =
  | { kind: 'ok'; ended: boolean; endReason: string | null }
  | { kind: 'empty' }
  /** Network or server failure. The message is kept so the user can send it again. */
  | { kind: 'retryable'; message: string }
  /** The server said no (4xx). The message is dropped. */
  | { kind: 'refused'; message: string };

function newTicket(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

/**
 * Chat rules, kept out of React so they can be tested (port of ChatController in Pod3 `ui/chat.py`):
 *  - every message gets one Idempotency-Key ("ticket"); a retry re-uses it so the server never saves it twice
 *  - network failure or 5xx keeps the pending message; 4xx drops it
 *  - after every attempt the session is quietly re-fetched
 */
export class ChatController {
  pending: Pending | null = null;

  constructor(
    private api: Agent3Api,
    public session: SessionDetail,
  ) {}

  async send(text: string): Promise<SendOutcome> {
    const content = text.trim();
    if (!content) return { kind: 'empty' };
    this.pending = { content, ticket: newTicket() };
    return this.attempt();
  }

  /** Send the pending message again with the same ticket. */
  async resend(): Promise<SendOutcome> {
    if (!this.pending) return { kind: 'empty' };
    return this.attempt();
  }

  discard(): void {
    this.pending = null;
  }

  async end(): Promise<void> {
    this.session = await this.api.endSession(this.session.id);
  }

  async refresh(): Promise<void> {
    try {
      this.session = await this.api.getSession(this.session.id);
    } catch {
      /* quiet: the next action will surface any real problem */
    }
  }

  private async attempt(): Promise<SendOutcome> {
    const p = this.pending!;
    try {
      const { done } = await this.api.sendTurn(this.session.id, p.content, p.ticket);
      this.pending = null;
      await this.refresh();
      return { kind: 'ok', ended: done.ended, endReason: done.end_reason };
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, 'Something went wrong.');
      if (err.retryable) {
        await this.refresh();
        return { kind: 'retryable', message: err.detail };
      }
      this.pending = null;
      await this.refresh();
      return { kind: 'refused', message: err.detail };
    }
  }
}
