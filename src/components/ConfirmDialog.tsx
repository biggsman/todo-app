// Design Ref: §5.2, §5.4, §7 — modal confirmation before an import overwrites the list (FR-13).
// A native <dialog> opened with showModal(): the page behind becomes inert (focus stays inside),
// Esc cancels, and the safe choice (취소) gets the initial focus.
import { useEffect, useId, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import type { KeyboardEvent, SyntheticEvent } from 'react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  detail,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    cancelRef.current?.focus();
    return () => dialog.close();
  }, []);

  function handleCancelEvent(event: SyntheticEvent<HTMLDialogElement>) {
    // Let the parent unmount the dialog instead of the browser closing it behind React's back.
    event.preventDefault();
    onCancel();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={handleCancelEvent}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.core}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p id={messageId} className={styles.message}>
          {message}
        </p>
        {detail && <p className={styles.detail}>{detail}</p>}
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className={styles.cancel} onClick={onCancel}>
            취소
          </button>
          <button type="button" className={styles.confirm} onClick={onConfirm}>
            {confirmLabel}
            <span className={styles.confirmIcon}>
              <UploadIcon />
            </span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
