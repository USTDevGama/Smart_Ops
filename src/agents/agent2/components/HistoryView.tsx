import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { RunSummary } from '../api/types';
import { fmtDateTime } from '../util/format';
import Alert from './Alert';
import Button from './Button';
import StatusBadge from './StatusBadge';

function Count({ label, value, hot }: { label: string; value: string | number; hot?: boolean }) {
  return (
    <div className={`rounded-sm py-2 ${hot ? 'bg-highlight' : 'bg-neu-50'}`}>
      <dd className="text-xl font-medium tabular-nums text-heading">{value}</dd>
      <dt className="text-xs text-body">{label}</dt>
    </div>
  );
}

/** DESIGN_SPEC section 5.4: hover gives the highlight background and border; keyboard focus uses the accent outline. */
function HistoryCard({ run, onOpen }: { run: RunSummary; onOpen: () => void }) {
  const live = run.status === 'queued' || run.status === 'running';
  return (
    <li>
      <button
        onClick={onOpen}
        className="flex h-full w-full flex-col rounded-md border border-line bg-surface p-4 text-left transition-colors hover:border-highlight-border hover:bg-highlight"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-heading">{run.filename}</p>
          <StatusBadge status={run.status} />
        </div>
        <time dateTime={run.created_at} className="mt-1 text-xs text-body">
          {fmtDateTime(run.created_at)}
        </time>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Count label="Findings" value={live ? '…' : run.findings_total} />
          <Count label="Reviews" value={live ? '…' : run.review_total} />
          <Count
            label="Pending"
            value={live ? '…' : run.review_pending}
            hot={run.review_pending > 0}
          />
        </dl>

        {run.top_flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {run.top_flags.map((n) => (
              <span
                key={n}
                className="rounded-sm border border-line bg-neu-50 px-2 text-xs text-heading"
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </button>
    </li>
  );
}

/** Previous runs in this session, newest first. Click a card to open it full width. */
export default function HistoryView({ onOpen }: { onOpen: (runId: string) => void }) {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRuns(await api.listRuns());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => void load(), [load]);

  // keep in-flight runs fresh
  const anyLive = runs?.some((r) => r.status === 'queued' || r.status === 'running');
  useEffect(() => {
    if (!anyLive) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [anyLive, load]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2>History</h2>
          <p className="text-sm text-body">Runs from this session. Click one to open it.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          Refresh
        </Button>
      </div>

      {error && (
        <Alert kind="error" className="mt-4">
          Could not load history: {error}
        </Alert>
      )}
      {runs === null && !error && <p className="mt-6 text-sm text-body">Loading…</p>}
      {runs && runs.length === 0 && (
        <div className="mt-6 rounded-md border border-dashed border-neu-300 bg-surface p-10 text-center text-sm text-body">
          No runs yet in this session. Add input on the “New run” tab to get started.
        </div>
      )}
      {runs && runs.length > 0 && (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map((r) => (
            <HistoryCard key={r.run_id} run={r} onOpen={() => onOpen(r.run_id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
