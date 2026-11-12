import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Alert, Button, Card, Modal, Spinner, Textarea, type AlertKind } from '@/components/ui';
import { ApiError, useApi, type SessionDetail } from '../api';
import { MoodMeter } from '../components/MoodMeter';
import { ReportPanel } from '../components/ReportPanel';
import { StatusBadge } from '../components/StatusBadge';
import { Transcript } from '../components/Transcript';
import { ChatController, endReasonText } from '../hooks/chatController';
import styles from './ChatRoom.module.css';

type Flash = { kind: AlertKind; text: string };

type Props = {
  initial: SessionDetail;
  flash?: Flash;
  onFlash: (f: Flash | undefined) => void;
  onLeave: () => void;
};

const MAX_CHARS = 4000;

/**
 * The chat room. Rules (idempotency ticket, pending message, retry vs refuse) live in
 * ChatController; this component only renders its state.
 */
export function ChatRoom({ initial, flash, onFlash, onLeave }: Props) {
  const api = useApi();
  const ctrl = useRef<ChatController | null>(null);
  if (!ctrl.current) ctrl.current = new ChatController(api, initial);
  const c = ctrl.current;
  const s = c.session;
  const ended = s.status === 'ended';

  const [, bump] = useState(0);
  const rerender = () => bump((n) => n + 1);
  const [text, setText] = useState('');
  const [replying, setReplying] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const log = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const busy = replying || ending;

  // Keep the newest message in view. Scroll the log only, not the page.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.turns.length, c.pending, replying]);

  async function handleOutcome(p: ReturnType<ChatController['send']>) {
    const out = await p;
    if (out.kind === 'empty') onFlash({ kind: 'warning', text: 'Type a message first.' });
    else if (out.kind === 'ok') {
      setText('');
      onFlash(out.ended ? { kind: 'info', text: endReasonText(out.endReason) } : undefined);
    } else if (out.kind === 'refused')
      onFlash({ kind: 'error', text: `That message was refused: ${out.message}` });
    else onFlash({ kind: 'error', text: `Could not get a reply: ${out.message}` });
  }

  async function sendWith(start: () => ReturnType<ChatController['send']>) {
    setReplying(true);
    try {
      await handleOutcome(start());
    } finally {
      setReplying(false);
      rerender();
    }
  }

  async function endChat() {
    setEnding(true);
    try {
      await c.end();
      setConfirmEnd(false);
      onFlash({ kind: 'info', text: endReasonText('trainee_ended') });
    } catch (e) {
      onFlash({
        kind: 'error',
        text: e instanceof ApiError ? e.detail : 'Could not end the chat.',
      });
    } finally {
      setEnding(false);
      rerender();
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) void sendWith(() => c.send(text));
  };

  // Enter sends, Shift+Enter starts a new line. Enter confirms an IME composition (e.g. Japanese
  // input) instead of sending, so typing in those languages is not interrupted.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (text.trim() && !busy) form.current?.requestSubmit();
  };

  const remaining = MAX_CHARS - text.length;

  return (
    <div className={styles.room}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className="stack-sm">
            <h1>Chat with {s.persona.key}</h1>
            <span className="caption">Character version v{s.persona.version_no}</span>
          </div>
          <StatusBadge status={s.status} />
        </div>
        <div className={styles.stats}>
          <div className={styles.mood}>
            <MoodMeter level={s.level} />
          </div>
          <span className={styles.count}>
            Your messages:{' '}
            <strong>
              {s.turns_used} of {s.max_turns}
            </strong>
          </span>
        </div>
      </header>

      <div
        ref={log}
        className={styles.log}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        tabIndex={0}
      >
        {s.turns.length === 0 && !c.pending && (
          <p className="caption">The client has not spoken yet.</p>
        )}
        <Transcript turns={s.turns} youLabel="You" />
        {c.pending && (
          <div className={styles.pending}>
            {replying ? (
              // In flight: a normal chat-app spinner next to the message, not an error.
              <span className={styles.pendingLabel}>
                <Spinner label="Sending" />
              </span>
            ) : (
              // Failed: the resend/discard card below explains what to do.
              <span className={styles.pendingLabel}>You · not saved yet</span>
            )}
            <p className={replying ? styles.sendingBubble : styles.pendingBubble}>
              {c.pending.content}
            </p>
          </div>
        )}
        {replying && (
          <div className={styles.typing}>
            <Spinner label="Client is replying" />
          </div>
        )}
      </div>

      {/* Once ended, the summary card below already says why; the info flash would repeat it. */}
      {flash && !(ended && flash.kind === 'info') && <Alert kind={flash.kind}>{flash.text}</Alert>}

      {c.pending && !replying && !ended && (
        <Card className="stack-sm">
          <Alert kind="warning">This message was not saved. Send it again or discard it.</Alert>
          <div className={styles.actions}>
            <Button disabled={busy} onClick={() => sendWith(() => c.resend())}>
              Send it again
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                c.discard();
                rerender();
              }}
            >
              Discard it
            </Button>
          </div>
        </Card>
      )}

      {ended ? (
        <Card className="stack">
          <Alert kind="info">{endReasonText(s.end_reason)}</Alert>
          <ReportPanel sessionId={s.id} isAdmin={false} ensure />
          <div>
            <Button variant="secondary" onClick={onLeave}>
              Back to the start
            </Button>
          </div>
        </Card>
      ) : (
        !(c.pending && !replying) && (
          <form ref={form} className={styles.composer} onSubmit={onSubmit}>
            <Textarea
              label="Your answer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
              maxLength={MAX_CHARS}
              rows={3}
              helper={`${remaining} characters left · Enter to send, Shift+Enter for a new line`}
            />
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => setConfirmEnd(true)} disabled={busy}>
                End the chat
              </Button>
              <Button type="submit" disabled={busy || !text.trim()}>
                {replying ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </form>
        )
      )}

      <Modal
        open={confirmEnd}
        title="End this chat?"
        onClose={() => setConfirmEnd(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmEnd(false)} disabled={ending}>
              Keep chatting
            </Button>
            <Button onClick={endChat} disabled={ending}>
              {ending ? 'Ending…' : 'End chat'}
            </Button>
          </>
        }
      >
        <p>
          You cannot send more messages after this. You can still read the transcript and get the
          report.
        </p>
      </Modal>
    </div>
  );
}
