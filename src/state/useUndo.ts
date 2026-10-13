// Design Ref: §4.1, §4.2 — a single 5-second Undo slot for removals (FR-12).
// undo() returns the removed items instead of dispatching, so this hook stays independent of the
// reducer; useTodoActions dispatches the `restore` action with them.
// Design Ref: §4.1 (v0.3) — pause()/resume() stop the countdown while the user is on the toast
// (WCAG 2.2.1 Timing Adjustable); resume() starts a fresh full window instead of the remainder.
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
  /** Stops the countdown (the toast is hovered or focused). No-op when nothing is pending. */
  pause: () => void;
  /** Ends a pause and starts a fresh 5s window. No-op when not paused. */
  resume: () => void;
}

export function useUndo(): UndoControls {
  const [pending, setPending] = useState<RemovedItem[] | null>(null);
  // The ref lets undo() return the current items synchronously, even before a re-render.
  const pendingRef = useRef<RemovedItem[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
    // The toast goes away with the slot, so it can no longer be hovered or focused.
    pausedRef.current = false;
    setPending(null);
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    // Plan SC: FR-12 — the removal can be undone for 5 seconds
    timerRef.current = setTimeout(dismiss, UNDO_TIMEOUT_MS);
  }, [clearTimer, dismiss]);

  const offer = useCallback(
    (removed: RemovedItem[]) => {
      clearTimer();
      pendingRef.current = removed;
      setPending(removed);
      // A new removal while the toast is still being hovered/focused waits for resume().
      if (!pausedRef.current) startTimer();
    },
    [clearTimer, startTimer],
  );

  const undo = useCallback(() => {
    const items = pendingRef.current;
    dismiss();
    return items;
  }, [dismiss]);

  const pause = useCallback(() => {
    if (pendingRef.current === null) return;
    // Plan SC: FR-12 / WCAG 2.2.1 — no countdown while the user is reading or reaching the toast
    pausedRef.current = true;
    clearTimer();
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    // A fresh full window (not the remainder): leaving the toast never makes it vanish at once.
    // Something is always pending here: pause() needs it and dismiss() clears the pause.
    startTimer();
  }, [startTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { pending, offer, undo, dismiss, pause, resume };
}
