import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has <dialog> but not its modal API; this minimal stand-in toggles `open` like a browser.
// Real modal behaviour (inert page, Esc, top layer) is covered by the Playwright E2E tests.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

// Vitest globals are off, so Testing Library cannot register its automatic unmount itself.
afterEach(() => {
  cleanup();
  // useTheme writes to the real (jsdom) localStorage and <html>; start every test clean.
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
