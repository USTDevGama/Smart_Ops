// Trainee view: the signed-in trainee's own skill gaps, recommendations and report.
// The trainee ID comes from the session (useAuth().user.traineeId), not from a box. The API must
// still refuse other trainees' results: the UI is not a permission check.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Spinner } from '@/components/ui';
import { useAuth } from '@/auth';
import { ApiError, useAgent4Api, type Agent4Api, type RunStatus, type Summary } from './api';
import { ResultsBlock } from './SummaryView';
import { summaryErrorText } from './reportView';
import styles from './AgentScreen.module.css';

type Result =
  | { kind: 'loading' }
  | { kind: 'ok'; summary: Summary }
  // The trainee is not in the trainee database.
  | { kind: 'not_found' }
  // The trainee exists but has no assessment scores, so there is nothing to run on.
  | { kind: 'no_data' }
  // A run exists but is not approved yet (or is still running). It is not re-run.
  | { kind: 'waiting'; status: RunStatus }
  | { kind: 'error'; text: string };

const WAITING_TEXT: Partial<Record<RunStatus, string>> = {
  running: 'Your assessment is being prepared. Check again shortly.',
  pending_review: 'Your results are waiting for review. They will appear here once approved.',
  rejected: 'Your latest results were not approved. Your reviewer will follow up.',
};

function errorResult(error: unknown): Result {
  if (error instanceof ApiError) return { kind: 'error', text: summaryErrorText(error.status) };
  return { kind: 'error', text: 'The results could not be loaded.' };
}

/**
 * Decides what the trainee sees. The server does all the diagnostic work; this only picks which
 * endpoint to ask:
 *   1. approved-summary: a stored approved report is shown as is. No agent run.
 *   2. On 404, trainees (read only) says whether the trainee exists and has a run already.
 *      - not listed: not found.
 *      - has a run (any status): no new run. Shown as waiting, or as a failure for a failed run.
 *      - no run yet: summary runs the agent on the trainee's stored scores and saves the run.
 *        Its 404 then means the trainee has no scores.
 */
async function loadResult(api: Agent4Api, traineeId: string): Promise<Result> {
  try {
    return { kind: 'ok', summary: await api.getApprovedSummary(traineeId) };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) return errorResult(error);
  }

  const row = (await api.listTrainees()).find((r) => r.trainee_id === traineeId);
  if (!row) return { kind: 'not_found' };
  if (row.status === 'failed') {
    return { kind: 'error', text: 'The last assessment run failed. Try again to run it again.' };
  }
  if (row.status !== null) return { kind: 'waiting', status: row.status };

  try {
    return { kind: 'ok', summary: await api.getSummary(traineeId) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { kind: 'no_data' };
    return errorResult(error);
  }
}

export function TraineeView() {
  const api = useAgent4Api();
  const { user } = useAuth();
  const traineeId = user?.traineeId;
  const [result, setResult] = useState<Result>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // One load per trainee and attempt. React runs effects twice in development, and a second
  // run must reuse the first run's request, not start another agent run.
  const inFlight = useRef<{ key: string; promise: Promise<Result> } | null>(null);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!traineeId) return;
    let cancelled = false;
    setResult({ kind: 'loading' });
    const key = `${traineeId}:${attempt}`;
    if (inFlight.current?.key !== key) {
      inFlight.current = { key, promise: loadResult(api, traineeId).catch(errorResult) };
    }
    inFlight.current.promise.then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [api, traineeId, attempt]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <h1>My skill results</h1>
        <p>Your skill gaps, recommendations and skill report.</p>
      </div>

      <div className={styles.result} aria-live="polite">
        {!traineeId && (
          <Alert kind="warning">
            Your account has no trainee ID. Sign out and sign in again with your trainee ID.
          </Alert>
        )}
        {traineeId && result.kind === 'loading' && <Spinner label="Loading results" />}
        {traineeId && result.kind === 'not_found' && (
          <Alert kind="error">Your trainee ID was not found in the trainee database.</Alert>
        )}
        {traineeId && result.kind === 'no_data' && (
          <p className={styles.empty}>
            {summaryErrorText(404)} Your assessment scores have not been recorded yet.
          </p>
        )}
        {traineeId && result.kind === 'waiting' && (
          <p className={styles.empty}>
            {WAITING_TEXT[result.status] ?? 'Your results are not available yet.'}
          </p>
        )}
        {traineeId && result.kind === 'error' && (
          <div className="stack-sm">
            <Alert kind="error">{result.text}</Alert>
            <div>
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
            </div>
          </div>
        )}
        {traineeId && result.kind === 'ok' && <ResultsBlock summary={result.summary} />}
      </div>
    </div>
  );
}
