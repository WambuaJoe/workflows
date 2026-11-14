import { useCallback, useState } from "react";

type HistoryState<T> = { past: T[]; present: T; future: T[] };

const LIMIT = 100;

/** Undo/redo over an immutable value. `set` takes an updater; returning the same value records nothing. */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const set = useCallback((update: (prev: T) => T) => {
    setState((s) => {
      const next = update(s.present);
      if (Object.is(next, s.present)) return s;
      return { past: [...s.past, s.present].slice(-LIMIT), present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) =>
      s.past.length === 0
        ? s
        : {
            past: s.past.slice(0, -1),
            present: s.past[s.past.length - 1],
            future: [s.present, ...s.future],
          },
    );
  }, []);

  const redo = useCallback(() => {
    setState((s) =>
      s.future.length === 0
        ? s
        : { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) },
    );
  }, []);

  return {
    present: state.present,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
