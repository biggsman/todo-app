// Design Ref: §9.4, §10.4 — the only place that reasons about local calendar dates.
// Due dates are 'YYYY-MM-DD' strings in the user's local time zone, so they compare lexically.
import type { DueStatus, Todo } from './todo';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Formats a Date as 'YYYY-MM-DD' using the local time zone (not UTC). */
export function toLocalDateString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True only for well-formed, real calendar dates (rejects '2026-02-30'). */
export function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Whole days from `from` to `to` (both 'YYYY-MM-DD'); negative when `to` is earlier. */
export function diffInDays(from: string, to: string): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / MS_PER_DAY);
}

export function getDueStatus(todo: Todo, today: string): DueStatus {
  // Plan SC: FR-06 — completed todos and todos without a due date get no due highlight
  if (todo.completed || todo.dueDate === null) return 'none';
  if (todo.dueDate < today) return 'overdue';
  if (todo.dueDate === today) return 'today';
  return 'upcoming';
}

// UTC midnight avoids daylight-saving shifts when counting days between two calendar dates.
function toUtcMidnight(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}
