// Design Ref: §5.1, §5.2, §5.3, §6.1, §7 — backup menu (FR-13): 내보내기 downloads a JSON file;
// 가져오기 picks a file → size check → validation → overwrite confirmation → replace.
// Components may not import storage/ (§9.3), so export/parse/import go through useTodoActions.
import { useEffect, useId, useRef, useState } from 'react';
import { mergeTodos } from '@/domain/merge';
import type { MergeSummary } from '@/domain/merge';
import { makeError } from '@/domain/errors';
import { checkImportFileSize } from '@/domain/importFile';
import { useTodoActions, useTodos } from '@/state/TodoContext';
import { ConfirmDialog } from './ConfirmDialog';
import { downloadFile } from './downloadFile';
import { ArchiveIcon } from './icons/ArchiveIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { Todo } from '@/domain/todo';
import type { NoticeInput } from './useNotices';
import styles from './DataMenu.module.css';

interface DataMenuProps {
  onNotify: (notice: NoticeInput) => void;
}

const IMPORT_ACCEPT = 'application/json,.json';
const EXPORT_MIME_TYPE = 'application/json';

export function DataMenu({ onNotify }: DataMenuProps) {
  const { todos } = useTodos();
  const { exportFile, parseImport, importTodos } = useTodoActions();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<Todo[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;
    menuItems(menuRef.current)[0]?.focus();

    // A press anywhere outside the menu closes it (without stealing that press's focus).
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setIsOpen(true);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = menuItems(menuRef.current);
    const current = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex: Record<string, number> = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    };
    if (event.key in nextIndex) {
      event.preventDefault();
      items[nextIndex[event.key]]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'Tab') {
      // Tab leaves the menu like any other control; the menu just closes behind it.
      setIsOpen(false);
    }
  }

  function handleExport() {
    closeMenu();
    const { filename, json } = exportFile();
    // Plan SC: FR-13 — the backup is a JSON file the user keeps outside the browser
    downloadFile(filename, json, EXPORT_MIME_TYPE);
  }

  function handleImportClick() {
    closeMenu();
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared so choosing the same file again still fires a change event.
    input.value = '';
    if (!file) return;

    // Plan SC: FR-13 — files over 5MB are refused before anything is read (§7)
    const size = checkImportFileSize(file.size);
    if (!size.ok) return onNotify({ tone: 'error', message: size.error.message });

    let text: string;
    try {
      text = await file.text();
    } catch {
      return onNotify({ tone: 'error', message: makeError('IMPORT_INVALID_JSON').message });
    }

    const parsed = parseImport(text);
    if (!parsed.ok) return onNotify({ tone: 'error', message: parsed.error.message });
    setPendingImport(parsed.value);
  }

  function handleConfirmImport() {
    if (!pendingImport) return;
    const result = importTodos(pendingImport);
    setPendingImport(null);
    triggerRef.current?.focus();
    onNotify(
      result.ok
        ? { tone: 'success', message: describeMerge(result.value) }
        : { tone: 'error', message: result.error.message },
    );
  }

  function handleCancelImport() {
    setPendingImport(null);
    triggerRef.current?.focus();
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <ArchiveIcon className={styles.triggerIcon} />
        <span className={styles.triggerLabel}>데이터</span>
        <ChevronDownIcon className={styles.chevron} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          className={styles.menu}
          role="menu"
          aria-label="데이터"
          onKeyDown={handleMenuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={styles.item}
            onClick={handleExport}
          >
            <span className={styles.itemIcon}>
              <DownloadIcon />
            </span>
            <span className={styles.itemText}>
              내보내기
              <span className={styles.itemHint} aria-hidden="true">
                JSON 파일로 백업
              </span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={styles.item}
            onClick={handleImportClick}
          >
            <span className={styles.itemIcon}>
              <UploadIcon />
            </span>
            <span className={styles.itemText}>
              가져오기
              <span className={styles.itemHint} aria-hidden="true">
                백업 파일과 합치기
              </span>
            </span>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="visually-hidden"
        tabIndex={-1}
        aria-label="가져올 백업 파일"
        onChange={(event) => void handleFileChange(event)}
      />

      {pendingImport && (
        // Plan SC: FR-13 — nothing changes until the user confirms the merge
        <ConfirmDialog
          title="데이터 가져오기"
          message={describeMergePreview(mergeTodos(todos, pendingImport))}
          detail="같은 할 일은 더 최근에 수정된 쪽을 남깁니다. 합치기 직전의 데이터는 이 브라우저에 자동으로 백업됩니다."
          confirmLabel="합치기"
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
        />
      )}
    </div>
  );
}

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
}

function describeMergePreview({ added, updated }: MergeSummary): string {
  if (added === 0 && updated === 0)
    return '가져온 파일에 새로운 내용이 없습니다. 목록은 그대로입니다';
  return `새 할 일 ${added}개를 추가하고, ${updated}개를 더 최신 내용으로 바꿉니다`;
}

function describeMerge({ added, updated }: MergeSummary): string {
  if (added === 0 && updated === 0) return '새로운 내용이 없어 목록이 그대로입니다';
  return `${added}개 추가, ${updated}개 갱신했습니다`;
}
