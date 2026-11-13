import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Decision, Run } from '../api/types';

/** Poll interval while a run is queued/running. Real backend: 1000ms is plenty. */
export const POLL_MS = 700;

export const isActive = (r: Run | null) => !!r && (r.status === 'queued' || r.status === 'running');

/**
 * Loads GET /runs/{id} and keeps polling until the run leaves queued/running.
 * Re-fetches whenever runId changes (used by both a fresh run and a run opened from History).
 */
export function useRun(runId: string | null) {
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRun(null);
    setError(null);
    if (!runId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const r = await api.getRun(runId);
        if (cancelled) return;
        setRun(r);
        setError(null);
        if (r.status === 'queued' || r.status === 'running') timer = setTimeout(tick, POLL_MS);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        timer = setTimeout(tick, POLL_MS * 4); // transient failure: keep trying, slower
      }
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId]);

  /** POST a decision; the response is the updated Run (completed once nothing is pending). */
  const decide = useCallback(
    async (itemId: string, decision: Decision) => {
      if (!runId) return;
      setRun(await api.decide(runId, itemId, { decision }));
    },
    [runId],
  );

  return { run, error, decide };
}
