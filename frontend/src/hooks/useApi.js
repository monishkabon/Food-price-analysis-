// src/hooks/useApi.js
// Generic data-fetching hook with loading, error, and data states.

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useApi(fetchFn, deps)
 * @param {Function} fetchFn  — async function that returns data
 * @param {Array}    deps     — dependency array (re-fetches when these change)
 * @param {object}   options  — { skip: bool } — skip fetching when true
 */
export function useApi(fetchFn, deps = [], { skip = false } = {}) {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const run = useCallback(async () => {
    if (skip) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchFn();
      if (mountedRef.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (mountedRef.current)
        setState({ data: null, loading: false, error: err.message || 'Unknown error' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip]);

  useEffect(() => { run(); }, [run]);

  return { ...state, refetch: run };
}

/**
 * useManualApi(fetchFn)
 * Like useApi but does not auto-fetch — call trigger() manually.
 * @param {Function} fetchFn — async function that returns data
 */
export function useManualApi(fetchFn) {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const trigger = useCallback(async (...args) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await fetchFn(...args);
      if (mountedRef.current) setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      if (mountedRef.current)
        setState({ data: null, loading: false, error: err.message || 'Unknown error' });
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn]);

  return { ...state, trigger };
}
