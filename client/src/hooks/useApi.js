import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Loads data with a service call and re-runs it when `deps` change.
 * Returns { data, meta, loading, error, reload, setData }.
 * Out-of-order responses are ignored, so fast typing in a search box never shows stale results.
 */
export function useApi(loader, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: enabled, error: null });
  const requestId = useRef(0);
  const loaderRef = useRef(loader);
  useLayoutEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++requestId.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await loaderRef.current();
      if (id !== requestId.current) return;
      const isEnvelope = result && typeof result === 'object' && 'data' in result && 'meta' in result;
      setState({
        data: isEnvelope ? result.data : result,
        meta: isEnvelope ? result.meta : null,
        loading: false,
        error: null,
      });
    } catch (error) {
      if (id !== requestId.current) return;
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    if (enabled) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
