// Evaluator view: the list of trainees, and for each one the results and the review decision.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/auth';
import { Alert, Button, Input, Select, Spinner } from '@/components/ui';
import { ApiError, useAgent4Api, type RunStatus, type Summary, type TraineeRow } from './api';
import { ReviewPanel } from './ReviewPanel';
import { ResultsBlock, StatusBadge } from './SummaryView';
import styles from './AgentScreen.module.css';

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
        (!q || row.trainee_id.toLowerCase().includes(q)) && (!status || row.status === status),
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
                    <StatusBadge status={row.status} />
                  </td>
                  <td className={styles.number}>{row.last_run_at.slice(0, 10)}</td>
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
  const [summary, setSummary] = useState<Summary | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setMissing(false);
    try {
      setSummary(await api.getSummary(traineeId));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setMissing(true);
      } else {
        setError(err instanceof Error ? err.message : 'The results could not be loaded.');
      }
    }
  }, [api, traineeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assess() {
    setRunning(true);
    setError(null);
    try {
      await api.assess(traineeId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The assessment did not run.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Button variant="secondary" compact onClick={onBack}>
          Back to all trainees
        </Button>
      </div>
      <div className={styles.pageHead}>
        <h1>Trainee {traineeId}</h1>
        {summary && <StatusBadge status={summary.status} />}
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {!summary && !error && !missing && <Spinner label="Loading results" />}
      {missing && (
        <div className={styles.card}>
          <p>No assessment for {traineeId} yet.</p>
          <div className={styles.actions}>
            <Button onClick={() => void assess()} disabled={running}>
              {running ? 'Running assessment' : 'Run assessment from the trainee database'}
            </Button>
          </div>
        </div>
      )}
      {summary && (
        <>
          <ResultsBlock summary={summary} />
          {summary.status === 'pending_review' && (
            <div className={styles.card}>
              <ReviewPanel
                runId={summary.run_id}
                reviewer={user?.name ?? ''}
                onDone={(next) => setSummary({ ...summary, status: next })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
