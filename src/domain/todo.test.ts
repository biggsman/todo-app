import { describe, expect, it } from 'vitest';
import { makeTodo } from '@/test/factories';
import { createTodo, toggleTodo, updateTodo } from './todo';
import type { Todo } from './todo';

const NOW = new Date('2026-10-12T09:00:00.000Z');
const LATER = new Date('2026-10-12T10:30:00.000Z');
const ID = 'id-1';

function expectOk<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error('expected ok result');
  return result.value;
}

describe('createTodo (§8.2 #3)', () => {
  it('fills defaults from minimal input', () => {
    const todo = expectOk(createTodo({ title: '장보기' }, NOW, ID));

    expect(todo).toEqual<Todo>({
      id: ID,
      title: '장보기',
      completed: false,
      priority: 'medium',
      dueDate: null,
      category: null,
      tags: [],
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      completedAt: null,
    });
  });

  it('normalizes every optional field', () => {
    const todo = expectOk(
      createTodo(
        {
          title: '  보고서  ',
          priority: 'high',
          dueDate: '2026-10-20',
          category: ' 업무 ',
          tags: ['Work', 'work ', 'Q4'],
        },
        NOW,
        ID,
      ),
    );

    expect(todo).toMatchObject({
      title: '보고서',
      priority: 'high',
      dueDate: '2026-10-20',
      category: '업무',
      tags: ['work', 'q4'],
    });
  });

  it('treats blank dueDate and category as null', () => {
    const todo = expectOk(createTodo({ title: 'a', dueDate: '', category: '  ' }, NOW, ID));
    expect(todo.dueDate).toBeNull();
    expect(todo.category).toBeNull();
  });

  it('returns the validation error instead of a todo', () => {
    expect(createTodo({ title: '   ' }, NOW, ID)).toMatchObject({
      ok: false,
      error: { code: 'EMPTY_TITLE' },
    });
    expect(createTodo({ title: 'a', tags: ['x'.repeat(21)] }, NOW, ID)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TAG' },
    });
    expect(createTodo({ title: 'a', category: 'c'.repeat(31) }, NOW, ID)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CATEGORY' },
    });
  });

  it('throws on a malformed dueDate (programming error, not user input)', () => {
    expect(() => createTodo({ title: 'a', dueDate: '2026/10/12' }, NOW, ID)).toThrow(RangeError);
    expect(() => createTodo({ title: 'a', dueDate: '2026-02-30' }, NOW, ID)).toThrow(RangeError);
  });
});

describe('updateTodo', () => {
  it('applies the patch, keeps untouched fields and bumps updatedAt only', () => {
    const original = makeTodo({ title: '원래', tags: ['a'], category: '개인' });

    const updated = expectOk(updateTodo(original, { title: ' 새 제목 ', priority: 'low' }, LATER));

    expect(updated).toEqual({
      ...original,
      title: '새 제목',
      priority: 'low',
      updatedAt: LATER.toISOString(),
    });
    expect(updated.createdAt).toBe(original.createdAt);
  });

  it('can clear dueDate and category', () => {
    const original = makeTodo({ dueDate: '2026-10-20', category: '업무' });
    const updated = expectOk(updateTodo(original, { dueDate: null, category: '' }, LATER));
    expect(updated.dueDate).toBeNull();
    expect(updated.category).toBeNull();
  });

  it('normalizes patched tags', () => {
    const updated = expectOk(updateTodo(makeTodo(), { tags: ['A', 'a'] }, LATER));
    expect(updated.tags).toEqual(['a']);
  });

  it('keeps completion state untouched', () => {
    const original = makeTodo({ completed: true, completedAt: NOW.toISOString() });
    const updated = expectOk(updateTodo(original, { title: 'x' }, LATER));
    expect(updated.completed).toBe(true);
    expect(updated.completedAt).toBe(NOW.toISOString());
  });

  it('rejects an invalid patch and leaves the original untouched', () => {
    const original = makeTodo({ title: '원래' });
    const snapshot = structuredClone(original);

    expect(updateTodo(original, { title: '' }, LATER)).toMatchObject({
      ok: false,
      error: { code: 'EMPTY_TITLE' },
    });
    expect(original).toEqual(snapshot);
  });
});

describe('toggleTodo (§8.2 #4)', () => {
  it('sets completedAt on completion and clears it when toggled again', () => {
    const active = makeTodo();

    const done = toggleTodo(active, NOW);
    expect(done).toMatchObject({
      completed: true,
      completedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });

    const reopened = toggleTodo(done, LATER);
    expect(reopened).toMatchObject({
      completed: false,
      completedAt: null,
      updatedAt: LATER.toISOString(),
    });
  });

  it('returns a new object and does not mutate the input', () => {
    const active = makeTodo();
    const snapshot = structuredClone(active);

    const done = toggleTodo(active, NOW);

    expect(done).not.toBe(active);
    expect(active).toEqual(snapshot);
  });
});
