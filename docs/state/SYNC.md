# State Synchronization

> Multi-tab state synchronization using the BroadcastChannel API

## Overview

The sync module enables real-time state synchronization across browser tabs/windows using the BroadcastChannel API. This is essential for enterprise applications where users may have multiple tabs open.

**Features:**
- Selective state sync (only sync what you configure)
- Leader election for coordinated operations
- Conflict resolution with configurable strategies
- Throttled/debounced sync to prevent excessive messaging
- Graceful degradation for unsupported browsers
- DevTools integration for debugging sync events

**File:** `/home/user/enzyme/src/lib/state/sync/BroadcastSync.ts`

## Quick Start

### Basic Setup

```typescript
import { createBroadcastSync, useStore } from '@missionfabric-js/enzyme';

// Create sync instance
const sync = createBroadcastSync(useStore, {
  channelName: 'app-state-sync',
  syncKeys: ['theme', 'locale', 'settings'],
  throttleMs: 100,
});

// Start syncing
sync.start();

// Later, stop syncing (e.g., on logout)
sync.stop();
```

### React Hook

```typescript
import { useBroadcastSync, useStore } from '@missionfabric-js/enzyme';

function App() {
  const sync = useBroadcastSync(useStore, {
    channelName: 'app-sync',
    syncKeys: ['theme', 'locale'],
  });

  return (
    <div>
      <p>Tab ID: {sync.getTabId()}</p>
      <p>Is Leader: {sync.isLeader() ? 'Yes' : 'No'}</p>
      <p>Connected Tabs: {sync.getConnectedTabs()}</p>
    </div>
  );
}
```

## Configuration

### BroadcastSyncConfig

```typescript
interface BroadcastSyncConfig<TState> {
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
```

### Basic Configuration

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'my-app-sync',
  syncKeys: ['theme', 'locale', 'sidebar'],
  throttleMs: 100,
});
```

### Selective Sync

Only sync specific keys:

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  // Only sync these keys
  syncKeys: ['theme', 'locale', 'fontSize'],
  // Sync all except these keys
  excludeKeys: ['password', 'apiKey', 'sessionToken'],
});
```

### Throttle vs Debounce

**Throttle:** Limit rate of sync messages (emit at most once per interval)

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  throttleMs: 100, // Max 1 message per 100ms
});
```

**Debounce:** Wait for changes to settle before syncing

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  debounceMs: 300, // Wait 300ms after last change
});
```

**When to use:**
- Throttle: Frequently changing state (e.g., slider values)
- Debounce: Typing inputs, rapid changes

### Conditional Sync

Only sync when certain conditions are met:

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  shouldSync: (prevState, nextState) => {
    // Only sync if user is logged in
    return nextState.isAuthenticated === true;
  },
});
```

## Conflict Resolution

### Strategies

```typescript
type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'merge' | 'custom';
```

#### Last Write Wins (Default)

Remote state always overwrites local state.

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  conflictStrategy: 'last-write-wins',
});
```

**Use when:** Most recent change is always correct (e.g., theme preference)

#### First Write Wins

Local state is preserved, remote changes ignored.

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  conflictStrategy: 'first-write-wins',
});
```

**Use when:** First tab's state should take precedence (rare)

#### Merge

Deep merge local and remote state.

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  conflictStrategy: 'merge',
});
```

**Use when:** States can be safely combined (e.g., non-overlapping settings)

#### Custom Resolver

Provide custom conflict resolution logic.

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  conflictStrategy: 'custom',
  customResolver: (local, remote) => {
    return {
      // Take theme from remote
      theme: remote.theme ?? local.theme,
      // Take locale from local (preserve user's choice)
      locale: local.locale,
      // Merge arrays
      recentItems: [...(local.recentItems ?? []), ...(remote.recentItems ?? [])],
    };
  },
});
```

## Leader Election

Leader election ensures one tab coordinates multi-tab operations.

### Enable Leader Election

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  enableLeaderElection: true,
  leaderHeartbeatMs: 5000, // Leader sends heartbeat every 5s
});

// Check if this tab is the leader
if (sync.isLeader()) {
  console.log('This tab is the leader');
  // Perform leader-only tasks
}
```

### Leader Election Process

1. Each tab announces itself with priority (timestamp)
2. Tab with lowest timestamp (oldest) becomes leader
3. Leader sends periodic heartbeats
4. If leader closes, new election occurs

### Force Leadership

```typescript
sync.forceLeader();
// This tab becomes leader immediately
```

**Use cases for leader election:**
- Coordinating API polling (only leader polls)
- Managing WebSocket connections (only leader connects)
- Synchronizing shared resources

## Sync Messages

### Message Types

```typescript
type SyncMessageType =
  | 'STATE_UPDATE'      // State changed in a tab
  | 'STATE_REQUEST'     // New tab requesting current state
  | 'STATE_RESPONSE'    // Response to state request
  | 'LEADER_ELECTION'   // Leader election message
  | 'LEADER_ANNOUNCE'   // Announcing leadership
  | 'TAB_PING'          // Tab discovery ping
  | 'TAB_PONG'          // Response to ping
  | 'HEARTBEAT';        // Leader heartbeat
```

### Message Structure

```typescript
interface SyncMessage<TState = unknown> {
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
```

## API Reference

### createBroadcastSync

Create a BroadcastChannel-based state synchronizer.

```typescript
function createBroadcastSync<TState extends object>(
  store: UseBoundStore<StoreApi<TState>>,
  config: BroadcastSyncConfig<TState>
): BroadcastSyncInstance<TState>
```

**Returns:** `BroadcastSyncInstance`

### BroadcastSyncInstance

```typescript
interface BroadcastSyncInstance<TState> {
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
```

### useBroadcastSync

React hook for BroadcastSync.

```typescript
function useBroadcastSync<TState extends object>(
  store: UseBoundStore<StoreApi<TState>>,
  config: BroadcastSyncConfig<TState>
): BroadcastSyncInstance<TState>
```

**Automatically starts on mount, stops on unmount.**

## Examples

### Complete Setup

```typescript
import { createBroadcastSync, useStore } from '@missionfabric-js/enzyme';

// Create sync instance
const sync = createBroadcastSync(useStore, {
  channelName: 'my-app-sync',
  syncKeys: ['theme', 'locale', 'sidebar', 'settings'],
  excludeKeys: ['sessionToken', 'password'],
  throttleMs: 100,
  conflictStrategy: 'last-write-wins',
  enableLeaderElection: true,
  debug: process.env.NODE_ENV === 'development',

  onSyncStateChange: (state) => {
    console.log('Sync state changed:', state);
  },

  onRemoteUpdate: (keys, source) => {
    console.log(`Remote update from ${source}:`, keys);
    // Show toast notification
    useStore.getState().addToast({
      type: 'info',
      message: `Settings synced from another tab`,
    });
  },
});

// Start syncing
sync.start();

// Export for global access
export { sync };
```

### React Integration

```typescript
import { useBroadcastSync, useStore } from '@missionfabric-js/enzyme';

function App() {
  const sync = useBroadcastSync(useStore, {
    channelName: 'app-sync',
    syncKeys: ['theme', 'locale'],
    debug: true,
  });

  return (
    <div>
      <header>
        <TabInfo
          tabId={sync.getTabId()}
          isLeader={sync.isLeader()}
          connectedTabs={sync.getConnectedTabs()}
        />
      </header>
      <main>
        <Routes />
      </main>
    </div>
  );
}
```

### Leader-Only Operations

```typescript
import { sync } from './sync';

function BackgroundTasks() {
  useEffect(() => {
    if (!sync.isLeader()) {
      return; // Only leader performs these tasks
    }

    // Poll API every minute (only from leader tab)
    const interval = setInterval(async () => {
      const data = await api.fetchUpdates();
      useStore.setState({ updates: data });
    }, 60000);

    return () => clearInterval(interval);
  }, [sync.isLeader()]);

  return null;
}
```

### Manual Broadcast

```typescript
import { sync } from './sync';

function SettingsForm() {
  const saveSettings = async (settings) => {
    // Save to backend
    await api.saveSettings(settings);

    // Update local state
    useStore.getState().updateSettings(settings);

    // Force broadcast to other tabs
    sync.broadcastState(['theme', 'locale']);
  };

  return <form onSubmit={saveSettings}>{/* ... */}</form>;
}
```

### Request State from Other Tabs

```typescript
import { sync } from './sync';

function InitializeApp() {
  useEffect(() => {
    // Request current state from other tabs
    sync.requestState();
  }, []);

  return <div>Initializing...</div>;
}
```

## Debugging

### Enable Debug Mode

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  debug: true, // Logs all sync events
});
```

**Console output:**
```
[BroadcastSync:abc123] Started
[BroadcastSync:abc123] Sent: TAB_PING {}
[BroadcastSync:abc123] Sent: STATE_REQUEST {}
[BroadcastSync:abc123] Received: TAB_PONG from def456
[BroadcastSync:abc123] Received: STATE_UPDATE from def456
[BroadcastSync:abc123] Applied remote state from def456 ['theme', 'locale']
```

### Monitor Sync State

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  onSyncStateChange: (state) => {
    console.log('Sync state:', state);
    // 'connected' | 'disconnected' | 'leader' | 'follower'
  },
  onRemoteUpdate: (keys, source) => {
    console.log(`Remote update from ${source}:`, keys);
  },
});
```

## Browser Support

### BroadcastChannel API

**Supported:**
- Chrome 54+
- Firefox 38+
- Edge 79+
- Safari 15.4+

**Not Supported:**
- IE 11
- Safari < 15.4

### Graceful Degradation

If BroadcastChannel is not supported, sync silently does nothing:

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
});

sync.start(); // No-op if BroadcastChannel unavailable
```

**Check support:**

```typescript
const isSupported = typeof BroadcastChannel !== 'undefined';

if (isSupported) {
  sync.start();
} else {
  console.warn('BroadcastChannel not supported, multi-tab sync disabled');
}
```

## Security Considerations

### Don't Sync Sensitive Data

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  // ❌ Never sync
  excludeKeys: [
    'password',
    'apiKey',
    'sessionToken',
    'creditCard',
    'ssn',
  ],
  // ✅ Safe to sync
  syncKeys: [
    'theme',
    'locale',
    'preferences',
  ],
});
```

### Same-Origin Only

BroadcastChannel is same-origin only (same protocol, domain, and port). Messages are never sent to different origins.

### Validation

Always validate remote state before applying:

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  customResolver: (local, remote) => {
    // Validate theme
    const validThemes = ['light', 'dark', 'system'];
    const theme = validThemes.includes(remote.theme)
      ? remote.theme
      : local.theme;

    return { ...local, theme };
  },
});
```

## Performance

### Throttling

Prevent excessive sync messages:

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  throttleMs: 100, // Max 10 messages/second
});
```

### Selective Sync

Only sync what's necessary:

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  syncKeys: ['theme', 'locale'], // Only these keys
});
```

### Conditional Sync

Skip sync for unimportant changes:

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  shouldSync: (prev, next) => {
    // Only sync if theme or locale changed
    return prev.theme !== next.theme || prev.locale !== next.locale;
  },
});
```

## Common Patterns

### Sync User Preferences

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'user-prefs-sync',
  syncKeys: [
    'theme',
    'locale',
    'fontSize',
    'layoutDensity',
    'sidebarCollapsed',
  ],
  throttleMs: 100,
});
```

### Sync with Notifications

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  syncKeys: ['theme', 'locale'],
  onRemoteUpdate: (keys) => {
    useStore.getState().addToast({
      type: 'info',
      message: `Settings synced: ${keys.join(', ')}`,
      duration: 3000,
    });
  },
});
```

### Leader-Only Background Tasks

```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  enableLeaderElection: true,
});

useEffect(() => {
  if (!sync.isLeader()) return;

  const interval = setInterval(() => {
    // Only leader polls API
    pollForUpdates();
  }, 60000);

  return () => clearInterval(interval);
}, [sync.isLeader()]);
```

## Troubleshooting

### Sync Not Working

1. Check BroadcastChannel support
2. Verify channelName is the same across tabs
3. Enable debug mode to see messages
4. Check excludeKeys isn't blocking sync

### Too Many Messages

1. Increase throttleMs
2. Add debounceMs
3. Use shouldSync to filter
4. Reduce syncKeys

### Conflicts

1. Choose appropriate conflictStrategy
2. Implement customResolver
3. Consider last-write-wins for preferences

### Performance Issues

1. Reduce number of syncKeys
2. Increase throttleMs
3. Use shouldSync to skip unnecessary syncs
4. Avoid syncing large objects

## Related Documentation

### State Management
- [Stores](./STORES.md) - Store architecture and persistence
- [Core](./CORE.md) - Store creation utilities
- [Types](./TYPES.md) - TypeScript type definitions
- [README](./README.md) - State management overview

### Cross-Cutting Concerns
- [Coordination Module](../../src/lib/coordination/README.md) - Provider orchestration and state coordination
- [Performance Guide](../PERFORMANCE.md) - Optimization strategies for multi-tab apps
- [Architecture](../ARCHITECTURE.md) - System design patterns

### Browser APIs
- [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) - MDN documentation
- [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) - Data serialization
