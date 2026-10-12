// Design Ref: §5.2, §5.3, §6.1 — inline editor for the title and all details: Enter (or 저장) saves
// through `update`, Esc or 취소 cancels. Domain validation errors are shown next to their field.
import { useEffect, useId, useRef, useState } from 'react';
import { TITLE_MAX_LENGTH } from '@/domain/validate';
import { useTodoActions } from '@/state/TodoContext';
import { detailsFromTodo, toFieldErrors } from './todoDetails';
import { TodoDetailsFields } from './TodoDetailsFields';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Todo } from '@/domain/todo';
import type { FieldErrors, TodoDetailsValue } from './todoDetails';
import styles from './TodoEditor.module.css';

interface TodoEditorProps {
  todo: Todo;
  /** Called after a successful save or a cancel. */
  onDone: () => void;
}

export function TodoEditor({ todo, onDone }: TodoEditorProps) {
  const { update } = useTodoActions();
  const [title, setTitle] = useState(todo.title);
  const [details, setDetails] = useState<TodoDetailsValue>(() => detailsFromTodo(todo));
  const [errors, setErrors] = useState<FieldErrors>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Plan SC: FR-03 — invalid edits are rejected with the domain's message and nothing changes
    const result = update(todo.id, { title, ...details });
    if (!result.ok) {
      setErrors(toFieldErrors(result.error));
      return;
    }
    onDone();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onDone();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          setErrors((current) => ({ ...current, title: undefined }));
        }}
        aria-label="할 일 제목 수정"
        maxLength={TITLE_MAX_LENGTH}
        autoComplete="off"
        enterKeyHint="done"
        aria-invalid={errors.title !== undefined}
        aria-describedby={errors.title ? errorId : undefined}
      />
      {errors.title && (
        <p id={errorId} className={styles.error} role="alert">
          {errors.title}
        </p>
      )}
      <div className={styles.details}>
        <TodoDetailsFields
          value={details}
          onChange={(next) => {
            setDetails(next);
            setErrors((current) => ({ title: current.title }));
          }}
          errors={errors}
        />
      </div>
      <div className={styles.buttons}>
        <button type="button" className={styles.secondary} onClick={onDone}>
          취소
        </button>
        <button type="submit" className={styles.primary}>
          저장
        </button>
      </div>
    </form>
  );
}
