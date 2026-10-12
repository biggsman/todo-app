// Design Ref: §5.1, §5.3, §5.4 — status toggles, search, category/tag filters and the sort select.
// Below 480px the three selects fold under a "필터" toggle; search stays visible.
import { useId, useState } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SearchIcon } from './icons/SearchIcon';
import { SlidersIcon } from './icons/SlidersIcon';
import { SORT_LABELS, SORT_OPTIONS, STATUS_LABELS, STATUS_OPTIONS } from './todoDetails';
import type { ReactNode } from 'react';
import type { SortKey } from '@/domain/todo';
import type { TodoView } from './useTodoView';
import styles from './FilterBar.module.css';

type FilterBarProps = Pick<
  TodoView,
  'query' | 'sortKey' | 'categories' | 'tags' | 'changeQuery' | 'changeSortKey'
>;

/** Select value standing for "no filter" (TodoQuery uses null). */
const ALL_VALUE = '';

export function FilterBar({
  query,
  sortKey,
  categories,
  tags,
  changeQuery,
  changeSortKey,
}: FilterBarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const baseId = useId();
  const ids = {
    search: `${baseId}-search`,
    panel: `${baseId}-panel`,
    category: `${baseId}-category`,
    tag: `${baseId}-tag`,
    sort: `${baseId}-sort`,
  };
  const activeSelectCount = [query.category, query.tag].filter((value) => value !== null).length;

  return (
    <div className={styles.bar}>
      {/* Plan SC: FR-09 — 전체/진행 중/완료; a toggle group because all three filter one list */}
      <div className={styles.segmented} role="group" aria-label="상태 필터">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            className={styles.segment}
            aria-pressed={query.status === status}
            onClick={() => changeQuery({ status })}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className={styles.search}>
        <SearchIcon className={styles.searchIcon} />
        <label htmlFor={ids.search} className="visually-hidden">
          검색
        </label>
        <input
          id={ids.search}
          className={styles.searchInput}
          type="search"
          value={query.text}
          onChange={(event) => changeQuery({ text: event.target.value })}
          placeholder="제목·태그 검색"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      <button
        type="button"
        className={styles.panelToggle}
        onClick={() => setIsPanelOpen((open) => !open)}
        aria-expanded={isPanelOpen}
        aria-controls={ids.panel}
      >
        <SlidersIcon className={styles.toggleIcon} />
        필터
        {activeSelectCount > 0 && (
          <span className={styles.count}>
            {activeSelectCount}
            <span className="visually-hidden">개 적용됨</span>
          </span>
        )}
      </button>

      <div id={ids.panel} className={styles.panel} data-open={isPanelOpen || undefined}>
        <SelectPill id={ids.category} label="카테고리">
          <select
            id={ids.category}
            className={styles.select}
            aria-label="카테고리 필터"
            value={query.category ?? ALL_VALUE}
            onChange={(event) => changeQuery({ category: event.target.value || null })}
          >
            <option value={ALL_VALUE}>전체</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </SelectPill>
        <SelectPill id={ids.tag} label="태그">
          <select
            id={ids.tag}
            className={styles.select}
            aria-label="태그 필터"
            value={query.tag ?? ALL_VALUE}
            onChange={(event) => changeQuery({ tag: event.target.value || null })}
          >
            <option value={ALL_VALUE}>전체</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        </SelectPill>
        <SelectPill id={ids.sort} label="정렬">
          <select
            id={ids.sort}
            className={styles.select}
            value={sortKey}
            onChange={(event) => changeSortKey(event.target.value as SortKey)}
          >
            {SORT_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </SelectPill>
      </div>
    </div>
  );
}

interface SelectPillProps {
  id: string;
  label: string;
  children: ReactNode;
}

/**
 * A pill with a visible label on the left and a native select filling the rest. The category/tag
 * selects add " 필터" via aria-label so they are not confused with the form fields of the same name.
 */
function SelectPill({ id, label, children }: SelectPillProps) {
  return (
    <div className={styles.pill}>
      <label htmlFor={id} className={styles.pillLabel}>
        {label}
      </label>
      {children}
      <ChevronDownIcon className={styles.chevron} />
    </div>
  );
}
