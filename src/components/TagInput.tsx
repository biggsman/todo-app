// Design Ref: §5.3, §5.4, §6.1 — tag chips: Enter or comma adds, Backspace on an empty draft
// removes the last chip, and INVALID_TAG is shown inline. Normalization is the domain's job.
import { useId, useState } from 'react';
import { normalizeTags, TAGS_MAX_COUNT } from '@/domain/validate';
import { CloseIcon } from './icons/CloseIcon';
import type { ChangeEvent, KeyboardEvent } from 'react';
import styles from './TagInput.module.css';

const TAG_SEPARATOR = ',';

interface TagInputProps {
  /** id of the text input, so the caller's visible <label htmlFor> names it. */
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Error from the surrounding form (e.g. a rejected save); shown when there is no local one. */
  error?: string;
}

export function TagInput({ id, tags, onChange, error: externalError }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const errorId = useId();
  const error = localError ?? externalError ?? null;
  const isFull = tags.length >= TAGS_MAX_COUNT;

  /** Adds the drafted tags; returns false (and keeps the draft) when the domain rejects them. */
  function commit(candidates: string[], remainingDraft = ''): boolean {
    if (candidates.every((candidate) => candidate.trim() === '')) {
      setDraft(remainingDraft);
      return true;
    }
    // Plan SC: FR-10 — lowercase/trim/dedupe and the 20-char / 10-tag limits come from the domain
    const result = normalizeTags([...tags, ...candidates]);
    if (!result.ok) {
      setLocalError(result.error.message);
      return false;
    }
    setLocalError(null);
    setDraft(remainingDraft);
    if (result.value.length !== tags.length) onChange(result.value);
    return true;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { value } = event.target;
    setLocalError(null);
    // Splitting on change (not keydown) also covers paste and mobile keyboards without key codes.
    if (!value.includes(TAG_SEPARATOR)) {
      setDraft(value);
      return;
    }
    const parts = value.split(TAG_SEPARATOR);
    const remainingDraft = parts.pop() ?? '';
    if (!commit(parts, remainingDraft)) setDraft(parts.join(TAG_SEPARATOR));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Ignore keys that confirm an IME composition (Hangul input).
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && draft.trim() !== '') {
      event.preventDefault();
      commit([draft]);
      return;
    }
    if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      event.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  }

  function removeTag(tag: string) {
    setLocalError(null);
    onChange(tags.filter((current) => current !== tag));
  }

  return (
    <div className={styles.field}>
      <div className={styles.box} data-invalid={error !== null || undefined}>
        {tags.length > 0 && (
          <ul className={styles.chips} aria-label="선택한 태그">
            {tags.map((tag) => (
              <li key={tag} className={styles.chip}>
                <span className={styles.chipText}>#{tag}</span>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeTag(tag)}
                  aria-label={`태그 ${tag} 삭제`}
                >
                  <CloseIcon className={styles.removeIcon} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          id={id}
          className={styles.input}
          type="text"
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => commit([draft])}
          placeholder={isFull ? `최대 ${TAGS_MAX_COUNT}개` : '태그 입력 후 Enter'}
          autoComplete="off"
          enterKeyHint="enter"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
