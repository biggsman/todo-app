// Design Ref: §5.3, §5.4, §6.1 — short-lived messages for the Toast region (storage problems,
// import results). UI-only state, so it lives with the components and is never saved.
import { useCallback, useEffect, useRef, useState } from 'react';

export type NoticeTone = 'success' | 'error';

export interface NoticeInput {
  tone: NoticeTone;
  message: string;
}

export interface Notice extends NoticeInput {
  id: number;
}

export interface NoticeControls {
  notices: Notice[];
  /** Shows a message; an identical message that is still visible is not repeated. */
  notify: (notice: NoticeInput) => void;
  dismiss: (id: number) => void;
}

/** Success messages fade after this long; errors stay until closed so they cannot be missed. */
export const NOTICE_TIMEOUT_MS = 5000;
const MAX_VISIBLE_NOTICES = 3;

export function useNotices(): NoticeControls {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timersRef.current.delete(id);
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const notify = useCallback(
    ({ tone, message }: NoticeInput) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      setNotices((current) => {
        if (current.some((notice) => notice.message === message)) return current;
        return [...current, { id, tone, message }].slice(-MAX_VISIBLE_NOTICES);
      });
      if (tone === 'success') {
        timersRef.current.set(
          id,
          setTimeout(() => dismiss(id), NOTICE_TIMEOUT_MS),
        );
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return { notices, notify, dismiss };
}
