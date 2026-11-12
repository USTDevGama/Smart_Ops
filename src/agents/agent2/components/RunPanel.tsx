import type { Decision, Run } from '../api/types';
import Alert from './Alert';
import ReviewQueue from './ReviewQueue';
import ResultViewer from './ResultViewer';
import RunAnimation from './RunAnimation';
import StatusBadge from './StatusBadge';

/**
 * Renders a run by status. Used for the right tile of a fresh run AND full-width for a run opened from History,
 * so both look identical.
 */
export default function RunPanel({
  run,
  error,
  onDecide,
}: {
  run: Run | null;
  error: string | null;
  onDecide: (itemId: string, d: Decision) => Promise<void>;
}) {
  if (!run) {
    return error ? (
      <Alert kind="error">Could not load the run: {error}</Alert>
    ) : (
      <p className="text-sm text-body">Starting…</p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-line pb-3">
        <p className="truncate text-sm font-medium text-heading">{run.filename}</p>
        <StatusBadge status={run.status} />
      </div>
      {error && (
        <Alert kind="warning" className="mb-3">
          Connection problem, retrying… ({error})
        </Alert>
      )}

      {(run.status === 'queued' || run.status === 'running') && <RunAnimation run={run} />}
      {run.status === 'needs_review' && (
        <ReviewQueue items={run.review_items} onDecide={onDecide} />
      )}
      {run.status === 'completed' && run.result && <ResultViewer result={run.result} />}
      {run.status === 'failed' && (
        <Alert kind="error">The run failed{run.error ? `: ${run.error}` : '.'}</Alert>
      )}
    </div>
  );
}
