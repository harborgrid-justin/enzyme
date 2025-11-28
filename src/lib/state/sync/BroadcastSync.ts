/**
 * @file BroadcastSync
 * @description Multi-tab state synchronization using the BroadcastChannel API
 *
 * This module enables real-time state synchronization across browser tabs/windows,
 * essential for enterprise applications where users may have multiple tabs open.
 *
 * Features:
 * - Selective state sync (only sync what you configure)
 * - Leader election for coordinated operations
 * - Conflict resolution with configurable strategies
 * - Throttled sync to prevent excessive messaging
 * - Graceful degradation for unsupported browsers
 * - DevTools integration for debugging sync events
 *
 * @example
 * ```typescript
 * import { createBroadcastSync } from './sync/BroadcastSync';
 * import { useStore } from './store';
 *
 * const sync = createBroadcastSync(useStore, {
 *   channelName: 'app-state-sync',
 *   syncKeys: ['settings', 'theme', 'locale'],
 *   throttleMs: 100,
 * });
 *
 * sync.start();
 * ```
 */

import type { StoreApi, UseBoundStore } from 'zustand';
import { useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Sync message types
 */
export type SyncMessageType =
  | 'STATE_UPDATE'
  | 'STATE_REQUEST'
  | 'STATE_RESPONSE'
  | 'LEADER_ELECTION'
  | 'LEADER_ANNOUNCE'
  | 'TAB_PING'
  | 'TAB_PONG'
  | 'HEARTBEAT';

/**
 * Sync message structure
 */
export interface SyncMessage<TState = unknown> {
  type: SyncMessageType;
  tabId: string;
  timestamp: number;
  payload?: {
    state?: Partial<TState>;
    keys?: string[];
    leaderId?: string;
    priority?: number;
  };
}

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'merge' | 'custom';

/**
 * Sync configuration
 */
export interface BroadcastSyncConfig<TState> {
  /** BroadcastChannel name (should be unique per app) */
  channelName: string;

  /** State keys to synchronize (empty = sync all) */
  syncKeys?: (keyof TState)[];

  /** Keys to never sync (e.g., sensitive data) */
  excludeKeys?: (keyof TState)[];

  /** Throttle sync messages (ms) */
  throttleMs?: number;

  /** Debounce sync messages (ms) */
  debounceMs?: number;

  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy;

  /** Custom conflict resolver */
  customResolver?: (local: Partial<TState>, remote: Partial<TState>) => Partial<TState>;

  /** Enable leader election */
  enableLeaderElection?: boolean;

  /** Leader heartbeat interval (ms) */
  leaderHeartbeatMs?: number;

  /** Log sync events to console (dev only) */
  debug?: boolean;

  /** Callback when sync state changes */
  onSyncStateChange?: (state: 'connected' | 'disconnected' | 'leader' | 'follower') => void;

  /** Callback when remote update received */
  onRemoteUpdate?: (keys: string[], source: string) => void;

  /** Filter function to determine if a state change should be synced */
  shouldSync?: (prevState: TState, nextState: TState) => boolean;
}

/**
 * Sync instance interface
 */
export interface BroadcastSyncInstance<TState> {
  /** Start synchronization */
  start: () => void;
  /** Stop synchronization */
  stop: () => void;
  /** Check if sync is active */
  isActive: () => boolean;
  /** Check if this tab is the leader */
  isLeader: () => boolean;
  /** Get current tab ID */
  getTabId: () => string;
  /** Request full state from other tabs */
  requestState: () => void;
  /** Broadcast current state to other tabs */
  broadcastState: (keys?: (keyof TState)[]) => void;
  /** Get connected tab count (approximate) */
  getConnectedTabs: () => number;
  /** Force this tab to become leader */
  forceLeader: () => void;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate unique tab ID
 */
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if BroadcastChannel is supported
 */
function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}

/**
 * Throttle function
 */
function throttle<T extends (...args: never[]) => void>(
  fn: T,
  wait: number
): T & { cancel: () => void } {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0) {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = now;
      fn(...args);
    } else {
      timeout ??= setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        fn(...args);
      }, remaining);
    }
  }) as T & { cancel: () => void };

  throttled.cancel = (): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return throttled;
}

/**
 * Debounce function
 */
function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      fn(...args);
    }, wait);
  }) as T & { cancel: () => void };

  debounced.cancel = (): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Deep merge objects (simple implementation)
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        targetValue !== undefined &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Partial<Record<string, unknown>>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Pick specific keys from an object
 */
function pickKeys<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
function omitKeys<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a BroadcastChannel-based state synchronizer
 *
 * @param store - Zustand store to synchronize
 * @param config - Sync configuration
 * @returns Sync instance with control methods
 *
 * @example
 * ```typescript
 * const sync = createBroadcastSync(useStore, {
 *   channelName: 'app-sync',
 *   syncKeys: ['theme', 'locale', 'settings'],
 *   throttleMs: 100,
 *   debug: process.env.NODE_ENV === 'development',
 * });
 *
 * // Start syncing
 * sync.start();
 *
 * // Check leadership
 * if (sync.isLeader()) {
 *   console.log('This tab is the leader');
 * }
 *
 * // Stop syncing (e.g., on logout)
 * sync.stop();
 * ```
 */
export function createBroadcastSync<TState extends object>(
  store: UseBoundStore<StoreApi<TState>>,
  config: BroadcastSyncConfig<TState>
): BroadcastSyncInstance<TState> {
  const {
    channelName,
    syncKeys,
    excludeKeys = [],
    throttleMs = 100,
    debounceMs,
    conflictStrategy = 'last-write-wins',
    customResolver,
    enableLeaderElection = false,
    leaderHeartbeatMs = 5000,
    debug = false,
    onSyncStateChange,
    onRemoteUpdate,
    shouldSync,
  } = config;

  // Internal state
  const tabId = generateTabId();
  let channel: BroadcastChannel | null = null;
  let isStarted = false;
  let isLeaderTab = false;
  let lastKnownLeader: string | null = null;
  let leaderHeartbeatInterval: ReturnType<typeof setInterval> | null = null;
  const connectedTabs = new Set<string>();
  let unsubscribe: (() => void) | null = null;
  // Use atomic counter instead of boolean to handle concurrent/nested updates safely
  // This prevents the flag from getting stuck if an error occurs during setState
  let applyingRemoteUpdateCount = 0;

  // Logger - using console.info for debug mode since console.log is not allowed
  const log = debug
    ? (...args: unknown[]): void => { console.info(`[BroadcastSync:${tabId.slice(-6)}]`, ...args); }
    : (): void => { /* noop */ };

  // Get syncable state
  const getSyncableState = (state: TState): Partial<TState> => {
    let syncState: Partial<TState> = state;

    if (syncKeys !== undefined && syncKeys.length > 0) {
      syncState = pickKeys(state, syncKeys);
    }

    if (excludeKeys.length > 0) {
      syncState = omitKeys(syncState as TState, excludeKeys);
    }

    // Filter out functions (actions)
    const result: Partial<TState> = {};
    for (const key in syncState) {
      if (typeof syncState[key] !== 'function') {
        result[key] = syncState[key];
      }
    }

    return result;
  };

  // Send message
  const sendMessage = (message: Omit<SyncMessage<TState>, 'tabId' | 'timestamp'>): void => {
    if (!channel) return;

    const fullMessage: SyncMessage<TState> = {
      ...message,
      tabId,
      timestamp: Date.now(),
    };

    try {
      channel.postMessage(fullMessage);
      log('Sent:', message.type, message.payload);
    } catch (err) {
      log('Send error:', err);
    }
  };

  // Throttled state broadcast
  const broadcastStateThrottled = throttle((keys?: (keyof TState)[]): void => {
    const state = store.getState();
    let syncState = getSyncableState(state);

    if (keys !== undefined && keys.length > 0) {
      syncState = pickKeys(syncState as TState, keys);
    }

    sendMessage({
      type: 'STATE_UPDATE',
      payload: {
        state: syncState,
        keys: keys ? (keys as string[]) : Object.keys(syncState),
      },
    });
  }, throttleMs);

  // Debounced state broadcast (if configured)
  const broadcastStateDebounced = debounceMs !== undefined && debounceMs > 0
    ? debounce((keys?: (keyof TState)[]): void => { broadcastStateThrottled(keys); }, debounceMs)
    : broadcastStateThrottled;

  // Apply remote state update
  const applyRemoteState = (remoteState: Partial<TState>, sourceTabId: string) => {
    if (Object.keys(remoteState).length === 0) return;

    const currentState = store.getState();
    let newState: Partial<TState>;

    // Apply conflict resolution
    switch (conflictStrategy) {
      case 'first-write-wins':
        // Only apply keys that don't exist in current state
        newState = {};
        for (const key in remoteState) {
          if (currentState[key as keyof TState] === undefined) {
            newState[key as keyof TState] = remoteState[key as keyof TState];
          }
        }
        break;

      case 'merge':
        newState = deepMerge(
          currentState as Record<string, unknown>,
          remoteState as Partial<Record<string, unknown>>
        ) as Partial<TState>;
        break;

      case 'custom':
        if (customResolver) {
          newState = customResolver(currentState, remoteState);
        } else {
          newState = remoteState;
        }
        break;

      case 'last-write-wins':
      default:
        newState = remoteState;
        break;
    }

    // Apply update using functional form to work with Immer middleware
    // Counter prevents re-broadcasting our own changes and handles concurrent updates safely
    applyingRemoteUpdateCount++;
    try {
      store.setState((state) => {
        for (const key in newState) {
          if (Object.prototype.hasOwnProperty.call(newState, key)) {
            (state as Record<string, unknown>)[key] = newState[key as keyof typeof newState];
          }
        }
        return state;
      });
      log('Applied remote state from', sourceTabId.slice(-6), Object.keys(newState));
      onRemoteUpdate?.(Object.keys(newState), sourceTabId);
    } finally {
      // Always decrement counter, even if setState throws
      applyingRemoteUpdateCount--;
    }
  };

  // Handle incoming message
  const handleMessage = (event: MessageEvent<SyncMessage<TState>>): void => {
    const message = event.data;

    // Ignore invalid messages or own messages
    if (message === null || message === undefined || typeof message !== 'object' || !('type' in message) || !('tabId' in message)) return;
    if (message.tabId === tabId) return;

    log('Received:', message.type, 'from', String(message.tabId).slice(-6));

    switch (message.type) {
      case 'STATE_UPDATE':
        if (message.payload?.state) {
          applyRemoteState(message.payload.state, String(message.tabId));
        }
        break;

      case 'STATE_REQUEST':
        // Another tab is requesting state (e.g., just opened)
        broadcastStateThrottled();
        break;

      case 'STATE_RESPONSE':
        if (message.payload?.state) {
          applyRemoteState(message.payload.state, String(message.tabId));
        }
        break;

      case 'LEADER_ELECTION':
        // Participate in election based on priority (timestamp)
        if (enableLeaderElection && message.payload?.priority !== undefined && message.payload.priority !== null) {
          const tabIdParts = tabId.split('-');
          const myPriority = parseInt(tabIdParts[1] ?? '0', 10);
          if (myPriority < message.payload.priority) {
            // I have higher priority (lower timestamp = older tab)
            sendMessage({
              type: 'LEADER_ANNOUNCE',
              payload: { leaderId: tabId },
            });
            becomeLeader();
          }
        }
        break;

      case 'LEADER_ANNOUNCE':
        if (message.payload?.leaderId !== undefined && message.payload.leaderId !== null) {
          if (message.payload.leaderId !== tabId) {
            isLeaderTab = false;
            lastKnownLeader = message.payload.leaderId;
            onSyncStateChange?.('follower');
            log('New leader:', String(message.payload.leaderId).slice(-6));
          }
        }
        break;

      case 'TAB_PING':
        // Respond to tab discovery
        sendMessage({ type: 'TAB_PONG' });
        connectedTabs.add(String(message.tabId));
        break;

      case 'TAB_PONG':
        connectedTabs.add(String(message.tabId));
        break;

      case 'HEARTBEAT':
        connectedTabs.add(String(message.tabId));
        if (enableLeaderElection && message.payload !== null && message.payload !== undefined && (message.payload as { leaderId?: string }).leaderId === lastKnownLeader) {
          // Leader is still alive
        }
        break;
    }
  };

  // Become leader
  const becomeLeader = (): void => {
    isLeaderTab = true;
    lastKnownLeader = tabId;
    onSyncStateChange?.('leader');
    log('Became leader');

    // Start heartbeat
    if (leaderHeartbeatInterval) {
      clearInterval(leaderHeartbeatInterval);
    }
    leaderHeartbeatInterval = setInterval(() => {
      sendMessage({
        type: 'HEARTBEAT',
        payload: { leaderId: tabId },
      });
    }, leaderHeartbeatMs);
  };

  // Subscribe to store changes
  const subscribeToStore = (): void => {
    let prevState = store.getState();

    unsubscribe = store.subscribe((state) => {
      // Don't broadcast if we're applying a remote update (counter > 0 means in progress)
      if (applyingRemoteUpdateCount > 0) {
        prevState = state;
        return;
      }

      // Check if should sync
      if (shouldSync !== undefined && !shouldSync(prevState, state)) {
        prevState = state;
        return;
      }

      // Find changed keys
      const changedKeys: (keyof TState)[] = [];
      const syncableKeys = syncKeys ?? (Object.keys(state) as (keyof TState)[]);

      for (const key of syncableKeys) {
        if (excludeKeys.includes(key)) continue;
        if (typeof state[key] === 'function') continue;
        if (state[key] !== prevState[key]) {
          changedKeys.push(key);
        }
      }

      if (changedKeys.length > 0) {
        broadcastStateDebounced(changedKeys);
      }

      prevState = state;
    });
  };

  // ========================================================================
  // Public API
  // ========================================================================

  return {
    start: (): void => {
      if (isStarted) {
        log('Already started');
        return;
      }

      if (!isBroadcastChannelSupported()) {
        // BroadcastChannel not supported - silently degrade
        return;
      }

      // Create channel
      channel = new BroadcastChannel(channelName);
      channel.onmessage = handleMessage;

      // Subscribe to store
      subscribeToStore();

      isStarted = true;
      onSyncStateChange?.('connected');
      log('Started');

      // Discover other tabs
      sendMessage({ type: 'TAB_PING' });

      // Request current state from other tabs
      sendMessage({ type: 'STATE_REQUEST' });

      // Start leader election if enabled
      if (enableLeaderElection) {
        setTimeout(() => {
          const tabIdParts = tabId.split('-');
          const priority = parseInt(tabIdParts[1] ?? '0', 10);
          sendMessage({
            type: 'LEADER_ELECTION',
            payload: { priority },
          });

          // If no one responds, become leader
          setTimeout(() => {
            if (lastKnownLeader === null) {
              becomeLeader();
            }
          }, 500);
        }, 100);
      }
    },

    stop: () => {
      if (!isStarted) return;

      // Cleanup
      broadcastStateThrottled.cancel();
      broadcastStateDebounced.cancel();

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      if (leaderHeartbeatInterval) {
        clearInterval(leaderHeartbeatInterval);
        leaderHeartbeatInterval = null;
      }

      if (channel) {
        channel.close();
        channel = null;
      }

      isStarted = false;
      isLeaderTab = false;
      lastKnownLeader = null;
      connectedTabs.clear();

      onSyncStateChange?.('disconnected');
      log('Stopped');
    },

    isActive: () => isStarted,

    isLeader: () => isLeaderTab,

    getTabId: () => tabId,

    requestState: () => {
      if (!isStarted) return;
      sendMessage({ type: 'STATE_REQUEST' });
    },

    broadcastState: (keys) => {
      if (!isStarted) return;
      const state = store.getState();
      let syncState = getSyncableState(state);

      if (keys && keys.length > 0) {
        syncState = pickKeys(syncState as TState, keys);
      }

      sendMessage({
        type: 'STATE_UPDATE',
        payload: {
          state: syncState,
          keys: keys ? (keys as string[]) : Object.keys(syncState),
        },
      });
    },

    getConnectedTabs: () => connectedTabs.size,

    forceLeader: () => {
      if (!isStarted || !enableLeaderElection) return;
      sendMessage({
        type: 'LEADER_ANNOUNCE',
        payload: { leaderId: tabId },
      });
      becomeLeader();
    },
  };
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for BroadcastSync
 *
 * @example
 * ```typescript
 * function App() {
 *   const sync = useBroadcastSync(useStore, {
 *     channelName: 'app-sync',
 *     syncKeys: ['theme', 'locale'],
 *   });
 *
 *   return (
 *     <div>
 *       <p>Tab ID: {sync.getTabId()}</p>
 *       <p>Is Leader: {sync.isLeader() ? 'Yes' : 'No'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBroadcastSync<TState extends object>(
  store: UseBoundStore<StoreApi<TState>>,
  config: BroadcastSyncConfig<TState>
): BroadcastSyncInstance<TState> {
  const syncRef = useRef<BroadcastSyncInstance<TState> | null>(null);

  if (syncRef.current === null) {
    syncRef.current = createBroadcastSync(store, config);
  }

  useEffect(() => {
    const sync = syncRef.current;
    if (sync === null) return;

    sync.start();

    return () => {
      sync.stop();
    };
  }, []);

  return syncRef.current;
}

// ============================================================================
// Exports
// ============================================================================