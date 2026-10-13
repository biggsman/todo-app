import { describe, expect, it } from 'vitest';
import { makeTodo } from '@/test/factories';
import { mergeTodos } from './merge';

const OLD = '2026-10-10T09:00:00.000Z';
const NEW = '2026-10-12T09:00:00.000Z';

describe('mergeTodos', () => {
  it('appends todos that only exist in the imported list, keeping current order first', () => {
    const a = makeTodo({ id: 'a', title: 'A' });
    const b = makeTodo({ id: 'b', title: 'B' });
    const c = makeTodo({ id: 'c', title: 'C' });

    const result = mergeTodos([a, b], [c]);

    expect(result.todos.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(result).toMatchObject({ added: 1, updated: 0 });
  });

  it('keeps the more recently updated copy when both sides have the same id', () => {
    const mine = makeTodo({ id: 'a', title: '내 것', updatedAt: OLD });
    const theirs = makeTodo({ id: 'a', title: '가져온 것', updatedAt: NEW });

    expect(mergeTodos([mine], [theirs]).todos[0].title).toBe('가져온 것');
    expect(mergeTodos([theirs], [mine]).todos[0].title).toBe('가져온 것');
    expect(mergeTodos([mine], [theirs])).toMatchObject({ added: 0, updated: 1 });
    expect(mergeTodos([theirs], [mine])).toMatchObject({ added: 0, updated: 0 });
  });

  it('keeps the current copy on a tie and never drops todos missing from the import', () => {
    const mine = makeTodo({ id: 'a', title: '내 것', updatedAt: OLD });
    const same = makeTodo({ id: 'a', title: '같은 시각', updatedAt: OLD });
    const onlyMine = makeTodo({ id: 'b' });

    const result = mergeTodos([mine, onlyMine], [same]);

    expect(result.todos.map((t) => t.title)).toEqual(['내 것', onlyMine.title]);
    expect(result).toMatchObject({ added: 0, updated: 0 });
  });

  it('does not mutate its inputs', () => {
    const current = [makeTodo({ id: 'a', updatedAt: OLD })];
    const incoming = [makeTodo({ id: 'a', updatedAt: NEW }), makeTodo({ id: 'b' })];
    const snapshot = JSON.stringify([current, incoming]);

    mergeTodos(current, incoming);

    expect(JSON.stringify([current, incoming])).toBe(snapshot);
  });
});
