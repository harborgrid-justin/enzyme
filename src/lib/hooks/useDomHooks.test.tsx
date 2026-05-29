/**
 * @file DOM Interaction Hooks Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, fireEvent, act } from '@testing-library/react';
import {
  useClickOutside,
  useHover,
  useIntersectionObserver,
  useResizeObserver,
  useWindowSize,
  useScrollPosition,
  useLockBodyScroll,
  useMediaQuery,
} from './useDomHooks';

describe('useClickOutside', () => {
  it('fires only for clicks outside the element', () => {
    const handler = vi.fn();
    function Component() {
      const ref = useClickOutside<HTMLDivElement>(handler);
      return (
        <div ref={ref} data-testid="inside">
          inside
        </div>
      );
    }
    const { getByTestId } = render(<Component />);

    // Inside click: no handler.
    fireEvent.mouseDown(getByTestId('inside'));
    expect(handler).not.toHaveBeenCalled();

    // Outside click: handler fires.
    fireEvent.mouseDown(document.body);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('useHover', () => {
  it('tracks pointer enter/leave', () => {
    function Component() {
      const [ref, hovered] = useHover<HTMLDivElement>();
      return (
        <div ref={ref} data-testid="box">
          {hovered ? 'yes' : 'no'}
        </div>
      );
    }
    const { getByTestId } = render(<Component />);
    const box = getByTestId('box');
    expect(box.textContent).toBe('no');
    fireEvent.mouseEnter(box);
    expect(box.textContent).toBe('yes');
    fireEvent.mouseLeave(box);
    expect(box.textContent).toBe('no');
  });
});

describe('useIntersectionObserver', () => {
  let triggers: Array<(entries: Partial<IntersectionObserverEntry>[]) => void>;

  beforeEach(() => {
    triggers = [];
    class MockIO {
      callback: (entries: Partial<IntersectionObserverEntry>[]) => void;
      constructor(cb: (entries: Partial<IntersectionObserverEntry>[]) => void) {
        this.callback = cb;
        triggers.push(cb);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    vi.stubGlobal('IntersectionObserver', MockIO);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports intersection state', () => {
    function Component() {
      const [ref, , isIntersecting] = useIntersectionObserver<HTMLDivElement>();
      return (
        <div ref={ref} data-testid="target">
          {isIntersecting ? 'visible' : 'hidden'}
        </div>
      );
    }
    const { getByTestId } = render(<Component />);
    expect(getByTestId('target').textContent).toBe('hidden');
    act(() => {
      triggers[0]?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });
    expect(getByTestId('target').textContent).toBe('visible');
  });
});

describe('useResizeObserver', () => {
  let triggers: Array<(entries: Array<{ contentRect: DOMRectReadOnly }>) => void>;

  beforeEach(() => {
    triggers = [];
    class MockRO {
      constructor(cb: (entries: Array<{ contentRect: DOMRectReadOnly }>) => void) {
        triggers.push(cb);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('ResizeObserver', MockRO);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the content rect', () => {
    function Component() {
      const [ref, rect] = useResizeObserver<HTMLDivElement>();
      return (
        <div ref={ref} data-testid="box">
          {rect?.width ?? 'none'}
        </div>
      );
    }
    const { getByTestId } = render(<Component />);
    expect(getByTestId('box').textContent).toBe('none');
    act(() => {
      triggers[0]?.([{ contentRect: { width: 100, height: 50 } as DOMRectReadOnly }]);
    });
    expect(getByTestId('box').textContent).toBe('100');
  });
});

describe('useWindowSize', () => {
  it('returns the current viewport size and updates on resize', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current.width).toBe(window.innerWidth);
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1234, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 567, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.width).toBe(1234);
    expect(result.current.height).toBe(567);
  });
});

describe('useScrollPosition', () => {
  it('initializes from window scroll offsets', () => {
    const { result } = renderHook(() => useScrollPosition());
    expect(result.current.x).toBe(window.scrollX);
    expect(result.current.y).toBe(window.scrollY);
  });
});

describe('useLockBodyScroll', () => {
  it('locks and restores body overflow', () => {
    document.body.style.overflow = 'auto';
    const { unmount, rerender } = renderHook(({ locked }) => useLockBodyScroll(locked), {
      initialProps: { locked: true },
    });
    expect(document.body.style.overflow).toBe('hidden');
    rerender({ locked: false });
    expect(document.body.style.overflow).toBe('auto');
    rerender({ locked: true });
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});

describe('useMediaQuery', () => {
  let listeners: Array<() => void>;
  let currentMatches: boolean;

  beforeEach(() => {
    listeners = [];
    currentMatches = false;
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        get matches() {
          return currentMatches;
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, cb: () => void) => listeners.push(cb),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the match state and updates on change', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(result.current).toBe(false);
    act(() => {
      currentMatches = true;
      listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);
  });
});
