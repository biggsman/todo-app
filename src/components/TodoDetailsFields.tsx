// Design Ref: §5.3, §5.4, §6.1 — due date, priority, category and tags as one controlled group,
// shared by TodoInput (inside the "세부 옵션" disclosure) and TodoEditor.
import { useId, useMemo } from 'react';
import { collectCategories } from '@/domain/filter';
import { CATEGORY_MAX_LENGTH } from '@/domain/validate';
import { useTodos } from '@/state/TodoContext';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { TagInput } from './TagInput';
import { PRIORITY_LABELS, PRIORITY_OPTIONS } from './todoDetails';
import type { Priority } from '@/domain/todo';
import type { FieldErrors, TodoDetailsValue } from './todoDetails';
import styles from './TodoDetailsFields.module.css';

interface TodoDetailsFieldsProps {
  value: TodoDetailsValue;
  onChange: (value: TodoDetailsValue) => void;
  errors?: FieldErrors;
}

export function TodoDetailsFields({ value, onChange, errors = {} }: TodoDetailsFieldsProps) {
  const { todos } = useTodos();
  // Plan SC: FR-10 — suggest categories already in use
  const categories = useMemo(() => collectCategories(todos), [todos]);
  const baseId = useId();
  const ids = {
    dueDate: `${baseId}-due`,
    priority: `${baseId}-priority`,
    category: `${baseId}-category`,
    categoryList: `${baseId}-category-list`,
    categoryError: `${baseId}-category-error`,
    tags: `${baseId}-tags`,
  };

  function change(patch: Partial<TodoDetailsValue>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className={styles.grid}>
      <div className={`${styles.field} ${styles.dateField}`}>
        <label className={styles.label} htmlFor={ids.dueDate}>
          마감일
        </label>
        <input
          id={ids.dueDate}
          className={styles.control}
          type="date"
          value={value.dueDate}
          onChange={(event) => change({ dueDate: event.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={ids.priority}>
          우선순위
        </label>
        <span className={styles.selectWrap}>
          <select
            id={ids.priority}
            className={`${styles.control} ${styles.select}`}
            value={value.priority}
            onChange={(event) => change({ priority: event.target.value as Priority })}
          >
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          <ChevronDownIcon className={styles.chevron} />
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={ids.category}>
          카테고리
        </label>
        <input
          id={ids.category}
          className={styles.control}
          type="text"
          value={value.category}
          onChange={(event) => change({ category: event.target.value })}
          list={ids.categoryList}
          placeholder="예: 업무"
          maxLength={CATEGORY_MAX_LENGTH}
          autoComplete="off"
          aria-invalid={errors.category !== undefined}
          aria-describedby={errors.category ? ids.categoryError : undefined}
        />
        <datalist id={ids.categoryList}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        {errors.category && (
          <p id={ids.categoryError} className={styles.error} role="alert">
            {errors.category}
          </p>
        )}
      </div>

      <div className={`${styles.field} ${styles.full}`}>
        <label className={styles.label} htmlFor={ids.tags}>
          태그
        </label>
        <TagInput
          id={ids.tags}
          tags={value.tags}
          onChange={(tags) => change({ tags })}
          error={errors.tags}
        />
      </div>
    </div>
  );
}
