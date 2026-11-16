import { useCallback, useState } from "react";

type HistoryState<T> = { past: T[]; present: T; future: T[]; mergeKey: string | null };
const LIMIT = 100;

/** Undo/redo over an immutable value, with adjacent edits optionally merged. */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [], present: initial, future: [], mergeKey: null,
  });

  const set = useCallback((update: (prev: T) => T, merge?: string) => {
    setState((s) => {
      const next = update(s.present);
      if (Object.is(next, s.present)) return s;
      if (merge && merge === s.mergeKey) return { ...s, present: next, future: [] };
      return {
        past: [...s.past, s.present].slice(-LIMIT),
        present: next,
        future: [],
        mergeKey: merge ?? null,
      };
    });
  }, []);

  const replace = useCallback((value: T) => {
    setState({ past: [], present: value, future: [], mergeKey: null });
  }, []);

  const undo = useCallback(() => {
    setState((s) => s.past.length === 0 ? s : {
      past: s.past.slice(0, -1),
      present: s.past[s.past.length - 1],
      future: [s.present, ...s.future],
      mergeKey: null,
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => s.future.length === 0 ? s : {
      past: [...s.past, s.present],
      present: s.future[0],
      future: s.future.slice(1),
      mergeKey: null,
    });
  }, []);

  return {
    present: state.present, set, replace, undo, redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
