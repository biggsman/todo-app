import { describe, expect, it } from 'vitest';
import { ERROR_MESSAGES } from './errors';
import {
  CATEGORY_MAX_LENGTH,
  normalizeTags,
  TAG_MAX_LENGTH,
  TAGS_MAX_COUNT,
  TITLE_MAX_LENGTH,
  validateCategory,
  validateTitle,
} from './validate';

describe('validateTitle (§8.2 #1)', () => {
  it('rejects a whitespace-only title with EMPTY_TITLE and its Korean message', () => {
    expect(validateTitle('  ')).toEqual({
      ok: false,
      error: { code: 'EMPTY_TITLE', message: '할 일 내용을 입력하세요' },
    });
  });

  it('rejects an empty string', () => {
    expect(validateTitle('')).toMatchObject({ ok: false, error: { code: 'EMPTY_TITLE' } });
  });

  it('rejects a title longer than 200 characters', () => {
    expect(validateTitle('a'.repeat(TITLE_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: { code: 'TITLE_TOO_LONG', message: ERROR_MESSAGES.TITLE_TOO_LONG },
    });
  });

  it('accepts exactly 200 characters', () => {
    expect(validateTitle('가'.repeat(TITLE_MAX_LENGTH))).toEqual({
      ok: true,
      value: '가'.repeat(TITLE_MAX_LENGTH),
    });
  });

  it('measures length after trimming', () => {
    const padded = `  ${'a'.repeat(TITLE_MAX_LENGTH)}  `;
    expect(validateTitle(padded)).toEqual({ ok: true, value: 'a'.repeat(TITLE_MAX_LENGTH) });
  });

  it('trims surrounding whitespace', () => {
    expect(validateTitle(' 장보기 ')).toEqual({ ok: true, value: '장보기' });
  });
});

describe('normalizeTags (§8.2 #2)', () => {
  it('lowercases, trims and removes duplicates keeping first-seen order', () => {
    expect(normalizeTags(['A', 'a ', 'b'])).toEqual({ ok: true, value: ['a', 'b'] });
  });

  it('drops blank entries', () => {
    expect(normalizeTags(['  ', '', 'Work'])).toEqual({ ok: true, value: ['work'] });
  });

  it('accepts an empty list', () => {
    expect(normalizeTags([])).toEqual({ ok: true, value: [] });
  });

  it('rejects more than 10 distinct tags', () => {
    const eleven = Array.from({ length: TAGS_MAX_COUNT + 1 }, (_, i) => `tag${i}`);
    expect(normalizeTags(eleven)).toEqual({
      ok: false,
      error: { code: 'INVALID_TAG', message: '태그는 20자 이하, 최대 10개입니다' },
    });
  });

  it('counts tags after de-duplication', () => {
    const tenPlusDuplicate = [...Array.from({ length: TAGS_MAX_COUNT }, (_, i) => `t${i}`), 'T0'];
    expect(normalizeTags(tenPlusDuplicate)).toMatchObject({ ok: true });
  });

  it('rejects a tag longer than 20 characters', () => {
    expect(normalizeTags(['x'.repeat(TAG_MAX_LENGTH + 1)])).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TAG' },
    });
  });

  it('accepts a 20-character tag and measures it after trimming', () => {
    const tag = 'x'.repeat(TAG_MAX_LENGTH);
    expect(normalizeTags([` ${tag} `])).toEqual({ ok: true, value: [tag] });
  });

  it('does not mutate the input array', () => {
    const input = ['B', 'b'];
    normalizeTags(input);
    expect(input).toEqual(['B', 'b']);
  });
});

describe('validateCategory', () => {
  it('turns an empty or blank value into null', () => {
    expect(validateCategory('')).toEqual({ ok: true, value: null });
    expect(validateCategory('   ')).toEqual({ ok: true, value: null });
  });

  it('trims and keeps the original case', () => {
    expect(validateCategory(' Work ')).toEqual({ ok: true, value: 'Work' });
  });

  it('accepts 30 characters and rejects 31', () => {
    expect(validateCategory('c'.repeat(CATEGORY_MAX_LENGTH))).toMatchObject({ ok: true });
    expect(validateCategory('c'.repeat(CATEGORY_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: { code: 'INVALID_CATEGORY', message: '카테고리는 30자 이하입니다' },
    });
  });
});
