/**
 * @file DOM Interaction Hooks
 * @description SSR-safe hooks for common DOM concerns: detecting outside
 * clicks, hover state, element visibility and resize, viewport metrics,
 * scroll position, body-scroll locking, and media queries.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * `useLayoutEffect` that degrades to `useEffect` during SSR to avoid React's
 * "useLayoutEffect does nothing on the server" warning.
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// ============================================================================
// useClickOutside
// ============================================================================

/**
 * Invoke a handler when a pointer/touch event occurs outside the referenced
 * element. Ideal for closing dropdowns, popovers, and modals.
 *
 * @param handler - Called with the triggering event when an outside click occurs.
 * @param events - DOM events to listen for (default `['mousedown', 'touchstart']`).
 * @returns A ref to attach to the element to treat as "inside".
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void,
  events: Array<'mousedown' | 'mouseup' | 'touchstart' | 'touchend' | 'click'> = [
    'mousedown',
    'touchstart',
  ]
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const listener = (event: MouseEvent | TouchEvent): void => {
      const el = ref.current;
      if (el === null || el.contains(event.target as Node)) return;
      handlerRef.current(event);
    };

    for (const event of events) {
      document.addEventListener(event, listener as EventListener);
    }
    return () => {
      for (const event of events) {
        document.removeEventListener(event, listener as EventListener);
      }
    };
    // events is a stable literal in typical usage; spread to track membership.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.join(',')]);

  return ref;
}

// ============================================================================
// useHover
// ============================================================================

/**
 * Track whether the pointer is hovering over an element.
 *
 * @returns A `[ref, isHovered]` tuple.
 */
export function useHover<T extends HTMLElement = HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return undefined;

    const onEnter = (): void => setHovered(true);
    const onLeave = (): void => setHovered(false);

    node.addEventListener('mouseenter', onEnter);
    node.addEventListener('mouseleave', onLeave);
    return () => {
      node.removeEventListener('mouseenter', onEnter);
      node.removeEventListener('mouseleave', onLeave);
    };
  });

  return [ref, hovered];
}

// ============================================================================
// useIntersectionObserver
// ============================================================================

/** Options for {@link useIntersectionObserver}. */
export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /** Stop observing after the element first becomes visible. Default `false`. */
  freezeOnceVisible?: boolean;
}

/**
 * Observe an element's intersection with the viewport (or a root).
 *
 * @param options - Standard `IntersectionObserver` options plus
 *   `freezeOnceVisible`.
 * @returns A tuple of `[ref, entry, isIntersecting]`.
 */
export function useIntersectionObserver<T extends Element = Element>(
  options: UseIntersectionObserverOptions = {}
): [RefObject<T | null>, IntersectionObserverEntry | null, boolean] {
  const { root = null, rootMargin = '0px', threshold = 0, freezeOnceVisible = false } = options;
  const ref = useRef<T>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  const frozen = entry?.isIntersecting === true && freezeOnceVisible;
  // Serialize the threshold so callers can pass an inline array/number without
  // re-subscribing the observer on every render.
  const thresholdKey = JSON.stringify(threshold);

  useEffect(() => {
    const node = ref.current;
    if (
      frozen ||
      node === null ||
      typeof window === 'undefined' ||
      typeof window.IntersectionObserver === 'undefined'
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([observed]) => {
        if (observed !== undefined) setEntry(observed);
      },
      { root, rootMargin, threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // threshold is tracked via the serialized thresholdKey above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, rootMargin, thresholdKey, frozen]);

  return [ref, entry, entry?.isIntersecting ?? false];
}

// ============================================================================
// useResizeObserver
// ============================================================================

/**
 * Observe an element's content-box size.
 *
 * @returns A `[ref, size]` tuple where `size` is the latest
 *   `DOMRectReadOnly` or `null` before the first measurement.
 */
export function useResizeObserver<T extends Element = Element>(): [
  RefObject<T | null>,
  DOMRectReadOnly | null,
] {
  const ref = useRef<T>(null);
  const [rect, setRect] = useState<DOMRectReadOnly | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (
      node === null ||
      typeof window === 'undefined' ||
      typeof window.ResizeObserver === 'undefined'
    ) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const [observed] = entries;
      if (observed !== undefined) setRect(observed.contentRect);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, rect];
}

// ============================================================================
// useWindowSize
// ============================================================================

/** Viewport dimensions returned by {@link useWindowSize}. */
export interface WindowSize {
  width: number;
  height: number;
}

/**
 * Track the browser viewport size, updating on resize.
 *
 * @returns The current `{ width, height }`. Both are `0` during SSR.
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = (): void => setSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}

// ============================================================================
// useScrollPosition
// ============================================================================

/** Scroll coordinates returned by {@link useScrollPosition}. */
export interface ScrollPosition {
  x: number;
  y: number;
}

/**
 * Track the window scroll position. Reads are throttled to animation frames
 * to avoid layout thrash.
 *
 * @returns The current `{ x, y }` scroll offset.
 */
export function useScrollPosition(): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>(() => ({
    x: typeof window === 'undefined' ? 0 : window.scrollX,
    y: typeof window === 'undefined' ? 0 : window.scrollY,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let frame = 0;
    const onScroll = (): void => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        setPosition({ x: window.scrollX, y: window.scrollY });
        frame = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return position;
}

// ============================================================================
// useLockBodyScroll
// ============================================================================

/**
 * Prevent the document body from scrolling while `locked` is true. The
 * previous `overflow` style is restored on unlock/unmount.
 *
 * @param locked - Whether scrolling should be locked (default `true`).
 */
export function useLockBodyScroll(locked = true): void {
  useIsomorphicLayoutEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined;
    const { body } = document;
    const original = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = original;
    };
  }, [locked]);
}

// ============================================================================
// useMediaQuery
// ============================================================================

/**
 * Subscribe to a CSS media query and return whether it currently matches.
 *
 * @param query - A media query string, e.g. `'(min-width: 768px)'`.
 * @returns `true` when the query matches. `false` during SSR.
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = (): void => setMatches(mql.matches);
    onChange();

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari < 14 fallback.
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}
