// Trainee view: the signed-in trainee's own skill gaps, recommendations and report.
// Opening the page asks for the stored report first (GET /stored-summary). Only when the server
// says REPORT_NOT_FOUND does it run the agent once (GET /summary), which also stores the result.
// Any other stored-summary error is shown as an error and never triggers a run.
// The trainee ID comes from the session (useAuth().user.traineeId), not from a box. The API must
// still refuse other trainees' results: the UI is not a permission check.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Spinner } from '@/components/ui';
import { useAuth } from '@/auth';
import { ApiError, REPORT_NOT_FOUND, useAgent4Api, type Agent4Api, type Summary } from './api';
import { ResultsBlock } from './SummaryView';
import { summaryErrorText } from './reportView';
import styles from './AgentScreen.module.css';

type Result =
  | { kind: 'loading' }
  | { kind: 'error'; text: string; stage: 'stored' | 'live' }
  | { kind: 'ok'; summary: Summary };

function errorText(error: unknown): string {
  return error instanceof ApiError
    ? `${summaryErrorText(error.status)} (${error.message})`
    : 'The results could not be loaded.';
}

async function runLive(api: Agent4Api, traineeId: string): Promise<Result> {
  try {
    return { kind: 'ok', summary: await api.getSummary(traineeId) };
  } catch (error) {
    return { kind: 'error', text: errorText(error), stage: 'live' };
  }
}

/** Stored report first; the live run only when the server says no report is stored. */
async function load(api: Agent4Api, traineeId: string, skipStored: boolean): Promise<Result> {
  if (skipStored) return runLive(api, traineeId);
  try {
    return { kind: 'ok', summary: await api.getStoredSummary(traineeId) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === REPORT_NOT_FOUND) {
      return runLive(api, traineeId);
    }
    return { kind: 'error', text: errorText(error), stage: 'stored' };
  }
}

export function TraineeView() {
  const api = useAgent4Api();
  const { user } = useAuth();
  const traineeId = user?.traineeId;
  const [result, setResult] = useState<Result>({ kind: 'loading' });
  const [attempt, setAttempt] = useState({ n: 0, skipStored: false });
  // One request chain per attempt. Strict Mode runs effects twice on the same component, and the
  // ref survives that, so the second run reuses the first run's promise instead of calling again.
  const flight = useRef<{ key: string; promise: Promise<Result> } | null>(null);

  const retry = useCallback(
    (stage: 'stored' | 'live') => setAttempt((a) => ({ n: a.n + 1, skipStored: stage === 'live' })),
    [],
  );

  useEffect(() => {
    if (!traineeId) return;
    let cancelled = false;
    setResult({ kind: 'loading' });
    const key = `${traineeId}:${attempt.n}`;
    if (flight.current?.key !== key) {
      flight.current = { key, promise: load(api, traineeId, attempt.skipStored) };
    }
    void flight.current.promise.then((next) => {
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
        {traineeId && result.kind === 'error' && (
          <div className="stack-sm">
            <Alert kind="error">{result.text}</Alert>
            <div>
              <Button variant="secondary" onClick={() => retry(result.stage)}>
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
