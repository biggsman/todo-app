// Design Ref: §5.1, §5.4 — remaining count, clear-completed action, and the local-only notice.
import { useMemo } from 'react';
import { useTodoActions, useTodos } from '@/state/TodoContext';
import { focusTitleInputAfterKeyboard } from './todoFocus';
import styles from './Footer.module.css';

export function Footer() {
  const { todos } = useTodos();
  const { clearCompleted } = useTodoActions();
  const completedCount = useMemo(() => todos.filter((todo) => todo.completed).length, [todos]);
  const remainingCount = todos.length - completedCount;

  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <p className={styles.count} aria-live="polite">
          남은 일 {remainingCount}개
        </p>
        {/* Plan SC: FR-12 — disabled when there is nothing completed to clear */}
        <button
          type="button"
          className={styles.clearButton}
          onClick={(event) => {
            clearCompleted();
            // The button is disabled right after, so focus would otherwise drop to the page.
            focusTitleInputAfterKeyboard(event);
          }}
          disabled={completedCount === 0}
        >
          완료 항목 삭제
        </button>
      </div>
      <p className={styles.notice}>데이터는 이 브라우저에만 저장됩니다</p>
    </footer>
  );
}
