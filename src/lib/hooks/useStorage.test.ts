/**
 * @file Web Storage Hooks Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, useSessionStorage } from './useStorage';

/** A functional, in-memory Storage implementation for tests. */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => store.delete(key),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('useLocalStorage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: createMemoryStorage(),
      writable: true,
      configurable: true,
    });
  });

  it('reads the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    expect(result.current[0]).toBe(0);
  });

  it('persists and reads back values', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    expect(window.localStorage.getItem('count')).toBe('5');

    // A fresh hook instance reads the persisted value.
    const { result: second } = renderHook(() => useLocalStorage('count', 0));
    expect(second.current[0]).toBe(5);
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('n', 1));
    act(() => result.current[1]((prev) => prev + 9));
    expect(result.current[0]).toBe(10);
  });

  it('supports lazy initial values', () => {
    const { result } = renderHook(() => useLocalStorage('lazy', () => 42));
    expect(result.current[0]).toBe(42);
  });

  it('removes the stored value and resets', () => {
    const { result } = renderHook(() => useLocalStorage('rm', 'a'));
    act(() => result.current[1]('b'));
    expect(window.localStorage.getItem('rm')).toBe('"b"');
    act(() => result.current[2]());
    expect(result.current[0]).toBe('a');
    expect(window.localStorage.getItem('rm')).toBeNull();
  });

  it('falls back to the initial value on malformed data', () => {
    window.localStorage.setItem('bad', '{not json');
    const { result } = renderHook(() => useLocalStorage('bad', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('reacts to cross-tab storage events', () => {
    const { result } = renderHook(() => useLocalStorage('shared', 0));
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'shared',
          newValue: '7',
          storageArea: window.localStorage,
        })
      );
    });
    expect(result.current[0]).toBe(7);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'shared',
          newValue: null,
          storageArea: window.localStorage,
        })
      );
    });
    expect(result.current[0]).toBe(0);
  });
});

describe('useSessionStorage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: createMemoryStorage(),
      writable: true,
      configurable: true,
    });
  });

  it('persists to sessionStorage', () => {
    const { result } = renderHook(() => useSessionStorage('s', 'init'));
    act(() => result.current[1]('changed'));
    expect(result.current[0]).toBe('changed');
    expect(window.sessionStorage.getItem('s')).toBe('"changed"');
  });
});
