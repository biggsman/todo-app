import { describe, expect, it } from 'vitest';
import { makeFixtureTodos, makeTodo, makeTodos } from '@/test/factories';
import { sortTodos } from './sort';

const ids = (todos: { id: string }[]) => todos.map((todo) => todo.id);
const at = (minute: number) => `2026-10-01T00:${String(minute).padStart(2, '0')}:00.000Z`;

describe('sortTodos("dueDate") (§8.2 #6)', () => {
  it('sorts ascending with todos without a due date last', () => {
    const todos = [
      makeTodo({ id: 'none', dueDate: null }),
      makeTodo({ id: 'late', dueDate: '2026-10-20' }),
      makeTodo({ id: 'early', dueDate: '2026-10-01' }),
      makeTodo({ id: 'mid', dueDate: '2026-10-12' }),
    ];

    expect(ids(sortTodos(todos, 'dueDate'))).toEqual(['early', 'mid', 'late', 'none']);
  });

  it('returns a new array and leaves the input untouched', () => {
    const todos = makeFixtureTodos();
    const before = ids(todos);
    const snapshot = structuredClone(todos);

    const sorted = sortTodos(todos, 'dueDate');

    expect(sorted).not.toBe(todos);
    expect(ids(todos)).toEqual(before);
    expect(todos).toEqual(snapshot);
  });

  it('breaks ties (same date, and among no-date todos) by newest createdAt first', () => {
    const todos = [
      makeTodo({ id: 'same-old', dueDate: '2026-10-12', createdAt: at(1) }),
      makeTodo({ id: 'none-old', dueDate: null, createdAt: at(2) }),
      makeTodo({ id: 'same-new', dueDate: '2026-10-12', createdAt: at(3) }),
      makeTodo({ id: 'none-new', dueDate: null, createdAt: at(4) }),
    ];

    expect(ids(sortTodos(todos, 'dueDate'))).toEqual([
      'same-new',
      'same-old',
      'none-new',
      'none-old',
    ]);
  });

  it('orders the fixture by due date, completed todos last', () => {
    expect(ids(sortTodos(makeFixtureTodos(), 'dueDate'))).toEqual([
      'fixture-1', // 10-11
      'fixture-2', // 10-12
      'fixture-3', // 10-14
      'fixture-5', // 10-20
      'fixture-6', // none, newer
      'fixture-4', // none, older
      'fixture-8', // completed, 10-01
      'fixture-7', // completed, 10-10
    ]);
  });

  it('puts completed todos after open ones, even with an earlier due date (v0.2)', () => {
    const todos = [
      makeTodo({ id: 'done-early', dueDate: '2026-10-01', completed: true }),
      makeTodo({ id: 'open-none', dueDate: null }),
      makeTodo({ id: 'open-late', dueDate: '2026-10-20' }),
      makeTodo({ id: 'done-none', dueDate: null, completed: true }),
    ];

    expect(ids(sortTodos(todos, 'dueDate'))).toEqual([
      'open-late',
      'open-none',
      'done-early',
      'done-none',
    ]);
  });
});

describe('sortTodos("priority") (§8.2 #7)', () => {
  it('orders high → medium → low', () => {
    const todos = [
      makeTodo({ id: 'low', priority: 'low' }),
      makeTodo({ id: 'high', priority: 'high' }),
      makeTodo({ id: 'medium', priority: 'medium' }),
    ];

    expect(ids(sortTodos(todos, 'priority'))).toEqual(['high', 'medium', 'low']);
  });

  it('puts the newest first among equal priorities', () => {
    const todos = [
      makeTodo({ id: 'high-old', priority: 'high', createdAt: at(1) }),
      makeTodo({ id: 'low', priority: 'low', createdAt: at(5) }),
      makeTodo({ id: 'high-new', priority: 'high', createdAt: at(3) }),
    ];

    expect(ids(sortTodos(todos, 'priority'))).toEqual(['high-new', 'high-old', 'low']);
  });

  it('puts completed todos after open ones, each group by priority (v0.2)', () => {
    const todos = [
      makeTodo({ id: 'done-high', priority: 'high', completed: true }),
      makeTodo({ id: 'open-low', priority: 'low' }),
      makeTodo({ id: 'done-low', priority: 'low', completed: true }),
      makeTodo({ id: 'open-high', priority: 'high' }),
    ];

    expect(ids(sortTodos(todos, 'priority'))).toEqual([
      'open-high',
      'open-low',
      'done-high',
      'done-low',
    ]);
  });

  it('is stable when priority and createdAt are both equal', () => {
    const todos = ['a', 'b', 'c', 'd'].map((id) =>
      makeTodo({ id, priority: 'medium', createdAt: at(0) }),
    );

    expect(ids(sortTodos(todos, 'priority'))).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('sortTodos("createdAt")', () => {
  it('orders newest first', () => {
    const todos = [
      makeTodo({ id: 'mid', createdAt: at(2) }),
      makeTodo({ id: 'old', createdAt: at(1) }),
      makeTodo({ id: 'new', createdAt: at(3) }),
    ];

    expect(ids(sortTodos(todos, 'createdAt'))).toEqual(['new', 'mid', 'old']);
  });

  it('ignores completion: 최신순 is purely by createdAt (v0.2)', () => {
    const todos = [
      makeTodo({ id: 'open-old', createdAt: at(1) }),
      makeTodo({ id: 'done-new', createdAt: at(3), completed: true }),
      makeTodo({ id: 'open-mid', createdAt: at(2) }),
    ];

    expect(ids(sortTodos(todos, 'createdAt'))).toEqual(['done-new', 'open-mid', 'open-old']);
  });
});

describe('sortTodos edge cases', () => {
  it('handles an empty list', () => {
    expect(sortTodos([], 'priority')).toEqual([]);
  });

  it('sorts 1,000 todos and keeps every item', () => {
    const todos = makeTodos(1000);
    const sorted = sortTodos(todos, 'dueDate');
    expect(sorted).toHaveLength(1000);
    expect(new Set(ids(sorted))).toEqual(new Set(ids(todos)));
  });
});
