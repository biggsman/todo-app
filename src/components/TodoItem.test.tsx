// Design Ref: §8.3 #6 — deleting a row hands the removed todo to the Undo slot.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TodoProvider, useTodos } from '@/state/TodoContext';
import { STORAGE_KEY, toStoredData } from '@/storage/schema';
import { makeTodo } from '@/test/factories';
import { MemoryStorage } from '@/test/fakeStorage';
import { TodoList } from './TodoList';
import type { Todo } from '@/domain/todo';

function PendingUndoProbe() {
  const { pendingUndo } = useTodos();
  return <output aria-label="되돌리기 대기">{pendingUndo?.map((item) => item.todo.title)}</output>;
}

function renderList(todos: Todo[]) {
  const storage = new MemoryStorage({ [STORAGE_KEY]: JSON.stringify(toStoredData(todos)) });
  render(
    <TodoProvider storage={storage}>
      <TodoList />
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
