// Design Ref: §8.3 #6, #10, §5.4 — undo toast, storage notices and focus after delete/undo.
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CORRUPT_BACKUP_KEY, STORAGE_KEY, toStoredData } from '@/storage/schema';
import { UNDO_TIMEOUT_MS } from '@/state/useUndo';
import { makeTodo } from '@/test/factories';
import { MemoryStorage, QuotaExceededStorage } from '@/test/fakeStorage';
import App from '../App';
import type { Todo } from '@/domain/todo';

const COMPLETED_AT = '2026-10-10T00:00:00.000Z';

function storageWith(todos: Todo[]): MemoryStorage {
  return new MemoryStorage({ [STORAGE_KEY]: JSON.stringify(toStoredData(todos)) });
}

/** Titles in display order (each row's checkbox is named after its todo). */
function listTitles(): string[] {
  const list = screen.queryByRole('list', { name: '할 일 목록' });
  if (!list) return [];
  return within(list)
    .getAllByRole('checkbox')
    .map((checkbox) => checkbox.getAttribute('aria-label') ?? '');
}

function deleteButtonOf(title: string): HTMLElement {
  const row = screen.getByRole('checkbox', { name: title }).closest('li')!;
  return within(row).getByRole('button', { name: '삭제' });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Undo toast (FR-12)', () => {
  it('shows 삭제됨 with 되돌리기, and undo restores the todo in place and focuses it', () => {
    vi.useFakeTimers();
    // createdAt order makes the default view show 첫째 → 둘째 → 셋째 (newest first among undated).
    render(
      <App
        storage={storageWith([
          makeTodo({ title: '셋째', createdAt: '2026-10-01T00:01:00.000Z' }),
          makeTodo({ title: '둘째', createdAt: '2026-10-01T00:02:00.000Z' }),
          makeTodo({ title: '첫째', createdAt: '2026-10-01T00:03:00.000Z' }),
        ])}
      />,
    );

    fireEvent.click(deleteButtonOf('둘째'));

    expect(screen.getByText('삭제됨')).toBeInTheDocument();
    expect(listTitles()).toEqual(['첫째', '셋째']);

    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));

    expect(listTitles()).toEqual(['첫째', '둘째', '셋째']);
    expect(screen.getByRole('button', { name: '둘째' })).toHaveFocus();
    expect(screen.queryByText('삭제됨')).not.toBeInTheDocument();
  });

  it('disappears after 5 seconds and the removal stays', () => {
    vi.useFakeTimers();
    render(<App storage={storageWith([makeTodo({ title: '청소' })])} />);

    fireEvent.click(deleteButtonOf('청소'));
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS));

    expect(screen.queryByRole('button', { name: '되돌리기' })).not.toBeInTheDocument();
    expect(listTitles()).toEqual([]);
  });

  it('완료 항목 삭제 shows the count and can be undone', () => {
    vi.useFakeTimers();
    render(
      <App
        storage={storageWith([
          makeTodo({ title: '운동', completed: true, completedAt: COMPLETED_AT }),
          makeTodo({ title: '장보기' }),
          makeTodo({ title: '빨래', completed: true, completedAt: COMPLETED_AT }),
        ])}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '완료 항목 삭제' }));

    expect(screen.getByText('완료 항목 2개 삭제됨')).toBeInTheDocument();
    expect(listTitles()).toEqual(['장보기']);
    expect(screen.getByRole('textbox', { name: '할 일 제목' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));

    expect(listTitles().sort()).toEqual(['빨래', '운동', '장보기'].sort());
  });

  it('can be closed without restoring', () => {
    vi.useFakeTimers();
    render(<App storage={storageWith([makeTodo({ title: '청소' })])} />);

    fireEvent.click(deleteButtonOf('청소'));
    fireEvent.click(screen.getByRole('button', { name: '알림 닫기' }));

    expect(screen.queryByText('삭제됨')).not.toBeInTheDocument();
    expect(listTitles()).toEqual([]);
    expect(screen.getByRole('textbox', { name: '할 일 제목' })).toHaveFocus();
  });
});

describe('Focus after delete', () => {
  const todos = () => [
    makeTodo({ title: 'C', createdAt: '2026-10-01T00:01:00.000Z' }),
    makeTodo({ title: 'B', createdAt: '2026-10-01T00:02:00.000Z' }),
    makeTodo({ title: 'A', createdAt: '2026-10-01T00:03:00.000Z' }),
  ];

  it('moves to the next row', () => {
    render(<App storage={storageWith(todos())} />);

    fireEvent.click(deleteButtonOf('A'));

    expect(screen.getByRole('button', { name: 'B' })).toHaveFocus();
  });

  it('moves to the previous row when the last row is deleted', () => {
    render(<App storage={storageWith(todos())} />);

    fireEvent.click(deleteButtonOf('C'));

    expect(screen.getByRole('button', { name: 'B' })).toHaveFocus();
  });

  it('moves to the title input when the list becomes empty', () => {
    render(<App storage={storageWith([makeTodo({ title: '하나' })])} />);

    fireEvent.click(deleteButtonOf('하나'));

    expect(screen.getByRole('textbox', { name: '할 일 제목' })).toHaveFocus();
  });
});

describe('Storage notices (FR-05, FR-14)', () => {
  it('#10 corrupt data: notice toast, empty list, original kept aside', () => {
    const storage = new MemoryStorage({ [STORAGE_KEY]: '{"schemaVersion":1,"todos":[{}]}' });

    render(<App storage={storage} />);

    expect(
      screen.getByText('저장된 데이터가 손상되어 새로 시작합니다. 원본은 따로 보관했습니다'),
    ).toBeInTheDocument();
    expect(screen.getByText('할 일이 없습니다. 위에서 추가해 보세요')).toBeInTheDocument();
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe('{"schemaVersion":1,"todos":[{}]}');
  });

  it('announces unavailable storage once, and the notice can be closed', () => {
    render(<App storage={null} />);

    const message = '이 브라우저에서는 저장할 수 없습니다 (시크릿 모드 등)';
    expect(screen.getAllByText(message)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '알림 닫기' }));
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('shows STORAGE_QUOTA when a save fails', () => {
    render(<App storage={new QuotaExceededStorage()} />);

    fireEvent.change(screen.getByRole('textbox', { name: '할 일 제목' }), {
      target: { value: '용량 초과' },
    });
    fireEvent.submit(screen.getByRole('textbox', { name: '할 일 제목' }).closest('form')!);

    expect(
      screen.getByText('저장 공간이 부족해 저장하지 못했습니다. 내보내기로 백업하세요'),
    ).toBeInTheDocument();
    expect(listTitles()).toEqual(['용량 초과']);
  });

  it('renders toasts inside a polite live region', () => {
    render(<App storage={null} />);

    const notice = screen.getByText('이 브라우저에서는 저장할 수 없습니다 (시크릿 모드 등)');
    expect(notice.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('Focus after pointer actions', () => {
  it('does not move focus to the text field after a tap (no on-screen keyboard pop-up)', () => {
    render(
      <App
        storage={storageWith([
          makeTodo({ title: '운동', completed: true, completedAt: COMPLETED_AT }),
        ])}
      />,
    );

    // A mouse/touch click reports detail ≥ 1; keyboard activation reports 0.
    fireEvent.click(screen.getByRole('button', { name: '완료 항목 삭제' }), { detail: 1 });

    expect(screen.getByRole('textbox', { name: '할 일 제목' })).not.toHaveFocus();
  });
});
