import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTodo } from '@/test/factories';
import { UNDO_TIMEOUT_MS, useUndo } from './useUndo';
import type { RemovedItem } from './todoReducer';

function removedItems(): RemovedItem[] {
  return [{ todo: makeTodo(), index: 0 }];
}

describe('useUndo (§8.2 #15)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with nothing pending', () => {
    const { result } = renderHook(() => useUndo());

    expect(result.current.pending).toBeNull();
    expect(result.current.undo()).toBeNull();
  });

  it('clears pending after 5 seconds', () => {
    const { result } = renderHook(() => useUndo());
    const items = removedItems();

    act(() => result.current.offer(items));
    expect(result.current.pending).toBe(items);

    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 1));
    expect(result.current.pending).toBe(items);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.pending).toBeNull();
    expect(result.current.undo()).toBeNull();
  });

  it('undo before the timeout returns the items and clears pending', () => {
    const { result } = renderHook(() => useUndo());
    const items = removedItems();
    act(() => result.current.offer(items));

    let restored: RemovedItem[] | null = null;
    act(() => {
      restored = result.current.undo();
    });

    expect(restored).toBe(items);
    expect(result.current.pending).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a new offer replaces the pending one and restarts the 5s window', () => {
    const { result } = renderHook(() => useUndo());
    const first = removedItems();
    const second = removedItems();

    act(() => result.current.offer(first));
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 1000));
    act(() => result.current.offer(second));
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 1000));

    expect(result.current.pending).toBe(second);
    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.pending).toBeNull();
  });

  it('dismiss clears pending without returning anything', () => {
    const { result } = renderHook(() => useUndo());
    act(() => result.current.offer(removedItems()));

    act(() => result.current.dismiss());

    expect(result.current.pending).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  describe('pause / resume (§4.1 v0.3, WCAG 2.2.1)', () => {
    it('keeps the items while paused, however long it takes', () => {
      const { result } = renderHook(() => useUndo());
      const items = removedItems();
      act(() => result.current.offer(items));
      act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 1000));

      act(() => result.current.pause());
      act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS * 10));

      expect(result.current.pending).toBe(items);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('resume starts a fresh full 5s window', () => {
      const { result } = renderHook(() => useUndo());
      act(() => result.current.offer(removedItems()));
      act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 1));
      act(() => result.current.pause());

      act(() => result.current.resume());
      act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 1));
      expect(result.current.pending).not.toBeNull();

      act(() => vi.advanceTimersByTime(1));
      expect(result.current.pending).toBeNull();
    });

    it('undo still works while paused', () => {
      const { result } = renderHook(() => useUndo());
      const items = removedItems();
      act(() => result.current.offer(items));
      act(() => result.current.pause());

      let restored: RemovedItem[] | null = null;
      act(() => {
        restored = result.current.undo();
      });

      expect(restored).toBe(items);
      expect(result.current.pending).toBeNull();
    });

    it('resume without a pause does not extend the window', () => {
      const { result } = renderHook(() => useUndo());
      act(() => result.current.offer(removedItems()));
      act(() => vi.advanceTimersByTime(3000));

      act(() => result.current.resume());
      act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 3000));

      expect(result.current.pending).toBeNull();
    });

    it('pause with nothing pending is ignored, so a later offer still times out', () => {
      const { result } = renderHook(() => useUndo());

      act(() => result.current.pause());
      act(() => result.current.offer(removedItems()));
      act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS));

      expect(result.current.pending).toBeNull();
    });

    it('a new offer while paused waits for resume', () => {
      const { result } = renderHook(() => useUndo());
      const second = removedItems();
      act(() => result.current.offer(removedItems()));
      act(() => result.current.pause());

      act(() => result.current.offer(second));
      act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS * 2));
      expect(result.current.pending).toBe(second);

      act(() => result.current.resume());
      act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS));
      expect(result.current.pending).toBeNull();
    });

    it('dismiss ends the pause, so the next offer times out normally', () => {
      const { result } = renderHook(() => useUndo());
      act(() => result.current.offer(removedItems()));
      act(() => result.current.pause());
      act(() => result.current.dismiss());

      act(() => result.current.offer(removedItems()));
      act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS));

      expect(result.current.pending).toBeNull();
    });
  });

  it('clears the timer on unmount', () => {
    const { result, unmount } = renderHook(() => useUndo());
    act(() => result.current.offer(removedItems()));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
