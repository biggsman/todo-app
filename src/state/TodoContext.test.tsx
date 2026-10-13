import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CORRUPT_BACKUP_KEY,
  PRE_IMPORT_BACKUP_KEY,
  STORAGE_KEY,
  toStoredData,
} from '@/storage/schema';
import { makeFixtureTodos, makeTodo } from '@/test/factories';
import { MemoryStorage, QuotaExceededStorage } from '@/test/fakeStorage';
import { TodoProvider, useTodoActions, useTodos } from './TodoContext';
import { UNDO_TIMEOUT_MS } from './useUndo';
import type { ReactNode } from 'react';
import type { Todo } from '@/domain/todo';

function useTodoStore() {
  return { ...useTodos(), actions: useTodoActions() };
}

function renderStore(storage: Storage | null) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TodoProvider storage={storage}>{children}</TodoProvider>
  );
  return renderHook(useTodoStore, { wrapper });
}

function storageWith(todos: Todo[]): MemoryStorage {
  return new MemoryStorage({ [STORAGE_KEY]: JSON.stringify(toStoredData(todos)) });
}

function storedTodos(storage: Storage): Todo[] {
  return (JSON.parse(storage.getItem(STORAGE_KEY) ?? '') as { todos: Todo[] }).todos;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('TodoProvider loading', () => {
  it('loads existing todos without rewriting them', () => {
    const todos = makeFixtureTodos();
    const storage = storageWith(todos);
    const setItem = vi.spyOn(storage, 'setItem');

    const { result } = renderStore(storage);

    expect(result.current.todos).toEqual(todos);
    expect(result.current.storageStatus).toEqual({
      recovered: false,
      backupSaved: false,
      unavailable: false,
      saveError: null,
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it('flags recovery and keeps the corrupt original', () => {
    const storage = new MemoryStorage({ [STORAGE_KEY]: '{broken' });

    const { result } = renderStore(storage);

    expect(result.current.todos).toEqual([]);
    expect(result.current.storageStatus.recovered).toBe(true);
    expect(result.current.storageStatus.backupSaved).toBe(true);
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe('{broken');
  });

  describe('corrupt data whose original could not be kept aside (G3, §2.2 v0.3)', () => {
    function unsavedStorage(): MemoryStorage {
      // An earlier, different corrupt-backup occupies the key, so the new original is not saved.
      return new MemoryStorage({ [STORAGE_KEY]: '{second', [CORRUPT_BACKUP_KEY]: '{first' });
    }

    it('flags backupSaved=false and leaves the original under todo-app:v1 on start', () => {
      const storage = unsavedStorage();
      const wrapper = ({ children }: { children: ReactNode }) => (
        <StrictMode>
          <TodoProvider storage={storage}>{children}</TodoProvider>
        </StrictMode>
      );

      const { result } = renderHook(useTodoStore, { wrapper });

      expect(result.current.storageStatus).toMatchObject({ recovered: true, backupSaved: false });
      expect(storage.getItem(STORAGE_KEY)).toBe('{second');
      expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe('{first');
    });

    it('overwrites todo-app:v1 only with the first user change', () => {
      const storage = unsavedStorage();
      const { result } = renderStore(storage);

      act(() => {
        result.current.actions.add({ title: '새 시작' });
      });

      expect(storedTodos(storage).map((todo) => todo.title)).toEqual(['새 시작']);
      expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe('{first');
    });
  });

  it('works in memory and flags unavailable storage', () => {
    const { result } = renderStore(null);

    act(() => {
      result.current.actions.add({ title: '메모리 전용' });
    });

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.storageStatus.unavailable).toBe(true);
  });

  it('falls back to the browser localStorage when no storage prop is given', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(toStoredData([makeTodo({ title: '브라우저' })])),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TodoProvider>{children}</TodoProvider>
    );

    const { result } = renderHook(useTodoStore, { wrapper });

    expect(result.current.todos.map((todo) => todo.title)).toEqual(['브라우저']);
    localStorage.clear();
  });

  it('throws a clear error outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useTodos())).toThrow('inside <TodoProvider>');
    expect(() => renderHook(() => useTodoActions())).toThrow('inside <TodoProvider>');
    vi.restoreAllMocks();
  });
});

describe('TodoProvider actions', () => {
  it('add validates, creates and persists the todo', () => {
    const storage = new MemoryStorage();
    const { result } = renderStore(storage);

    let added: ReturnType<typeof result.current.actions.add> | undefined;
    act(() => {
      added = result.current.actions.add({ title: '  장보기 ', tags: ['Home'] });
    });

    expect(added?.ok).toBe(true);
    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0]).toMatchObject({ title: '장보기', tags: ['home'] });
    expect(result.current.todos[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(storedTodos(storage)).toEqual(result.current.todos);
  });

  it('add returns the validation error and changes nothing', () => {
    const storage = new MemoryStorage();
    const { result } = renderStore(storage);

    const added = result.current.actions.add({ title: '   ' });

    expect(added).toEqual({
      ok: false,
      error: { code: 'EMPTY_TITLE', message: '할 일 내용을 입력하세요' },
    });
    expect(result.current.todos).toEqual([]);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('update applies a valid patch and rejects an invalid one', () => {
    const todo = makeTodo({ title: '원래' });
    const storage = storageWith([todo]);
    const { result } = renderStore(storage);

    act(() => {
      expect(result.current.actions.update(todo.id, { title: '바뀜', priority: 'high' }).ok).toBe(
        true,
      );
    });
    expect(result.current.todos[0]).toMatchObject({ title: '바뀜', priority: 'high' });
    expect(storedTodos(storage)[0].title).toBe('바뀜');

    const invalid = result.current.actions.update(todo.id, { title: '' });
    expect(invalid.ok).toBe(false);
    expect(result.current.actions.update('missing', { title: '무시' })).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('toggle completes a todo and persists it', () => {
    const todo = makeTodo();
    const storage = storageWith([todo]);
    const { result } = renderStore(storage);

    act(() => result.current.actions.toggle(todo.id));

    expect(result.current.todos[0].completed).toBe(true);
    expect(result.current.todos[0].completedAt).not.toBeNull();
    expect(storedTodos(storage)[0].completed).toBe(true);
  });

  it('remove + undo restores the todo at the same index', () => {
    vi.useFakeTimers();
    const todos = [makeTodo(), makeTodo(), makeTodo()];
    const storage = storageWith(todos);
    const { result } = renderStore(storage);

    act(() => result.current.actions.remove(todos[1].id));
    expect(result.current.todos).toEqual([todos[0], todos[2]]);
    expect(result.current.pendingUndo).toEqual({
      reason: 'remove',
      items: [{ todo: todos[1], index: 1 }],
    });
    expect(storedTodos(storage)).toHaveLength(2);

    act(() => result.current.actions.undo());

    expect(result.current.todos).toEqual(todos);
    expect(result.current.pendingUndo).toBeNull();
    expect(storedTodos(storage)).toEqual(todos);
  });

  it('remove becomes permanent after the undo window', () => {
    vi.useFakeTimers();
    const todos = [makeTodo(), makeTodo()];
    const { result } = renderStore(storageWith(todos));

    act(() => result.current.actions.remove(todos[0].id));
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS));
    act(() => result.current.actions.undo());

    expect(result.current.todos).toEqual([todos[1]]);
  });

  it('remove of an unknown id does nothing', () => {
    const { result } = renderStore(storageWith([makeTodo()]));

    act(() => result.current.actions.remove('missing'));

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.pendingUndo).toBeNull();
  });

  it('clearCompleted removes completed todos and can be undone in order', () => {
    vi.useFakeTimers();
    const todos = makeFixtureTodos();
    const { result } = renderStore(storageWith(todos));

    act(() => result.current.actions.clearCompleted());
    expect(result.current.todos.every((todo) => !todo.completed)).toBe(true);
    expect(result.current.pendingUndo?.reason).toBe('clearCompleted');
    expect(result.current.pendingUndo?.items).toHaveLength(2);

    act(() => result.current.actions.undo());
    expect(result.current.todos).toEqual(todos);
  });

  it('clearCompleted without completed todos offers no undo', () => {
    const { result } = renderStore(storageWith([makeTodo()]));

    act(() => result.current.actions.clearCompleted());

    expect(result.current.pendingUndo).toBeNull();
  });

  it('importTodos replaces, persists and drops a pending undo', () => {
    vi.useFakeTimers();
    const current = [makeTodo({ title: '기존' }), makeTodo()];
    const imported = makeFixtureTodos();
    const storage = storageWith(current);
    const { result } = renderStore(storage);

    act(() => result.current.actions.remove(current[0].id));
    act(() => result.current.actions.importTodos(imported));
    act(() => result.current.actions.undo());

    expect(result.current.todos).toEqual(imported);
    expect(result.current.pendingUndo).toBeNull();
    expect(storedTodos(storage)).toEqual(imported);
  });

  it('importTodos creates the pre-import backup of the current list', () => {
    const current = [makeTodo({ title: '기존' })];
    const storage = storageWith(current);
    const { result } = renderStore(storage);

    act(() => {
      expect(result.current.actions.importTodos(makeFixtureTodos())).toEqual({
        ok: true,
        value: undefined,
      });
    });

    expect(JSON.parse(storage.getItem(PRE_IMPORT_BACKUP_KEY) ?? '')).toEqual({
      schemaVersion: 1,
      todos: current,
    });
  });

  it('importTodos keeps the current data and returns the error when the backup fails', () => {
    vi.useFakeTimers();
    const current = [makeTodo({ title: '기존' }), makeTodo()];
    const storage = storageWith(current);
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const { result } = renderStore(storage);
    act(() => result.current.actions.remove(current[1].id));

    let imported: ReturnType<typeof result.current.actions.importTodos> | undefined;
    act(() => {
      imported = result.current.actions.importTodos(makeFixtureTodos());
    });

    expect(imported).toEqual({
      ok: false,
      error: {
        code: 'IMPORT_BACKUP_FAILED',
        message: '현재 데이터를 백업하지 못해 가져오기를 취소했습니다. 기존 데이터는 그대로입니다',
      },
    });
    expect(result.current.todos).toEqual([current[0]]);
    // The earlier removal can still be undone: nothing was replaced.
    act(() => result.current.actions.undo());
    expect(result.current.todos).toEqual(current);
  });

  it('importTodos replaces in memory when storage is unavailable', () => {
    const { result } = renderStore(null);
    const imported = makeFixtureTodos();

    act(() => {
      expect(result.current.actions.importTodos(imported).ok).toBe(true);
    });

    expect(result.current.todos).toEqual(imported);
  });

  it('exportFile and parseImport round-trip the current todos', () => {
    const todos = makeFixtureTodos();
    const { result } = renderStore(storageWith(todos));

    const file = result.current.actions.exportFile();

    expect(file.filename).toMatch(/^todo-app-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(file.json)).toMatchObject({ app: 'todo-app', schemaVersion: 1, todos });
    expect(result.current.actions.parseImport(file.json)).toEqual({ ok: true, value: todos });
    expect(result.current.actions.parseImport('{').ok).toBe(false);
  });

  it('pauseUndo keeps the removal restorable past 5s; resumeUndo restarts the countdown', () => {
    vi.useFakeTimers();
    const todos = [makeTodo()];
    const { result } = renderStore(storageWith(todos));

    act(() => result.current.actions.remove(todos[0].id));
    act(() => result.current.actions.pauseUndo());
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS * 3));
    expect(result.current.pendingUndo).not.toBeNull();

    act(() => result.current.actions.resumeUndo());
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS));
    expect(result.current.pendingUndo).toBeNull();
  });

  it('dismissUndo drops the pending removal', () => {
    vi.useFakeTimers();
    const todos = [makeTodo()];
    const { result } = renderStore(storageWith(todos));

    act(() => result.current.actions.remove(todos[0].id));
    act(() => result.current.actions.dismissUndo());
    act(() => result.current.actions.undo());

    expect(result.current.todos).toEqual([]);
  });
});

describe('TodoProvider saving', () => {
  it('reports STORAGE_QUOTA and keeps the in-memory change', () => {
    const { result } = renderStore(new QuotaExceededStorage());

    act(() => {
      result.current.actions.add({ title: '용량 초과' });
    });

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.storageStatus.saveError?.code).toBe('STORAGE_QUOTA');
  });

  it('clears the save error after a later successful save', () => {
    const storage = new MemoryStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    setItem.mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const { result } = renderStore(storage);

    act(() => {
      result.current.actions.add({ title: '첫 번째' });
    });
    expect(result.current.storageStatus.saveError?.code).toBe('STORAGE_QUOTA');

    act(() => {
      result.current.actions.add({ title: '두 번째' });
    });
    expect(result.current.storageStatus.saveError).toBeNull();
    expect(storedTodos(storage)).toHaveLength(2);
  });

  it('does not save on mount under StrictMode', () => {
    const storage = storageWith([makeTodo()]);
    const setItem = vi.spyOn(storage, 'setItem');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <TodoProvider storage={storage}>{children}</TodoProvider>
      </StrictMode>
    );

    renderHook(useTodoStore, { wrapper });

    expect(setItem).not.toHaveBeenCalled();
  });
});
