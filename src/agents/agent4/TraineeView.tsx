// Trainee view: the signed-in trainee's own skill gaps, recommendations and report.
// The trainee ID comes from the session (useAuth().user.traineeId), not from a box. The API must
// still refuse other trainees' results: the UI is not a permission check.

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Spinner } from '@/components/ui';
import { useAuth } from '@/auth';
import { ApiError, useAgent4Api, type Summary } from './api';
import { ResultsBlock } from './SummaryView';
import { summaryErrorText } from './reportView';
import styles from './AgentScreen.module.css';

type Result =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'incomplete' }
  | { kind: 'error'; text: string }
  | { kind: 'ok'; summary: Summary };

export function TraineeView() {
  const api = useAgent4Api();
  const { user } = useAuth();
  const traineeId = user?.traineeId;
  const [result, setResult] = useState<Result>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!traineeId) return;
    let cancelled = false;
    setResult({ kind: 'loading' });
    api.getSummary(traineeId).then(
      (summary) => {
        if (!cancelled) setResult({ kind: 'ok', summary });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) setResult({ kind: 'none' });
        else if (error instanceof ApiError && error.status === 409)
          setResult({ kind: 'incomplete' });
        else if (error instanceof ApiError)
          setResult({ kind: 'error', text: summaryErrorText(error.status, 'trainee') });
        else setResult({ kind: 'error', text: 'The results could not be loaded.' });
      },
    );
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
        {traineeId && result.kind === 'none' && (
          <p className={styles.empty}>{summaryErrorText(404, 'trainee')}</p>
        )}
        {traineeId && result.kind === 'incomplete' && (
          <p className={styles.empty}>Complete all your assessments to view your results.</p>
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
