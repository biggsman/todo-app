// Design Ref: §5.2, §6.1 — turns the Provider's storage status into toasts: corrupt data and
// unavailable storage are announced once on start, every failed save as it happens (FR-05, FR-14).
import { useEffect, useRef } from 'react';
import { ERROR_MESSAGES } from '@/domain/errors';
import { useTodos } from '@/state/TodoContext';
import type { NoticeInput } from './useNotices';

export function useStorageNotices(notify: (notice: NoticeInput) => void): void {
  const { storageStatus } = useTodos();
  const { recovered, backupSaved, unavailable, saveError } = storageStatus;
  // A ref (not state) so StrictMode's mount → unmount → mount does not announce twice.
  const announcedStartRef = useRef(false);

  useEffect(() => {
    if (announcedStartRef.current) return;
    announcedStartRef.current = true;
    // Plan SC: FR-14 — the user learns that the app started empty and whether the original was
    // really kept aside (§6.1 v0.3: STORAGE_CORRUPT vs STORAGE_CORRUPT_UNSAVED)
    if (recovered) {
      const code = backupSaved ? 'STORAGE_CORRUPT' : 'STORAGE_CORRUPT_UNSAVED';
      notify({ tone: 'error', message: ERROR_MESSAGES[code] });
    }
    if (unavailable) notify({ tone: 'error', message: ERROR_MESSAGES.STORAGE_UNAVAILABLE });
  }, [recovered, backupSaved, unavailable, notify]);

  useEffect(() => {
    if (saveError) notify({ tone: 'error', message: saveError.message });
  }, [saveError, notify]);
}
