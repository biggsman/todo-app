// Design Ref: §5.2, §5.3, §5.4 — one todo row: completion checkbox, title with badges, edit and delete.
// Clicking the title (or Enter while it is focused) switches the row to the inline editor.
// Plan NFR Performance: memoized — with stable actions (TodoContext) and an unchanged todo object
// a row skips re-rendering, so toggling one of 1,000 todos renders one row instead of all.
import { memo, useEffect, useRef, useState } from 'react';
import { useTodoActions } from '@/state/TodoContext';
import { CheckIcon } from './icons/CheckIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { TodoBadges } from './TodoBadges';
import { TodoEditor } from './TodoEditor';
import { focusTitleInputAfterKeyboard, focusTodoRow } from './todoFocus';
import type { MouseEvent } from 'react';
import type { Todo } from '@/domain/todo';
import styles from './TodoItem.module.css';

interface TodoItemProps {
  todo: Todo;
  /** Local 'YYYY-MM-DD' for due badges; the list computes it once per render. */
  today: string;
  /** Play the entry animation; read once when the row mounts (see TodoList). */
  animateEntry?: boolean;
}

export const TodoItem = memo(function TodoItem({
  todo,
  today,
  animateEntry = false,
}: TodoItemProps) {
  const { toggle, remove } = useTodoActions();
  const [isEditing, setIsEditing] = useState(false);
  // Fixed at mount: the class must not drop mid-animation when the list re-renders.
  const [entryClassName] = useState(animateEntry ? ` ${styles.entering}` : '');
  const rowRef = useRef<HTMLLIElement>(null);
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

  function handleRemove(event: MouseEvent<HTMLButtonElement>) {
    const row = rowRef.current;
    // Read before removing: the neighbouring rows stay in the DOM while this one goes.
    const neighbor = row?.nextElementSibling ?? row?.previousElementSibling;
    remove(todo.id);
    // Plan SC: FR-12 — keyboard focus moves to the next row (else the previous one, else the
    // title input) instead of falling back to the page
    if (!focusTodoRow(neighbor)) focusTitleInputAfterKeyboard(event);
  }

  if (isEditing) {
    return (
      <li className={`${styles.item} ${styles.editing}${entryClassName}`} data-todo-id={todo.id}>
        <TodoEditor todo={todo} onDone={closeEditor} />
      </li>
    );
  }

  const itemClassName = `${styles.item}${todo.completed ? ` ${styles.completed}` : ''}${entryClassName}`;

  return (
    <li ref={rowRef} className={itemClassName} data-todo-id={todo.id}>
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
      <div className={styles.body}>
        <button
          ref={titleRef}
          type="button"
          className={styles.title}
          onClick={() => setIsEditing(true)}
          data-row-focus=""
        >
          {todo.title}
        </button>
        <TodoBadges todo={todo} today={today} />
      </div>
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
          onClick={handleRemove}
          aria-label="삭제"
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
});
