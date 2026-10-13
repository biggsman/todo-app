// Design Ref: §3.2, §5.3, §10.4 — view state for FilterBar/TodoList (query + sort key) and the
// derived visible list. It is UI-only and session-scoped, so it lives next to the components
// instead of in state/ (which holds the persisted todos) and is never saved.
import { useDeferredValue, useMemo, useState } from 'react';
import { collectCategories, collectTags, filterTodos } from '@/domain/filter';
import { sortTodos } from '@/domain/sort';
import type { SortKey, Todo, TodoQuery } from '@/domain/todo';

export const DEFAULT_QUERY: TodoQuery = { status: 'all', text: '', category: null, tag: null };
/** §5.1 shows 마감일순 as the initial sort: the most urgent work comes first. */
export const DEFAULT_SORT_KEY: SortKey = 'dueDate';

export interface TodoView {
  query: TodoQuery;
  sortKey: SortKey;
  categories: string[];
  tags: string[];
  visibleTodos: Todo[];
  /** True when any filter (not the sort) differs from the defaults. */
  isFiltered: boolean;
  changeQuery: (patch: Partial<TodoQuery>) => void;
  changeSortKey: (sortKey: SortKey) => void;
  resetFilters: () => void;
}

export function useTodoView(todos: Todo[]): TodoView {
  const [query, setQuery] = useState<TodoQuery>(DEFAULT_QUERY);
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const categories = useMemo(() => collectCategories(todos), [todos]);
  const tags = useMemo(() => collectTags(todos), [todos]);

  // A selected category/tag that no todo uses any more falls back to "전체". Adjusting state
  // while rendering (instead of in an effect) avoids one frame with an empty, unexplained list.
  const isCategoryStale = query.category !== null && !categories.includes(query.category);
  const isTagStale = query.tag !== null && !tags.includes(query.tag);
  if (isCategoryStale || isTagStale) {
    setQuery({
      ...query,
      category: isCategoryStale ? null : query.category,
      tag: isTagStale ? null : query.tag,
    });
  }

  // Plan NFR Performance: the list follows deferred copies of the query and sort key. The search
  // box and filter buttons repaint at once; React renders the (up to 1,000-row) list right after
  // at background priority and drops that work if the next keystroke arrives first. Todo changes
  // (add, toggle, delete) are not deferred.
  const listQuery = useDeferredValue(query);
  const listSortKey = useDeferredValue(sortKey);

  // Plan SC: FR-08/09/10 — the visible list is derived with useMemo, never stored
  const visibleTodos = useMemo(
    () => sortTodos(filterTodos(todos, listQuery), listSortKey),
    [todos, listQuery, listSortKey],
  );

  return {
    query,
    sortKey,
    categories,
    tags,
    visibleTodos,
    isFiltered:
      query.status !== DEFAULT_QUERY.status ||
      query.text.trim() !== '' ||
      query.category !== null ||
      query.tag !== null,
    changeQuery: (patch) => setQuery((current) => ({ ...current, ...patch })),
    changeSortKey: setSortKey,
    resetFilters: () => setQuery(DEFAULT_QUERY),
  };
}
