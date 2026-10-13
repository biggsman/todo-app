// Design Ref: §4.1, §8.3 #9 — theme defaults to the system, a manual choice is stored and wins.
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockSystemColorScheme } from '@/test/matchMedia';
import indexHtml from '../../index.html?raw';
import { DARK_SCHEME_QUERY, THEME_STORAGE_KEY, useTheme } from './useTheme';
import type { SystemColorScheme } from '@/test/matchMedia';

let system: SystemColorScheme | null = null;

function withSystem(dark: boolean) {
  system = mockSystemColorScheme(dark);
  return system;
}

afterEach(() => {
  system?.restore();
  system = null;
  vi.restoreAllMocks();
});

describe('useTheme', () => {
  it('starts from the system preference and applies it to <html>', () => {
    withSystem(true);

    const { result } = renderHook(useTheme);

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('falls back to light without matchMedia support', () => {
    const { result } = renderHook(useTheme);

    expect(result.current.theme).toBe('light');
  });

  it('prefers a stored manual choice over the system', () => {
    withSystem(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    const { result } = renderHook(useTheme);

    expect(result.current.theme).toBe('light');
  });

  it('ignores an invalid stored value', () => {
    withSystem(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

    expect(renderHook(useTheme).result.current.theme).toBe('dark');
  });

  it('follows system changes while no manual choice exists', () => {
    const scheme = withSystem(false);
    const { result } = renderHook(useTheme);

    act(() => scheme.setDark(true));

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggle stores the choice, which then outlives system changes', () => {
    const scheme = withSystem(false);
    const { result } = renderHook(useTheme);

    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => scheme.setDark(false));
    expect(result.current.theme).toBe('dark');

    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('keeps working when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const { result } = renderHook(useTheme);

    act(() => result.current.toggle());

    expect(result.current.theme).toBe('dark');
  });
});

describe('index.html pre-paint theme script', () => {
  it('uses the same storage key and media query as useTheme', () => {
    expect(indexHtml).toContain(`'${THEME_STORAGE_KEY}'`);
    expect(indexHtml).toContain(`'${DARK_SCHEME_QUERY}'`);
  });
});
