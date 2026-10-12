// Design Ref: §1.2, §4.1 — user input is validated once at the boundary; inner code trusts the result.
import { fail, ok } from './errors';
import type { Result } from './todo';

export const TITLE_MAX_LENGTH = 200;
export const CATEGORY_MAX_LENGTH = 30;
export const TAG_MAX_LENGTH = 20;
export const TAGS_MAX_COUNT = 10;

export function validateTitle(raw: string): Result<string> {
  const title = raw.trim();
  // Plan SC: FR-01 — empty or whitespace-only titles are rejected
  if (title.length === 0) return fail('EMPTY_TITLE');
  if (title.length > TITLE_MAX_LENGTH) return fail('TITLE_TOO_LONG');
  return ok(title);
}

/**
 * Lowercases and trims each tag, drops blanks and duplicates (first occurrence wins),
 * then enforces the per-tag length and total count limits.
 */
export function normalizeTags(raw: string[]): Result<string[]> {
  const unique = new Set<string>();
  for (const tag of raw) {
    const normalized = tag.trim().toLowerCase();
    if (normalized.length === 0) continue;
    if (normalized.length > TAG_MAX_LENGTH) return fail('INVALID_TAG');
    unique.add(normalized);
  }
  // Plan SC: FR-10 — at most 10 distinct tags per todo
  if (unique.size > TAGS_MAX_COUNT) return fail('INVALID_TAG');
  return ok([...unique]);
}

export function validateCategory(raw: string): Result<string | null> {
  const category = raw.trim();
  if (category.length === 0) return ok(null);
  if (category.length > CATEGORY_MAX_LENGTH) return fail('INVALID_CATEGORY');
  return ok(category);
}
