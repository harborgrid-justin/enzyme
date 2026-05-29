/**
 * @file State Management Hooks Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useToggle,
  usePrevious,
  useCounter,
  useStep,
  useStateHistory,
  useList,
  useMap,
  useSet,
  useQueue,
} from './useStateHooks';

describe('useToggle', () => {
  it('toggles and sets explicitly', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
  });
});

describe('usePrevious', () => {
  it('returns the value from the previous render', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 1 },
    });
    expect(result.current).toBeUndefined();
    rerender({ value: 2 });
    expect(result.current).toBe(1);
    rerender({ value: 3 });
    expect(result.current).toBe(2);
  });
});

describe('useCounter', () => {
  it('increments, decrements, sets and resets within bounds', () => {
    const { result } = renderHook(() => useCounter(5, { min: 0, max: 10, step: 2 }));
    expect(result.current.count).toBe(5);
    act(() => result.current.increment());
    expect(result.current.count).toBe(7);
    act(() => result.current.increment(10)); // clamped to max
    expect(result.current.count).toBe(10);
    act(() => result.current.decrement(100)); // clamped to min
    expect(result.current.count).toBe(0);
    act(() => result.current.set(4));
    expect(result.current.count).toBe(4);
    act(() => result.current.reset());
    expect(result.current.count).toBe(5);
  });

  it('clamps the initial value', () => {
    const { result } = renderHook(() => useCounter(50, { max: 10 }));
    expect(result.current.count).toBe(10);
  });
});

describe('useStep', () => {
  it('navigates with guards', () => {
    const { result } = renderHook(() => useStep(3));
    expect(result.current.step).toBe(1);
    expect(result.current.isFirst).toBe(true);
    expect(result.current.canGoPrev).toBe(false);
    act(() => result.current.next());
    expect(result.current.step).toBe(2);
    act(() => result.current.next());
    expect(result.current.isLast).toBe(true);
    act(() => result.current.next()); // clamped
    expect(result.current.step).toBe(3);
    act(() => result.current.setStep(1));
    expect(result.current.step).toBe(1);
    act(() => result.current.prev()); // clamped
    expect(result.current.step).toBe(1);
    act(() => result.current.setStep(2));
    act(() => result.current.reset());
    expect(result.current.step).toBe(1);
  });
});

describe('useStateHistory', () => {
  it('supports undo and redo', () => {
    const { result } = renderHook(() => useStateHistory(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    expect(result.current.state).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.history).toEqual([0, 1, 2]);

    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.state).toBe(2);

    // Setting after undo truncates the redo branch.
    act(() => result.current.undo());
    act(() => result.current.set(9));
    expect(result.current.state).toBe(9);
    expect(result.current.canRedo).toBe(false);
  });

  it('ignores no-op sets and supports functional updates + reset', () => {
    const { result } = renderHook(() => useStateHistory(5));
    act(() => result.current.set(5)); // no-op (Object.is)
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.set((p) => p + 1));
    expect(result.current.state).toBe(6);
    act(() => result.current.reset());
    expect(result.current.state).toBe(5);
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.reset(42));
    expect(result.current.state).toBe(42);
  });

  it('respects capacity', () => {
    const { result } = renderHook(() => useStateHistory(0, 2));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.set(3));
    // Only the last 2 past entries are retained.
    expect(result.current.history).toEqual([1, 2, 3]);
  });
});

describe('useList', () => {
  it('mutates immutably', () => {
    const { result } = renderHook(() => useList<number>([1, 2, 3]));
    act(() => result.current.push(4, 5));
    expect(result.current.list).toEqual([1, 2, 3, 4, 5]);
    act(() => result.current.removeAt(0));
    expect(result.current.list).toEqual([2, 3, 4, 5]);
    act(() => result.current.insertAt(1, 99));
    expect(result.current.list).toEqual([2, 99, 3, 4, 5]);
    act(() => result.current.updateAt(0, 7));
    expect(result.current.list).toEqual([7, 99, 3, 4, 5]);
    act(() => result.current.move(0, 2));
    expect(result.current.list).toEqual([99, 3, 7, 4, 5]);
    act(() => result.current.move(0, 99)); // out of range no-op
    expect(result.current.list).toEqual([99, 3, 7, 4, 5]);
    act(() => result.current.filter((n) => n > 4));
    expect(result.current.list).toEqual([99, 7, 5]);
    act(() => result.current.sort((a, b) => a - b));
    expect(result.current.list).toEqual([5, 7, 99]);
    act(() => result.current.set([1]));
    expect(result.current.list).toEqual([1]);
    act(() => result.current.clear());
    expect(result.current.list).toEqual([]);
    act(() => result.current.reset());
    expect(result.current.list).toEqual([1, 2, 3]);
  });
});

describe('useMap', () => {
  it('reads and writes entries', () => {
    const { result } = renderHook(() => useMap<string, number>([['a', 1]]));
    expect(result.current.get('a')).toBe(1);
    expect(result.current.has('a')).toBe(true);
    act(() => result.current.set('b', 2));
    expect(result.current.map.get('b')).toBe(2);
    act(() =>
      result.current.setAll([
        ['c', 3],
        ['d', 4],
      ])
    );
    expect(result.current.map.size).toBe(4);
    act(() => result.current.remove('a'));
    expect(result.current.has('a')).toBe(false);
    act(() => result.current.remove('zzz')); // no-op
    act(() => result.current.clear());
    expect(result.current.map.size).toBe(0);
    act(() => result.current.reset());
    expect(result.current.map.size).toBe(1);
  });
});

describe('useSet', () => {
  it('adds, toggles and removes', () => {
    const { result } = renderHook(() => useSet<number>([1]));
    expect(result.current.has(1)).toBe(true);
    act(() => result.current.add(2));
    act(() => result.current.add(2)); // no-op
    expect(result.current.set.size).toBe(2);
    act(() => result.current.toggle(3));
    expect(result.current.has(3)).toBe(true);
    act(() => result.current.toggle(3));
    expect(result.current.has(3)).toBe(false);
    act(() => result.current.remove(1));
    act(() => result.current.remove(99)); // no-op
    expect(result.current.has(1)).toBe(false);
    act(() => result.current.clear());
    expect(result.current.set.size).toBe(0);
    act(() => result.current.reset());
    expect(result.current.set.size).toBe(1);
  });
});

describe('useQueue', () => {
  it('behaves FIFO', () => {
    const { result } = renderHook(() => useQueue<string>(['a']));
    expect(result.current.first).toBe('a');
    act(() => result.current.add('b'));
    act(() => result.current.add('c'));
    expect(result.current.size).toBe(3);
    expect(result.current.last).toBe('c');

    let removed: string | undefined;
    act(() => {
      removed = result.current.remove();
    });
    expect(removed).toBe('a');
    expect(result.current.first).toBe('b');

    act(() => result.current.clear());
    expect(result.current.size).toBe(0);
    let empty: string | undefined = 'x';
    act(() => {
      empty = result.current.remove();
    });
    expect(empty).toBeUndefined();
  });
});
