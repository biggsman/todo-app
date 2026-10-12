import { describe, expect, it } from 'vitest';
import { makeTodo } from '@/test/factories';
import { todoReducer } from './todoReducer';
import type { TodoAction, TodoState } from './todoReducer';

const NOW = '2026-10-12T09:00:00.000Z';

function stateOf(count: number): TodoState {
  return { todos: Array.from({ length: count }, () => makeTodo()) };
}

describe('todoReducer (§8.2 #13)', () => {
  it('add appends the todo without mutating the previous state', () => {
    const state = stateOf(2);
    const before = [...state.todos];
    const todo = makeTodo();

    const next = todoReducer(state, { type: 'add', todo });

    expect(next.todos).toEqual([...before, todo]);
    expect(state.todos).toEqual(before);
  });

  it('update replaces the todo with the same id in place', () => {
    const state = stateOf(3);
    const changed = { ...state.todos[1], title: '수정됨' };

    const next = todoReducer(state, { type: 'update', todo: changed });

    expect(next.todos).toEqual([state.todos[0], changed, state.todos[2]]);
  });

  it('toggle completes and reopens using the action time', () => {
    const state = stateOf(2);
    const id = state.todos[0].id;

    const completed = todoReducer(state, { type: 'toggle', id, now: NOW });
    expect(completed.todos[0]).toMatchObject({ completed: true, completedAt: NOW, updatedAt: NOW });
    expect(completed.todos[1]).toBe(state.todos[1]);

    const reopened = todoReducer(completed, { type: 'toggle', id, now: NOW });
    expect(reopened.todos[0]).toMatchObject({ completed: false, completedAt: null });
  });

  it('remove drops the todo', () => {
    const state = stateOf(3);

    const next = todoReducer(state, { type: 'remove', id: state.todos[1].id });

    expect(next.todos).toEqual([state.todos[0], state.todos[2]]);
  });

  it('clearCompleted keeps only active todos', () => {
    const active = makeTodo();
    const state = { todos: [makeTodo({ completed: true }), active, makeTodo({ completed: true })] };

    expect(todoReducer(state, { type: 'clearCompleted' }).todos).toEqual([active]);
  });

  it('clearCompleted without completed todos returns the same state', () => {
    const state = stateOf(2);

    expect(todoReducer(state, { type: 'clearCompleted' })).toBe(state);
  });

  it('replaceAll swaps the whole list', () => {
    const imported = [makeTodo(), makeTodo()];

    expect(todoReducer(stateOf(3), { type: 'replaceAll', todos: imported }).todos).toBe(imported);
  });

  it.each<TodoAction>([
    { type: 'update', todo: makeTodo({ id: 'missing' }) },
    { type: 'toggle', id: 'missing', now: NOW },
    { type: 'remove', id: 'missing' },
  ])('$type with an unknown id returns the same state reference', (action) => {
    const state = stateOf(2);

    expect(todoReducer(state, action)).toBe(state);
  });
});

describe('todoReducer restore (§8.2 #14)', () => {
  it('puts two removed middle todos back in their original order', () => {
    const original = stateOf(5);
    const [a, b, c, d, e] = original.todos;
    const removed = [
      { todo: d, index: 3 },
      { todo: b, index: 1 },
    ];
    const afterRemove = { todos: [a, c, e] };

    // Items are given out of order on purpose: restore sorts them by index.
    const next = todoReducer(afterRemove, { type: 'restore', items: removed });

    expect(next.todos).toEqual([a, b, c, d, e]);
  });

  it('restores the result of clearCompleted', () => {
    const todos = [
      makeTodo({ completed: true }),
      makeTodo(),
      makeTodo({ completed: true }),
      makeTodo(),
      makeTodo({ completed: true }),
    ];
    const removed = todos
      .map((todo, index) => ({ todo, index }))
      .filter(({ todo }) => todo.completed);
    const cleared = todoReducer({ todos }, { type: 'clearCompleted' });

    expect(todoReducer(cleared, { type: 'restore', items: removed }).todos).toEqual(todos);
  });

  it('appends items whose index is past the end', () => {
    const state = stateOf(1);
    const todo = makeTodo();

    const next = todoReducer(state, { type: 'restore', items: [{ todo, index: 10 }] });

    expect(next.todos).toEqual([state.todos[0], todo]);
  });

  it('skips ids that are already present', () => {
    const state = stateOf(2);
    const fresh = makeTodo();

    const next = todoReducer(state, {
      type: 'restore',
      items: [
        { todo: state.todos[0], index: 0 },
        { todo: fresh, index: 1 },
        { todo: fresh, index: 2 },
      ],
    });

    expect(next.todos).toEqual([state.todos[0], fresh, state.todos[1]]);
  });

  it('returns the same state when nothing is restored', () => {
    const state = stateOf(2);

    const next = todoReducer(state, {
      type: 'restore',
      items: [{ todo: state.todos[1], index: 0 }],
    });

    expect(next).toBe(state);
    expect(todoReducer(state, { type: 'restore', items: [] })).toBe(state);
  });
});
