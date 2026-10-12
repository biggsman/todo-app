// Design Ref: §5.3, §5.4 — renders the filtered + sorted todos, or one of two empty states:
// no todos at all vs. no todos matching the current filters.
import { toLocalDateString } from '@/domain/date';
import { TodoItem } from './TodoItem';
import type { Todo } from '@/domain/todo';
import styles from './TodoList.module.css';

interface TodoListProps {
  /** Already filtered and sorted (see useTodoView). */
  todos: Todo[];
  /** Number of todos before filtering; tells the two empty states apart. */
  totalCount: number;
  onResetFilters: () => void;
}

export function TodoList({ todos, totalCount, onResetFilters }: TodoListProps) {
  if (totalCount === 0) {
    return <p className={styles.empty}>할 일이 없습니다. 위에서 추가해 보세요</p>;
  }

  if (todos.length === 0) {
    // Plan SC: FR-09 — "no results" is distinct from "no todos" and offers a way back
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>조건에 맞는 할 일이 없습니다</p>
        <button type="button" className={styles.resetButton} onClick={onResetFilters}>
          필터 초기화
        </button>
      </div>
    );
  }

  // Plan SC: FR-06 — "today" is read once per list render, not once per item
  const today = toLocalDateString(new Date());

  return (
    <ul className={styles.list} aria-label="할 일 목록">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} today={today} />
      ))}
    </ul>
  );
}
