/**
 * @file Lifecycle & Timing Hooks Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMount, useUpdateEffect, useEventCallback, useCountdown } from './useLifecycleHooks';

describe('useMount', () => {
  it('runs the callback once on mount', () => {
    const onMount = vi.fn();
    const { rerender } = renderHook(() => useMount(onMount));
    expect(onMount).toHaveBeenCalledTimes(1);
    rerender();
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it('runs the returned cleanup on unmount', () => {
    const cleanup = vi.fn();
    const { unmount } = renderHook(() => useMount(() => cleanup));
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('useUpdateEffect', () => {
  it('skips the initial render', () => {
    const effect = vi.fn();
    const { rerender } = renderHook(({ dep }) => useUpdateEffect(effect, [dep]), {
      initialProps: { dep: 0 },
    });
    expect(effect).not.toHaveBeenCalled();
    rerender({ dep: 1 });
    expect(effect).toHaveBeenCalledTimes(1);
    rerender({ dep: 1 }); // same dep, no run
    expect(effect).toHaveBeenCalledTimes(1);
    rerender({ dep: 2 });
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('runs cleanup between updates', () => {
    const cleanup = vi.fn();
    const { rerender, unmount } = renderHook(({ dep }) => useUpdateEffect(() => cleanup, [dep]), {
      initialProps: { dep: 0 },
    });
    rerender({ dep: 1 });
    rerender({ dep: 2 });
    expect(cleanup).toHaveBeenCalledTimes(1);
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});

describe('useEventCallback', () => {
  it('keeps a stable identity while calling the latest callback', () => {
    const { result, rerender } = renderHook(({ value }) => useEventCallback(() => value), {
      initialProps: { value: 1 },
    });
    const first = result.current;
    expect(first()).toBe(1);
    rerender({ value: 2 });
    expect(result.current).toBe(first); // identity preserved
    expect(result.current()).toBe(2); // reads latest
  });
});

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts down to the target and fires onComplete', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(3, { interval: 1000, onComplete }));
    expect(result.current.count).toBe(3);
    expect(result.current.isRunning).toBe(false);

    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.count).toBe(2);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.count).toBe(0);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('pauses and resets', () => {
    const { result } = renderHook(() => useCountdown(5, { interval: 1000, autoStart: true }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.count).toBe(3);
    act(() => result.current.pause());
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.count).toBe(3);
    act(() => result.current.reset());
    expect(result.current.count).toBe(5);
    expect(result.current.isRunning).toBe(false);
  });

  it('supports counting up to a target', () => {
    const { result } = renderHook(() =>
      useCountdown(0, { interval: 1000, target: 2, autoStart: true })
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.count).toBe(2);
    expect(result.current.isComplete).toBe(true);
  });
});
