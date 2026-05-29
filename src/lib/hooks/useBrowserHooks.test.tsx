/**
 * @file Browser API Hooks Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useDocumentTitle,
  useCopyToClipboard,
  usePageVisibility,
  useIdle,
  useGeolocation,
  usePermission,
  useReducedMotion,
} from './useBrowserHooks';

describe('useDocumentTitle', () => {
  it('sets the document title', () => {
    renderHook(() => useDocumentTitle('Hello'));
    expect(document.title).toBe('Hello');
  });

  it('restores the previous title on unmount when requested', () => {
    document.title = 'original';
    const { unmount } = renderHook(() => useDocumentTitle('temp', { restoreOnUnmount: true }));
    expect(document.title).toBe('temp');
    unmount();
    expect(document.title).toBe('original');
  });
});

describe('useCopyToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('copies via the Clipboard API and tracks the value', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { result } = renderHook(() => useCopyToClipboard());

    let ok = false;
    await act(async () => {
      ok = await result.current[1]('copied text');
    });
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('copied text');
    expect(result.current[0]).toBe('copied text');
  });

  it('falls back to execCommand when the Clipboard API is missing', async () => {
    vi.stubGlobal('navigator', {});
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: execCommand,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useCopyToClipboard());
    let ok = false;
    await act(async () => {
      ok = await result.current[1]('legacy');
    });
    expect(ok).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });
});

describe('usePageVisibility', () => {
  it('tracks visibility changes', () => {
    const { result } = renderHook(() => usePageVisibility());
    expect(result.current).toBe(true);
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(false);
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(true);
  });
});

describe('useIdle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('becomes idle after the timeout and resets on activity', () => {
    const { result } = renderHook(() => useIdle(1000));
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });
    expect(result.current).toBe(false);
  });
});

describe('useGeolocation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports an error when geolocation is unsupported', () => {
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('reports coordinates from watchPosition', () => {
    const clearWatch = vi.fn();
    let successCb: ((p: GeolocationPosition) => void) | null = null;
    vi.stubGlobal('navigator', {
      geolocation: {
        watchPosition: (success: (p: GeolocationPosition) => void) => {
          successCb = success;
          return 1;
        },
        clearWatch,
      },
    });
    const { result, unmount } = renderHook(() => useGeolocation());
    expect(result.current.loading).toBe(true);
    act(() => {
      successCb?.({
        coords: { latitude: 1, longitude: 2 } as GeolocationCoordinates,
        timestamp: 123,
      } as GeolocationPosition);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.coords?.latitude).toBe(1);
    unmount();
    expect(clearWatch).toHaveBeenCalledWith(1);
  });
});

describe('usePermission', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns "unsupported" without the Permissions API', () => {
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => usePermission('geolocation' as PermissionName));
    expect(result.current).toBe('unsupported');
  });

  it('resolves and tracks the permission state', async () => {
    const status = {
      state: 'granted' as PermissionState,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('navigator', {
      permissions: { query: vi.fn().mockResolvedValue(status) },
    });
    const { result } = renderHook(() => usePermission('geolocation' as PermissionName));
    await waitFor(() => expect(result.current).toBe('granted'));
  });
});

describe('useReducedMotion', () => {
  it('reads the prefers-reduced-motion media query', () => {
    const { result } = renderHook(() => useReducedMotion());
    // happy-dom default matchMedia mock returns matches: false.
    expect(typeof result.current).toBe('boolean');
  });
});
