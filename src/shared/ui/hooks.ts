import { useCallback, useEffect, useRef, useState } from 'react';

export interface Loaded<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Runs `load` on mount and whenever `deps` change; `reload` re-runs it (used for Try again and polling). */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, error: null, loading: s.data === null }));
    loadRef.current().then(
      (data) => live && setState({ data, error: null, loading: false }),
      (e: Error) => live && setState((s) => ({ ...s, error: e.message, loading: false })),
    );
    return () => {
      live = false;
    };
  }, [...deps, tick]);

  return { ...state, reload: useCallback(() => setTick((t) => t + 1), []) };
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 4000);
  }, []);
  return { toast: message, show };
}
