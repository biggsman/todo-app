// Design Ref: §3.3, §4.1, §9.3 — light/dark theme (FR-11). The system preference is the default;
// a manual choice is stored under `todo-app:theme` and wins from then on.
// theme/ may not import storage/ (§9.3), and the theme key is a UI preference rather than todo
// data, so this module owns the key and its (try/catch-guarded) localStorage access. index.html
// repeats the key in its pre-paint script; a test keeps the two in sync.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'todo-app:theme';
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export interface ThemeControls {
  theme: Theme;
  toggle: () => void;
}

export function useTheme(): ThemeControls {
  const [storedTheme, setStoredTheme] = useState<Theme | null>(readStoredTheme);
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getServerTheme);
  // Plan SC: FR-11 — system changes are followed only until the user picks a theme manually
  const theme = storedTheme ?? systemTheme;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setStoredTheme(next);
    writeStoredTheme(next);
  }, [theme]);

  return { theme, toggle };
}

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function readStoredTheme(): Theme | null {
  try {
    const value = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    // Blocked storage: fall back to the system preference.
    return null;
  }
}

/** Best effort: if it cannot be stored, the choice still applies until the page is closed. */
function writeStoredTheme(theme: Theme): void {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignored on purpose; see the doc comment.
  }
}

function darkSchemeQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DARK_SCHEME_QUERY) : null;
}

function getSystemTheme(): Theme {
  return darkSchemeQuery()?.matches ? 'dark' : 'light';
}

function getServerTheme(): Theme {
  return 'light';
}

function subscribeToSystemTheme(onChange: () => void): () => void {
  const query = darkSchemeQuery();
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}
