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

  it('clears the timer on unmount', () => {
    const { result, unmount } = renderHook(() => useUndo());
    act(() => result.current.offer(removedItems()));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
