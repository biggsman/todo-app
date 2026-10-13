// Design Ref: §8.3 #9 — controllable `prefers-color-scheme` for theme tests (jsdom has no matchMedia).
import { vi } from 'vitest';

export interface SystemColorScheme {
  /** Simulates the OS switching between light and dark. */
  setDark: (dark: boolean) => void;
  restore: () => void;
}

export function mockSystemColorScheme(initiallyDark: boolean): SystemColorScheme {
  let dark = initiallyDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const original = window.matchMedia;

  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return query.includes('dark') && dark;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  return {
    setDark(next) {
      dark = next;
      for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent);
    },
    restore() {
      window.matchMedia = original;
    },
  };
}
