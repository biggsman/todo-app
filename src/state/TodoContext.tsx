// Design Ref: §2.2, §4.1, §9.4 — Provider that loads todos once, auto-saves every change, and
// exposes validated actions. The clock (new Date) and ids (crypto.randomUUID) live here so the
// domain and reducer stay pure.
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ok } from '@/domain/errors';
import { createTodo, updateTodo } from '@/domain/todo';
import { backupBeforeImport } from '@/storage/backup';
import { getBrowserStorage, loadTodos, saveTodos } from '@/storage/todoStorage';
import { todoReducer } from './todoReducer';
import { useUndo } from './useUndo';
import type { ReactNode } from 'react';
import type { AppError, NewTodoInput, Result, Todo, TodoPatch } from '@/domain/todo';
import type { LoadResult } from '@/storage/todoStorage';
import type { RemovedItem } from './todoReducer';

export interface StorageStatus {
  /** Stored data was corrupt; the original was backed up and the app started empty (FR-14). */
  recovered: boolean;
  /** localStorage cannot be used; changes live in memory only (STORAGE_UNAVAILABLE). */
  unavailable: boolean;
  /** Error of the most recent save, cleared by the next successful save. */
  saveError: AppError | null;
}

export interface TodosValue {
  todos: Todo[];
  storageStatus: StorageStatus;
  /** Removed items that can still be restored with `undo()`, or null. */
  pendingUndo: RemovedItem[] | null;
}

export interface TodoActions {
  add: (input: NewTodoInput) => Result<Todo>;
  /** Validation errors are returned; an unknown id is a no-op. */
  update: (id: string, patch: TodoPatch) => Result<void>;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clearCompleted: () => void;
  /** Replaces all todos with already-validated imported ones, after a pre-import backup. */
  importTodos: (todos: Todo[]) => void;
  undo: () => void;
  dismissUndo: () => void;
}

interface TodoProviderProps {
  children: ReactNode;
  /** Storage to use; `null` simulates unavailable storage. Defaults to the browser's localStorage. */
  storage?: Storage | null;
}

const EMPTY_LOAD: LoadResult = { todos: [], recovered: false };

const TodosContext = createContext<TodosValue | null>(null);
const TodoActionsContext = createContext<TodoActions | null>(null);

export function TodoProvider({ children, storage: storageProp }: TodoProviderProps) {
  const [storage] = useState(() => (storageProp === undefined ? getBrowserStorage() : storageProp));
  // Plan SC: FR-05 / FR-14 — load once on start; corrupt data is backed up and reported
  const [initial] = useState(() => (storage ? loadTodos(storage) : EMPTY_LOAD));
  const [state, dispatch] = useReducer(todoReducer, { todos: initial.todos });
  const [saveError, setSaveError] = useState<AppError | null>(null);
  const { pending, offer, undo, dismiss } = useUndo();
  const lastSavedRef = useRef(initial.todos);

  useEffect(() => {
    // Skips the initial (already stored) list; also keeps StrictMode's double effect harmless.
    if (!storage || state.todos === lastSavedRef.current) return;
    lastSavedRef.current = state.todos;
    // Plan SC: FR-05 — every change is saved automatically
    const result = saveTodos(storage, state.todos);
    setSaveError(result.ok ? null : result.error);
  }, [storage, state.todos]);

  const { todos } = state;

  const actions = useMemo<TodoActions>(
    () => ({
      add(input) {
        const created = createTodo(input, new Date(), crypto.randomUUID());
        if (created.ok) dispatch({ type: 'add', todo: created.value });
        return created;
      },
      update(id, patch) {
        const current = todos.find((todo) => todo.id === id);
        if (!current) return ok(undefined);
        const updated = updateTodo(current, patch, new Date());
        if (!updated.ok) return updated;
        dispatch({ type: 'update', todo: updated.value });
        return ok(undefined);
      },
      toggle(id) {
        dispatch({ type: 'toggle', id, now: new Date().toISOString() });
      },
      remove(id) {
        const index = todos.findIndex((todo) => todo.id === id);
        if (index === -1) return;
        dispatch({ type: 'remove', id });
        // Plan SC: FR-12 — the removed todo and its position go to the Undo slot
        offer([{ todo: todos[index], index }]);
      },
      clearCompleted() {
        const removed = todos
          .map((todo, index) => ({ todo, index }))
          .filter(({ todo }) => todo.completed);
        if (removed.length === 0) return;
        dispatch({ type: 'clearCompleted' });
        offer(removed);
      },
      importTodos(imported) {
        // Plan SC: FR-13 — current data is copied aside before the import replaces it
        if (storage) backupBeforeImport(storage, todos);
        dispatch({ type: 'replaceAll', todos: imported });
        // Restoring old positions into a replaced list would mix the two data sets.
        dismiss();
      },
      undo() {
        const items = undo();
        if (items) dispatch({ type: 'restore', items });
      },
      dismissUndo: dismiss,
    }),
    [todos, storage, offer, undo, dismiss],
  );

  const value = useMemo<TodosValue>(
    () => ({
      todos,
      storageStatus: { recovered: initial.recovered, unavailable: storage === null, saveError },
      pendingUndo: pending,
    }),
    [todos, initial.recovered, storage, saveError, pending],
  );

  return (
    <TodoActionsContext.Provider value={actions}>
      <TodosContext.Provider value={value}>{children}</TodosContext.Provider>
    </TodoActionsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hooks belong with their Provider (§9.4)
export function useTodos(): TodosValue {
  const value = useContext(TodosContext);
  if (!value) throw new Error('useTodos must be used inside <TodoProvider>');
  return value;
}

// eslint-disable-next-line react-refresh/only-export-components -- hooks belong with their Provider (§9.4)
export function useTodoActions(): TodoActions {
  const actions = useContext(TodoActionsContext);
  if (!actions) throw new Error('useTodoActions must be used inside <TodoProvider>');
  return actions;
}
