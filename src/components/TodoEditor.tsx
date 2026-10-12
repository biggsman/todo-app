// Design Ref: §5.2, §5.3, §6.1 — inline editor: Enter saves through `update`, Esc cancels.
// Edits the title only for now; module-4 adds TodoDetailsFields.
import { useEffect, useId, useRef, useState } from 'react';
import { TITLE_MAX_LENGTH } from '@/domain/validate';
import { useTodoActions } from '@/state/TodoContext';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Todo } from '@/domain/todo';
import styles from './TodoEditor.module.css';

interface TodoEditorProps {
  todo: Todo;
  /** Called after a successful save or a cancel. */
  onDone: () => void;
}

export function TodoEditor({ todo, onDone }: TodoEditorProps) {
  const { update } = useTodoActions();
  const [title, setTitle] = useState(todo.title);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Plan SC: FR-03 — invalid edits are rejected with the domain's message and nothing changes
    const result = update(todo.id, { title });
    if (!result.ok) {
      setError(result.error.message);
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
      <div className={styles.row}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
          aria-label="할 일 제목 수정"
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
        />
        <div className={styles.buttons}>
          <button type="button" className={styles.secondary} onClick={onDone}>
            취소
          </button>
          <button type="submit" className={styles.primary}>
            저장
          </button>
        </div>
      </div>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
