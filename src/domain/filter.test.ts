import { describe, expect, it } from 'vitest';
import { makeFixtureTodos, makeTodo } from '@/test/factories';
import { collectCategories, collectTags, filterTodos } from './filter';
import type { TodoQuery } from './todo';

const ALL: TodoQuery = { status: 'all', text: '', category: null, tag: null };
const ids = (todos: { id: string }[]) => todos.map((todo) => todo.id);
const query = (overrides: Partial<TodoQuery>): TodoQuery => ({ ...ALL, ...overrides });

describe('filterTodos (§8.2 #8)', () => {
  const todos = makeFixtureTodos();

  it('returns every todo for the default query (null category/tag = all)', () => {
    expect(filterTodos(todos, ALL)).toEqual(todos);
  });

  it('filters by status', () => {
    expect(ids(filterTodos(todos, query({ status: 'completed' })))).toEqual([
      'fixture-7',
      'fixture-8',
    ]);
    expect(filterTodos(todos, query({ status: 'active' }))).toHaveLength(6);
  });

  it('matches title text case-insensitively and ignores surrounding spaces', () => {
    expect(ids(filterTodos(todos, query({ text: '  email ' })))).toEqual(['fixture-5']);
    expect(ids(filterTodos(todos, query({ text: 'CLIENT' })))).toEqual(['fixture-5']);
  });

  it('matches text against tags too', () => {
    expect(ids(filterTodos(todos, query({ text: 'MEET' })))).toEqual(['fixture-2', 'fixture-5']);
  });

  it('matches Korean partial titles', () => {
    expect(ids(filterTodos(todos, query({ text: '보고' })))).toEqual(['fixture-1']);
  });

  it('filters by exact category', () => {
    expect(ids(filterTodos(todos, query({ category: '업무' })))).toEqual([
      'fixture-1',
      'fixture-2',
      'fixture-5',
    ]);
  });

  it('filters by exact tag', () => {
    expect(ids(filterTodos(todos, query({ tag: 'home' })))).toEqual([
      'fixture-3',
      'fixture-6',
      'fixture-7',
    ]);
  });

  it('combines every condition with AND', () => {
    expect(
      ids(
        filterTodos(todos, query({ status: 'active', category: '개인', tag: 'home', text: '장' })),
      ),
    ).toEqual(['fixture-3']);
    expect(
      ids(filterTodos(todos, query({ status: 'completed', text: 'urgent', category: null }))),
    ).toEqual(['fixture-8']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterTodos(todos, query({ status: 'completed', category: '업무' }))).toEqual([]);
    expect(filterTodos(todos, query({ text: '없는 검색어' }))).toEqual([]);
  });

  it('does not mutate the input array and keeps the input order', () => {
    const input = makeFixtureTodos();
    const snapshot = structuredClone(input);

    const result = filterTodos(input, query({ status: 'active' }));

    expect(result).not.toBe(input);
    expect(input).toEqual(snapshot);
    expect(ids(result)).toEqual([
      'fixture-1',
      'fixture-2',
      'fixture-3',
      'fixture-4',
      'fixture-5',
      'fixture-6',
    ]);
  });
});

describe('collectCategories', () => {
  it('returns distinct non-null categories, sorted', () => {
    expect(collectCategories(makeFixtureTodos())).toEqual(['개인', '업무']);
  });

  it('returns an empty list when nothing has a category', () => {
    expect(collectCategories([makeTodo({ category: null })])).toEqual([]);
  });
});

describe('collectTags', () => {
  it('returns distinct tags, sorted', () => {
    expect(collectTags(makeFixtureTodos())).toEqual(['home', 'meeting', 'urgent']);
  });

  it('returns an empty list for no todos', () => {
    expect(collectTags([])).toEqual([]);
  });
});
