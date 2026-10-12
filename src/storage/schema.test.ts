import { describe, expect, it } from 'vitest';
import { makeFixtureTodos, makeTodo } from '@/test/factories';
import { CURRENT_SCHEMA_VERSION, parseStoredData, parseTodoList, toStoredData } from './schema';
import type { Todo } from '@/domain/todo';

function storedWith(todo: Record<string, unknown>): unknown {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, todos: [todo] };
}

describe('parseStoredData', () => {
  it('accepts the stored shape and returns the todos', () => {
    const todos = makeFixtureTodos();

    expect(parseStoredData(toStoredData(todos))).toEqual({ ok: true, value: todos });
  });

  it('accepts an empty list', () => {
    expect(parseStoredData({ schemaVersion: 1, todos: [] })).toEqual({ ok: true, value: [] });
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'todos'],
    ['a missing schemaVersion', { todos: [] }],
    ['schemaVersion 2', { schemaVersion: 2, todos: [] }],
    ['todos that are not an array', { schemaVersion: 1, todos: {} }],
  ])('rejects %s as STORAGE_CORRUPT', (_label, raw) => {
    const result = parseStoredData(raw);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('STORAGE_CORRUPT');
  });

  it('rejects a todo with a missing field', () => {
    const withoutTitle: Record<string, unknown> = { ...makeTodo() };
    delete withoutTitle.title;

    expect(parseStoredData(storedWith(withoutTitle)).ok).toBe(false);
  });

  it('drops unknown fields', () => {
    const todo = makeTodo();
    const result = parseStoredData(storedWith({ ...todo, extra: '<script>' }));

    expect(result).toEqual({ ok: true, value: [todo] });
  });
});

describe('parseTodoList field checks', () => {
  const invalidFields: [keyof Todo, unknown][] = [
    ['id', ''],
    ['id', 7],
    ['title', '   '],
    ['title', 'x'.repeat(201)],
    ['title', 1],
    ['completed', 'yes'],
    ['priority', 'urgent'],
    ['dueDate', '2026-02-30'],
    ['dueDate', 20261012],
    ['category', 'x'.repeat(31)],
    ['category', 3],
    ['tags', 'home'],
    ['tags', [1]],
    ['tags', ['x'.repeat(21)]],
    ['createdAt', 'yesterday'],
    ['updatedAt', null],
    ['completedAt', '2026-10-12'],
  ];

  it.each(invalidFields)('points at %s when it is %j', (field, value) => {
    const result = parseTodoList([makeTodo(), { ...makeTodo(), [field]: value }]);

    expect(result).toEqual({ ok: false, error: { path: `todos[1].${field}` } });
  });

  it('reports a non-object item and a non-array list', () => {
    expect(parseTodoList([42])).toEqual({ ok: false, error: { path: 'todos[0]' } });
    expect(parseTodoList(undefined)).toEqual({ ok: false, error: { path: 'todos' } });
  });

  it('rejects duplicate ids', () => {
    const todo = makeTodo();

    expect(parseTodoList([todo, { ...todo }])).toEqual({
      ok: false,
      error: { path: 'todos[1].id' },
    });
  });

  it('accepts nullable fields and an empty category as null', () => {
    const todo = makeTodo({ dueDate: null, category: null, completedAt: null });
    const result = parseTodoList([{ ...todo, category: '' }]);

    expect(result).toEqual({ ok: true, value: [todo] });
  });

  it('accepts a completed todo with a due date, category and tags', () => {
    const todo = makeTodo({
      completed: true,
      completedAt: '2026-10-12T09:00:00.000Z',
      dueDate: '2026-10-14',
      category: '업무',
      tags: ['urgent', 'meeting'],
    });

    expect(parseTodoList([todo])).toEqual({ ok: true, value: [todo] });
  });
});
