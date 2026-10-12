// Design Ref: §8.3 #6, §5.4 — deleting a row hands the removed todo to the Undo slot; badges.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoProvider, useTodos } from '@/state/TodoContext';
import { STORAGE_KEY, toStoredData } from '@/storage/schema';
import { makeTodo } from '@/test/factories';
import { MemoryStorage } from '@/test/fakeStorage';
import { TodoList } from './TodoList';
import type { Todo } from '@/domain/todo';

/** Renders the whole stored list, unfiltered (what TodoPage does with the default view). */
function ListFromContext() {
  const { todos } = useTodos();
  return <TodoList todos={todos} totalCount={todos.length} onResetFilters={() => {}} />;
}

function PendingUndoProbe() {
  const { pendingUndo } = useTodos();
  return <output aria-label="되돌리기 대기">{pendingUndo?.map((item) => item.todo.title)}</output>;
}

function renderList(todos: Todo[]) {
  const storage = new MemoryStorage({ [STORAGE_KEY]: JSON.stringify(toStoredData(todos)) });
  render(
    <TodoProvider storage={storage}>
      <ListFromContext />
      <PendingUndoProbe />
    </TodoProvider>,
  );
}

describe('TodoItem', () => {
  it('offers the deleted todo for undo', () => {
    renderList([makeTodo({ title: '청소' })]);

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: '되돌리기 대기' })).toHaveTextContent('청소');
  });

  it('shows a completed todo with a checked box', () => {
    renderList([
      makeTodo({ title: '운동', completed: true, completedAt: '2026-10-10T00:00:00.000Z' }),
    ]);

    expect(screen.getByRole('checkbox', { name: '운동' })).toBeChecked();
  });

  it('enters edit mode when Enter activates the focused title', () => {
    renderList([makeTodo({ title: '장보기' })]);

    // A native <button> turns Enter into a click, so the click covers the keyboard path.
    const title = screen.getByRole('button', { name: '장보기' });
    title.focus();
    fireEvent.click(title);

    expect(screen.getByRole('textbox', { name: '할 일 제목 수정' })).toHaveValue('장보기');
  });
});

describe('TodoItem badges (§5.4)', () => {
  beforeEach(() => {
    // Local noon on FIXTURE_TODAY (2026-10-12), so "today" is stable in any time zone.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 12, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function badgesOf(title: string): HTMLElement {
    return screen.getByRole('checkbox', { name: title }).closest('li')!;
  }

  it('shows "N일 지남" for an overdue todo and "오늘" for one due today', () => {
    renderList([
      makeTodo({ title: '보고서', dueDate: '2026-10-09' }),
      makeTodo({ title: '회의', dueDate: '2026-10-12' }),
      makeTodo({ title: '장보기', dueDate: '2026-10-14' }),
    ]);

    expect(within(badgesOf('보고서')).getByText('3일 지남')).toBeInTheDocument();
    expect(within(badgesOf('회의')).getByText('오늘')).toBeInTheDocument();
    expect(within(badgesOf('장보기')).getByText('10/14')).toBeInTheDocument();
  });

  it('gives a completed overdue todo a plain date instead of a warning', () => {
    renderList([
      makeTodo({
        title: '세금',
        dueDate: '2026-10-01',
        completed: true,
        completedAt: '2026-10-02T00:00:00.000Z',
      }),
    ]);

    const row = badgesOf('세금');
    expect(within(row).queryByText(/지남/)).not.toBeInTheDocument();
    expect(within(row).getByText('10/1')).toBeInTheDocument();
  });

  it('shows priority, category and tags', () => {
    renderList([
      makeTodo({ title: '발표', priority: 'high', category: '업무', tags: ['urgent', 'meeting'] }),
    ]);

    const row = badgesOf('발표');
    expect(within(row).getByText('높음')).toBeInTheDocument();
    expect(within(row).getByText('업무')).toBeInTheDocument();
    expect(within(row).getByText('#urgent')).toBeInTheDocument();
    expect(within(row).getByText('#meeting')).toBeInTheDocument();
    expect(within(row).queryByText(/마감/)).not.toBeInTheDocument();
  });
});
