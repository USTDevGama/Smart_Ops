// Trainee view: enter a trainee ID and see that trainee's skill gaps, recommendations and report.
// The role is set at login. In production the trainee's own ID should come from sign-in, not
// from this box; until then the API must limit trainees to their own results.

import { useState, type FormEvent } from 'react';
import { Alert, Button, Input, Spinner } from '@/components/ui';
import { ApiError, isMockMode, useAgent4Api, type Summary } from './api';
import { ResultsBlock } from './SummaryView';
import styles from './AgentScreen.module.css';

type Result =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'none'; traineeId: string }
  | { kind: 'error'; text: string }
  | { kind: 'ok'; summary: Summary };

export function TraineeView() {
  const api = useAgent4Api();
  const [traineeId, setTraineeId] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });

  async function lookup(event?: FormEvent) {
    event?.preventDefault();
    const id = traineeId.trim();
    if (!id) {
      setResult({ kind: 'idle' });
      return;
    }
    setResult({ kind: 'loading' });
    try {
      setResult({ kind: 'ok', summary: await api.getSummary(id) });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setResult({ kind: 'none', traineeId: id });
      } else {
        setResult({
          kind: 'error',
          text: error instanceof Error ? error.message : 'The results could not be loaded.',
        });
      }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <h1>My skill results</h1>
        <p>Enter your trainee ID to see your skill gaps, recommendations and assessment report.</p>
      </div>

      <form className={styles.lookup} onSubmit={lookup}>
        <div className={styles.lookupField}>
          <Input
            label="Trainee ID"
            value={traineeId}
            onChange={(event) => setTraineeId(event.target.value)}
            placeholder="for example T-06"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={result.kind === 'loading'}>
          View results
        </Button>
      </form>
      {isMockMode && <p className={styles.small}>Mock data: try T-06 or T-09.</p>}

      <div className={styles.result} aria-live="polite">
        {result.kind === 'idle' && (
          <p className={styles.empty}>Enter your trainee ID to see your results.</p>
        )}
        {result.kind === 'loading' && <Spinner label="Loading results" />}
        {result.kind === 'none' && (
          <p className={styles.empty}>
            No results yet for <strong>{result.traineeId}</strong>. Check the ID and try again.
          </p>
        )}
        {result.kind === 'error' && <Alert kind="error">{result.text}</Alert>}
        {result.kind === 'ok' && <ResultsBlock summary={result.summary} />}
      </div>
    </div>
  );
}
