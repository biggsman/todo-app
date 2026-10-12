// Design Ref: §4.2 — pure state transitions for the todo list.
// Validation happens before dispatch (domain); the reducer only applies already-valid changes.
import { toggleTodo } from '@/domain/todo';
import type { Todo } from '@/domain/todo';

export interface TodoState {
  todos: Todo[];
}

/** A removed todo and the index it had in `todos`, so Undo can put it back in place. */
export interface RemovedItem {
  todo: Todo;
  index: number;
}

export type TodoAction =
  | { type: 'add'; todo: Todo }
  | { type: 'update'; todo: Todo }
  | { type: 'toggle'; id: string; now: string }
  | { type: 'remove'; id: string }
  | { type: 'clearCompleted' }
  | { type: 'restore'; items: RemovedItem[] }
  | { type: 'replaceAll'; todos: Todo[] };

export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'add':
      return { todos: [...state.todos, action.todo] };
    case 'update':
      return replaceById(state, action.todo.id, () => action.todo);
    case 'toggle':
      return replaceById(state, action.id, (todo) => toggleTodo(todo, new Date(action.now)));
    case 'remove': {
      const todos = state.todos.filter((todo) => todo.id !== action.id);
      return todos.length === state.todos.length ? state : { todos };
    }
    case 'clearCompleted': {
      const todos = state.todos.filter((todo) => !todo.completed);
      return todos.length === state.todos.length ? state : { todos };
    }
    case 'restore':
      return restore(state, action.items);
    case 'replaceAll':
      return { todos: action.todos };
  }
}

// Unknown ids leave the state untouched (same reference, so nothing re-renders or re-saves).
function replaceById(state: TodoState, id: string, change: (todo: Todo) => Todo): TodoState {
  const index = state.todos.findIndex((todo) => todo.id === id);
  if (index === -1) return state;
  const todos = [...state.todos];
  todos[index] = change(todos[index]);
  return { todos };
}

/**
 * Re-inserts removed items at their original indices. Inserting in ascending index order
 * rebuilds the original list, because every lower index is already back in place when a
 * higher one is inserted. Ids that are already present are skipped.
 */
function restore(state: TodoState, items: RemovedItem[]): TodoState {
  const presentIds = new Set(state.todos.map((todo) => todo.id));
  const todos = [...state.todos];
  // Plan SC: FR-12 — undo puts removed todos back exactly where they were
  const ordered = [...items].sort((a, b) => a.index - b.index);
  for (const { todo, index } of ordered) {
    if (presentIds.has(todo.id)) continue;
    presentIds.add(todo.id);
    todos.splice(Math.min(index, todos.length), 0, todo);
  }
  return todos.length === state.todos.length ? state : { todos };
}
