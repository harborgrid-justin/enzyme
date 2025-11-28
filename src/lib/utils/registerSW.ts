/**
 * @file Service Worker Registration
 * @description Comprehensive service worker lifecycle management with update
 * detection, offline/online events, and user notification support.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Service worker registration configuration
 */
export interface ServiceWorkerConfig {
  /** Path to service worker file */
  swPath?: string;
  /** Called when SW is successfully installed for first time */
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  /** Called when new SW content is available */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  /** Called when app goes offline */
  onOffline?: () => void;
  /** Called when app comes back online */
  onOnline?: () => void;
  /** Called on registration error */
  onError?: (error: Error) => void;
  /** Called during SW registration */
  onRegistering?: () => void;
  /** Enable registration in development (default: false) */
  enableInDev?: boolean;
  /** Update check interval in ms (default: 60000 = 1 minute) */
  updateCheckInterval?: number;
}

/**
 * Service worker state
 */
export interface ServiceWorkerState {
  /** Whether SW is supported */
  isSupported: boolean;
  /** Whether SW is registered */
  isRegistered: boolean;
  /** Whether a new version is available */
  hasUpdate: boolean;
  /** Whether app is online */
  isOnline: boolean;
  /** Current registration */
  registration: ServiceWorkerRegistration | null;
  /** Any registration error */
  error: Error | null;
}

/**
 * Service worker controller interface
 */
export interface ServiceWorkerController {
  /** Current state */
  state: ServiceWorkerState;
  /** Update the service worker */
  update: () => Promise<void>;
  /** Skip waiting and activate new SW */
  skipWaiting: () => void;
  /** Unregister the service worker */
  unregister: () => Promise<boolean>;
  /** Get SW version */
  getVersion: () => Promise<string | null>;
  /** Cache specific URLs */
  cacheUrls: (urls: string[]) => void;
  /** Clear all caches */
  clearCaches: () => void;
  /** Add state change listener */
  subscribe: (listener: (state: ServiceWorkerState) => void) => () => void;
}

// ============================================================================
// State Management
// ============================================================================

let currentState: ServiceWorkerState = {
  isSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  isRegistered: false,
  hasUpdate: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  registration: null,
  error: null,
};

const listeners = new Set<(state: ServiceWorkerState) => void>();

function setState(updates: Partial<ServiceWorkerState>): void {
  currentState = { ...currentState, ...updates };
  listeners.forEach((listener) => listener(currentState));
}

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if running on localhost
 */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;

  return Boolean(
    window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
  );
}

/**
 * Check if SW should be enabled
 */
function shouldEnableSW(enableInDev: boolean): boolean {
  if (!currentState.isSupported) return false;
  if (!enableInDev && isLocalhost()) return false;
  return true;
}

// ============================================================================
// Registration Functions
// ============================================================================

/**
 * Register a valid service worker
 */
async function registerValidSW(
  swPath: string,
  config: ServiceWorkerConfig
): Promise<ServiceWorkerRegistration | null> {
  try {
    config.onRegistering?.();

    const registration = await navigator.serviceWorker.register(swPath, {
      scope: '/',
    });

    setState({ registration, isRegistered: true, error: null });

    // Handle updates
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content available
            console.info('[SW] New content available; please refresh.');
            setState({ hasUpdate: true });
            config.onUpdate?.(registration);
          } else {
            // Content cached for first time
            console.info('[SW] Content cached for offline use.');
            config.onSuccess?.(registration);
          }
        }
      };
    };

    // Setup periodic update checks
    if (config.updateCheckInterval !== undefined && config.updateCheckInterval > 0) {
      setInterval(() => {
        registration.update().catch(console.error);
      }, config.updateCheckInterval);
    }

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    setState({ error: err, isRegistered: false });
    config.onError?.(err);
    return null;
  }
}

/**
 * Check if service worker is valid (for localhost debugging)
 */
async function checkValidServiceWorker(
  swPath: string,
  config: ServiceWorkerConfig
): Promise<ServiceWorkerRegistration | null> {
  try {
    const response = await fetch(swPath, {
      headers: { 'Service-Worker': 'script' },
    });

    const contentType = response.headers.get('content-type');

    if (
      response.status === 404 ||
      (contentType !== null && contentType !== '' && !contentType.includes('javascript'))
    ) {
      // No valid SW found - unregister existing
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      window.location.reload();
      return null;
    }

    // Valid SW, proceed with registration
    return registerValidSW(swPath, config);
  } catch {
    console.info('[SW] No internet connection. Running offline.');
    setState({ isOnline: false });
    config.onOffline?.();
    return null;
  }
}

// ============================================================================
// Main Registration Function
// ============================================================================

/**
 * Register service worker with lifecycle management
 *
 * @example
 * ```tsx
 * // In your app entry point
 * registerServiceWorker({
 *   onSuccess: () => console.log('App cached for offline'),
 *   onUpdate: () => {
 *     if (confirm('New version available! Reload?')) {
 *       window.location.reload();
 *     }
 *   },
 *   onOffline: () => toast.info('You are offline'),
 *   onOnline: () => toast.success('Back online'),
 * });
 * ```
 */
export function registerServiceWorker(
  config: ServiceWorkerConfig = {}
): ServiceWorkerController {
  const {
    swPath = '/sw.js',
    enableInDev = false,
    updateCheckInterval = 60000,
    ...callbacks
  } = config;

  // Setup network status listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      setState({ isOnline: true });
      callbacks.onOnline?.();
    });

    window.addEventListener('offline', () => {
      setState({ isOnline: false });
      callbacks.onOffline?.();
    });
  }

  // Register SW if supported
  if (shouldEnableSW(enableInDev)) {
    window.addEventListener('load', () => {
      if (isLocalhost()) {
        // Localhost - check if SW is valid first
        void checkValidServiceWorker(swPath, {
          ...callbacks,
          updateCheckInterval,
        });
      } else {
        // Production - register directly
        void registerValidSW(swPath, {
          ...callbacks,
          updateCheckInterval,
        });
      }
    });

    // Listen for controller changes (when new SW takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.info('[SW] Controller changed - reloading');
      window.location.reload();
    });
  }

  // Return controller interface
  return createController();
}

// ============================================================================
// Controller Interface
// ============================================================================

function createController(): ServiceWorkerController {
  return {
    get state() {
      return currentState;
    },

    async update(): Promise<void> {
      if (currentState.registration) {
        await currentState.registration.update();
      }
    },

    skipWaiting(): void {
      const waiting = currentState.registration?.waiting;
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    },

    async unregister(): Promise<boolean> {
      if (currentState.registration) {
        const result = await currentState.registration.unregister();
        if (result) {
          setState({
            isRegistered: false,
            registration: null,
            hasUpdate: false,
          });
        }
        return result;
      }
      return false;
    },

    async getVersion(): Promise<string | null> {
      if (!currentState.registration?.active) return null;

      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event: MessageEvent<{ version?: string } | null>) => {
          resolve(event.data?.version ?? null);
        };

        const activeWorker = currentState.registration?.active;
        if (activeWorker) {
          activeWorker.postMessage(
            { type: 'GET_VERSION' },
            [channel.port2]
          );
        } else {
          resolve(null);
          return;
        }

        // Timeout after 1 second
        setTimeout(() => resolve(null), 1000);
      });
    },

    cacheUrls(urls: string[]): void {
      currentState.registration?.active?.postMessage({
        type: 'CACHE_URLS',
        payload: { urls },
      });
    },

    clearCaches(): void {
      currentState.registration?.active?.postMessage({
        type: 'CLEAR_CACHES',
      });
    },

    subscribe(listener: (state: ServiceWorkerState) => void): () => void {
      listeners.add(listener);
      // Immediately call with current state
      listener(currentState);
      return () => listeners.delete(listener);
    },
  };
}

// ============================================================================
// React Hook
// ============================================================================

import { useState as useReactState, useEffect } from 'react';

/**
 * React hook for service worker state
 *
 * @example
 * ```tsx
 * function App() {
 *   const { hasUpdate, isOnline, skipWaiting } = useServiceWorker();
 *
 *   return (
 *     <>
 *       {hasUpdate && (
 *         <Banner>
 *           Update available!
 *           <button onClick={skipWaiting}>Refresh</button>
 *         </Banner>
 *       )}
 *       {!isOnline && <Banner>You are offline</Banner>}
 *     </>
 *   );
 * }
 * ```
 */
export function useServiceWorker(controller?: ServiceWorkerController): {
  isSupported: boolean;
  isRegistered: boolean;
  hasUpdate: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
  update: () => Promise<void>;
  skipWaiting: () => void;
  unregister: () => Promise<boolean>;
  getVersion: () => Promise<string | null>;
  cacheUrls: (urls: string[]) => void;
  clearCaches: () => void;
} {
  const [state, setLocalState] = useReactState<ServiceWorkerState>(currentState);

  useEffect(() => {
    const ctrl = controller ?? createController();
    return ctrl.subscribe(setLocalState);
  }, [controller, setLocalState]);

  const ctrl = controller ?? createController();
  return {
    ...state,
    update: async () => ctrl.update(),
    skipWaiting: () => ctrl.skipWaiting(),
    unregister: async () => ctrl.unregister(),
    getVersion: async () => ctrl.getVersion(),
    cacheUrls: (urls: string[]) => ctrl.cacheUrls(urls),
    clearCaches: () => ctrl.clearCaches(),
  };
}

// ============================================================================
// Unregister Function
// ============================================================================

/**
 * Unregister all service workers
 *
 * @example
 * ```tsx
 * // Useful for debugging or resetting app state
 * await unregisterServiceWorker();
 * ```
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!currentState.isSupported) return false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(async (r) => r.unregister()));

    setState({
      isRegistered: false,
      registration: null,
      hasUpdate: false,
    });

    return true;
  } catch (error) {
    console.error('[SW] Unregister failed:', error);
    return false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if service worker is controlling the page
 */
export function isServiceWorkerControlling(): boolean {
  return currentState.isSupported && Boolean(navigator.serviceWorker.controller);
}

/**
 * Wait for service worker to be ready
 */
export async function waitForServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!currentState.isSupported) return null;

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * Send message to service worker
 */
export function postMessageToSW(message: unknown): void {
  currentState.registration?.active?.postMessage(message);
}
