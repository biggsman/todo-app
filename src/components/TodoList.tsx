// Design Ref: §5.3, §5.4 — renders the visible todos or the empty state.
// FilterBar (module-4) will add filterTodos and a user-chosen sort key here.
import { useMemo } from 'react';
import { sortTodos } from '@/domain/sort';
import { useTodos } from '@/state/TodoContext';
import { TodoItem } from './TodoItem';
import styles from './TodoList.module.css';

export function TodoList() {
  const { todos } = useTodos();
  // Plan SC: FR-08 — derived list is computed, never stored (newest first until FilterBar lands)
  const visibleTodos = useMemo(() => sortTodos(todos, 'createdAt'), [todos]);

  if (visibleTodos.length === 0) {
    return <p className={styles.empty}>할 일이 없습니다. 위에서 추가해 보세요</p>;
  }

  return (
    <ul className={styles.list} aria-label="할 일 목록">
      {visibleTodos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
