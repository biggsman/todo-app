// Design Ref: §5.3, §5.4 (v0.3) — the Undo toast (FR-12). Its 5s countdown pauses while the toast
// is hovered or has focus anywhere inside it (focus-within), and a fresh 5s starts once it is
// neither (WCAG 2.2.1). Mounted only while an Undo is pending, so the hover/focus flags below
// always start clean: a toast that vanished under the pointer never leaves a stale "hovered".
import { useRef } from 'react';
import { useTodoActions } from '@/state/TodoContext';
import { CloseIcon } from './icons/CloseIcon';
import { UndoIcon } from './icons/UndoIcon';
import type { FocusEvent, MouseEvent } from 'react';
import type { PendingUndo } from '@/state/TodoContext';
import styles from './Toast.module.css';

interface UndoToastProps {
  pending: PendingUndo;
  onUndo: (pending: PendingUndo, click: MouseEvent) => void;
  onClose: (click: MouseEvent) => void;
}

export function UndoToast({ pending, onUndo, onClose }: UndoToastProps) {
  const { pauseUndo, resumeUndo } = useTodoActions();
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);

  function enter(flag: { current: boolean }) {
    flag.current = true;
    pauseUndo();
  }

  function leave(flag: { current: boolean }) {
    flag.current = false;
    // Plan SC: FR-12 / WCAG 2.2.1 — the countdown restarts only when the user has left the toast
    if (!hoveredRef.current && !focusedRef.current) resumeUndo();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    // Focus moving between the toast's own buttons is not leaving it (focus-within semantics).
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    leave(focusedRef);
  }

  return (
    <div
      className={styles.toast}
      data-tone="undo"
      onPointerEnter={() => enter(hoveredRef)}
      onPointerLeave={() => leave(hoveredRef)}
      onFocus={() => enter(focusedRef)}
      onBlur={handleBlur}
    >
      <p className={styles.message}>{undoMessage(pending)}</p>
      <button
        type="button"
        className={styles.undoButton}
        onClick={(event) => onUndo(pending, event)}
      >
        되돌리기
        <span className={styles.undoIcon}>
          <UndoIcon />
        </span>
      </button>
      <button type="button" className={styles.closeButton} onClick={onClose} aria-label="알림 닫기">
        <CloseIcon />
      </button>
    </div>
  );
}

function undoMessage({ reason, items }: PendingUndo): string {
  return reason === 'clearCompleted' ? `완료 항목 ${items.length}개 삭제됨` : '삭제됨';
}
