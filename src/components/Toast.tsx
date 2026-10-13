// Design Ref: §5.1, §5.3, §5.4 — bottom toast region (aria-live="polite"): the 5-second Undo for
// removals (FR-12) and notices for storage problems and import results (FR-05, FR-13, FR-14).
import { flushSync } from 'react-dom';
import { useTodoActions, useTodos } from '@/state/TodoContext';
import { AlertIcon } from './icons/AlertIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CloseIcon } from './icons/CloseIcon';
import { focusTitleInputAfterKeyboard, focusTodoById } from './todoFocus';
import { UndoToast } from './UndoToast';
import type { MouseEvent } from 'react';
import type { PendingUndo } from '@/state/TodoContext';
import type { Notice } from './useNotices';
import styles from './Toast.module.css';

interface ToastProps {
  notices: Notice[];
  onDismissNotice: (id: number) => void;
}

export function Toast({ notices, onDismissNotice }: ToastProps) {
  const { pendingUndo } = useTodos();
  const { undo, dismissUndo } = useTodoActions();

  function handleUndo(pending: PendingUndo, click: MouseEvent) {
    // The lowest original index comes back first in the list; focus follows the restored row.
    const [first] = [...pending.items].sort((a, b) => a.index - b.index);
    // Render the restored rows now so they can take focus before the toast disappears.
    flushSync(() => undo());
    // A restored todo hidden by the current filters cannot take focus; the input can.
    if (!focusTodoById(first.todo.id)) focusTitleInputAfterKeyboard(click);
  }

  /** The clicked close button disappears with its toast, so focus moves to the title input. */
  function closeWith(close: () => void, click: MouseEvent) {
    close();
    focusTitleInputAfterKeyboard(click);
  }

  return (
    <div className={styles.region} aria-live="polite">
      {notices.map((notice) => (
        <div key={notice.id} className={styles.toast} data-tone={notice.tone}>
          {notice.tone === 'error' ? (
            <AlertIcon className={styles.icon} />
          ) : (
            <CheckIcon className={styles.icon} />
          )}
          <p className={styles.message}>{notice.message}</p>
          <button
            type="button"
            className={styles.closeButton}
            onClick={(event) => closeWith(() => onDismissNotice(notice.id), event)}
            aria-label="알림 닫기"
          >
            <CloseIcon />
          </button>
        </div>
      ))}
      {/* Plan SC: FR-12 — a removal can be undone from the toast (countdown pauses on hover/focus) */}
      {pendingUndo && (
        <UndoToast
          pending={pendingUndo}
          onUndo={handleUndo}
          onClose={(event) => closeWith(dismissUndo, event)}
        />
      )}
    </div>
  );
}
