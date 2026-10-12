// Design Ref: §4.1, §4.2 — a single 5-second Undo slot for removals (FR-12).
// undo() returns the removed items instead of dispatching, so this hook stays independent of the
// reducer; useTodoActions dispatches the `restore` action with them.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RemovedItem } from './todoReducer';

export const UNDO_TIMEOUT_MS = 5000;

export interface UndoControls {
  /** Items that can still be restored, or null when nothing is pending. */
  pending: RemovedItem[] | null;
  /** Starts a new 5s window; a previous pending removal is dropped (it becomes permanent). */
  offer: (removed: RemovedItem[]) => void;
  /** Ends the window and returns the items to restore, or null if it already expired. */
  undo: () => RemovedItem[] | null;
  /** Ends the window without restoring. */
  dismiss: () => void;
}

export function useUndo(): UndoControls {
  const [pending, setPending] = useState<RemovedItem[] | null>(null);
  // The ref lets undo() return the current items synchronously, even before a re-render.
  const pendingRef = useRef<RemovedItem[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
    setPending(null);
  }, [clearTimer]);

  const offer = useCallback(
    (removed: RemovedItem[]) => {
      clearTimer();
      pendingRef.current = removed;
      setPending(removed);
      // Plan SC: FR-12 — the removal can be undone for 5 seconds
      timerRef.current = setTimeout(dismiss, UNDO_TIMEOUT_MS);
    },
    [clearTimer, dismiss],
  );

  const undo = useCallback(() => {
    const items = pendingRef.current;
    dismiss();
    return items;
  }, [dismiss]);

  useEffect(() => clearTimer, [clearTimer]);

  return { pending, offer, undo, dismiss };
}
