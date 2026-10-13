// Design Ref: §4.1 — import merges into the current list by id instead of replacing it,
// so todos added on two devices both survive a backup round trip.
import type { Todo } from './todo';

export interface MergeSummary {
  /** Todos that only existed in the imported file. */
  added: number;
  /** Todos present on both sides where the imported copy was edited more recently. */
  updated: number;
}

export interface MergeResult extends MergeSummary {
  todos: Todo[];
}

/**
 * Merges `incoming` into `current`. Matching ids keep whichever copy has the later `updatedAt`
 * (ties keep the current copy); current order is preserved and new todos are appended in their
 * imported order. Deletions are not propagated: a todo missing from one side is kept.
 */
export function mergeTodos(current: Todo[], incoming: Todo[]): MergeResult {
  const incomingById = new Map(incoming.map((todo) => [todo.id, todo]));
  let updated = 0;

  const merged = current.map((todo) => {
    const other = incomingById.get(todo.id);
    if (!other) return todo;
    incomingById.delete(todo.id);
    // Plan SC: FR-13 — the more recently edited copy wins
    if (Date.parse(other.updatedAt) > Date.parse(todo.updatedAt)) {
      updated += 1;
      return other;
    }
    return todo;
  });

  const added = [...incomingById.values()];
  return { todos: [...merged, ...added], added: added.length, updated };
}
