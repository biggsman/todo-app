// Design Ref: §5.1, §5.3, §5.4, §6.1 — new-todo form: title row plus the collapsible "세부 옵션"
// (due date, priority, category, tags). Validation errors come back as domain Results.
import { useId, useState } from 'react';
import { TITLE_MAX_LENGTH } from '@/domain/validate';
import { useTodoActions } from '@/state/TodoContext';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusIcon } from './icons/PlusIcon';
import { EMPTY_DETAILS, toFieldErrors } from './todoDetails';
import { TodoDetailsFields } from './TodoDetailsFields';
import { TODO_TITLE_INPUT_ID } from './todoFocus';
import type { FormEvent } from 'react';
import type { FieldErrors, TodoDetailsValue } from './todoDetails';
import styles from './TodoInput.module.css';

export function TodoInput() {
  const { add } = useTodoActions();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState<TodoDetailsValue>(EMPTY_DETAILS);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const errorId = useId();
  const panelId = useId();
  // Plan SC: FR-01 — the add button stays disabled while the title is empty or whitespace
  const canSubmit = title.trim().length > 0;
  const changedDetailCount = countChangedDetails(details);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Plan SC: FR-06/07/10 — details go through the same domain validation as the title
    const result = add({ title, ...details });
    if (!result.ok) {
      const fieldErrors = toFieldErrors(result.error);
      setErrors(fieldErrors);
      // A detail error inside a collapsed panel would be invisible, so reveal it.
      if (!fieldErrors.title) setIsDetailsOpen(true);
      return;
    }
    setTitle('');
    setDetails(EMPTY_DETAILS);
    setErrors({});
  }

  function handleDetailsChange(next: TodoDetailsValue) {
    setDetails(next);
    setErrors((current) => ({ title: current.title }));
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.row}>
        <input
          id={TODO_TITLE_INPUT_ID}
          className={styles.input}
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setErrors((current) => ({ ...current, title: undefined }));
          }}
          placeholder="할 일을 입력하세요"
          aria-label="할 일 제목"
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title ? errorId : undefined}
        />
        <button className={styles.addButton} type="submit" disabled={!canSubmit}>
          <span className={styles.addIcon}>
            <PlusIcon />
          </span>
          <span className={styles.addLabel}>추가</span>
        </button>
      </div>
      {errors.title && (
        <p id={errorId} className={styles.error} role="alert">
          {errors.title}
        </p>
      )}

      <button
        type="button"
        className={styles.disclosure}
        onClick={() => setIsDetailsOpen((open) => !open)}
        aria-expanded={isDetailsOpen}
        aria-controls={panelId}
      >
        <ChevronDownIcon className={styles.disclosureIcon} />
        세부 옵션
        {changedDetailCount > 0 && (
          <span className={styles.disclosureCount}>
            {changedDetailCount}
            <span className="visually-hidden">개 설정됨</span>
          </span>
        )}
      </button>
      <div id={panelId} className={styles.panel} hidden={!isDetailsOpen}>
        <TodoDetailsFields value={details} onChange={handleDetailsChange} errors={errors} />
      </div>
    </form>
  );
}

function countChangedDetails(details: TodoDetailsValue): number {
  return [
    details.dueDate !== EMPTY_DETAILS.dueDate,
    details.priority !== EMPTY_DETAILS.priority,
    details.category.trim() !== '',
    details.tags.length > 0,
  ].filter(Boolean).length;
}
