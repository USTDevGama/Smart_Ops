import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { RunSummary } from '../api/types';
import { batchLabel, fmtDateTime } from '../util/format';
import Alert from './Alert';
import Button from './Button';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { useToast } from './Toast';

function Count({ label, value, hot }: { label: string; value: string | number; hot?: boolean }) {
  return (
    <div className={`rounded-sm py-2 ${hot ? 'bg-highlight' : 'bg-neu-50'}`}>
      <dd className="text-xl font-medium tabular-nums text-heading">{value}</dd>
      <dt className="text-xs text-body">{label}</dt>
    </div>
  );
}

/**
 * DESIGN_SPEC section 5.4: hover gives the highlight background and border; keyboard focus uses the accent outline.
 * The card is a container with two sibling buttons (open, delete): a button cannot sit inside another button.
 */
function HistoryCard({
  run,
  onOpen,
  onDelete,
}: {
  run: RunSummary;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const live = run.status === 'queued' || run.status === 'running';
  return (
    <li className="flex flex-col rounded-md border border-line bg-surface transition-colors hover:border-highlight-border hover:bg-highlight">
      <button
        onClick={onOpen}
        className="flex w-full flex-1 flex-col rounded-md p-4 pb-2 text-left"
      >
        <div className="flex w-full items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-heading">{batchLabel(run.batch_id)}</p>
          <StatusBadge status={run.status} />
        </div>
        <time dateTime={run.created_at} className="mt-1 text-xs text-body">
          {fmtDateTime(run.created_at)}
        </time>

        <dl className="mt-3 grid w-full grid-cols-3 gap-2 text-center">
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
      <div className="flex justify-end px-4 pb-3">
        <Button
          variant="danger-ghost"
          size="sm"
          onClick={onDelete}
          disabled={live}
          title={live ? 'Wait until the run has finished' : undefined}
          aria-label={`Delete ${batchLabel(run.batch_id)}`}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

/** Previous runs in this session, newest first. Click a card to open it full width. */
export default function HistoryView({ onOpen }: { onOpen: (runId: string) => void }) {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RunSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setRuns(await api.listRuns());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => void load(), [load]);

  async function remove(run: RunSummary) {
    setBusy(true);
    try {
      await api.deleteRun(run.run_id);
      toast(`Deleted ${batchLabel(run.batch_id)}`, 'success');
    } catch (e) {
      // 404: it was already gone (another tab); anything else is shown with the server's message
      if ((e as { status?: number }).status === 404) toast('That run was already deleted', 'info');
      else toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
    await load();
  }

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
            <HistoryCard
              key={r.run_id}
              run={r}
              onOpen={() => onOpen(r.run_id)}
              onDelete={() => setDeleting(r)}
            />
          ))}
        </ul>
      )}
      {deleting && (
        <Modal
          title="Delete this run?"
          onClose={() => !busy && setDeleting(null)}
          footer={
            <>
              <Button variant="secondary" disabled={busy} onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => remove(deleting)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-body">
            <strong>{batchLabel(deleting.batch_id)}</strong> and its results are removed from the
            history and from the database. This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
