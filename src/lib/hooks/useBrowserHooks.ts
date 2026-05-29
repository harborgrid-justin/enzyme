/**
 * @file Browser API Hooks
 * @description SSR-safe hooks wrapping common browser APIs: document title,
 * clipboard, page visibility, user idle detection, geolocation, the
 * Permissions API, and reduced-motion preference.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaQuery } from './useDomHooks';

// ============================================================================
// useDocumentTitle
// ============================================================================

/** Options for {@link useDocumentTitle}. */
export interface UseDocumentTitleOptions {
  /** Restore the previous title when the component unmounts. Default `false`. */
  restoreOnUnmount?: boolean;
}

/**
 * Set `document.title` declaratively for the lifetime of a component.
 *
 * @param title - The title to apply.
 * @param options - Set `restoreOnUnmount` to revert on unmount.
 */
export function useDocumentTitle(title: string, options: UseDocumentTitleOptions = {}): void {
  const { restoreOnUnmount = false } = options;
  const previous = useRef<string>(typeof document === 'undefined' ? '' : document.title);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.title = title;
    const prior = previous.current;
    return () => {
      if (restoreOnUnmount) document.title = prior;
    };
  }, [title, restoreOnUnmount]);
}

// ============================================================================
// useCopyToClipboard
// ============================================================================

/** Result of {@link useCopyToClipboard}. */
export type UseCopyToClipboardResult = [
  /** The text most recently copied, or `null` if nothing/failed. */
  copied: string | null,
  /** Copy `text` to the clipboard; resolves to whether it succeeded. */
  copy: (text: string) => Promise<boolean>,
];

/**
 * Copy text to the clipboard and track the last successfully copied value.
 *
 * Uses the async Clipboard API when available and falls back to a
 * `document.execCommand('copy')` shim for older browsers.
 */
export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(text);
        return true;
      } catch {
        // Fall through to the legacy approach.
      }
    }

    if (typeof document === 'undefined') {
      setCopied(null);
      return false;
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(ok ? text : null);
      return ok;
    } catch {
      setCopied(null);
      return false;
    }
  }, []);

  return [copied, copy];
}

// ============================================================================
// usePageVisibility
// ============================================================================

/**
 * Track whether the page/tab is currently visible to the user.
 *
 * @returns `true` when visible. Defaults to `true` during SSR.
 */
export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : !document.hidden
  );

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onChange = (): void => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}

// ============================================================================
// useIdle
// ============================================================================

/** Options for {@link useIdle}. */
export interface UseIdleOptions {
  /** Activity events that reset the idle timer. */
  events?: Array<keyof WindowEventMap>;
  /** Treat the user as idle initially. Default `false`. */
  initialState?: boolean;
}

const DEFAULT_IDLE_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
];

/**
 * Detect when the user has been inactive for `timeout` milliseconds.
 *
 * @param timeout - Idle threshold in milliseconds (default `60000`).
 * @param options - Activity events and initial state.
 * @returns `true` once the user is idle; resets to `false` on activity.
 */
export function useIdle(timeout = 60_000, options: UseIdleOptions = {}): boolean {
  const { events = DEFAULT_IDLE_EVENTS, initialState = false } = options;
  const [idle, setIdle] = useState(initialState);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let timer: ReturnType<typeof setTimeout>;

    const onActivity = (): void => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), timeout);
    };

    timer = setTimeout(() => setIdle(true), timeout);
    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    return () => {
      clearTimeout(timer);
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeout, events.join(',')]);

  return idle;
}

// ============================================================================
// useGeolocation
// ============================================================================

/** State returned by {@link useGeolocation}. */
export interface GeolocationState {
  /** Whether a position request is in flight. */
  loading: boolean;
  /** The latest coordinates, if available. */
  coords: GeolocationCoordinates | null;
  /** The timestamp of the latest reading. */
  timestamp: number | null;
  /** The latest error, if any. */
  error: GeolocationPositionError | Error | null;
}

/**
 * Watch the device's geolocation, updating as the position changes.
 *
 * @param options - Standard `PositionOptions` (accuracy, timeout, maxAge).
 * @returns The current geolocation state.
 */
export function useGeolocation(options?: PositionOptions): GeolocationState {
  const [state, setState] = useState<GeolocationState>(() => {
    const supported = typeof navigator !== 'undefined' && navigator.geolocation !== undefined;
    return {
      loading: supported,
      coords: null,
      timestamp: null,
      error: supported ? null : new Error('Geolocation is not supported in this environment'),
    };
  });

  // Serialize options so the watcher only restarts when they actually change.
  const optionsKey = JSON.stringify(options ?? {});

  useEffect(() => {
    if (typeof navigator === 'undefined' || navigator.geolocation === undefined) {
      return undefined;
    }

    const onSuccess = (position: GeolocationPosition): void => {
      setState({
        loading: false,
        coords: position.coords,
        timestamp: position.timestamp,
        error: null,
      });
    };

    const onError = (error: GeolocationPositionError): void => {
      setState((prev) => ({ ...prev, loading: false, error }));
    };

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);

  return state;
}

// ============================================================================
// usePermission
// ============================================================================

/** A permission query state, plus framework-specific sentinels. */
export type UsePermissionState = PermissionState | 'unsupported' | 'prompt-pending';

/**
 * Query and subscribe to a browser permission via the Permissions API.
 *
 * @param name - The permission name, e.g. `'geolocation'` or `'notifications'`.
 * @returns The current permission state, or `'unsupported'` where unavailable.
 */
export function usePermission(name: PermissionName): UsePermissionState {
  const [state, setState] = useState<UsePermissionState>(() =>
    typeof navigator === 'undefined' || navigator.permissions?.query === undefined
      ? 'unsupported'
      : 'prompt-pending'
  );

  useEffect(() => {
    if (typeof navigator === 'undefined' || navigator.permissions?.query === undefined) {
      return undefined;
    }

    let status: PermissionStatus | null = null;
    let active = true;
    const onChange = (): void => {
      if (status !== null) setState(status.state);
    };

    navigator.permissions
      .query({ name })
      .then((result) => {
        if (!active) return;
        status = result;
        setState(result.state);
        result.addEventListener('change', onChange);
      })
      .catch(() => {
        if (active) setState('unsupported');
      });

    return () => {
      active = false;
      if (status !== null) status.removeEventListener('change', onChange);
    };
  }, [name]);

  return state;
}

// ============================================================================
// useReducedMotion
// ============================================================================

/**
 * Whether the user has requested reduced motion via their OS/browser settings.
 * Use to disable or simplify animations for accessibility.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
