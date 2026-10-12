import { describe, expect, it } from 'vitest';
import { makeTodo } from '@/test/factories';
import {
  diffInDays,
  formatShortDate,
  getDueStatus,
  isIsoTimestamp,
  isValidDateString,
  toLocalDateString,
} from './date';

const TODAY = '2026-10-12';

describe('getDueStatus (§8.2 #5)', () => {
  it.each([
    ['yesterday', '2026-10-11', 'overdue'],
    ['today', '2026-10-12', 'today'],
    ['tomorrow', '2026-10-13', 'upcoming'],
    ['last year', '2025-12-31', 'overdue'],
    ['next month', '2026-11-01', 'upcoming'],
  ] as const)('active todo due %s → %s', (_label, dueDate, expected) => {
    expect(getDueStatus(makeTodo({ dueDate }), TODAY)).toBe(expected);
  });

  it('returns none when there is no due date', () => {
    expect(getDueStatus(makeTodo({ dueDate: null }), TODAY)).toBe('none');
  });

  it('returns none for a completed todo even if it was due yesterday', () => {
    const done = makeTodo({ dueDate: '2026-10-11', completed: true, completedAt: TODAY });
    expect(getDueStatus(done, TODAY)).toBe('none');
  });
});

describe('toLocalDateString', () => {
  it('formats using local calendar fields with zero padding', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('uses the local date, not the UTC date, near midnight', () => {
    const lateEvening = new Date(2026, 9, 12, 23, 30);
    const earlyMorning = new Date(2026, 9, 12, 0, 15);
    expect(toLocalDateString(lateEvening)).toBe('2026-10-12');
    expect(toLocalDateString(earlyMorning)).toBe('2026-10-12');
  });
});

describe('isValidDateString', () => {
  it.each(['2026-10-12', '2024-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(isValidDateString(value)).toBe(true);
  });

  it.each(['', '2026-1-5', '2026/10/12', '2026-13-01', '2026-02-30', '2025-02-29', 'abc'])(
    'rejects %j',
    (value) => {
      expect(isValidDateString(value)).toBe(false);
    },
  );
});

describe('diffInDays', () => {
  it('counts whole calendar days in either direction', () => {
    expect(diffInDays('2026-10-12', '2026-10-12')).toBe(0);
    expect(diffInDays('2026-10-10', '2026-10-12')).toBe(2);
    expect(diffInDays('2026-10-12', '2026-10-10')).toBe(-2);
  });

  it('crosses month and year boundaries', () => {
    expect(diffInDays('2026-09-30', '2026-10-01')).toBe(1);
    expect(diffInDays('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('isIsoTimestamp', () => {
  it('accepts toISOString output and offsets', () => {
    expect(isIsoTimestamp('2026-10-12T09:00:00.000Z')).toBe(true);
    expect(isIsoTimestamp('2026-10-12T09:00:00Z')).toBe(true);
    expect(isIsoTimestamp('2026-10-12T18:00:00+09:00')).toBe(true);
  });

  it('rejects dates without time, free text and impossible values', () => {
    expect(isIsoTimestamp('2026-10-12')).toBe(false);
    expect(isIsoTimestamp('yesterday')).toBe(false);
    expect(isIsoTimestamp('2026-13-40T99:00:00.000Z')).toBe(false);
  });
});

describe('formatShortDate', () => {
  it('drops the year and zero padding within the same year', () => {
    expect(formatShortDate('2026-10-04', '2026-10-12')).toBe('10/4');
  });

  it('keeps the year for another year', () => {
    expect(formatShortDate('2027-01-05', '2026-10-12')).toBe('2027/1/5');
  });
});
