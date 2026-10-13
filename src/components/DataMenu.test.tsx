// Design Ref: §5.2, §6.1, §7, §8.3 — DataMenu: export download, import validation/confirmation.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_IMPORT_BYTES } from '@/domain/importFile';
import { PRE_IMPORT_BACKUP_KEY, STORAGE_KEY, toStoredData } from '@/storage/schema';
import { makeFixtureTodos, makeTodo } from '@/test/factories';
import { MemoryStorage } from '@/test/fakeStorage';
import App from '../App';
import type { Todo } from '@/domain/todo';

function storageWith(todos: Todo[]): MemoryStorage {
  return new MemoryStorage({ [STORAGE_KEY]: JSON.stringify(toStoredData(todos)) });
}

function storedTodos(storage: Storage): Todo[] {
  return (JSON.parse(storage.getItem(STORAGE_KEY) ?? '') as { todos: Todo[] }).todos;
}

function exportText(todos: Todo[], overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    app: 'todo-app',
    schemaVersion: 1,
    exportedAt: '2026-10-12T09:00:00.000Z',
    todos,
    ...overrides,
  });
}

function menuButton(): HTMLElement {
  return screen.getByRole('button', { name: '데이터' });
}

function openMenu(): HTMLElement {
  fireEvent.click(menuButton());
  return screen.getByRole('menu', { name: '데이터' });
}

function chooseFile(file: File) {
  fireEvent.click(within(openMenu()).getByRole('menuitem', { name: '가져오기' }));
  fireEvent.change(screen.getByLabelText('가져올 백업 파일'), { target: { files: [file] } });
}

function jsonFile(text: string): File {
  return new File([text], 'backup.json', { type: 'application/json' });
}

const OTHER_APP_MESSAGE = 'todo-app 백업 파일이 아니거나 형식이 맞지 않습니다 (app)';
const BACKUP_FAILED_MESSAGE =
  '현재 데이터를 백업하지 못해 가져오기를 취소했습니다. 기존 데이터는 그대로입니다';

describe('DataMenu menu', () => {
  it('opens with focus on the first item, moves with arrows and closes with Esc', () => {
    render(<App storage={new MemoryStorage()} />);
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');

    const menu = openMenu();
    const [exportItem, importItem] = within(menu).getAllByRole('menuitem');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(exportItem).toHaveFocus();
    expect(exportItem).toHaveAccessibleName('내보내기');
    expect(importItem).toHaveAccessibleName('가져오기');

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(importItem).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(exportItem).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'End' });
    expect(importItem).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(exportItem).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(importItem).toHaveFocus();

    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
  });

  it('opens from the keyboard and closes on an outside press or Tab', () => {
    render(<App storage={new MemoryStorage()} />);

    fireEvent.keyDown(menuButton(), { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.keyDown(menuButton(), { key: 'ArrowUp' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('DataMenu export (FR-13)', () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:todo-export');
  const revokeObjectURL = vi.fn<(url: string) => void>();

  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it('downloads the todos as a dated JSON file and revokes the URL', async () => {
    const todos = makeFixtureTodos();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App storage={storageWith(todos)} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: '내보내기' }));

    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^todo-app-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(link.href).toBe('blob:todo-export');
    expect(link.isConnected).toBe(false);
    expect(menuButton()).toHaveFocus();

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/json');
    expect(JSON.parse(await blob.text())).toMatchObject({
      app: 'todo-app',
      schemaVersion: 1,
      todos,
    });

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:todo-export');
  });
});

describe('DataMenu import (FR-13)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('confirms the merge, keeps current todos, backs up and reports the counts', async () => {
    const current = [makeTodo({ title: '기존 1' }), makeTodo({ title: '기존 2' })];
    const imported = makeFixtureTodos();
    const storage = storageWith(current);
    render(<App storage={storage} />);

    chooseFile(jsonFile(exportText(imported)));

    const dialog = await screen.findByRole('dialog', { name: '데이터 가져오기' });
    expect(dialog).toHaveAccessibleDescription(
      '새 할 일 8개를 추가하고, 0개를 더 최신 내용으로 바꿉니다',
    );
    expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus();
    expect(storedTodos(storage)).toEqual(current);

    fireEvent.click(within(dialog).getByRole('button', { name: '합치기' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(storedTodos(storage)).toEqual([...current, ...imported]);
    expect(JSON.parse(storage.getItem(PRE_IMPORT_BACKUP_KEY) ?? '').todos).toEqual(current);
    expect(screen.getByText('8개 추가, 0개 갱신했습니다')).toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
  });

  it('취소 and Esc keep the current data', async () => {
    const current = [makeTodo({ title: '기존' })];
    const storage = storageWith(current);
    render(<App storage={storage} />);

    chooseFile(jsonFile(exportText(makeFixtureTodos())));
    fireEvent.click(await screen.findByRole('button', { name: '취소' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    chooseFile(jsonFile(exportText(makeFixtureTodos())));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(storedTodos(storage)).toEqual(current);
    expect(storage.getItem(PRE_IMPORT_BACKUP_KEY)).toBeNull();
    expect(menuButton()).toHaveFocus();
  });

  it('the dialog cancel event (native Esc) also cancels', async () => {
    render(<App storage={storageWith([makeTodo()])} />);

    chooseFile(jsonFile(exportText([])));
    fireEvent(await screen.findByRole('dialog'), new Event('cancel', { cancelable: true }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['invalid JSON', '{ not json', '올바른 JSON 파일이 아닙니다'],
    ['another app', exportText([], { app: 'other-app' }), OTHER_APP_MESSAGE],
  ])('rejects %s with an error toast and keeps the data', async (_name, text, message) => {
    const current = [makeTodo({ title: '기존' })];
    const storage = storageWith(current);
    render(<App storage={storage} />);

    chooseFile(jsonFile(text));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(storedTodos(storage)).toEqual(current);
  });

  it('rejects a file over 5MB before reading it', () => {
    render(<App storage={storageWith([makeTodo()])} />);
    const file = jsonFile('{}');
    Object.defineProperty(file, 'size', { value: MAX_IMPORT_BYTES + 1 });
    const readText = vi.spyOn(file, 'text');

    chooseFile(file);

    expect(screen.getByText('5MB 이하 파일만 가져올 수 있습니다')).toBeInTheDocument();
    expect(readText).not.toHaveBeenCalled();
  });

  it('reports an unreadable file as invalid JSON', async () => {
    render(<App storage={storageWith([makeTodo()])} />);
    const file = jsonFile('{}');
    vi.spyOn(file, 'text').mockRejectedValue(new Error('read failed'));

    chooseFile(file);

    expect(await screen.findByText('올바른 JSON 파일이 아닙니다')).toBeInTheDocument();
  });

  it('cancels the import and keeps the data when the backup cannot be written', async () => {
    const current = [makeTodo({ title: '기존' })];
    const storage = storageWith(current);
    const writeItem = storage.setItem.bind(storage);
    vi.spyOn(storage, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === PRE_IMPORT_BACKUP_KEY) throw new DOMException('full', 'QuotaExceededError');
      writeItem(key, value);
    });
    render(<App storage={storage} />);

    chooseFile(jsonFile(exportText(makeFixtureTodos())));
    fireEvent.click(await screen.findByRole('button', { name: '합치기' }));

    expect(screen.getByText(BACKUP_FAILED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '기존' })).toBeInTheDocument();
    expect(storedTodos(storage)).toEqual(current);
  });

  it('ignores an empty file selection', async () => {
    render(<App storage={storageWith([makeTodo()])} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: '가져오기' }));
    fireEvent.change(screen.getByLabelText('가져올 백업 파일'), { target: { files: [] } });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
