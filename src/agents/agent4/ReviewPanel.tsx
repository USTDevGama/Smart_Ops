import { useState } from 'react';
import { Alert, Button, Textarea } from '@/components/ui';
import { useAgent4Api, type RunStatus } from './api';
import styles from './ReviewPanel.module.css';

// The reviewer's decision. The plan is not shared until a person approves it.
// The reviewer is the signed-in user (the local user while sign-in is off).
export function ReviewPanel({
  runId,
  reviewer,
  onDone,
}: {
  runId: string;
  reviewer: string;
  onDone: (status: RunStatus) => void;
}) {
  const api = useAgent4Api();
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const commentProblem =
    decision === 'reject' && !comment.trim() ? 'A rejection needs a comment.' : null;

  async function submit() {
    if (commentProblem) return;
    setSending(true);
    setMessage(null);
    try {
      const result = await api.submitReview(runId, {
        decision,
        reviewer_ref: reviewer || 'reviewer',
        comment: comment.trim() || null,
      });
      setMessage({ kind: 'success', text: `Recorded: ${result.status.replace('_', ' ')}.` });
      onDone(result.status);
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'The decision was not saved.',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.review} aria-labelledby="review-heading">
      <h3 id="review-heading">Reviewer decision</h3>
      <p className={styles.meta}>
        A person must decide. The plan is not shared until it is approved.
      </p>
      <fieldset className={styles.fieldset}>
        <legend>Decision</legend>
        <label className={styles.choice}>
          <input
            type="radio"
            name="decision"
            checked={decision === 'approve'}
            onChange={() => setDecision('approve')}
          />
          Approve
        </label>
        <label className={styles.choice}>
          <input
            type="radio"
            name="decision"
            checked={decision === 'reject'}
            onChange={() => setDecision('reject')}
          />
          Reject
        </label>
      </fieldset>
      <p className={styles.meta}>Recorded as {reviewer || 'the signed-in reviewer'}.</p>
      <Textarea
        label={decision === 'reject' ? 'Comment (required)' : 'Comment (optional)'}
        rows={3}
        maxLength={1000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        error={commentProblem ?? undefined}
      />
      <div className={styles.actions}>
        <Button onClick={() => void submit()} disabled={commentProblem !== null || sending}>
          Submit decision
        </Button>
      </div>
      {message && (
        <Alert kind={message.kind === 'success' ? 'success' : 'error'}>{message.text}</Alert>
      )}
    </section>
  );
}
