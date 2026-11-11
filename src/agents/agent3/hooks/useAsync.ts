import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { ApiError } from '../api';

export type AsyncState<T> = {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  reload: () => void;
};

/** Run an async loader on mount and whenever `deps` change. `reload()` runs it again. */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const hasData = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // Reloads (and polling) refresh silently; only the first load shows a spinner.
    if (!hasData.current) setLoading(true);
    loaderRef
      .current()
      .then((d) => {
        if (cancelled) return;
        hasData.current = true;
        setData(d);
        setError(undefined);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.detail : 'Something went wrong.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}

/**
 * Call `tick` every `intervalMs` while `active` is true.
 * Used for resumes/demand documents (2s while queued/extracting) and reports (3s while generating).
 */
export function usePolling(active: boolean, intervalMs: number, tick: () => void): void {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => tickRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
}
