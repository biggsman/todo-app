// Design Ref: §2.2, §4.1, §9.4 — Provider that loads todos once, auto-saves every change, and
// exposes validated actions. The clock (new Date) and ids (crypto.randomUUID) live here so the
// domain and reducer stay pure.
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ok } from '@/domain/errors';
import { createTodo, updateTodo } from '@/domain/todo';
import { backupBeforeImport, exportTodos, parseImportFile } from '@/storage/backup';
import { getBrowserStorage, loadTodos, saveTodos } from '@/storage/todoStorage';
import { todoReducer } from './todoReducer';
import { useUndo } from './useUndo';
import type { ReactNode } from 'react';
import type { AppError, NewTodoInput, Result, Todo, TodoPatch } from '@/domain/todo';
import type { ExportFile } from '@/storage/backup';
import type { LoadResult } from '@/storage/todoStorage';
import type { RemovedItem } from './todoReducer';

// Re-exported so components can name these types without importing storage/ (§9.3).
export type { ExportFile, RemovedItem };

/** What the pending Undo would bring back; the reason picks the toast wording (FR-12). */
export interface PendingUndo {
  reason: 'remove' | 'clearCompleted';
  items: RemovedItem[];
}

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
  pendingUndo: PendingUndo | null;
}

export interface TodoActions {
  add: (input: NewTodoInput) => Result<Todo>;
  /** Validation errors are returned; an unknown id is a no-op. */
  update: (id: string, patch: TodoPatch) => Result<void>;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clearCompleted: () => void;
  /** Current todos as a backup file (FR-13). */
  exportFile: () => ExportFile;
  /** Validates the text of an import file; nothing changes until `importTodos`. */
  parseImport: (text: string) => Result<Todo[]>;
  /**
   * Replaces all todos with already-validated imported ones. The current list is backed up first;
   * if that backup fails, nothing is replaced and the error is returned (§4.1 v0.2).
   */
  importTodos: (todos: Todo[]) => Result<void>;
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
  const [undoReason, setUndoReason] = useState<PendingUndo['reason']>('remove');
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
        setUndoReason('remove');
      },
      clearCompleted() {
        const removed = todos
          .map((todo, index) => ({ todo, index }))
          .filter(({ todo }) => todo.completed);
        if (removed.length === 0) return;
        dispatch({ type: 'clearCompleted' });
        offer(removed);
        setUndoReason('clearCompleted');
      },
      exportFile() {
        return exportTodos(todos, new Date());
      },
      parseImport(text) {
        return parseImportFile(text);
      },
      importTodos(imported) {
        // Plan SC: FR-13 — current data is copied aside before the import replaces it, and a
        // failed backup cancels the import. Without storage there is nothing persisted to protect
        // (the app runs in memory only), so the confirmed import goes ahead.
        if (storage) {
          const backup = backupBeforeImport(storage, todos);
          if (!backup.ok) return backup;
        }
        dispatch({ type: 'replaceAll', todos: imported });
        // Restoring old positions into a replaced list would mix the two data sets.
        dismiss();
        return ok(undefined);
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
      pendingUndo: pending && { reason: undoReason, items: pending },
    }),
    [todos, initial.recovered, storage, saveError, pending, undoReason],
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
