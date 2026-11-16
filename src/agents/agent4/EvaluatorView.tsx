// Evaluator view: the list of trainees, and for each one the results and the review decision.
// Both the list and detail screens use the stored-first report loading flow to avoid unnecessary
// agent runs when a report is already available.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/auth';
import { Alert, Button, Input, Select, Spinner } from '@/components/ui';
import { useAgent4Api, type RunStatus, type TraineeRow } from './api';
import { ReviewPanel } from './ReviewPanel';
import { ResultsBlock, StatusBadge } from './SummaryView';
import { loadReportFlow, type Result } from './loadReportFlow';
import styles from './AgentScreen.module.css';

// Filter value for trainees with no run yet (their status is null).
const NOT_ASSESSED = 'not_assessed';
const STATUSES: RunStatus[] = ['pending_review', 'approved', 'rejected', 'failed', 'running'];
const STATUS_TEXT: Record<RunStatus, string> = {
  running: 'Running',
  pending_review: 'Pending review',
  failed: 'Failed',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function EvaluatorView() {
  const [selected, setSelected] = useState<string | null>(null);
  return selected ? (
    <TraineeDetail traineeId={selected} onBack={() => setSelected(null)} />
  ) : (
    <TraineeList onOpen={setSelected} />
  );
}

function TraineeList({ onOpen }: { onOpen: (traineeId: string) => void }) {
  const api = useAgent4Api();
  const [rows, setRows] = useState<TraineeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await api.listTrainees());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The trainee list could not be loaded.');
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter(
      (row) =>
        (!q || row.trainee_id.toLowerCase().includes(q)) &&
        (!status || (status === NOT_ASSESSED ? row.status === null : row.status === status)),
    );
  }, [rows, search, status]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <h1>Trainees</h1>
        <p>Select a trainee to see their skill gaps, recommendations and report.</p>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Input
              label="Search by trainee ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className={styles.filter}>
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value={NOT_ASSESSED}>Not assessed</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_TEXT[value]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error && (
          <Alert kind="error">
            {error}{' '}
            <Button variant="secondary" compact onClick={() => void load()}>
              Try again
            </Button>
          </Alert>
        )}
        {rows === null && !error && <Spinner label="Loading trainees" />}
        {rows !== null && shown.length === 0 && !error && (
          <p className={styles.empty}>
            {rows.length === 0
              ? 'No trainee has been assessed yet.'
              : 'No trainees match these filters.'}
          </p>
        )}
        {shown.length > 0 && (
          <table className={styles.table}>
            <caption className={styles.visuallyHidden}>Trainees and their latest status</caption>
            <thead>
              <tr>
                <th scope="col">Trainee ID</th>
                <th scope="col">Status</th>
                <th scope="col">Last assessed</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.trainee_id}>
                  <td>
                    <button
                      type="button"
                      className={styles.rowButton}
                      onClick={() => onOpen(row.trainee_id)}
                    >
                      {row.trainee_id}
                    </button>
                  </td>
                  <td>
                    {row.status ? (
                      <StatusBadge status={row.status} />
                    ) : (
                      <span className={styles.notAssessed}>Not assessed</span>
                    )}
                  </td>
                  <td className={styles.number}>
                    {row.last_run_at ? row.last_run_at.slice(0, 10) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TraineeDetail({ traineeId, onBack }: { traineeId: string; onBack: () => void }) {
  const api = useAgent4Api();
  const { user } = useAuth();
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
    let cancelled = false;
    setResult({ kind: 'loading' });
    const key = `${traineeId}:${attempt.n}`;
    if (flight.current?.key !== key) {
      flight.current = { key, promise: loadReportFlow(api, traineeId, attempt.skipStored) };
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
      <div className={styles.crumb}>
        <Button variant="secondary" compact onClick={onBack}>
          <svg
            className={styles.backIcon}
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M10 3 5 8l5 5" />
          </svg>
          Back to all trainees
        </Button>
      </div>
      {/* With results, the results block carries the title and status, so it is not repeated. */}
      {result.kind !== 'ok' && (
        <div className={styles.pageHead}>
          <h1>Trainee {traineeId}</h1>
        </div>
      )}

      {result.kind === 'error' && (
        <div className="stack-sm">
          <Alert kind="error">{result.text}</Alert>
          <div>
            <Button variant="secondary" onClick={() => retry(result.stage)}>
              Try again
            </Button>
          </div>
        </div>
      )}
      {result.kind === 'loading' && <Spinner label="Loading results" />}
      {result.kind === 'ok' && (
        <>
          <ResultsBlock summary={result.summary} />
          {result.summary.status === 'pending_review' && (
            <div className={styles.card}>
              <ReviewPanel
                runId={result.summary.run_id}
                reviewer={user?.name ?? ''}
                onDone={(next) => {
                  setResult({ kind: 'ok', summary: { ...result.summary, status: next } });
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
