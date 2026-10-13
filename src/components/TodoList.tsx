// Design Ref: §5.3, §5.4 — renders the filtered + sorted todos, or one of two empty states:
// no todos at all vs. no todos matching the current filters.
import { useState } from 'react';
import { toLocalDateString } from '@/domain/date';
import { useTodos } from '@/state/TodoContext';
import { TodoItem } from './TodoItem';
import type { Todo } from '@/domain/todo';
import styles from './TodoList.module.css';

const NO_IDS: ReadonlySet<string> = new Set();

interface TodoListProps {
  /** Already filtered and sorted (see useTodoView). */
  todos: Todo[];
  /** Number of todos before filtering; tells the two empty states apart. */
  totalCount: number;
  onResetFilters: () => void;
}

export function TodoList({ todos, totalCount, onResetFilters }: TodoListProps) {
  const enteringIds = useEnteringIds();

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
        <TodoItem key={todo.id} todo={todo} today={today} animateEntry={enteringIds.has(todo.id)} />
      ))}
    </ul>
  );
}

/**
 * Ids that joined the stored list in its latest change (added, restored by Undo, imported). Only
 * those rows play the entry animation. Plan NFR Performance: rows that merely reappear because a
 * filter or the search changed, or that are there on page load, mount without it, so showing
 * hundreds of rows at once does not start hundreds of animations.
 */
function useEnteringIds(): ReadonlySet<string> {
  const { todos } = useTodos();
  const [seenTodos, setSeenTodos] = useState(todos);
  const [enteringIds, setEnteringIds] = useState(NO_IDS);
  // Adjusting state while rendering (like useTodoView) so a new row mounts with the right value.
  if (todos !== seenTodos) {
    const before = new Set(seenTodos.map((todo) => todo.id));
    const added = todos.filter((todo) => !before.has(todo.id));
    setSeenTodos(todos);
    setEnteringIds(added.length === 0 ? NO_IDS : new Set(added.map((todo) => todo.id)));
  }
  return enteringIds;
}
