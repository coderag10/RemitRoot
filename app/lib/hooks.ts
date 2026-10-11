"use client";

import { useCallback, useEffect, useState } from "react";

type Loaded<T> = { data: T | null; error: unknown; loading: boolean };

/** Loads on mount and whenever `load` changes; `reload` keeps the old data on screen meanwhile. */
export function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<Loaded<T>>({ data: null, error: null, loading: true });
  const reload = useCallback(
    () =>
      load().then(
        (data) => setState({ data, error: null, loading: false }),
        (error) => setState((previous) => ({ ...previous, error, loading: false })),
      ),
    [load],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  return { ...state, reload };
}

/** The current time in unix seconds, refreshed often enough to show interest and maturity. */
export function useNow(intervalMs = 5000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
