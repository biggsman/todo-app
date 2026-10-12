// Design Ref: §5.2, §5.3, §5.4 — one todo row: completion checkbox, title, edit and delete.
// Clicking the title (or Enter while it is focused) switches the row to the inline editor.
import { useEffect, useRef, useState } from 'react';
import { useTodoActions } from '@/state/TodoContext';
import { CheckIcon } from './icons/CheckIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { TodoEditor } from './TodoEditor';
import type { Todo } from '@/domain/todo';
import styles from './TodoItem.module.css';

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const { toggle, remove } = useTodoActions();
  const [isEditing, setIsEditing] = useState(false);
  const titleRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    // Return keyboard focus to the title once the editor closes (save or cancel).
    if (isEditing || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    titleRef.current?.focus();
  }, [isEditing]);

  function closeEditor() {
    restoreFocusRef.current = true;
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <li className={styles.item}>
        <TodoEditor todo={todo} onDone={closeEditor} />
      </li>
    );
  }

  const itemClassName = todo.completed ? `${styles.item} ${styles.completed}` : styles.item;

  return (
    <li className={itemClassName}>
      <span className={styles.checkbox}>
        {/* Plan SC: FR-02 — toggling completion; the accessible name is the todo title */}
        <input
          type="checkbox"
          className={styles.checkboxInput}
          checked={todo.completed}
          onChange={() => toggle(todo.id)}
          aria-label={todo.title}
        />
        <CheckIcon className={styles.checkMark} />
      </span>
      <button
        ref={titleRef}
        type="button"
        className={styles.title}
        onClick={() => setIsEditing(true)}
      >
        {todo.title}
      </button>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setIsEditing(true)}
          aria-label="수정"
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.danger}`}
          onClick={() => remove(todo.id)}
          aria-label="삭제"
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
