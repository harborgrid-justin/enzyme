# @missionfabric-js/enzyme Framework API Documentation

> **Version:** 1.0.0
> **Last Updated:** 2025-11-28

This document provides comprehensive API documentation for the Enzyme framework modules: Realtime, Routing, Security, and Services.

---

## Table of Contents

1. [Realtime Module](#realtime-module)
2. [Routing Module](#routing-module)
3. [Security Module](#security-module)
4. [Services Module](#services-module)

---

# Realtime Module

The Realtime module provides WebSocket and Server-Sent Events (SSE) support for real-time data streaming. This is distinct from React 18 SSR streaming.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RealtimeProvider                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Connection Manager (WebSocket/SSE)                    │ │
│  │  - Auto-reconnect with exponential backoff             │ │
│  │  - Heartbeat/keepalive                                 │ │
│  │  - Channel-based message routing                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  StreamQueryCacheUpdater       │
        │  - Maps events to cache updates│
        │  - Optimistic updates          │
        └────────────────────────────────┘
                         │
                         ▼
                ┌────────────────┐
                │  React Query   │
                │  Cache         │
                └────────────────┘
```

---

## Core Classes

### WebSocketClient

Low-level WebSocket connection manager with automatic reconnection and channel support.

**Class:** `WebSocketClient`

#### Constructor

```typescript
constructor(config: WebSocketClientConfig)
```

**Parameters:**
- `config.url` (string): WebSocket server URL
- `config.reconnect?` (boolean): Enable auto-reconnect (default: `true`)
- `config.reconnectInterval?` (number): Base reconnect delay in ms (default: `3000`)
- `config.maxReconnectAttempts?` (number): Maximum reconnection attempts (default: `10`)
- `config.heartbeatInterval?` (number): Heartbeat interval in ms (default: `30000`)
- `config.protocols?` (string[]): WebSocket subprotocols

#### Methods

##### `connect(): void`

Establishes WebSocket connection.

**Example:**
```typescript
const ws = new WebSocketClient({ url: 'wss://api.example.com/ws' });
ws.connect();
```

##### `disconnect(): void`

Closes WebSocket connection and stops reconnection attempts.

##### `send(data: unknown): void`

Sends message to server. Data is automatically JSON-stringified.

**Parameters:**
- `data` (unknown): Message payload

**Example:**
```typescript
ws.send({ type: 'chat', message: 'Hello!' });
```

##### `sendToChannel(channel: string, data: unknown): void`

Sends message to a specific channel.

**Parameters:**
- `channel` (string): Channel name
- `data` (unknown): Message payload

##### `subscribe(channel: string, handler: MessageHandler): () => void`

Subscribes to messages on a specific channel.

**Parameters:**
- `channel` (string): Channel name
- `handler` (MessageHandler): Callback function `(data: unknown) => void`

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = ws.subscribe('notifications', (data) => {
  console.log('New notification:', data);
});

// Later: unsubscribe()
```

##### `onMessage(handler: MessageHandler): () => void`

Subscribes to all messages.

**Returns:** Unsubscribe function

##### `onError(handler: ErrorHandler): () => void`

Subscribes to error events.

**Parameters:**
- `handler` (ErrorHandler): Callback `(error: Event) => void`

**Returns:** Unsubscribe function

##### `onStateChange(handler: StateChangeHandler): () => void`

Subscribes to connection state changes.

**Parameters:**
- `handler` (StateChangeHandler): Callback `(state: WebSocketState) => void`

**Returns:** Unsubscribe function

##### `getState(): WebSocketState`

Returns current connection state: `'connecting' | 'connected' | 'disconnected' | 'reconnecting'`

##### `isConnected(): boolean`

Returns `true` if connected and ready to send messages.

---

### SSEClient

Low-level Server-Sent Events client with automatic reconnection.

**Class:** `SSEClient`

#### Constructor

```typescript
constructor(config: SSEClientConfig)
```

**Parameters:**
- `config.url` (string): SSE endpoint URL
- `config.withCredentials?` (boolean): Send credentials (default: `true`)
- `config.reconnect?` (boolean): Enable auto-reconnect (default: `true`)
- `config.reconnectInterval?` (number): Base reconnect delay in ms (default: `3000`)
- `config.maxReconnectAttempts?` (number): Maximum reconnection attempts (default: `10`)
- `config.eventTypes?` (string[]): Event types to listen for (default: `['message']`)

#### Methods

##### `connect(): void`

Establishes SSE connection.

##### `disconnect(): void`

Closes SSE connection.

##### `on(eventType: string, handler: SSEMessageHandler): () => void`

Subscribes to messages of a specific event type.

**Parameters:**
- `eventType` (string): SSE event type
- `handler` (SSEMessageHandler): Callback `(data: unknown, event?: string) => void`

**Returns:** Unsubscribe function

**Example:**
```typescript
const sse = new SSEClient({ url: '/api/events' });
sse.connect();

sse.on('user-update', (data) => {
  console.log('User updated:', data);
});
```

##### `onMessage(handler: SSEMessageHandler): () => void`

Subscribes to default 'message' events.

##### `onError(handler: SSEErrorHandler): () => void`

Subscribes to error events.

##### `onStateChange(handler: SSEStateChangeHandler): () => void`

Subscribes to connection state changes.

##### `getState(): SSEState`

Returns current connection state.

##### `isConnected(): boolean`

Returns `true` if connected.

---

### StreamQueryCacheUpdater

Maps incoming real-time events to React Query cache updates.

**Class:** `StreamQueryCacheUpdater`

#### Constructor

```typescript
constructor(config: StreamCacheConfig)
```

**Parameters:**
- `config.queryClient` (QueryClient): React Query client instance
- `config.strategies` (CacheUpdateStrategy[]): Cache update strategies
- `config.onEvent?` ((event: StreamEvent) => void): Event callback
- `config.onError?` ((error: Error, event: StreamEvent) => void): Error callback

#### Methods

##### `processEvent(event: StreamEvent): void`

Processes an incoming stream event and updates cache accordingly.

**Parameters:**
- `event` (StreamEvent): Stream event object

**StreamEvent Structure:**
```typescript
interface StreamEvent<T = unknown> {
  type: 'create' | 'update' | 'delete' | 'invalidate' | 'patch';
  entity: string;
  id?: string;
  data?: T;
  timestamp: string;
  queryKeys?: QueryKey[];
}
```

**Example:**
```typescript
const updater = new StreamQueryCacheUpdater({
  queryClient,
  strategies: [
    {
      entity: 'user',
      getQueryKey: (id) => ['user', id],
      getListQueryKey: () => ['users'],
    }
  ]
});

updater.processEvent({
  type: 'update',
  entity: 'user',
  id: '123',
  data: { name: 'John Doe' },
  timestamp: new Date().toISOString()
});
```

##### `addStrategy<T>(strategy: CacheUpdateStrategy<T>): void`

Dynamically adds a cache update strategy.

##### `removeStrategy(entity: string): void`

Removes a cache update strategy.

---

## React Components

### RealtimeProvider

Context provider for real-time connections.

**Component:** `RealtimeProvider`

#### Props

```typescript
interface RealtimeProviderProps {
  children: ReactNode;
  config?: RealtimeProviderConfig;
}

interface RealtimeProviderConfig {
  type: 'websocket' | 'sse';
  url?: string;
  autoConnect?: boolean;
  cacheStrategies?: CacheUpdateStrategy[];
}
```

#### Example

```tsx
import { RealtimeProvider } from '@/lib/realtime';

function App() {
  return (
    <RealtimeProvider
      config={{
        type: 'websocket',
        url: '/ws',
        autoConnect: true,
        cacheStrategies: [
          {
            entity: 'notification',
            getQueryKey: (id) => ['notification', id],
            getListQueryKey: () => ['notifications'],
          }
        ]
      }}
    >
      <YourApp />
    </RealtimeProvider>
  );
}
```

---

## React Hooks

### useRealtimeStream

Hook to subscribe to a real-time channel.

**Signature:**
```typescript
function useRealtimeStream<T = unknown>(
  channel: string,
  options?: UseRealtimeStreamOptions<T>
): UseRealtimeStreamResult<T>
```

**Parameters:**
- `channel` (string): Channel name to subscribe to
- `options.enabled?` (boolean): Enable subscription (default: `true`)
- `options.onMessage?` ((data: T) => void): Message callback
- `options.onError?` ((error: Error) => void): Error callback
- `options.transform?` ((data: unknown) => T): Transform incoming data

**Returns:**
```typescript
interface UseRealtimeStreamResult<T> {
  isConnected: boolean;
  lastMessage: T | null;
  messages: T[];
  send: (data: unknown) => void;
  clear: () => void;
}
```

**Example:**
```tsx
function ChatRoom() {
  const { messages, send, isConnected } = useRealtimeStream<ChatMessage>('chat-room', {
    onMessage: (msg) => console.log('New message:', msg),
    transform: (data) => data as ChatMessage
  });

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
      <button onClick={() => send({ text: 'Hello!' })}>
        Send
      </button>
    </div>
  );
}
```

---

### useRealtimeConnection

Hook to access connection state and controls.

**Signature:**
```typescript
function useRealtimeConnection(): {
  connectionState: string;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}
```

**Example:**
```tsx
function ConnectionStatus() {
  const { connectionState, isConnected, connect, disconnect } = useRealtimeConnection();

  return (
    <div>
      <div>State: {connectionState}</div>
      {isConnected ? (
        <button onClick={disconnect}>Disconnect</button>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
    </div>
  );
}
```

---

### useBufferedRealtimeStream

Hook for debounced/buffered real-time updates.

**Signature:**
```typescript
function useBufferedRealtimeStream<T = unknown>(
  channel: string,
  bufferMs?: number,
  options?: UseRealtimeStreamOptions<T>
): UseRealtimeStreamResult<T>
```

**Parameters:**
- `channel` (string): Channel name
- `bufferMs` (number): Buffer duration in milliseconds (default: `100`)
- `options`: Same as `useRealtimeStream`

**Example:**
```tsx
function LiveFeed() {
  // Buffer updates for 500ms to reduce re-renders
  const { messages } = useBufferedRealtimeStream('live-updates', 500);

  return (
    <div>
      {messages.map((msg, i) => <div key={i}>{msg}</div>)}
    </div>
  );
}
```

---

### useRealtimePresence

Hook to track online users in a channel.

**Signature:**
```typescript
function useRealtimePresence(channel: string): {
  users: string[];
  count: number;
}
```

**Example:**
```tsx
function OnlineUsers() {
  const { users, count } = useRealtimePresence('chat-room');

  return (
    <div>
      <h3>{count} users online</h3>
      <ul>
        {users.map(userId => <li key={userId}>{userId}</li>)}
      </ul>
    </div>
  );
}
```

---

## Factory Functions

### createWebSocketClient

Creates a WebSocket client with default configuration.

**Signature:**
```typescript
function createWebSocketClient(
  path?: string,
  config?: Partial<WebSocketClientConfig>
): WebSocketClient
```

**Parameters:**
- `path` (string): WebSocket path (default: `'/ws'`)
- `config`: Additional configuration options

**Example:**
```typescript
const ws = createWebSocketClient('/api/ws', {
  reconnectInterval: 5000,
  heartbeatInterval: 60000
});
```

---

### createSSEClient

Creates an SSE client with default configuration.

**Signature:**
```typescript
function createSSEClient(
  path?: string,
  config?: Partial<SSEClientConfig>
): SSEClient
```

---

### createStreamCacheUpdater

Creates a stream cache updater.

**Signature:**
```typescript
function createStreamCacheUpdater(
  queryClient: QueryClient,
  strategies: CacheUpdateStrategy[]
): StreamQueryCacheUpdater
```

---

### createCacheStrategy

Creates a simple cache update strategy.

**Signature:**
```typescript
function createCacheStrategy<T>(
  entity: string,
  options?: {
    detailKeyPrefix?: string;
    listKeyPrefix?: string;
  }
): CacheUpdateStrategy<T>
```

**Example:**
```typescript
const userStrategy = createCacheStrategy('user', {
  detailKeyPrefix: 'user',
  listKeyPrefix: 'users'
});
```

---

# Routing Module

The Routing module provides file-system based routing with type-safe route building, automatic route discovery, conflict detection, and advanced route guards.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Route Discovery                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  File System Scanner                                    │ │
│  │  - Scans /app directory for route files                │ │
│  │  - Parses file naming conventions                      │ │
│  │  - Builds route tree with layouts                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Conflict Detector              │
        │  - Exact duplicates             │
        │  - Dynamic parameter shadows    │
        │  - Catch-all conflicts          │
        └────────────────────────────────┘
                         │
                         ▼
                ┌────────────────┐
                │  Route Builder │
                │  Type-safe API │
                └────────────────┘
                         │
                         ▼
                ┌────────────────┐
                │  Guard Resolver│
                │  - Auth        │
                │  - Roles       │
                │  - Permissions │
                │  - Features    │
                └────────────────┘
```

## File-System Conventions

The routing system follows Next.js-style file-based routing:

```
app/
├── index.tsx                    → /
├── about.tsx                    → /about
├── users/
│   ├── index.tsx               → /users
│   ├── [id].tsx                → /users/:id
│   ├── [id]/
│   │   └── posts/
│   │       └── [postId].tsx    → /users/:id/posts/:postId
│   └── [[...slug]].tsx         → /users/* (catch-all)
├── (auth)/                      → Group (not in URL)
│   ├── login.tsx               → /login
│   └── register.tsx            → /register
└── _layout.tsx                  → Layout wrapper
```

**Conventions:**
- `index.tsx` → Index route (`/`)
- `[param].tsx` → Dynamic parameter (`:param`)
- `[[...slug]].tsx` → Catch-all route (`/*`)
- `[[param]].tsx` → Optional parameter (`:param?`)
- `(group)/` → Route group (excluded from URL)
- `_layout.tsx` → Layout component

---

## Type System

### Route Parameter Extraction

The routing system uses TypeScript template literal types for compile-time parameter extraction:

```typescript
import type { RouteParams, ExtractRequiredParams, ExtractOptionalParams } from '@/lib/routing';

// Extract all params
type UserParams = RouteParams<'/users/:id/posts/:postId'>;
// Result: { id: string; postId: string }

// Extract only required params
type Required = ExtractRequiredParams<'/search/:query?/:id'>;
// Result: { id: string }

// Extract only optional params
type Optional = ExtractOptionalParams<'/search/:query?/:id'>;
// Result: { query?: string }
```

### Type-Safe Route Builders

```typescript
import type { RouteBuilder, TypedRouteRegistry } from '@/lib/routing';

// Define routes
const routes = {
  home: '/',
  users: '/users',
  userDetail: '/users/:id',
  userPosts: '/users/:id/posts/:postId'
} as const;

// Create type-safe registry
type Registry = TypedRouteRegistry<typeof routes>;

// Registry type is:
// {
//   home: (query?: Record<string, string>) => '/';
//   users: (query?: Record<string, string>) => '/users';
//   userDetail: (params: { id: string }, query?: ...) => string;
//   userPosts: (params: { id: string; postId: string }, query?: ...) => string;
// }
```

---

## Core Functions

### buildPath

Builds a URL path with parameters.

**Signature:**
```typescript
function buildPath<TPath extends string>(
  pattern: TPath,
  params?: ExtractRouteParams<TPath>,
  query?: Record<string, string | undefined>
): string
```

**Example:**
```typescript
const url = buildPath('/users/:id/posts/:postId',
  { id: '123', postId: '456' },
  { tab: 'comments' }
);
// Result: '/users/123/posts/456?tab=comments'
```

---

### buildQueryString

Builds a query string from parameters.

**Signature:**
```typescript
function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string
```

**Example:**
```typescript
const qs = buildQueryString({ page: 1, filter: 'active', empty: null });
// Result: '?page=1&filter=active'
```

---

### parseQueryString

Parses a query string into an object.

**Signature:**
```typescript
function parseQueryString(search: string): Record<string, string>
```

---

### matchPathPattern

Checks if a path matches a pattern.

**Signature:**
```typescript
function matchPathPattern(path: string, pattern: string): boolean
```

**Example:**
```typescript
const matches = matchPathPattern('/users/123', '/users/:id');
// Result: true
```

---

### parsePathParams

Extracts parameters from a path based on a pattern.

**Signature:**
```typescript
function parsePathParams(
  path: string,
  pattern: string
): Record<string, string> | null
```

**Example:**
```typescript
const params = parsePathParams('/users/123/posts/456', '/users/:id/posts/:postId');
// Result: { id: '123', postId: '456' }
```

---

## Route Discovery

### scanRouteFiles

Scans directory for route files and builds route tree.

**Signature:**
```typescript
function scanRouteFiles(
  directory: string,
  options?: DiscoveryConfig
): Promise<DiscoveredRoute[]>
```

**Parameters:**
- `directory` (string): Directory to scan
- `options.extensions?` (string[]): File extensions to include (default: `['.tsx', '.ts', '.jsx', '.js']`)
- `options.excludePatterns?` (string[]): Patterns to exclude
- `options.includeMetadata?` (boolean): Include route metadata

**Returns:** Array of discovered routes

**Example:**
```typescript
const routes = await scanRouteFiles('./src/app', {
  extensions: ['.tsx'],
  excludePatterns: ['**/*.test.tsx', '**/_*.tsx']
});
```

---

### scanRouteFilesCached

Cached version of scanRouteFiles for performance.

**Signature:**
```typescript
function scanRouteFilesCached(
  directory: string,
  options?: DiscoveryConfig
): Promise<DiscoveredRoute[]>
```

---

## Conflict Detection

### detectConflicts

Detects conflicts in route definitions.

**Signature:**
```typescript
function detectConflicts(
  routes: RouteForConflictDetection[],
  options?: ConflictDetectionOptions
): ConflictDetectionResult
```

**Returns:**
```typescript
interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: RouteConflict[];
  warnings: RouteConflict[];
  errors: RouteConflict[];
  summary: {
    totalRoutes: number;
    conflictCount: number;
    warningCount: number;
    errorCount: number;
  };
}
```

**Conflict Types:**
- `exact-duplicate`: Multiple routes with identical patterns
- `dynamic-shadow`: Static route shadowed by dynamic route
- `ambiguous`: Routes that could match same URL
- `catch-all-conflict`: Catch-all route conflicts
- `nested-dynamic`: Nested dynamic parameters
- `deep-nesting`: Too many nesting levels
- `index-layout-conflict`: Index/layout conflicts

**Example:**
```typescript
const result = detectConflicts([
  { path: '/users/:id', id: 'user-detail' },
  { path: '/users/new', id: 'user-new' }  // Warning: shadowed by :id
]);

if (result.hasConflicts) {
  console.error('Route conflicts detected:', result.conflicts);
}
```

---

### sortRoutesBySpecificity

Sorts routes by specificity (most specific first).

**Signature:**
```typescript
function sortRoutesBySpecificity<T extends { path: string }>(
  routes: T[]
): T[]
```

**Specificity Rules:**
1. Static segments beat dynamic segments
2. More segments beats fewer segments
3. Dynamic beats catch-all
4. Required params beat optional params

**Example:**
```typescript
const sorted = sortRoutesBySpecificity([
  { path: '/users/*' },
  { path: '/users/:id' },
  { path: '/users/new' }
]);
// Result order: ['/users/new', '/users/:id', '/users/*']
```

---

## Route Guards

Route guards control access to routes based on authentication, roles, permissions, and feature flags.

### Guard Data Flow

```
User navigates to route
         │
         ▼
┌────────────────────┐
│  GuardResolver     │
│  - Loads guards    │
│  - Executes chain  │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  AuthGuard         │
│  ✓ Authenticated?  │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  RoleGuard         │
│  ✓ Has role?       │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  PermissionGuard   │
│  ✓ Has permission? │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  FeatureGuard      │
│  ✓ Feature enabled?│
└────────────────────┘
         │
         ▼
   Allow / Deny / Redirect
```

---

### RoleGuard

Guards routes based on user roles.

**Class:** `RoleGuard`

#### Methods

##### `requireRole(role: string): RouteGuardFunction`

Requires a specific role.

**Example:**
```typescript
import { requireRole } from '@/lib/routing';

const adminRoute = {
  path: '/admin',
  guards: [requireRole('admin')]
};
```

##### `requireAnyRole(roles: string[]): RouteGuardFunction`

Requires any of the specified roles.

**Example:**
```typescript
import { requireAnyRole } from '@/lib/routing';

const editorRoute = {
  path: '/edit',
  guards: [requireAnyRole(['editor', 'admin'])]
};
```

##### `requireAllRoles(roles: string[]): RouteGuardFunction`

Requires all specified roles.

##### `excludeRoles(roles: string[]): RouteGuardFunction`

Excludes specific roles.

**Example:**
```typescript
import { excludeRoles } from '@/lib/routing';

const publicRoute = {
  path: '/public',
  guards: [excludeRoles(['banned'])]
};
```

---

### PermissionGuard

Guards routes based on granular permissions.

**Class:** `PermissionGuard`

#### Permission Format

Permissions can be strings or structured objects:

```typescript
// String format
'users:read'
'posts:write'
'admin:*'

// Structured format
interface StructuredPermission {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}
```

#### Methods

##### `requirePermission(permission: Permission): RouteGuardFunction`

Requires a specific permission.

**Example:**
```typescript
import { requirePermission } from '@/lib/routing';

const route = {
  path: '/users',
  guards: [requirePermission('users:read')]
};
```

##### `requireAnyPermission(permissions: Permission[]): RouteGuardFunction`

Requires any of the specified permissions.

##### `requireAllPermissions(permissions: Permission[]): RouteGuardFunction`

Requires all specified permissions.

##### `requireResourcePermission(resource: string, action: string): RouteGuardFunction`

Requires permission for a specific resource and action.

**Example:**
```typescript
import { requireResourcePermission } from '@/lib/routing';

const route = {
  path: '/posts/:id/edit',
  guards: [requireResourcePermission('posts', 'write')]
};
```

---

### FeatureGuard

Guards routes based on feature flags.

**Class:** `FeatureGuard`

#### Methods

##### `requireFeature(flag: string): RouteGuardFunction`

Requires a feature flag to be enabled.

**Example:**
```typescript
import { requireFeature } from '@/lib/routing';

const betaRoute = {
  path: '/beta-features',
  guards: [requireFeature('beta-features')]
};
```

##### `requireAnyFeature(flags: string[]): RouteGuardFunction`

Requires any of the specified feature flags.

##### `requireAllFeatures(flags: string[]): RouteGuardFunction`

Requires all specified feature flags.

##### `deprecatedFeature(flag: string, message?: string): RouteGuardFunction`

Warns about deprecated features.

##### `betaFeature(flag: string, message?: string): RouteGuardFunction`

Marks route as beta feature.

**Example:**
```typescript
import { betaFeature } from '@/lib/routing';

const route = {
  path: '/new-dashboard',
  guards: [betaFeature('new-dashboard', 'This is a beta feature')]
};
```

---

### CompositeGuard

Combines multiple guards with different strategies.

**Strategies:**
- `all`: All guards must pass (AND)
- `any`: At least one guard must pass (OR)
- `sequential`: Execute guards in order, stop on first failure
- `parallel`: Execute all guards in parallel

#### Methods

##### `allGuards(...guards: RouteGuardFunction[]): RouteGuardFunction`

All guards must pass.

**Example:**
```typescript
import { allGuards, requireRole, requirePermission } from '@/lib/routing';

const route = {
  path: '/admin/users',
  guards: [
    allGuards(
      requireRole('admin'),
      requirePermission('users:write')
    )
  ]
};
```

##### `anyGuard(...guards: RouteGuardFunction[]): RouteGuardFunction`

At least one guard must pass.

##### `sequentialGuards(...guards: RouteGuardFunction[]): RouteGuardFunction`

Execute guards in sequence.

##### `parallelGuards(...guards: RouteGuardFunction[]): RouteGuardFunction`

Execute guards in parallel.

---

## React Hooks

### useRouteNavigate

Type-safe navigation hook.

**Signature:**
```typescript
function useRouteNavigate(): <TPath extends string>(
  path: TPath,
  params?: ExtractRouteParams<TPath>,
  options?: NavigateOptions
) => void
```

**Example:**
```tsx
function UserList() {
  const navigate = useRouteNavigate();

  const handleUserClick = (userId: string) => {
    navigate('/users/:id', { id: userId });
  };

  return <UserListView onClick={handleUserClick} />;
}
```

---

### useQueryParams

Hook to access and update query parameters.

**Signature:**
```typescript
function useQueryParams<T extends Record<string, string>>(): [
  T,
  (updates: Partial<T>) => void
]
```

**Example:**
```tsx
function SearchPage() {
  const [query, setQuery] = useQueryParams<{ q: string; page: string }>();

  return (
    <div>
      <input
        value={query.q || ''}
        onChange={(e) => setQuery({ q: e.target.value })}
      />
      <div>Page: {query.page}</div>
    </div>
  );
}
```

---

### useQueryParam

Hook to access a single query parameter.

**Signature:**
```typescript
function useQueryParam(key: string): [
  string | null,
  (value: string | null) => void
]
```

---

### useRouteMetadata

Hook to access current route metadata.

**Signature:**
```typescript
function useRouteMetadata(): RouteMetadata | null
```

**Returns:**
```typescript
interface RouteMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  robots?: 'index' | 'noindex' | 'follow' | 'nofollow';
  analytics?: {
    pageType: string;
    section?: string;
    category?: string;
  };
}
```

---

# Security Module

The Security module provides comprehensive security features including CSP, XSS prevention, CSRF protection, and secure storage.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    SecurityProvider                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  CSP Manager                                            │ │
│  │  - Nonce generation                                     │ │
│  │  - Policy building                                      │ │
│  │  - Violation reporting                                  │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  CSRF Protection                                        │ │
│  │  - Token generation                                     │ │
│  │  - Request validation                                   │ │
│  │  - Token rotation                                       │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  XSS Prevention                                         │ │
│  │  - HTML sanitization                                    │ │
│  │  - Context-aware encoding                               │ │
│  │  - Threat detection                                     │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  Secure Storage                                         │ │
│  │  - AES-GCM encryption                                   │ │
│  │  - PBKDF2 key derivation                                │ │
│  │  - Integrity checking                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## CSP Manager

### CSPManager

Manages Content Security Policy with nonce generation and violation reporting.

**Class:** `CSPManager`

#### Methods

##### `getInstance(config?: CSPManagerConfig): CSPManager`

Gets singleton instance.

##### `initialize(): void`

Initializes CSP manager and sets up violation listener.

##### `getCurrentNonce(): string`

Returns current nonce value for inline scripts/styles.

**Example:**
```typescript
const cspManager = CSPManager.getInstance();
const nonce = cspManager.getCurrentNonce();

// Use in React
<script nonce={nonce}>console.log('Secure!');</script>
```

##### `regenerateNonce(): string`

Generates a new nonce.

##### `buildPolicyString(): string`

Builds CSP header value.

**Example:**
```typescript
const policyString = cspManager.buildPolicyString();
// Result: "default-src 'self'; script-src 'nonce-...' 'strict-dynamic'"
```

##### `addViolationHandler(handler: CSPViolationHandler): void`

Adds a violation handler.

**Example:**
```typescript
cspManager.addViolationHandler((violation) => {
  console.error('CSP Violation:', {
    blockedUri: violation.blockedUri,
    violatedDirective: violation.violatedDirective
  });
});
```

---

### Nonce Generation

##### `generateNonce(): string`

Generates a cryptographically secure nonce.

**Example:**
```typescript
import { generateNonce } from '@/lib/security';

const nonce = generateNonce();
// Result: Base64-encoded random value (256 bits)
```

---

### Policy Utilities

##### `parseCSPString(csp: string): CSPPolicy`

Parses CSP string into policy object.

##### `mergeCSPPolicies(...policies: CSPPolicy[]): CSPPolicy`

Merges multiple CSP policies.

**Example:**
```typescript
import { mergeCSPPolicies } from '@/lib/security';

const merged = mergeCSPPolicies(
  { 'script-src': ["'self'"] },
  { 'script-src': ["'unsafe-inline'"], 'style-src': ["'self'"] }
);
// Result: { 'script-src': ["'self'", "'unsafe-inline'"], 'style-src': ["'self'"] }
```

##### `createStrictPolicy(): CSPPolicy`

Creates a strict CSP policy.

##### `validateCSPPolicy(policy: CSPPolicy): boolean`

Validates a CSP policy.

---

## XSS Prevention

### HTML Encoding

##### `encodeHTML(str: string): string`

Encodes HTML content.

**Example:**
```typescript
import { encodeHTML } from '@/lib/security';

const safe = encodeHTML('<script>alert("XSS")</script>');
// Result: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
```

##### `encodeHTMLAttribute(str: string): string`

Encodes HTML attribute values.

##### `encodeJavaScript(str: string): string`

Encodes for JavaScript context.

##### `encodeCSS(str: string): string`

Encodes for CSS context.

##### `encodeURL(str: string): string`

Encodes full URLs.

##### `encodeURLParam(str: string): string`

Encodes URL parameters.

##### `encodeForContext(str: string, context: HTMLEncodingContext): string`

Context-aware encoding.

**Example:**
```typescript
import { encodeForContext } from '@/lib/security';

const html = encodeForContext(userInput, 'html-content');
const attr = encodeForContext(userInput, 'html-attribute');
const js = encodeForContext(userInput, 'javascript');
```

---

### HTML Sanitization

##### `sanitizeHTML(html: string, options?: SanitizationOptions): string`

Sanitizes HTML content.

**Parameters:**
- `options.allowedTags?` (string[]): Allowed HTML tags
- `options.allowedAttributes?` (Record<string, string[]>): Allowed attributes per tag
- `options.allowedSchemes?` (string[]): Allowed URL schemes
- `options.allowDataUrls?` (boolean): Allow data: URLs
- `options.stripAllHtml?` (boolean): Strip all HTML
- `options.maxLength?` (number): Maximum output length

**Example:**
```typescript
import { sanitizeHTML } from '@/lib/security';

const clean = sanitizeHTML(
  '<p>Hello <script>alert("XSS")</script></p>',
  {
    allowedTags: ['p', 'strong', 'em'],
    allowedAttributes: { a: ['href'] }
  }
);
// Result: '<p>Hello </p>'
```

##### `stripTags(html: string): string`

Removes all HTML tags.

---

### Threat Detection

##### `detectDangerousContent(content: string): DangerousContentResult`

Detects dangerous content patterns.

**Returns:**
```typescript
interface DangerousContentResult {
  isDangerous: boolean;
  threats: DangerousThreatType[];
  details: ThreatDetail[];
  sanitized: string;
}
```

**Threat Types:**
- `script-injection`
- `event-handler`
- `javascript-url`
- `data-url`
- `svg-script`
- `meta-refresh`
- `iframe-injection`
- `object-embed`
- `base-hijack`
- `form-action-hijack`
- `css-expression`
- `encoded-payload`
- `template-injection`

**Example:**
```typescript
import { detectDangerousContent } from '@/lib/security';

const result = detectDangerousContent('<img src=x onerror=alert(1)>');
if (result.isDangerous) {
  console.warn('Threats:', result.threats);
  console.log('Safe version:', result.sanitized);
}
```

##### `isDangerous(content: string): boolean`

Quick check for dangerous content.

---

### Safe HTML Utilities

##### `createSafeHTMLProps(html: string): { dangerouslySetInnerHTML: { __html: string } }`

Creates safe props for React dangerouslySetInnerHTML.

**Example:**
```tsx
import { createSafeHTMLProps } from '@/lib/security';

function Content({ html }: { html: string }) {
  return <div {...createSafeHTMLProps(html)} />;
}
```

##### `createTextOnlyProps(text: string): { children: string }`

Creates props for text-only rendering.

---

## CSRF Protection

### CSRFProtection

Manages CSRF tokens and request validation.

**Class:** `CSRFProtection`

#### Methods

##### `getInstance(config?: CSRFConfig): CSRFProtection`

Gets singleton instance.

##### `generateToken(): CSRFToken`

Generates a CSRF token.

##### `validateToken(token: string): CSRFValidationResult`

Validates a CSRF token.

**Example:**
```typescript
const csrf = CSRFProtection.getInstance();
const token = csrf.generateToken();

// Later...
const validation = csrf.validateToken(token.token);
if (!validation.isValid) {
  throw new Error('Invalid CSRF token');
}
```

##### `createSecureRequestInit(init?: RequestInit): RequestInit`

Creates fetch config with CSRF token.

**Example:**
```typescript
import { createSecureRequestInit } from '@/lib/security';

const response = await fetch('/api/users', createSecureRequestInit({
  method: 'POST',
  body: JSON.stringify(data)
}));
```

##### `createProtectedFormHandler(handler: (e: FormEvent) => void): (e: FormEvent) => void`

Wraps form handler with CSRF protection.

---

### generateOneTimeToken

Generates a one-time CSRF token.

**Signature:**
```typescript
function generateOneTimeToken(): CSRFToken
```

---

### createCSRFInputProps

Creates props for hidden CSRF input.

**Signature:**
```typescript
function createCSRFInputProps(token: string): {
  type: 'hidden';
  name: string;
  value: string;
}
```

**Example:**
```tsx
import { useCSRFToken, createCSRFInputProps } from '@/lib/security';

function SecureForm() {
  const { token } = useCSRFToken();

  return (
    <form method="POST">
      <input {...createCSRFInputProps(token)} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Secure Storage

### SecureStorage

Encrypted localStorage/sessionStorage wrapper.

**Class:** `SecureStorage`

#### Methods

##### `setItem<T>(key: string, value: T, options?: SecureStorageSetOptions): Promise<SecureStorageResult<void>>`

Stores encrypted data.

**Parameters:**
- `key` (string): Storage key
- `value` (T): Data to store
- `options.ttl?` (number): Time-to-live in milliseconds
- `options.compress?` (boolean): Compress data
- `options.metadata?` (Record<string, unknown>): Custom metadata

**Example:**
```typescript
import { createSecureLocalStorage } from '@/lib/security';

const storage = createSecureLocalStorage();

await storage.setItem('user', { id: 123, name: 'John' }, {
  ttl: 60 * 60 * 1000 // 1 hour
});
```

##### `getItem<T>(key: string): Promise<SecureStorageResult<T>>`

Retrieves and decrypts data.

**Example:**
```typescript
const result = await storage.getItem<User>('user');
if (result.success && result.data) {
  console.log('User:', result.data);
}
```

##### `removeItem(key: string): Promise<SecureStorageResult<void>>`

Removes an item.

##### `hasItem(key: string): Promise<boolean>`

Checks if item exists.

##### `keys(): Promise<string[]>`

Gets all storage keys.

##### `clear(): Promise<SecureStorageResult<void>>`

Clears all secure storage.

##### `getQuotaInfo(): Promise<StorageQuotaInfo>`

Gets storage quota information.

**Returns:**
```typescript
interface StorageQuotaInfo {
  total: number;
  used: number;
  available: number;
  usagePercent: number;
  isNearLimit: boolean;
  itemCount: number;
}
```

##### `cleanup(): Promise<number>`

Removes expired items.

---

### Factory Functions

##### `createSecureLocalStorage(config?: Partial<SecureStorageConfig>): SecureStorage`

Creates secure localStorage instance.

##### `createSecureSessionStorage(config?: Partial<SecureStorageConfig>): SecureStorage`

Creates secure sessionStorage instance.

---

## Security Hooks

### useCSPNonce

Hook to get CSP nonce for inline scripts/styles.

**Signature:**
```typescript
function useCSPNonce(): UseCSPNonceResult

interface UseCSPNonceResult {
  nonce: string;
  scriptProps: { nonce: string };
  styleProps: { nonce: string };
  regenerate: () => string;
}
```

**Example:**
```tsx
import { useCSPNonce } from '@/lib/security';

function InlineScript() {
  const { nonce, scriptProps } = useCSPNonce();

  return (
    <script {...scriptProps}>
      {`console.log('Secure inline script');`}
    </script>
  );
}
```

---

### useNonceScript

Hook specifically for script nonces.

**Signature:**
```typescript
function useNonceScript(): { nonce: string }
```

---

### useNonceStyle

Hook specifically for style nonces.

**Signature:**
```typescript
function useNonceStyle(): { nonce: string }
```

---

### useCSRFToken

Hook to get CSRF token.

**Signature:**
```typescript
function useCSRFToken(): UseCSRFTokenResult

interface UseCSRFTokenResult {
  token: string;
  isReady: boolean;
  regenerate: () => Promise<string>;
  formInputProps: { type: 'hidden'; name: string; value: string };
  metaProps: { name: string; content: string };
  headerName: string;
}
```

**Example:**
```tsx
import { useCSRFToken } from '@/lib/security';

function SecureForm() {
  const { formInputProps, token } = useCSRFToken();

  return (
    <form method="POST">
      <input {...formInputProps} />
      <input name="email" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

### useSecureFetch

Hook for CSRF-protected fetch requests.

**Signature:**
```typescript
function useSecureFetch(): <T>(
  url: string,
  options?: RequestInit
) => Promise<T>
```

**Example:**
```tsx
import { useSecureFetch } from '@/lib/security';

function UserEditor() {
  const secureFetch = useSecureFetch();

  const handleSubmit = async (data: User) => {
    const result = await secureFetch<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    console.log('Created:', result);
  };

  return <UserForm onSubmit={handleSubmit} />;
}
```

---

### useSecureFormSubmit

Hook for CSRF-protected form submission.

**Signature:**
```typescript
function useSecureFormSubmit(
  handler: (e: FormEvent) => void | Promise<void>
): (e: FormEvent) => Promise<void>
```

---

### useSanitizedContent

Hook for HTML sanitization.

**Signature:**
```typescript
function useSanitizedContent(
  content: string,
  options?: UseSanitizedContentOptions
): UseSanitizedContentResult

interface UseSanitizedContentResult {
  sanitized: string;
  isDangerous: boolean;
  threats: DangerousThreatType[];
  sanitizedProps: { dangerouslySetInnerHTML: { __html: string } };
}
```

**Example:**
```tsx
import { useSanitizedContent } from '@/lib/security';

function UserContent({ html }: { html: string }) {
  const { sanitized, isDangerous, threats } = useSanitizedContent(html);

  return (
    <div>
      {isDangerous && (
        <div className="warning">
          Content sanitized. Threats removed: {threats.join(', ')}
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: sanitized }} />
    </div>
  );
}
```

---

### useSafeInnerHTML

Hook for safe innerHTML with automatic sanitization.

**Signature:**
```typescript
function useSafeInnerHTML(html: string): {
  __html: string;
}
```

**Example:**
```tsx
import { useSafeInnerHTML } from '@/lib/security';

function Content({ html }: { html: string }) {
  const safeHTML = useSafeInnerHTML(html);
  return <div dangerouslySetInnerHTML={safeHTML} />;
}
```

---

### useValidatedInput

Hook for input validation and XSS prevention.

**Signature:**
```typescript
function useValidatedInput(initialValue?: string): {
  value: string;
  setValue: (value: string) => void;
  isValid: boolean;
  isDangerous: boolean;
  sanitizedValue: string;
}
```

---

### useSafeText

Hook for safe text rendering.

**Signature:**
```typescript
function useSafeText(text: string): string
```

---

### useContextEncoder

Hook for context-aware encoding.

**Signature:**
```typescript
function useContextEncoder(context: HTMLEncodingContext): (str: string) => string
```

**Example:**
```tsx
import { useContextEncoder } from '@/lib/security';

function DynamicAttribute({ userValue }: { userValue: string }) {
  const encodeAttr = useContextEncoder('html-attribute');

  return <div data-value={encodeAttr(userValue)} />;
}
```

---

### useSecureStorage

Hook for secure storage operations.

**Signature:**
```typescript
function useSecureStorage<T>(
  key: string,
  options?: UseSecureStorageOptions
): UseSecureStorageResult<T>

interface UseSecureStorageResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  set: (value: T, options?: SecureStorageSetOptions) => Promise<void>;
  remove: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

**Example:**
```tsx
import { useSecureStorage } from '@/lib/security';

function UserPreferences() {
  const { data, set, isLoading } = useSecureStorage<Preferences>('preferences');

  const updateTheme = async (theme: string) => {
    await set({ ...data, theme });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={() => updateTheme('dark')}>Dark Mode</button>
    </div>
  );
}
```

---

### useSecurityContext

Hook to access security context.

**Signature:**
```typescript
function useSecurityContext(): SecurityContextValue

interface SecurityContextValue {
  // State
  cspNonce: string;
  isInitialized: boolean;
  csrfToken: string;
  secureStorageAvailable: boolean;
  config: SecurityConfiguration;
  violations: SecurityViolation[];
  lastEventAt: number;

  // Actions
  regenerateNonce: () => string;
  regenerateCsrfToken: () => Promise<string>;
  reportViolation: (violation: Omit<SecurityViolation, 'id' | 'timestamp'>) => void;
  clearViolations: () => void;
  getSecureStorage: () => SecureStorageInterface;
  updateConfig: (partial: Partial<SecurityConfiguration>) => void;
}
```

---

### useSecurityState

Hook to access security state.

**Signature:**
```typescript
function useSecurityState(): SecurityContextState
```

---

### useSecurityActions

Hook to access security actions.

**Signature:**
```typescript
function useSecurityActions(): SecurityContextActions
```

---

### useViolationReporter

Hook to report security violations.

**Signature:**
```typescript
function useViolationReporter(): (
  violation: Omit<SecurityViolation, 'id' | 'timestamp'>
) => void
```

---

### useViolations

Hook to access security violations.

**Signature:**
```typescript
function useViolations(): SecurityViolation[]
```

---

### useSecurityStatus

Hook to get security status.

**Signature:**
```typescript
function useSecurityStatus(): {
  isInitialized: boolean;
  secureStorageAvailable: boolean;
  violationCount: number;
}
```

---

### useSecurityReady

Hook that suspends until security is initialized.

**Signature:**
```typescript
function useSecurityReady(): boolean
```

---

# Services Module

The Services module provides HTTP client, type-safe API clients, circuit breakers, offline support, batching, versioning, and optimistic updates.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    ServiceLayerFacade                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  HTTP Client                                            │ │
│  │  - Interceptor chain                                    │ │
│  │  - Request/Response/Error handling                      │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  Enhanced Interceptors                                  │ │
│  │  - Circuit breaker                                      │ │
│  │  - Distributed tracing                                  │ │
│  │  - Retry with exponential backoff                       │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  Offline Queue                                          │ │
│  │  - Persistent storage                                   │ │
│  │  - Auto-retry on reconnect                              │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  DataLoader Batching                                    │ │
│  │  - Request deduplication                                │ │
│  │  - Automatic batching                                   │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  Optimistic Mutations                                   │ │
│  │  - Optimistic updates                                   │ │
│  │  - Conflict resolution                                  │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  API Versioning                                         │ │
│  │  - Multiple version strategies                          │ │
│  │  - Request/response transformation                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Service Layer Facade

### initializeServiceLayer

Initializes the complete service layer.

**Signature:**
```typescript
function initializeServiceLayer(config: ServiceLayerConfig): Promise<void>

interface ServiceLayerConfig {
  apiBaseUrl: string;
  enableOfflineQueue?: boolean;
  enableCircuitBreakers?: boolean;
  enableBatching?: boolean;
  enableTelemetry?: boolean;
  telemetry?: TelemetryConfig;
}
```

**Example:**
```typescript
import { initializeServiceLayer } from '@/lib/services';

await initializeServiceLayer({
  apiBaseUrl: 'https://api.example.com',
  enableOfflineQueue: true,
  enableCircuitBreakers: true,
  enableBatching: true,
  enableTelemetry: true,
});
```

---

### serviceLayer

Global service layer instance.

**Properties:**
- `httpClient`: HTTP client instance
- `offlineQueue`: Offline queue instance
- `circuitBreakers`: Circuit breaker registry
- `batcher`: Request batcher

---

### getServiceLayerStatus

Gets service layer status.

**Signature:**
```typescript
function getServiceLayerStatus(): ServiceLayerStatus

interface ServiceLayerStatus {
  initialized: boolean;
  offlineQueueSize: number;
  circuitBreakerStates: Record<string, CircuitBreakerState>;
  pendingRequests: number;
}
```

---

## HTTP Client

### HttpClient

Core HTTP client with interceptor support.

**Class:** `HttpClient`

#### Methods

##### `request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>>`

Makes an HTTP request.

**Parameters:**
- `config.url` (string): Request URL
- `config.method` (string): HTTP method
- `config.headers?` (Record<string, string>): Request headers
- `config.body?` (unknown): Request body
- `config.params?` (Record<string, string>): URL parameters
- `config.timeout?` (number): Request timeout in ms
- `config.signal?` (AbortSignal): Abort signal

**Example:**
```typescript
import { httpClient } from '@/lib/services';

const response = await httpClient.request<User>({
  url: '/api/users/123',
  method: 'GET'
});

console.log('User:', response.data);
```

##### `get<T>(url: string, config?: Omit<HttpRequestConfig, 'method' | 'url'>): Promise<HttpResponse<T>>`

GET request.

##### `post<T>(url: string, data?: unknown, config?): Promise<HttpResponse<T>>`

POST request.

##### `put<T>(url: string, data?: unknown, config?): Promise<HttpResponse<T>>`

PUT request.

##### `patch<T>(url: string, data?: unknown, config?): Promise<HttpResponse<T>>`

PATCH request.

##### `delete<T>(url: string, config?): Promise<HttpResponse<T>>`

DELETE request.

---

### Interceptors

#### createAuthInterceptor

Creates an authentication interceptor.

**Signature:**
```typescript
function createAuthInterceptor(
  getToken: () => string | Promise<string>
): RequestInterceptor
```

**Example:**
```typescript
import { httpClient, createAuthInterceptor } from '@/lib/services';

const authInterceptor = createAuthInterceptor(async () => {
  return localStorage.getItem('token') || '';
});

httpClient.interceptors.request.use(authInterceptor);
```

---

#### createRetryInterceptor

Creates a retry interceptor with exponential backoff.

**Signature:**
```typescript
function createRetryInterceptor(config?: {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryCondition?: (error: HttpError) => boolean;
}): ErrorInterceptor
```

**Example:**
```typescript
import { httpClient, createRetryInterceptor } from '@/lib/services';

const retryInterceptor = createRetryInterceptor({
  maxRetries: 3,
  baseDelay: 1000,
  retryCondition: (error) => error.status >= 500
});

httpClient.interceptors.error.use(retryInterceptor);
```

---

#### createRequestLoggerInterceptor

Logs outgoing requests.

**Signature:**
```typescript
function createRequestLoggerInterceptor(): RequestInterceptor
```

---

#### createResponseLoggerInterceptor

Logs responses.

**Signature:**
```typescript
function createResponseLoggerInterceptor(): ResponseInterceptor
```

---

#### createTimingInterceptor

Measures request timing.

**Signature:**
```typescript
function createTimingInterceptor(
  onTiming?: (timing: TimingData) => void
): RequestInterceptor & ResponseInterceptor
```

---

## Type-Safe API Client

### createTypedApiClient

Creates a type-safe API client with Zod validation.

**Signature:**
```typescript
function createTypedApiClient<TContract extends ApiContract>(
  contract: TContract,
  config?: TypedApiClientConfig
): TypedApiClient<TContract>
```

**Example:**
```typescript
import { createTypedApiClient, defineGet, definePost } from '@/lib/services';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

const userApiContract = {
  getUser: defineGet('/users/:id', {
    params: z.object({ id: z.string() }),
    response: userSchema
  }),
  createUser: definePost('/users', {
    body: userSchema.omit({ id: true }),
    response: userSchema
  })
};

const userApi = createTypedApiClient(userApiContract, {
  baseUrl: 'https://api.example.com'
});

// Type-safe API calls
const user = await userApi.getUser({ params: { id: '123' } });
// user is typed as { id: string; name: string; email: string }

const newUser = await userApi.createUser({
  body: { name: 'John', email: 'john@example.com' }
});
```

---

### defineEndpoint

Defines a type-safe endpoint.

**Signature:**
```typescript
function defineEndpoint<
  TMethod extends HttpMethod,
  TParams extends z.ZodType,
  TQuery extends z.ZodType,
  TBody extends z.ZodType,
  TResponse extends z.ZodType
>(
  method: TMethod,
  path: string,
  definition: {
    params?: TParams;
    query?: TQuery;
    body?: TBody;
    response: TResponse;
  }
): EndpointDefinition
```

---

### defineGet, definePost, definePut, definePatch, defineDelete

Convenience functions for defining endpoints.

**Example:**
```typescript
import { defineGet, definePost, z } from '@/lib/services';

const getUsers = defineGet('/users', {
  query: z.object({ page: z.number(), limit: z.number() }),
  response: z.array(userSchema)
});

const createUser = definePost('/users', {
  body: userSchema.omit({ id: true }),
  response: userSchema
});
```

---

## Circuit Breakers

### ServiceCircuitBreaker

Circuit breaker for service resilience.

**Class:** `ServiceCircuitBreaker`

#### Constructor

```typescript
constructor(config: ServiceConfig)

interface ServiceConfig {
  failureThreshold: number;      // Number of failures to open circuit
  resetTimeout: number;           // Timeout before half-open state
  successThreshold: number;       // Successes needed to close from half-open
  timeout: number;                // Request timeout
}
```

#### Methods

##### `execute<T>(fn: () => Promise<T>): Promise<T>`

Executes function through circuit breaker.

**Example:**
```typescript
import { ServiceCircuitBreaker } from '@/lib/services';

const breaker = new ServiceCircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
  successThreshold: 2,
  timeout: 5000
});

const result = await breaker.execute(async () => {
  return await fetch('/api/data').then(r => r.json());
});
```

##### `getState(): 'closed' | 'open' | 'half-open'`

Gets current circuit state.

##### `reset(): void`

Resets circuit breaker.

##### `onStateChange(callback: (state: string) => void): void`

Subscribes to state changes.

---

### serviceRegistry

Global service circuit breaker registry.

**Methods:**
- `register(name: string, config: ServiceConfig): void`
- `get(name: string): ServiceCircuitBreaker | undefined`
- `execute<T>(serviceName: string, fn: () => Promise<T>): Promise<T>`
- `getStates(): Record<string, CircuitBreakerState>`

**Example:**
```typescript
import { serviceRegistry } from '@/lib/services';

serviceRegistry.register('user-api', {
  failureThreshold: 3,
  resetTimeout: 30000,
  successThreshold: 2,
  timeout: 5000
});

const users = await serviceRegistry.execute('user-api', async () => {
  return await fetch('/api/users').then(r => r.json());
});
```

---

## Offline Queue

### PersistentOfflineQueue

Queues requests when offline for later retry.

**Class:** `PersistentOfflineQueue`

#### Methods

##### `enqueue(request: QueuedRequest, options?: EnqueueOptions): Promise<string>`

Adds request to queue.

**Example:**
```typescript
import { offlineQueue } from '@/lib/services';

const id = await offlineQueue.enqueue({
  url: '/api/users',
  method: 'POST',
  body: { name: 'John' },
  headers: { 'Content-Type': 'application/json' }
}, {
  priority: 'high',
  maxRetries: 3
});
```

##### `processQueue(): Promise<void>`

Processes queued requests.

##### `getStats(): Promise<QueueStats>`

Gets queue statistics.

**Returns:**
```typescript
interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  failed: number;
  completed: number;
}
```

##### `clear(): Promise<void>`

Clears the queue.

##### `remove(id: string): Promise<void>`

Removes specific request.

---

### offlineQueue

Global offline queue instance.

---

## DataLoader Batching

### DataLoader

Batches and caches data loading.

**Class:** `DataLoader<K, V>`

#### Constructor

```typescript
constructor(
  batchFn: BatchFunction<K, V>,
  options?: DataLoaderConfig
)

type BatchFunction<K, V> = (keys: K[]) => Promise<V[]>
```

**Example:**
```typescript
import { DataLoader } from '@/lib/services';

const userLoader = new DataLoader<string, User>(async (ids) => {
  const response = await fetch(`/api/users?ids=${ids.join(',')}`);
  return response.json();
}, {
  maxBatchSize: 100,
  cacheKeyFn: (id) => id
});

// These calls are batched automatically
const user1 = await userLoader.load('1');
const user2 = await userLoader.load('2');
const user3 = await userLoader.load('3');
// Results in single request: /api/users?ids=1,2,3
```

#### Methods

##### `load(key: K): Promise<V>`

Loads a single value (batched).

##### `loadMany(keys: K[]): Promise<V[]>`

Loads multiple values (batched).

##### `clear(key: K): void`

Clears cache for key.

##### `clearAll(): void`

Clears entire cache.

##### `prime(key: K, value: V): void`

Primes cache with value.

---

### createResourceLoader

Creates a DataLoader for a specific resource.

**Signature:**
```typescript
function createResourceLoader<T>(
  resourceName: string,
  fetchFn: (ids: string[]) => Promise<T[]>
): DataLoader<string, T>
```

**Example:**
```typescript
import { createResourceLoader } from '@/lib/services';

const userLoader = createResourceLoader<User>('users', async (ids) => {
  const response = await fetch(`/api/users?ids=${ids.join(',')}`);
  return response.json();
});
```

---

### RequestDeduplicator

Deduplicates identical in-flight requests.

**Class:** `RequestDeduplicator`

**Example:**
```typescript
import { globalDeduplicator, deduplicatedFetch } from '@/lib/services';

// Multiple calls to same URL are deduplicated
const [result1, result2, result3] = await Promise.all([
  deduplicatedFetch('/api/user'),
  deduplicatedFetch('/api/user'),
  deduplicatedFetch('/api/user')
]);
// Only one actual HTTP request is made
```

---

## Optimistic Mutations

### useOptimisticMutation

Hook for optimistic updates.

**Signature:**
```typescript
function useOptimisticMutation<TData, TVariables, TContext>(
  config: OptimisticUpdateConfig<TData, TVariables, TContext>
): UseMutationResult<TData, Error, TVariables, TContext>
```

**Example:**
```tsx
import { useOptimisticMutation } from '@/lib/services';

function UserEditor() {
  const updateUser = useOptimisticMutation({
    mutationFn: async (user: User) => {
      return await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(user)
      }).then(r => r.json());
    },
    optimisticUpdate: (variables, context) => {
      // Update cache optimistically
      queryClient.setQueryData(['user', variables.id], variables);
    },
    onSuccess: (data, variables, context) => {
      // Verify optimistic update with server response
      queryClient.setQueryData(['user', data.id], data);
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['user', variables.id], context.previousData);
      }
    },
    conflictStrategy: 'server-wins'
  });

  return (
    <button onClick={() => updateUser.mutate({ id: '123', name: 'New Name' })}>
      Update
    </button>
  );
}
```

---

### createListOptimisticUpdates

Helper for optimistic list updates.

**Signature:**
```typescript
function createListOptimisticUpdates<T extends ListItem>(
  queryKey: QueryKey
): {
  onCreate: (item: T) => void;
  onUpdate: (id: string, item: Partial<T>) => void;
  onDelete: (id: string) => void;
}
```

**Example:**
```typescript
import { createListOptimisticUpdates } from '@/lib/services';

const listUpdates = createListOptimisticUpdates<User>(['users']);

// Optimistically add user
listUpdates.onCreate({ id: 'temp-123', name: 'John' });

// Optimistically update user
listUpdates.onUpdate('123', { name: 'Jane' });

// Optimistically delete user
listUpdates.onDelete('123');
```

---

## API Versioning

### VersionedApiClient

API client with version negotiation and transformation.

**Class:** `VersionedApiClient`

**Example:**
```typescript
import { VersionedApiClient, VersioningStrategy } from '@/lib/services';

const api = new VersionedApiClient({
  baseUrl: 'https://api.example.com',
  strategy: VersioningStrategy.Header,
  currentVersion: '2.0',
  supportedVersions: ['1.0', '2.0'],
  transformers: {
    '1.0': {
      request: (data) => {
        // Transform v2 request to v1 format
        return { ...data, legacy: true };
      },
      response: (data) => {
        // Transform v1 response to v2 format
        return { ...data, version: 2 };
      }
    }
  }
});

const response = await api.request('/users', {
  method: 'GET',
  version: '1.0'  // Uses v1 API
});
```

---

### VersioningStrategy

Version negotiation strategies.

**Enum:**
```typescript
enum VersioningStrategy {
  Header = 'header',        // X-API-Version: 2.0
  QueryParam = 'query',     // ?version=2.0
  URLPath = 'url',          // /v2/users
  MediaType = 'media-type'  // Accept: application/vnd.api+json;version=2.0
}
```

---

### parseVersion, compareVersions, isVersionInRange

Version utility functions.

**Example:**
```typescript
import { parseVersion, compareVersions, isVersionInRange } from '@/lib/services';

const v1 = parseVersion('1.2.3');  // { major: 1, minor: 2, patch: 3 }

const comparison = compareVersions('2.0.0', '1.5.0');  // 1 (greater)

const inRange = isVersionInRange('1.5.0', '1.0.0', '2.0.0');  // true
```

---

## Request Caching

### RequestCache

In-memory request cache.

**Class:** `RequestCache`

#### Methods

##### `get<T>(key: string): T | undefined`

Gets cached value.

##### `set<T>(key: string, value: T, ttl?: number): void`

Sets cached value.

**Example:**
```typescript
import { requestCache } from '@/lib/services';

requestCache.set('user-123', userData, 60000);  // Cache for 1 minute

const cached = requestCache.get('user-123');
```

##### `has(key: string): boolean`

Checks if key exists.

##### `delete(key: string): void`

Deletes cached value.

##### `clear(): void`

Clears entire cache.

---

### createCachedFetcher

Creates a cached fetch function.

**Signature:**
```typescript
function createCachedFetcher<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): () => Promise<T>
```

**Example:**
```typescript
import { createCachedFetcher } from '@/lib/services';

const getUser = createCachedFetcher(
  'user-123',
  async () => {
    const res = await fetch('/api/users/123');
    return res.json();
  },
  60000  // 1 minute TTL
);

// First call fetches from API
const user1 = await getUser();

// Second call returns cached value
const user2 = await getUser();
```

---

## Request Queue & Rate Limiting

### RequestQueue

Priority-based request queue.

**Class:** `RequestQueue`

**Example:**
```typescript
import { globalRequestQueue } from '@/lib/services';

await globalRequestQueue.enqueue(
  async () => {
    return await fetch('/api/users').then(r => r.json());
  },
  { priority: 'high' }
);
```

---

### RateLimiter

Rate limiting for API requests.

**Class:** `RateLimiter`

**Example:**
```typescript
import { RateLimiter } from '@/lib/services';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000  // 100 requests per minute
});

await limiter.acquire();  // Waits if rate limit exceeded
// Make request
```

---

## Summary

This documentation covers the four main modules of the @missionfabric-js/enzyme framework:

1. **Realtime**: WebSocket/SSE clients with automatic reconnection, channel subscriptions, and React Query integration
2. **Routing**: Type-safe file-based routing with guards, conflict detection, and automatic discovery
3. **Security**: CSP, XSS prevention, CSRF protection, and encrypted storage
4. **Services**: HTTP client with interceptors, type-safe APIs, circuit breakers, offline support, batching, and versioning

Each module is designed to work independently or together to provide a comprehensive enterprise-grade React application framework.

---

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**End of Documentation**
