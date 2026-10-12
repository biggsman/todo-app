// Design Ref: §5.3, §5.4, §6.1 — new-todo form (title only until module-4 adds detail fields).
import { useId, useState } from 'react';
import { TITLE_MAX_LENGTH } from '@/domain/validate';
import { useTodoActions } from '@/state/TodoContext';
import { PlusIcon } from './icons/PlusIcon';
import type { FormEvent } from 'react';
import styles from './TodoInput.module.css';

export function TodoInput() {
  const { add } = useTodoActions();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  // Plan SC: FR-01 — the add button stays disabled while the title is empty or whitespace
  const canSubmit = title.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = add({ title });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setTitle('');
    setError(null);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
          placeholder="할 일을 입력하세요"
          aria-label="할 일 제목"
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
        />
        <button className={styles.addButton} type="submit" disabled={!canSubmit}>
          <span className={styles.addIcon}>
            <PlusIcon />
          </span>
          <span className={styles.addLabel}>추가</span>
        </button>
      </div>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
