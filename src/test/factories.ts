// Design Ref: §8.5 — deterministic test data (no clock, no random ids).
import type { Priority, Todo } from '@/domain/todo';

const BASE_CREATED_AT = Date.UTC(2026, 9, 1, 0, 0, 0);
const MINUTE_MS = 60 * 1000;
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

/** "Today" used by the fixture below, so due statuses are predictable. */
export const FIXTURE_TODAY = '2026-10-12';

let sequence = 0;

/** A valid active todo with defaults; `overrides` win. Each call gets a fresh id. */
export function makeTodo(overrides: Partial<Todo> = {}): Todo {
  sequence += 1;
  const createdAt = new Date(BASE_CREATED_AT + sequence * MINUTE_MS).toISOString();
  return {
    id: `todo-${sequence}`,
    title: `할 일 ${sequence}`,
    completed: false,
    priority: 'medium',
    dueDate: null,
    category: null,
    tags: [],
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    ...overrides,
  };
}

/** `count` varied todos with strictly increasing createdAt (for performance and bulk tests). */
export function makeTodos(count: number): Todo[] {
  return Array.from({ length: count }, (_, index) => {
    const createdAt = new Date(BASE_CREATED_AT + index * MINUTE_MS).toISOString();
    const completed = index % 4 === 0;
    return makeTodo({
      id: `bulk-${index}`,
      title: `Bulk todo ${index}`,
      priority: PRIORITIES[index % PRIORITIES.length],
      dueDate: index % 5 === 0 ? null : `2026-10-${String((index % 28) + 1).padStart(2, '0')}`,
      category: index % 3 === 0 ? null : `category-${index % 2}`,
      tags: [`tag-${index % 7}`],
      completed,
      completedAt: completed ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
    });
  });
}

/**
 * The 8-todo fixture from §8.5 relative to FIXTURE_TODAY:
 * 3 priorities, due overdue/today/upcoming/none, 2 completed, 2 categories, 3 tags.
 * createdAt increases with the list order (first = oldest).
 */
export function makeFixtureTodos(): Todo[] {
  const rows: FixtureRow[] = [
    {
      title: '보고서 제출',
      priority: 'high',
      dueDate: '2026-10-11',
      category: '업무',
      tags: ['urgent'],
    },
    {
      title: '회의 준비',
      priority: 'high',
      dueDate: '2026-10-12',
      category: '업무',
      tags: ['urgent', 'meeting'],
    },
    {
      title: '장보기',
      priority: 'medium',
      dueDate: '2026-10-14',
      category: '개인',
      tags: ['home'],
    },
    { title: '책 읽기', priority: 'low', dueDate: null, category: '개인', tags: [] },
    {
      title: 'Email Client',
      priority: 'medium',
      dueDate: '2026-10-20',
      category: '업무',
      tags: ['meeting'],
    },
    { title: '청소', priority: 'low', dueDate: null, category: null, tags: ['home'] },
    {
      title: '운동',
      priority: 'medium',
      dueDate: '2026-10-10',
      category: '개인',
      tags: ['home'],
      completed: true,
    },
    {
      title: '세금 납부',
      priority: 'high',
      dueDate: '2026-10-01',
      category: null,
      tags: ['urgent'],
      completed: true,
    },
  ];
  return rows.map((row, index) => {
    const createdAt = new Date(BASE_CREATED_AT + (index + 1) * MINUTE_MS).toISOString();
    const completed = row.completed ?? false;
    return {
      id: `fixture-${index + 1}`,
      ...row,
      completed,
      createdAt,
      updatedAt: createdAt,
      completedAt: completed ? createdAt : null,
    };
  });
}

type FixtureRow = Pick<Todo, 'title' | 'priority' | 'dueDate' | 'category' | 'tags'> & {
  completed?: boolean;
};
