# @defendr/enzyme Framework API Documentation

**Version:** 1.0.0
**Author:** Harbor Grid Development Team
**Last Updated:** 2025-11-28

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Module: `@defendr/enzyme/vdom`](#module-vdom)
4. [Module: `@defendr/enzyme/core`](#module-core)
5. [Module: `@defendr/enzyme/feature`](#module-feature)
6. [Module: `@defendr/enzyme/hooks`](#module-hooks)

---

## Overview

@defendr/enzyme is a comprehensive enterprise-grade React framework providing:

- **Virtual Modular DOM (VDOM)**: Advanced module boundary system with lifecycle management
- **Configuration Management**: Centralized, type-safe configuration with runtime updates
- **Feature Factory**: Plugin architecture for modular feature development
- **Hooks Library**: Production-ready custom hooks for common patterns

### Key Features

- ✅ TypeScript-first with complete type safety
- ✅ Memory-efficient object pooling
- ✅ Built-in security sandbox and XSS prevention
- ✅ Hot Module Replacement (HMR) support
- ✅ Performance monitoring and budgets
- ✅ Server-Side Rendering (SSR) hydration
- ✅ Cross-module event communication
- ✅ Dependency injection container
- ✅ Code splitting with intelligent prefetching

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │  Features     │  │  Components   │  │  Pages        │   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │
└──────────┼──────────────────┼──────────────────┼───────────┘
           │                  │                  │
┌──────────┼──────────────────┼──────────────────┼───────────┐
│          │    @defendr/enzyme Framework         │           │
│  ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐   │
│  │  VDOM System  │  │  Core Config  │  │  Hooks Lib    │   │
│  │  ┌─────────┐  │  │  ┌─────────┐  │  │  ┌─────────┐  │   │
│  │  │ Pool    │  │  │  │Registry │  │  │  │ State   │  │   │
│  │  │ Sandbox │  │  │  │Endpoints│  │  │  │ Network │  │   │
│  │  │ Events  │  │  │  │Runtime  │  │  │  │ A11y    │  │   │
│  │  └─────────┘  │  │  └─────────┘  │  │  └─────────┘  │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                  │                  │
┌──────────▼──────────────────▼──────────────────▼───────────┐
│                        React Runtime                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Interaction
      │
      ▼
┌──────────────┐
│  Component   │ ─── useModule() ───┐
└──────────────┘                    │
      │                             ▼
      │                    ┌─────────────────┐
      ▼                    │ Module Context  │
┌──────────────┐           │  - Config       │
│  Event Bus   │◄──────────│  - State        │
│  publish()   │           │  - Security     │
└──────┬───────┘           └────────┬────────┘
       │                            │
       ▼                            ▼
┌──────────────┐           ┌─────────────────┐
│  Subscribers │           │  VDOM Pool      │
│  (Modules)   │           │  acquire/release│
└──────────────┘           └─────────────────┘
```

---

## Module: @defendr/enzyme/vdom

The Virtual Modular DOM system provides module boundary management, memory pooling, security sandboxing, and cross-module communication.

### Import Path

```typescript
import { /* exports */ } from '@defendr/enzyme/vdom';
```

---

### Core Types

#### `ModuleId`

Branded type for unique module identifiers.

```typescript
type ModuleId = string & { readonly __brand: 'ModuleId' };
```

#### `VNodeId`

Branded type for virtual node identifiers.

```typescript
type VNodeId = string & { readonly __brand: 'VNodeId' };
```

#### `SecurityNonce`

Branded type for security nonces.

```typescript
type SecurityNonce = string & { readonly __brand: 'SecurityNonce' };
```

---

### Enums

#### `VNodeType`

Virtual node types enumeration.

```typescript
const VNodeType = {
  ELEMENT: 'element',
  TEXT: 'text',
  COMMENT: 'comment',
  FRAGMENT: 'fragment',
  COMPONENT: 'component',
  PORTAL: 'portal',
  SUSPENSE: 'suspense',
  MODULE_BOUNDARY: 'module_boundary',
} as const;
```

#### `ModuleLifecycleState`

Module lifecycle states.

```typescript
const ModuleLifecycleState = {
  REGISTERED: 'registered',
  INITIALIZING: 'initializing',
  INITIALIZED: 'initialized',
  MOUNTING: 'mounting',
  MOUNTED: 'mounted',
  SUSPENDED: 'suspended',
  UNMOUNTING: 'unmounting',
  UNMOUNTED: 'unmounted',
  ERROR: 'error',
  DISPOSED: 'disposed',
} as const;
```

#### `HydrationState`

Hydration states for SSR support.

```typescript
const HydrationState = {
  DEHYDRATED: 'dehydrated',
  PENDING: 'pending',
  HYDRATING: 'hydrating',
  HYDRATED: 'hydrated',
  SKIPPED: 'skipped',
  FAILED: 'failed',
} as const;
```

#### `HydrationPriority`

Priority levels for hydration (lower number = higher priority).

```typescript
const HydrationPriority = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
  DEFERRED: 5,
} as const;
```

#### `HydrationTrigger`

What triggers hydration.

```typescript
const HydrationTrigger = {
  IMMEDIATE: 'immediate',
  VISIBLE: 'visible',
  IDLE: 'idle',
  INTERACTION: 'interaction',
  MANUAL: 'manual',
} as const;
```

#### `EventPriority`

Event processing priority levels.

```typescript
const EventPriority = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
} as const;
```

#### `LoadingPriority`

Module loading priority levels.

```typescript
const LoadingPriority = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  PREFETCH: 4,
} as const;
```

---

### Interfaces

#### `VirtualNode`

Core virtual node interface.

```typescript
interface VirtualNode {
  readonly id: VNodeId;
  readonly type: VNodeType;
  readonly tag: string | ComponentType<unknown>;
  readonly props: VNodeProps;
  readonly children: ReadonlyArray<VirtualNode | string>;
  parent: VirtualNode | null;
  element: Element | Text | null;
  readonly moduleId: ModuleId | null;
  hydrationState: HydrationState;
  poolGeneration: number;
  isPooled: boolean;
  lastUpdated: number;
}
```

#### `ModuleBoundaryConfig`

Module boundary configuration.

```typescript
interface ModuleBoundaryConfig {
  readonly id: ModuleId;
  readonly name: string;
  readonly version?: string;
  readonly dependencies?: ReadonlyArray<ModuleDependency>;
  readonly slots?: ReadonlyArray<ModuleSlotDefinition>;
  readonly lifecycle?: ModuleLifecycleHooks;
  readonly hydration?: Partial<HydrationConfig>;
  readonly security?: Partial<ModuleSecurityConfig>;
  readonly isolated?: boolean;
  readonly performanceBudget?: number;
  readonly strict?: boolean;
}
```

#### `ModuleSecurityConfig`

Module security configuration.

```typescript
interface ModuleSecurityConfig {
  readonly csp?: CSPDirectives;
  readonly nonce?: SecurityNonce;
  readonly sandbox?: boolean;
  readonly sandboxFlags?: ReadonlyArray<string>;
  readonly trustedTypesPolicy?: string;
  readonly sanitizeHydration?: boolean;
  readonly allowedEvents?: ReadonlyArray<string | RegExp>;
  readonly blockedEvents?: ReadonlyArray<string | RegExp>;
  readonly maxMessageSize?: number;
  readonly validateOrigins?: boolean;
}
```

#### `HydrationConfig`

Hydration configuration for a module.

```typescript
interface HydrationConfig {
  readonly priority: HydrationPriority;
  readonly trigger: HydrationTrigger;
  readonly timeout?: number;
  readonly rootMargin?: string;
  readonly threshold?: number;
  readonly independentChildren?: boolean;
  readonly onHydrationStart?: () => void;
  readonly onHydrationComplete?: () => void;
  readonly onHydrationError?: (error: Error) => void;
}
```

#### `VDOMPoolConfig`

VDOM pool configuration.

```typescript
interface VDOMPoolConfig {
  readonly initialSize: number;
  readonly maxSize: number;
  readonly minFreeNodes: number;
  readonly growthFactor: number;
  readonly shrinkThreshold: number;
  readonly gcIntervalMs: number;
  readonly nodeTtlMs: number;
  readonly enableMemoryPressure: boolean;
  readonly memoryPressureThreshold: number;
}
```

#### `VDOMPoolStats`

Pool statistics.

```typescript
interface VDOMPoolStats {
  readonly totalNodes: number;
  readonly inUseNodes: number;
  readonly freeNodes: number;
  readonly acquireCount: number;
  readonly releaseCount: number;
  readonly expansionCount: number;
  readonly gcCount: number;
  readonly gcCollectedCount: number;
  readonly generation: number;
  readonly estimatedMemoryBytes: number;
  readonly lastGcTimestamp: number;
  readonly utilization: number;
}
```

---

### Classes

#### `VDOMPool`

Memory-efficient virtual node pool with automatic garbage collection.

**Constructor:**

```typescript
constructor(config?: Partial<VDOMPoolConfig>)
```

**Methods:**

##### `acquire(options?): VirtualNode`

Acquires a virtual node from the pool.

**Parameters:**
- `options`: Object with optional properties:
  - `type?: VNodeType` - Node type
  - `tag?: string | ComponentType<unknown>` - Tag name or component
  - `props?: VNodeProps` - Node properties
  - `children?: (VirtualNode | string)[]` - Child nodes
  - `moduleId?: ModuleId` - Parent module ID
  - `hydrationState?: HydrationState` - Initial hydration state

**Returns:** `VirtualNode` - A configured virtual node

**Example:**

```typescript
const pool = new VDOMPool({ initialSize: 100, maxSize: 1000 });

const node = pool.acquire({
  type: VNodeType.ELEMENT,
  tag: 'div',
  props: { className: 'container' },
  children: [],
});
```

##### `release(node: VirtualNode): void`

Releases a virtual node back to the pool.

```typescript
pool.release(node);
```

##### `releaseMany(nodes: VirtualNode[]): void`

Releases multiple nodes at once.

```typescript
pool.releaseMany([node1, node2, node3]);
```

##### `gc(): void`

Forces garbage collection of old nodes.

```typescript
pool.gc();
```

##### `getStats(): VDOMPoolStats`

Gets current pool statistics.

```typescript
const stats = pool.getStats();
console.log(`Pool utilization: ${stats.utilization * 100}%`);
```

##### `clear(): void`

Clears all nodes from the pool.

##### `dispose(): void`

Disposes the pool and releases all resources.

**Helper Methods:**

##### `createElement(tag, props?, children?, options?): VirtualNode`

Creates an element node.

```typescript
const div = pool.createElement('div', { className: 'box' }, []);
```

##### `createText(text, options?): VirtualNode`

Creates a text node.

```typescript
const textNode = pool.createText('Hello World');
```

##### `createFragment(children?, options?): VirtualNode`

Creates a fragment node.

```typescript
const fragment = pool.createFragment([child1, child2]);
```

##### `createComponent(component, props?, children?, options?): VirtualNode`

Creates a component node.

```typescript
const comp = pool.createComponent(MyComponent, { prop: 'value' });
```

##### `createModuleBoundary(moduleId, children?, options?): VirtualNode`

Creates a module boundary node.

```typescript
const boundary = pool.createModuleBoundary(moduleId, [children]);
```

**Tree Operations:**

##### `clone(node, deep?): VirtualNode`

Clones a virtual node tree.

```typescript
const cloned = pool.clone(originalNode, true);
```

##### `appendChild(parent, child): void`

Appends a child to a node.

```typescript
pool.appendChild(parent, child);
```

##### `removeChild(parent, child): void`

Removes a child from a node.

##### `replaceChild(parent, oldChild, newChild): void`

Replaces a child node.

---

#### `VirtualModuleManager`

Manager class for virtual module lifecycle and state.

**Constructor:**

```typescript
constructor(config: ModuleBoundaryConfig)
```

**Getters:**

```typescript
get id(): ModuleId
get name(): string
get lifecycleState(): ModuleLifecycleState
get hydrationState(): HydrationState
get isMounted(): boolean
get isVisible(): boolean
get hasError(): boolean
get error(): Error | null
get metrics(): ModulePerformanceMetrics
```

**Methods:**

##### `async initialize(): Promise<void>`

Initializes the module.

```typescript
await module.initialize();
```

##### `async mount(container: Element): Promise<void>`

Mounts the module to a container element.

```typescript
const container = document.getElementById('app');
await module.mount(container);
```

##### `async unmount(): Promise<void>`

Unmounts the module.

##### `async suspend(): Promise<void>`

Suspends the module (lazy state).

##### `async dispose(): Promise<void>`

Disposes the module and releases resources.

##### `async handleError(error: Error, errorInfo?: ErrorInfo): Promise<void>`

Handles an error in the module.

##### `clearError(): void`

Clears the error state.

##### `async recover(): Promise<void>`

Attempts to recover from error state.

**Child Module Management:**

##### `registerChild(child: VirtualModuleManager): void`

Registers a child module.

##### `async unregisterChild(moduleId: ModuleId): Promise<void>`

Unregisters a child module.

##### `getChild(moduleId: ModuleId): VirtualModuleManager | null`

Gets a child module by ID.

**Slot Management:**

##### `setSlot(name: string, content: ReactNode): void`

Sets content for a named slot.

```typescript
module.setSlot('header', <Header />);
```

##### `getSlot(name: string): ReactNode | null`

Gets content from a named slot.

##### `clearSlot(name: string): void`

Clears a named slot.

**State Management:**

##### `setModuleState<T>(key: string, value: T): void`

Sets a module-scoped state value.

```typescript
module.setModuleState('count', 42);
```

##### `getModuleState<T>(key: string): T | undefined`

Gets a module-scoped state value.

##### `clearModuleState(): void`

Clears all module-scoped state.

**Event Management:**

##### `subscribe(event: ModuleLifecycleEvent, handler: () => void): () => void`

Subscribes to a lifecycle event. Returns unsubscribe function.

```typescript
const unsubscribe = module.subscribe(
  ModuleLifecycleEvent.AFTER_MOUNT,
  () => console.log('Mounted!')
);
```

**Performance:**

##### `recordRender(renderTime: number): void`

Records a render performance metric.

---

#### `ModuleRegistry`

Central registry for module management.

**Methods:**

##### `register(config: ModuleBoundaryConfig, options?: ModuleRegistrationOptions): boolean`

Registers a module with the registry.

**Parameters:**
- `config`: Module configuration
- `options`:
  - `loader?: () => Promise<{ default: ComponentType<unknown> }>` - Dynamic import function
  - `component?: ComponentType<unknown>` - Preloaded component
  - `hmrEnabled?: boolean` - Enable HMR support
  - `priority?: number` - Module priority
  - `prefetch?: boolean` - Prefetch hint

**Example:**

```typescript
const registry = new ModuleRegistry();

registry.register(
  {
    id: createModuleId('my-module'),
    name: 'My Module',
  },
  {
    loader: () => import('./MyModule'),
    hmrEnabled: true,
  }
);
```

##### `unregister(moduleId: ModuleId): boolean`

Unregisters a module.

##### `has(moduleId: ModuleId): boolean`

Checks if a module is registered.

##### `get(moduleId: ModuleId): ModuleRegistryEntry | null`

Gets a module entry.

##### `getConfig(moduleId: ModuleId): ModuleBoundaryConfig | null`

Gets module configuration.

##### `async getComponent(moduleId: ModuleId): Promise<ComponentType<unknown> | null>`

Gets or loads a module's component.

```typescript
const component = await registry.getComponent(moduleId);
```

##### `async preload(moduleId: ModuleId): Promise<void>`

Preloads a module's component.

##### `async preloadMany(moduleIds: ModuleId[]): Promise<void>`

Preloads multiple modules.

**Dependency Resolution:**

##### `resolveDependencies(moduleId, options?): DependencyResolutionResult`

Resolves dependencies for a module using topological sort.

**Returns:**

```typescript
interface DependencyResolutionResult {
  resolved: ModuleId[];
  failed: Array<{ moduleId: ModuleId; reason: string }>;
  circularDependencies: ModuleId[][];
}
```

##### `getDependents(moduleId: ModuleId): ModuleId[]`

Gets modules that depend on a given module.

##### `getDependencies(moduleId: ModuleId): ModuleId[]`

Gets modules that a given module depends on.

**HMR:**

##### `onHMRUpdate(handler: HMRUpdateHandler): () => void`

Registers an HMR update handler. Returns unsubscribe function.

```typescript
const unsubscribe = registry.onHMRUpdate((moduleId, newComponent) => {
  console.log(`Module ${moduleId} updated`);
});
```

##### `handleHMRUpdate(moduleId: ModuleId, newComponent: ComponentType<unknown>): void`

Handles an HMR update for a module.

##### `getVersion(moduleId: ModuleId): number`

Gets the current version of a module.

**Query:**

##### `query(options?: ModuleQueryOptions): ModuleRegistryEntry[]`

Queries modules based on criteria.

```typescript
const results = registry.query({
  namePattern: /^feature-/,
});
```

##### `getAllModuleIds(): ModuleId[]`

Gets all registered module IDs.

##### `get size(): number`

Gets the count of registered modules.

---

#### `ModuleLoader`

Orchestrates module loading with intelligent strategies.

**Constructor:**

```typescript
constructor(registry?: ModuleRegistry)
```

**Methods:**

##### `async load(moduleId: ModuleId, options?: ModuleLoadOptions): Promise<ComponentType<unknown>>`

Loads a module with the given options.

**Parameters:**
- `options`:
  - `priority?: LoadingPriority` - Loading priority
  - `timeout?: number` - Timeout in ms
  - `retries?: number` - Retry count on failure
  - `retryDelay?: number` - Retry delay in ms
  - `preloadDependencies?: boolean` - Whether to preload dependencies
  - `onProgress?: (progress: number) => void` - Progress callback
  - `onComplete?: () => void` - Completion callback
  - `onError?: (error: Error) => void` - Error callback

**Example:**

```typescript
const loader = new ModuleLoader();

const component = await loader.load(moduleId, {
  priority: LoadingPriority.HIGH,
  timeout: 5000,
  onProgress: (progress) => console.log(`Loading: ${progress * 100}%`),
});
```

##### `async loadMany(moduleIds: ModuleId[], options?): Promise<Map<ModuleId, ComponentType<unknown>>>`

Loads multiple modules in parallel.

##### `getLoadingState(moduleId: ModuleId): ModuleLoadingState | null`

Gets the loading state of a module.

```typescript
interface ModuleLoadingState {
  readonly moduleId: ModuleId;
  readonly state: 'idle' | 'queued' | 'loading' | 'loaded' | 'error';
  readonly progress: number;
  readonly error: Error | null;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly dependenciesLoaded: number;
  readonly dependenciesTotal: number;
}
```

##### `cancel(moduleId: ModuleId): boolean`

Cancels a pending load.

**Prefetching:**

##### `addPrefetchHint(hint: PrefetchHint): void`

Adds a prefetch hint for a module.

**Parameters:**

```typescript
interface PrefetchHint {
  moduleId: ModuleId;
  probability: number; // 0-1
  trigger: 'immediate' | 'idle' | 'visible' | 'hover';
  element?: Element;
}
```

**Example:**

```typescript
loader.addPrefetchHint({
  moduleId: otherModuleId,
  probability: 0.8,
  trigger: 'idle',
});
```

##### `removePrefetchHint(moduleId: ModuleId): void`

Removes a prefetch hint.

**Metrics:**

##### `getMetrics(): LoadingMetrics`

Gets loading metrics.

```typescript
interface LoadingMetrics {
  totalLoaded: number;
  totalLoadTime: number;
  averageLoadTime: number;
  failedLoads: number;
  cacheHits: number;
  prefetchHits: number;
}
```

##### `resetMetrics(): void`

Resets loading metrics.

##### `get pendingCount(): number`

Gets the number of pending loads.

##### `get loadingCount(): number`

Gets the number of currently loading modules.

---

#### `SecuritySandbox`

Comprehensive security sandbox for module boundaries.

**Constructor:**

```typescript
constructor(moduleId: ModuleId, config?: Partial<ModuleSecurityConfig>)
```

**Content Validation:**

##### `validateContent(content: string): boolean`

Validates content against security policies.

```typescript
const sandbox = new SecuritySandbox(moduleId, {
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", 'cdn.example.com'],
  },
  sanitizeHydration: true,
});

const isSafe = sandbox.validateContent('<script>alert(1)</script>');
// false
```

##### `sanitize(content: string): string`

Sanitizes content to make it safe.

```typescript
const safe = sandbox.sanitize('<div onclick="evil()">Hello</div>');
// <div>Hello</div>
```

##### `sanitizeText(text: string): string`

Sanitizes text (escape HTML).

**Hydration Security:**

##### `async sanitizeHydrationData(data): Promise<HydrationData>`

Sanitizes hydration data for secure server-to-client transfer.

##### `async validateHydrationData(data: HydrationData): Promise<boolean>`

Validates hydration data integrity.

**Event Security:**

##### `isEventAllowed(eventName: string): boolean`

Checks if an event is allowed.

```typescript
const allowed = sandbox.isEventAllowed('module:data-updated');
```

##### `validateMessage(sourceModuleId, eventName, payload): boolean`

Validates a cross-module message.

**CSP Management:**

##### `getNonce(): SecurityNonce`

Gets the current security nonce.

```typescript
const nonce = sandbox.getNonce();
// Use in <script nonce={nonce}>
```

##### `generateCSPHeader(): string`

Generates CSP header.

##### `validateCSPSource(type: keyof CSPDirectives, source: string): boolean`

Validates a source against CSP.

**Violation Management:**

##### `reportViolation(violation): void`

Reports a security violation.

##### `getViolations(): ReadonlyArray<SecurityViolation>`

Gets all recorded violations.

##### `clearViolations(): void`

Clears recorded violations.

##### `createContext(): SecurityContext`

Creates a security context for the module.

---

#### `ContentSanitizer`

Sanitizes HTML content to prevent XSS attacks.

**Constructor:**

```typescript
constructor(options?: {
  additionalTags?: string[];
  additionalAttributes?: string[];
})
```

**Methods:**

##### `sanitize(html: string): string`

Sanitizes HTML content.

##### `sanitizeText(text: string): string`

Sanitizes plain text (escape HTML).

##### `validate(content: string): boolean`

Validates content against dangerous patterns.

---

#### `CSPManager`

Manages Content Security Policy for modules.

**Constructor:**

```typescript
constructor(directives?: CSPDirectives)
```

**Methods:**

##### `getNonce(): SecurityNonce`

Gets the current nonce.

##### `generateHeader(): string`

Generates CSP header value.

##### `validateSource(type: keyof CSPDirectives, source: string): boolean`

Validates content against CSP directives.

##### `applyMetaTag(): void`

Applies CSP meta tag to document.

---

#### `EventValidator`

Validates cross-module events against security policies.

**Constructor:**

```typescript
constructor(config: ModuleSecurityConfig)
```

**Methods:**

##### `isEventAllowed(eventName: string): boolean`

Validates an event name.

##### `isPayloadSizeValid(payload: unknown): boolean`

Validates message payload size.

##### `isOriginValid(sourceModuleId, targetModuleId, allowedOrigins?): boolean`

Validates origin for cross-module messages.

---

#### `ModuleEventBus`

Event bus for cross-module communication.

**Constructor:**

```typescript
constructor(options?: ModuleEventBusOptions)
```

**Methods:**

##### `subscribe<T>(eventType: string, handler: ModuleEventHandler<T>, moduleId?: string): () => void`

Subscribes to events. Returns unsubscribe function.

```typescript
const eventBus = new ModuleEventBus();

const unsubscribe = eventBus.subscribe(
  'data:updated',
  (message) => {
    console.log('Data updated:', message.payload);
  },
  moduleId
);
```

##### `publish<T>(eventType: string, payload: T, source: string, target?: string): void`

Publishes an event.

```typescript
eventBus.publish('data:updated', { items: [] }, sourceModuleId);
```

##### `unsubscribeModule(moduleId: string): void`

Unsubscribes all handlers for a module.

##### `getStats(): EventBusStats`

Gets statistics.

```typescript
interface EventBusStats {
  totalPublished: number;
  totalDelivered: number;
  activeSubscriptions: number;
  eventsByType: Map<string, number>;
}
```

##### `clear(): void`

Clears all subscriptions.

##### `dispose(): void`

Disposes the event bus.

---

### React Components

#### `<ModuleProvider>`

Root provider for the Virtual Modular DOM system.

**Props:**

```typescript
interface ModuleProviderProps {
  children: ReactNode;
  config?: Partial<ModuleProviderConfig>;
  pool?: VDOMPool;
  registry?: ModuleRegistry;
  loader?: ModuleLoader;
  eventBus?: ModuleEventBus;
  onReady?: () => void;
  onError?: (error: Error) => void;
}
```

**Example:**

```tsx
import { ModuleProvider } from '@defendr/enzyme/vdom';

function App() {
  return (
    <ModuleProvider
      config={{
        devMode: process.env.NODE_ENV === 'development',
        enableTelemetry: true,
        performanceBudget: {
          maxRenderTime: 16,
          maxInitTime: 100,
        },
      }}
      onReady={() => console.log('Module system ready')}
    >
      <ModuleBoundary id="app" name="Application">
        <YourApp />
      </ModuleBoundary>
    </ModuleProvider>
  );
}
```

#### `<ModuleBoundary>`

Defines a module boundary with isolated context.

**Props:**

```typescript
interface ModuleBoundaryProps {
  id: string | ModuleId;
  name: string;
  version?: string;
  children: ReactNode;
  dependencies?: ModuleDependency[];
  slots?: ModuleSlotDefinition[];
  lifecycle?: ModuleLifecycleHooks;
  hydration?: Partial<HydrationConfig>;
  security?: Partial<ModuleSecurityConfig>;
  isolated?: boolean;
  performanceBudget?: number;
  fallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
}
```

**Example:**

```tsx
<ModuleBoundary
  id="dashboard"
  name="Dashboard Module"
  version="1.0.0"
  hydration={{
    priority: HydrationPriority.HIGH,
    trigger: HydrationTrigger.VISIBLE,
  }}
  security={{
    sanitizeHydration: true,
    allowedEvents: [/^module:/],
  }}
  lifecycle={{
    onAfterMount: () => console.log('Dashboard mounted'),
  }}
>
  <DashboardContent />
</ModuleBoundary>
```

#### `<ModuleSlot>`

Defines a slot for content composition.

**Props:**

```typescript
interface ModuleSlotProps {
  name: string;
  children?: ReactNode;
  required?: boolean;
  accepts?: string[];
  maxChildren?: number;
  fallback?: ReactNode;
}
```

**Example:**

```tsx
<ModuleBoundary id="layout" name="Layout">
  <div className="layout">
    <ModuleSlot name="header" fallback={<DefaultHeader />} />
    <ModuleSlot name="content" required />
    <ModuleSlot name="sidebar" />
  </div>
</ModuleBoundary>
```

#### `<DynamicModuleSlot>`

Dynamic slot that loads content based on conditions.

**Props:**

```typescript
interface DynamicModuleSlotProps {
  name: string;
  loader: () => Promise<React.ComponentType>;
  loading?: ReactNode;
  error?: ReactNode | ((error: Error) => ReactNode);
}
```

#### `<LazyModuleSlot>`

Lazy-loaded slot with Suspense integration.

**Props:**

```typescript
interface LazyModuleSlotProps {
  name: string;
  moduleId: ModuleId;
  fallback?: ReactNode;
  priority?: LoadingPriority;
}
```

#### `<ModuleOutlet>`

Renders content from a module slot (like React Router Outlet).

**Props:**

```typescript
interface ModuleOutletProps {
  slotName?: string;
  fallback?: ReactNode;
}
```

#### `<ConditionalModuleSlot>`

Conditionally rendered slot.

**Props:**

```typescript
interface ConditionalModuleSlotProps {
  name: string;
  condition: boolean | (() => boolean);
  children: ReactNode;
  fallback?: ReactNode;
}
```

#### `<ModulePortalSlot>`

Portal slot for rendering content elsewhere in the DOM.

**Props:**

```typescript
interface ModulePortalSlotProps {
  name: string;
  target: string | Element;
  children: ReactNode;
}
```

---

### Hooks

#### `useModule()`

Primary hook to access module context.

**Returns:**

```typescript
interface UseModuleReturn {
  readonly moduleId: ModuleId;
  readonly config: ModuleBoundaryConfig;
  readonly lifecycleState: ModuleLifecycleState;
  readonly isMounted: boolean;
  readonly isVisible: boolean;
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly metrics: ModulePerformanceMetrics;
  readonly emit: <T>(name: string, payload: T) => void;
  readonly on: <T>(
    name: string,
    handler: EventHandler<T>,
    options?: EventSubscriptionOptions
  ) => EventSubscription;
}
```

**Example:**

```tsx
function MyComponent() {
  const { moduleId, emit, on, metrics } = useModule();

  useEffect(() => {
    const subscription = on('data:updated', (msg) => {
      console.log('Received update:', msg.payload);
    });

    return () => subscription.unsubscribe();
  }, [on]);

  const handleClick = () => {
    emit('button:clicked', { timestamp: Date.now() });
  };

  return (
    <div>
      <p>Module: {moduleId}</p>
      <p>Renders: {metrics.renderCount}</p>
      <button onClick={handleClick}>Click Me</button>
    </div>
  );
}
```

#### `useModuleId()`

Gets the current module ID.

```tsx
const moduleId = useModuleId();
```

#### `useModuleConfig()`

Gets the module configuration.

```tsx
const config = useModuleConfig();
```

#### `useIsModuleMounted()`

Checks if module is mounted.

```tsx
const isMounted = useIsModuleMounted();
```

#### `useModuleMetrics()`

Gets module performance metrics.

```tsx
const metrics = useModuleMetrics();
```

#### `useModuleEmit()`

Gets the emit function for events.

```tsx
const emit = useModuleEmit();
emit('event:name', { data: 'value' });
```

#### `useModuleSubscribe()`

Gets the event subscription function.

```tsx
const subscribe = useModuleSubscribe();

useEffect(() => {
  const subscription = subscribe('event:name', (msg) => {
    console.log(msg.payload);
  });
  return () => subscription.unsubscribe();
}, [subscribe]);
```

#### `useModuleState<T>(key, options)`

Isolated module state management.

**Parameters:**
- `key: string` - State key
- `options`:
  - `initialValue: T` - Initial value
  - `persistent?: boolean` - Persist to localStorage
  - `sanitize?: (value: T) => T` - Sanitize function
  - `validate?: (value: T) => boolean` - Validation function

**Returns:**

```typescript
interface UseModuleStateReturn<T> {
  readonly state: T;
  readonly setState: (value: T | ((prev: T) => T)) => void;
  readonly mergeState: (partial: Partial<T>) => void;
  readonly resetState: () => void;
  readonly isLoading: boolean;
  readonly error: Error | null;
}
```

**Example:**

```tsx
function Counter() {
  const { state, setState, resetState } = useModuleState('count', {
    initialValue: 0,
  });

  return (
    <div>
      <p>Count: {state}</p>
      <button onClick={() => setState(s => s + 1)}>Increment</button>
      <button onClick={resetState}>Reset</button>
    </div>
  );
}
```

#### `useSimpleModuleState<T>(key, initialValue)`

Simplified module state (no options).

```tsx
const [count, setCount] = useSimpleModuleState('count', 0);
```

#### `useBooleanModuleState(key, initialValue?)`

Boolean state with toggle helper.

```tsx
const [isOpen, setIsOpen, toggle] = useBooleanModuleState('isOpen', false);
```

#### `useArrayModuleState<T>(key, initialValue?)`

Array state with helpers.

```tsx
const [items, { push, pop, filter, map }] = useArrayModuleState('items', []);

push({ id: 1, name: 'Item 1' });
filter(item => item.id !== 1);
```

#### `useRecordModuleState<K, V>(key, initialValue?)`

Record/Map state with helpers.

```tsx
const [data, { set, remove, clear }] = useRecordModuleState('data', {});

set('key', 'value');
remove('key');
```

#### `useModuleBoundary()`

Gets boundary information and slot management.

**Returns:**

```typescript
interface UseModuleBoundaryReturn {
  readonly boundaryRef: React.RefObject<HTMLElement>;
  readonly slots: ReadonlyArray<ModuleSlotDefinition>;
  readonly getSlot: (name: string) => ReactNode | null;
  readonly fillSlot: (name: string, content: ReactNode) => void;
  readonly clearSlot: (name: string) => void;
  readonly dimensions: DOMRect | null;
  readonly isVisible: boolean;
  readonly parentBoundary: UseModuleBoundaryReturn | null;
}
```

**Example:**

```tsx
function Layout() {
  const { boundaryRef, fillSlot, dimensions } = useModuleBoundary();

  useEffect(() => {
    fillSlot('header', <CustomHeader />);
  }, [fillSlot]);

  return (
    <div ref={boundaryRef}>
      {dimensions && <p>Size: {dimensions.width}x{dimensions.height}</p>}
    </div>
  );
}
```

#### `useBoundaryDimensions()`

Gets boundary dimensions.

```tsx
const dimensions = useBoundaryDimensions();
```

#### `useBoundaryVisibility()`

Checks if boundary is visible.

```tsx
const isVisible = useBoundaryVisibility();
```

#### `useModuleDepth()`

Gets the nesting depth of the current module.

```tsx
const depth = useModuleDepth(); // 0 = root, 1 = first level, etc.
```

#### `useModulePath()`

Gets the full module path from root.

```tsx
const path = useModulePath(); // ['root', 'parent', 'current']
```

#### `useIsNestedModule()`

Checks if module is nested (not root).

```tsx
const isNested = useIsNestedModule();
```

#### `useParentModuleId()`

Gets the parent module ID.

```tsx
const parentId = useParentModuleId();
```

#### `useSlot(name)`

Gets content from a specific slot.

```tsx
const headerContent = useSlot('header');
```

#### `useSlots(names)`

Gets content from multiple slots.

```tsx
const { header, footer } = useSlots(['header', 'footer']);
```

#### `useFillSlot(name, content)`

Fills a slot with content.

```tsx
useFillSlot('header', <Header />);
```

#### `useSlotContent(name)`

Alternative to useSlot.

```tsx
const content = useSlotContent('header');
```

#### `useIsSlotFilled(name)`

Checks if a slot is filled.

```tsx
const hasSidebar = useIsSlotFilled('sidebar');
```

#### `useModuleHydration()`

Hydration control and state.

**Returns:**

```typescript
interface UseModuleHydrationReturn {
  readonly hydrationState: HydrationState;
  readonly isHydrated: boolean;
  readonly isPending: boolean;
  readonly isHydrating: boolean;
  readonly hasFailed: boolean;
  readonly error: Error | null;
  readonly progress: number;
  readonly hydrate: () => Promise<void>;
  readonly skip: () => void;
  readonly data: HydrationData | null;
}
```

**Example:**

```tsx
function HydratableComponent() {
  const { isHydrated, hydrate, progress } = useModuleHydration();

  if (!isHydrated) {
    return (
      <div>
        <p>Hydrating... {progress * 100}%</p>
        <button onClick={hydrate}>Force Hydrate</button>
      </div>
    );
  }

  return <InteractiveContent />;
}
```

#### `useIsHydrated()`

Checks if module is hydrated.

```tsx
const isHydrated = useIsHydrated();
```

#### `useHydrateTrigger()`

Manually triggers hydration.

```tsx
const triggerHydration = useHydrateTrigger();

<button onClick={triggerHydration}>Hydrate Now</button>
```

#### `useHydrationProgress()`

Gets hydration progress (0-1).

```tsx
const progress = useHydrationProgress();
```

#### `useOnHydrated(callback)`

Runs callback when hydration completes.

```tsx
useOnHydrated(() => {
  console.log('Module is now interactive!');
});
```

#### `useOnHydrationError(callback)`

Runs callback when hydration fails.

```tsx
useOnHydrationError((error) => {
  console.error('Hydration failed:', error);
});
```

#### `useHydrationGuard<T>(fallback, content)`

Conditionally renders based on hydration state.

```tsx
const content = useHydrationGuard(
  <StaticContent />,
  <InteractiveContent />
);
```

#### `useHydrationTiming(options)`

Controls hydration timing.

```tsx
useHydrationTiming({
  delay: 1000,
  priority: HydrationPriority.LOW,
  trigger: HydrationTrigger.IDLE,
});
```

#### `useSecureModule()`

Security context and validation.

**Returns:**

```typescript
interface UseSecureModuleReturn {
  readonly securityContext: SecurityContext;
  readonly nonce: SecurityNonce | null;
  readonly isSecure: boolean;
  readonly validateContent: (content: string) => boolean;
  readonly sanitize: (content: string) => string;
  readonly isEventAllowed: (eventName: string) => boolean;
  readonly violations: ReadonlyArray<SecurityViolation>;
  readonly reportViolation: (violation: Omit<SecurityViolation, 'timestamp'>) => void;
}
```

**Example:**

```tsx
function UserContent({ html }) {
  const { sanitize, validateContent, isSecure } = useSecureModule();

  if (!validateContent(html)) {
    return <div>Invalid content</div>;
  }

  const safeHtml = sanitize(html);

  return (
    <div>
      {isSecure && <span>🔒 Secure</span>}
      <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </div>
  );
}
```

#### `useSecurityNonce()`

Gets the security nonce.

```tsx
const nonce = useSecurityNonce();

<script nonce={nonce}>...</script>
```

#### `useIsSecure()`

Checks if context is secure.

```tsx
const isSecure = useIsSecure();
```

#### `useSanitizer()`

Gets the content sanitizer.

```tsx
const sanitizer = useSanitizer();
const clean = sanitizer.sanitize(dirtyHtml);
```

#### `useContentValidator()`

Gets the content validator.

```tsx
const validator = useContentValidator();
const isValid = validator.validate(content);
```

#### `useSecurityViolations()`

Gets security violations.

```tsx
const violations = useSecurityViolations();
```

#### `useSafeHtml(html)`

Sanitizes HTML and returns safe version.

```tsx
const safeHtml = useSafeHtml(userProvidedHtml);
```

#### `useSecureUrl(url)`

Validates and returns secure URL.

```tsx
const safeUrl = useSecureUrl(userProvidedUrl);
```

#### `useSecureStyleProps()`

Gets secure style props with nonce.

```tsx
const styleProps = useSecureStyleProps();

<link {...styleProps} href="styles.css" />
```

#### `useSecureScriptProps()`

Gets secure script props with nonce.

```tsx
const scriptProps = useSecureScriptProps();

<script {...scriptProps} src="script.js" />
```

#### `useIsEventAllowed(eventName)`

Checks if an event is allowed.

```tsx
const isAllowed = useIsEventAllowed('module:custom-event');
```

#### `useSecureMessaging()`

Gets secure messaging utilities.

```tsx
const { sendSecure, validateMessage } = useSecureMessaging();
```

---

### Utility Functions

#### `createModuleId(id: string): ModuleId`

Creates a branded ModuleId.

```typescript
const moduleId = createModuleId('my-module');
```

#### `createVNodeId(id: string): VNodeId`

Creates a branded VNodeId.

#### `createSecurityNonce(nonce: string): SecurityNonce`

Creates a branded SecurityNonce.

#### `isModuleId(value: unknown): value is ModuleId`

Type guard for ModuleId.

#### `isVNodeId(value: unknown): value is VNodeId`

Type guard for VNodeId.

#### `createValidatedModuleId(id: string): ModuleId`

Creates a module ID with validation.

```typescript
const moduleId = createValidatedModuleId('feature-dashboard');
// Validates: alphanumeric, hyphens, underscores, must start with letter
```

#### `createMinimalConfig(id: string, name: string): ModuleBoundaryConfig`

Creates a minimal module configuration.

```typescript
const config = createMinimalConfig('dashboard', 'Dashboard');
```

#### `createVirtualModule(config: ModuleBoundaryConfig): VirtualModuleManager`

Creates a new virtual module manager.

```typescript
const module = createVirtualModule({
  id: createModuleId('my-module'),
  name: 'My Module',
  lifecycle: {
    onAfterMount: () => console.log('Mounted'),
  },
});
```

#### `createSecuritySandbox(moduleId, config?): SecuritySandbox`

Creates a new security sandbox.

#### `createStrictSecurityConfig(): ModuleSecurityConfig`

Creates a strict security configuration.

#### `createRelaxedSecurityConfig(): ModuleSecurityConfig`

Creates a relaxed security configuration for development.

#### `createVDOMPool(config?): VDOMPool`

Creates a new VDOM pool.

```typescript
const pool = createVDOMPool({
  initialSize: 200,
  maxSize: 5000,
  gcIntervalMs: 15000,
});
```

---

### Singleton Functions

#### `getDefaultPool(): VDOMPool`

Gets the default global VDOM pool.

#### `setDefaultPool(pool: VDOMPool): void`

Sets the default global VDOM pool.

#### `resetDefaultPool(): void`

Resets the default global VDOM pool.

#### `getDefaultRegistry(): ModuleRegistry`

Gets the default global module registry.

#### `setDefaultRegistry(registry: ModuleRegistry): void`

Sets the default global module registry.

#### `resetDefaultRegistry(): void`

Resets the default global module registry.

#### `getDefaultLoader(): ModuleLoader`

Gets the default global module loader.

#### `setDefaultLoader(loader: ModuleLoader): void`

Sets the default global module loader.

#### `resetDefaultLoader(): void`

Resets the default global module loader.

#### `getDefaultEventBus(): ModuleEventBus`

Gets the default global event bus.

#### `setDefaultEventBus(bus: ModuleEventBus): void`

Sets the default global event bus.

#### `resetDefaultEventBus(): void`

Resets the default global event bus.

---

### Convenience Functions

#### `acquireNode(options?): VirtualNode`

Acquires a node from the default pool.

```typescript
const node = acquireNode({
  type: VNodeType.ELEMENT,
  tag: 'div',
});
```

#### `releaseNode(node: VirtualNode): void`

Releases a node to the default pool.

#### `registerModule(config, options?): boolean`

Registers a module with the default registry.

#### `getModuleComponent(moduleId): Promise<ComponentType<unknown> | null>`

Gets a module component from the default registry.

#### `loadModule(moduleId, options?): Promise<ComponentType<unknown>>`

Loads a module using the default loader.

#### `prefetchModule(moduleId, probability?): void`

Prefetches a module using the default loader.

#### `createLazyLoader(moduleId, options?): () => Promise<{ default: ComponentType<unknown> }>`

Creates a lazy loader wrapper for React.lazy() compatibility.

```typescript
const LazyModule = React.lazy(createLazyLoader(moduleId));

<Suspense fallback={<Loading />}>
  <LazyModule />
</Suspense>
```

#### `subscribe<T>(eventType, handler, moduleId?): () => void`

Subscribes to an event on the default event bus.

#### `publish<T>(eventType, payload, source, target?): void`

Publishes an event on the default event bus.

#### `initializeVDOM(config?): void`

Initializes the Virtual Modular DOM system with default configuration.

```typescript
initializeVDOM({
  devMode: true,
  enableTelemetry: true,
});
```

#### `cleanupVDOM(): void`

Cleans up the Virtual Modular DOM system.

#### `createModuleRegistration(id, name)`

Creates a module registration helper with builder pattern.

```typescript
createModuleRegistration('my-module', 'My Module')
  .withLoader(() => import('./MyModule'))
  .withDependency('other-module')
  .withHMR()
  .withVersion('1.0.0')
  .register();
```

---

### Default Configurations

#### `DEFAULT_HYDRATION_CONFIG`

```typescript
{
  priority: HydrationPriority.NORMAL,
  trigger: HydrationTrigger.VISIBLE,
  timeout: 5000,
  rootMargin: '100px',
  threshold: 0.1,
  independentChildren: false,
}
```

#### `DEFAULT_POOL_CONFIG`

```typescript
{
  initialSize: 100,
  maxSize: 10000,
  minFreeNodes: 20,
  growthFactor: 2,
  shrinkThreshold: 0.75,
  gcIntervalMs: 30000,
  nodeTtlMs: 60000,
  enableMemoryPressure: true,
  memoryPressureThreshold: 0.9,
}
```

#### `DEFAULT_SECURITY_CONFIG`

```typescript
{
  sandbox: false,
  sanitizeHydration: true,
  maxMessageSize: 1024 * 1024, // 1MB
  validateOrigins: true,
}
```

---

## Module: @defendr/enzyme/core

The core configuration system provides centralized, type-safe configuration management.

### Import Path

```typescript
import { /* exports */ } from '@defendr/enzyme/core';
```

---

### Core Types

#### Type Primitives

```typescript
type Milliseconds = number;
type Seconds = number;
type Pixels = number;
type Percentage = number;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
type Environment = 'development' | 'staging' | 'production' | 'test';
```

---

### Configuration Interfaces

#### `NetworkConfig`

Network-related configuration.

```typescript
interface NetworkConfig {
  defaultTimeout: Milliseconds;
  longTimeout: Milliseconds;
  shortTimeout: Milliseconds;
  healthCheckTimeout: Milliseconds;
  remoteTimeout: Milliseconds;
  retryBaseDelay: Milliseconds;
  retryMaxDelay: Milliseconds;
  maxRetryAttempts: number;
  maxFailures: number;
  jitter: number;
}
```

#### `CacheConfig`

Cache-related configuration.

```typescript
interface CacheConfig {
  defaultTTL: Milliseconds;
  shortCacheTTL: Milliseconds;
  longCacheTTL: Milliseconds;
  flagCacheTTL: Milliseconds;
  pollingInterval: Milliseconds;
  pingInterval: Milliseconds;
}
```

#### `AuthConfig`

Authentication-related configuration.

```typescript
interface AuthConfig {
  tokenRefreshBuffer: Milliseconds;
  sessionTimeout: Milliseconds;
  sessionCheckInterval: Milliseconds;
  defaultTokenLifetime: Milliseconds;
  refreshBufferMs: Milliseconds;
}
```

#### `UIConfig`

UI-related configuration.

```typescript
interface UIConfig {
  defaultDebounce: Milliseconds;
  scrollThrottle: Milliseconds;
  throttleMs: Milliseconds;
  defaultBreakpoint: Pixels;
  defaultGap: Pixels;
  defaultPadding: Pixels;
  defaultMinColumnWidth: Pixels;
}
```

#### `VDOMConfig`

Virtual DOM configuration.

```typescript
interface VDOMConfig {
  defaultPoolSize: number;
  gcInterval: Milliseconds;
  memoryLimit: number;
}
```

#### `MonitoringConfig`

Monitoring and observability configuration.

```typescript
interface MonitoringConfig {
  batchSize: number;
  metricsFlushInterval: Milliseconds;
  slowRequestThreshold: Milliseconds;
  defaultBuckets: number[];
  maxEntryAgeMs: Milliseconds;
  sessionWindowGapMs: Milliseconds;
  maxSessionWindowMs: Milliseconds;
}
```

#### `LibraryConfig`

Complete library configuration.

```typescript
interface LibraryConfig {
  environment: Environment;
  network: NetworkConfig;
  cache: CacheConfig;
  featureFlags: FeatureFlagsConfig;
  auth: AuthConfig;
  layouts: LayoutsConfig;
  vdom: VDOMConfig;
  ui: UIConfig;
  monitoring: MonitoringConfig;
}
```

---

### Endpoint Types

#### `EndpointDefinition`

REST API endpoint definition.

```typescript
interface EndpointDefinition {
  name: string;
  path: string;
  method: HttpMethod;
  baseUrl?: string;
  auth?: boolean;
  cache?: EndpointCacheConfig;
  rateLimit?: EndpointRateLimit;
  timeout?: Milliseconds;
  retries?: number;
  tags?: string[];
  description?: string;
  deprecated?: boolean;
  version?: string;
}
```

#### `EndpointCacheConfig`

Endpoint-specific cache configuration.

```typescript
interface EndpointCacheConfig {
  strategy: CacheStrategy;
  ttl: Milliseconds;
  revalidateOnMount?: boolean;
  revalidateOnFocus?: boolean;
}

type CacheStrategy =
  | 'cache-first'
  | 'network-first'
  | 'cache-only'
  | 'network-only'
  | 'stale-while-revalidate';
```

#### `EndpointHealth`

Endpoint health status.

```typescript
interface EndpointHealth {
  status: EndpointHealthStatus;
  lastChecked: number;
  consecutiveFailures: number;
  averageResponseTime: Milliseconds;
  lastError: Error | null;
}

type EndpointHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
```

---

### Classes

#### `ConfigRegistry`

Central configuration registry.

**Methods:**

##### `get(): DeepReadonly<LibraryConfig>`

Gets the entire configuration.

```typescript
const registry = new ConfigRegistry();
const config = registry.get();
```

##### `getValue<T>(path: ConfigPath): T | undefined`

Gets a configuration value by path.

```typescript
const timeout = registry.getValue('network.defaultTimeout');
```

##### `setValue<T>(path: ConfigPath, value: T): void`

Sets a configuration value at runtime.

```typescript
registry.setValue('network.defaultTimeout', 60000);
```

##### `subscribe(listener: ConfigChangeListener): Unsubscribe`

Subscribes to configuration changes.

```typescript
const unsubscribe = registry.subscribe((event) => {
  console.log(`Config changed: ${event.path} = ${event.newValue}`);
});
```

##### `reset(): void`

Resets to default configuration.

##### `merge(partial: DeepPartial<LibraryConfig>): void`

Merges partial configuration.

```typescript
registry.merge({
  network: {
    defaultTimeout: 45000,
  },
});
```

---

#### `EndpointRegistry`

REST API endpoint registry.

**Methods:**

##### `register(endpoint: EndpointDefinition): void`

Registers an endpoint.

```typescript
const registry = new EndpointRegistry();

registry.register({
  name: 'users.list',
  path: '/users',
  method: 'GET',
  auth: true,
  cache: {
    strategy: 'cache-first',
    ttl: 300000,
  },
});
```

##### `get(name: string): EndpointDefinition | undefined`

Gets an endpoint by name.

```typescript
const endpoint = registry.get('users.list');
```

##### `buildUrl(name: string, params?: Record<string, string>): string`

Builds a URL for an endpoint with parameters.

```typescript
const url = registry.buildUrl('users.detail', { id: '123' });
// /users/123
```

##### `getHealth(name: string): EndpointHealth | undefined`

Gets health status for an endpoint.

##### `isHealthy(name: string): boolean`

Checks if an endpoint is healthy.

```typescript
if (registry.isHealthy('users.list')) {
  // Make request
}
```

##### `recordResponse(name: string, success: boolean, responseTime?: Milliseconds): void`

Records a response for health tracking.

##### `getAllByTag(tag: string): EndpointDefinition[]`

Gets all endpoints with a specific tag.

```typescript
const userEndpoints = registry.getAllByTag('users');
```

##### `getAll(): EndpointDefinition[]`

Gets all registered endpoints.

##### `subscribe(listener: EndpointChangeListener): Unsubscribe`

Subscribes to endpoint changes.

---

#### `RuntimeConfigManager`

Manages runtime configuration updates.

**Methods:**

##### `applyOverlay(overlay: DeepPartial<LibraryConfig>): void`

Applies a configuration overlay.

```typescript
const manager = new RuntimeConfigManager();

manager.applyOverlay({
  network: { defaultTimeout: 45000 },
});
```

##### `rollback(steps?: number): void`

Rolls back configuration changes.

```typescript
manager.rollback(2); // Rollback last 2 changes
```

##### `startPolling(url: string, interval: Milliseconds): void`

Starts polling for remote configuration updates.

```typescript
manager.startPolling('/api/config', 60000);
```

##### `stopPolling(): void`

Stops configuration polling.

##### `getHistory(): ConfigChangeEvent[]`

Gets configuration change history.

---

#### `AppConfigBridge`

Bridges application config with library config.

**Methods:**

##### `initialize(appConfig: unknown): void`

Initializes from application configuration.

```typescript
import { env, TIMING, API_CONFIG } from '@/config';

const bridge = new AppConfigBridge();
bridge.initialize({ env, TIMING, API_CONFIG });
```

##### `syncToLibConfig(): void`

Syncs app config to library config.

##### `syncFromLibConfig(): void`

Syncs library config back to app config.

---

### Singleton Functions

#### `getConfigRegistry(): ConfigRegistry`

Gets the global config registry instance.

#### `getLibConfig(): DeepReadonly<LibraryConfig>`

Gets the current library configuration.

```typescript
const config = getLibConfig();
console.log(config.network.defaultTimeout);
```

#### `getLibConfigValue<T>(path: ConfigPath): T | undefined`

Gets a configuration value by path.

```typescript
const timeout = getLibConfigValue('network.defaultTimeout');
```

#### `setLibConfigValue<T>(path: ConfigPath, value: T): void`

Sets a configuration value.

```typescript
setLibConfigValue('network.defaultTimeout', 60000);
```

#### `subscribeToLibConfig(listener: ConfigChangeListener): Unsubscribe`

Subscribes to configuration changes.

```typescript
const unsubscribe = subscribeToLibConfig((event) => {
  console.log('Config changed:', event);
});
```

#### `getEndpointRegistry(): EndpointRegistry`

Gets the global endpoint registry.

#### `registerEndpoint(endpoint: EndpointDefinition): void`

Registers an endpoint globally.

```typescript
registerEndpoint({
  name: 'products.list',
  path: '/products',
  method: 'GET',
  cache: { strategy: 'cache-first', ttl: 300000 },
});
```

#### `getEndpoint(name: string): EndpointDefinition | undefined`

Gets a registered endpoint.

#### `buildEndpointUrl(name: string, params?: Record<string, string>): string`

Builds an endpoint URL.

```typescript
const url = buildEndpointUrl('products.detail', { id: '456' });
```

#### `isEndpointHealthy(name: string): boolean`

Checks if an endpoint is healthy.

#### `getRuntimeConfigManager(): RuntimeConfigManager`

Gets the runtime config manager.

#### `setRuntimeConfig(overlay: DeepPartial<LibraryConfig>): void`

Sets runtime configuration.

#### `applyRuntimeOverlay(overlay: DeepPartial<LibraryConfig>): void`

Applies a runtime overlay.

#### `rollbackConfig(steps?: number): void`

Rolls back configuration.

#### `startConfigPolling(url: string, interval: Milliseconds): void`

Starts polling for config updates.

#### `stopConfigPolling(): void`

Stops config polling.

#### `getAppConfigBridge(): AppConfigBridge`

Gets the app config bridge.

#### `initLibConfigFromApp(appConfig: unknown): void`

Initializes library config from app config.

```typescript
import { env, TIMING } from '@/config';

initLibConfigFromApp({ env, TIMING });
```

---

### React Hooks

#### `useLibConfig()`

Gets the entire library configuration.

```tsx
function ConfigDisplay() {
  const config = useLibConfig();

  return <div>Timeout: {config.network.defaultTimeout}ms</div>;
}
```

#### `useNetworkConfig()`

Gets network configuration.

```tsx
const networkConfig = useNetworkConfig();
```

#### `useCacheConfig()`

Gets cache configuration.

#### `useAuthConfig()`

Gets auth configuration.

#### `useUIConfig()`

Gets UI configuration.

#### `useVDOMConfig()`

Gets VDOM configuration.

#### `useMonitoringConfig()`

Gets monitoring configuration.

#### `useLibConfigValue<T>(path, defaultValue?)`

Gets a specific config value.

```tsx
function TimeoutDisplay() {
  const timeout = useLibConfigValue('network.defaultTimeout', 30000);

  return <div>Timeout: {timeout}ms</div>;
}
```

#### `useLibConfigState<T>(path, defaultValue?)`

Gets config value as state (triggers re-render on change).

```tsx
const [timeout, setTimeout] = useLibConfigState('network.defaultTimeout', 30000);

setTimeout(45000); // Updates config
```

#### `useRuntimeConfig()`

Gets runtime config manager.

```tsx
const runtime = useRuntimeConfig();

runtime.applyOverlay({ network: { defaultTimeout: 60000 } });
```

#### `useLibConfigSelector<T>(selector)`

Selects a derived value from config.

```tsx
const isProduction = useLibConfigSelector(
  config => config.environment === 'production'
);
```

#### `useEndpoint(name)`

Gets an endpoint definition.

```tsx
function ApiEndpoint({ name }) {
  const endpoint = useEndpoint(name);

  if (!endpoint) return null;

  return (
    <div>
      <p>Path: {endpoint.path}</p>
      <p>Method: {endpoint.method}</p>
      <p>Requires Auth: {endpoint.auth ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

#### `useAllEndpoints()`

Gets all registered endpoints.

```tsx
const endpoints = useAllEndpoints();
```

#### `useEndpointsByTag(tag)`

Gets endpoints by tag.

```tsx
const userEndpoints = useEndpointsByTag('users');
```

#### `useEndpointUrl(name, params?)`

Builds an endpoint URL.

```tsx
function UserLink({ userId }) {
  const url = useEndpointUrl('users.detail', { id: userId });

  return <a href={url}>View User</a>;
}
```

#### `useEndpointUrlBuilder(name)`

Gets a URL builder function.

```tsx
const buildUserUrl = useEndpointUrlBuilder('users.detail');

const url = buildUserUrl({ id: '123' });
```

#### `useEndpointHealth(name)`

Gets endpoint health status.

```tsx
function EndpointStatus({ name }) {
  const health = useEndpointHealth(name);

  if (!health) return null;

  return (
    <div className={health.status}>
      Status: {health.status}
      {health.lastError && <p>Error: {health.lastError.message}</p>}
    </div>
  );
}
```

#### `useIsEndpointHealthy(name)`

Checks if endpoint is healthy.

```tsx
const isHealthy = useIsEndpointHealthy('users.list');
```

#### `useUnhealthyEndpoints()`

Gets all unhealthy endpoints.

```tsx
const unhealthy = useUnhealthyEndpoints();
```

#### `useDegradedEndpoints()`

Gets all degraded endpoints.

#### `useRegisterEndpoint(endpoint)`

Registers an endpoint.

```tsx
useRegisterEndpoint({
  name: 'custom.endpoint',
  path: '/custom',
  method: 'GET',
});
```

---

### Constants

All timing and size constants are exported:

```typescript
// Time units
SECOND = 1000;
MINUTE = 60000;
HOUR = 3600000;

// Network timeouts
DEFAULT_TIMEOUT = 30000;
DEFAULT_LONG_TIMEOUT = 60000;
DEFAULT_SHORT_TIMEOUT = 10000;
DEFAULT_HEALTH_CHECK_TIMEOUT = 5000;
DEFAULT_REMOTE_TIMEOUT = 15000;

// Retry configuration
DEFAULT_RETRY_BASE_DELAY = 1000;
DEFAULT_RETRY_MAX_DELAY = 30000;
DEFAULT_MAX_RETRY_ATTEMPTS = 3;
DEFAULT_MAX_FAILURES = 5;
DEFAULT_JITTER = 0.1;

// Cache TTLs
DEFAULT_CACHE_TTL = 300000;
DEFAULT_SHORT_CACHE_TTL = 60000;
DEFAULT_LONG_CACHE_TTL = 3600000;
DEFAULT_FLAG_CACHE_TTL = 600000;

// Polling intervals
DEFAULT_POLLING_INTERVAL = 30000;
DEFAULT_PING_INTERVAL = 60000;

// Auth timeouts
TOKEN_REFRESH_BUFFER = 300000;
SESSION_TIMEOUT = 3600000;
SESSION_CHECK_INTERVAL = 60000;
DEFAULT_TOKEN_LIFETIME = 3600000;
REFRESH_BUFFER_MS = 300000;

// UI timing
DEFAULT_DEBOUNCE = 300;
DEFAULT_SCROLL_THROTTLE = 100;
DEFAULT_THROTTLE_MS = 100;

// VDOM
DEFAULT_POOL_SIZE = 100;
DEFAULT_GC_INTERVAL = 30000;
DEFAULT_MEMORY_LIMIT = 50 * 1024 * 1024;

// Monitoring
DEFAULT_BATCH_SIZE = 50;
DEFAULT_METRICS_FLUSH_INTERVAL = 30000;
DEFAULT_SLOW_REQUEST_THRESHOLD = 1000;
MAX_ENTRY_AGE_MS = 3600000;
SESSION_WINDOW_GAP_MS = 1800000;
MAX_SESSION_WINDOW_MS = 86400000;

// String constants
STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFS: 'user_preferences',
  // ...
};

HEADER_NAMES = {
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  // ...
};

// Numeric constants
PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  // ...
};

RATE_LIMITS = {
  DEFAULT_PER_MINUTE: 60,
  DEFAULT_PER_HOUR: 1000,
  // ...
};
```

---

## Module: @defendr/enzyme/feature

The feature factory provides a plug-and-play system for modular feature development.

### Import Path

```typescript
import { /* exports */ } from '@defendr/enzyme/feature';
```

---

### Core Types

#### `FeatureMetadata`

Feature metadata.

```typescript
interface FeatureMetadata {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  order?: number;
  version?: string;
}
```

#### `FeatureAccess`

Feature access configuration.

```typescript
interface FeatureAccess {
  requiredRoles?: Role[];
  allowedRoles?: Role[];
  permissions?: string[];
  featureFlag?: string;
  requiredFlags?: string[];
  requireAuth?: boolean;
}
```

#### `FeatureTab`

Feature tab definition.

```typescript
interface FeatureTab {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  disabled?: boolean;
  access?: FeatureAccess;
  badge?: number | string;
}
```

#### `FeatureConfig`

Feature page configuration.

```typescript
interface FeatureConfig {
  metadata: FeatureMetadata;
  access: FeatureAccess;
  tabs?: FeatureTab[];
  defaultTab?: string;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  showBreadcrumbs?: boolean;
  showTitle?: boolean;
  pageMetadata?: {
    title?: string;
    description?: string;
  };
}
```

#### `FeatureViewModel<TData>`

Feature view model base interface.

```typescript
interface FeatureViewModel<TData = unknown> {
  isLoading: boolean;
  error: Error | null;
  data: TData | null;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  refresh: () => void;
}
```

#### `CreateFeatureOptions<TData, TViewModel>`

Feature creation options.

```typescript
interface CreateFeatureOptions<
  TData = unknown,
  TViewModel extends FeatureViewModel<TData> = FeatureViewModel<TData>
> {
  config: FeatureConfig;
  useViewModel: () => TViewModel;
  View: React.ComponentType<FeatureViewProps<TViewModel>>;
  Loading?: React.ComponentType;
  Error?: React.ComponentType<{ error: Error; retry: () => void }>;
}
```

---

### Functions

#### `createFeaturePage<TData, TViewModel>(options)`

Creates a feature page component.

**Parameters:** `CreateFeatureOptions`

**Returns:** `React.ComponentType`

**Example:**

```typescript
import { createFeaturePage } from '@defendr/enzyme/feature';

const DashboardPage = createFeaturePage({
  config: {
    metadata: {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Main dashboard',
      icon: 'dashboard',
      category: 'main',
    },
    access: {
      requireAuth: true,
      allowedRoles: ['user', 'admin'],
    },
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'analytics', label: 'Analytics' },
    ],
  },
  useViewModel: () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const refresh = useCallback(() => {
      setIsLoading(true);
      fetchData()
        .then(setData)
        .catch(setError)
        .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return { data, isLoading, error, refresh };
  },
  View: ({ viewModel }) => (
    <div>
      {viewModel.isLoading && <Spinner />}
      {viewModel.error && <Error error={viewModel.error} />}
      {viewModel.data && <DashboardContent data={viewModel.data} />}
    </div>
  ),
});
```

#### `createLazyFeaturePage(loader)`

Creates a lazy-loaded feature page.

```typescript
const LazyDashboard = createLazyFeaturePage(
  () => import('./features/Dashboard')
);
```

#### `hasFeatureAccess(access, userRoles, enabledFlags)`

Checks if user has access to feature.

```typescript
const canAccess = hasFeatureAccess(
  {
    requireAuth: true,
    allowedRoles: ['admin'],
    featureFlag: 'new_dashboard',
  },
  ['admin'],
  ['new_dashboard']
);
```

---

### Registry Functions

#### `registerFeature(id, entry)`

Registers a feature.

```typescript
registerFeature('dashboard', {
  config: dashboardConfig,
  component: React.lazy(() => import('./Dashboard')),
});
```

#### `unregisterFeature(id)`

Unregisters a feature.

#### `getFeature(id)`

Gets a feature entry.

```typescript
const feature = getFeature('dashboard');
```

#### `getAllFeatures()`

Gets all registered features.

#### `getFeatureIds()`

Gets all feature IDs.

#### `isFeatureRegistered(id)`

Checks if feature is registered.

#### `getFeatureRoutes()`

Gets routes for all features.

```typescript
const routes = getFeatureRoutes();
// [{ path: '/dashboard', element: <Dashboard /> }, ...]
```

#### `getFeatureNavItems()`

Gets navigation items for all features.

```typescript
const navItems = getFeatureNavItems();
// [{ id: 'dashboard', label: 'Dashboard', path: '/dashboard' }, ...]
```

#### `initializeFeatures()`

Initializes feature registry.

#### `clearFeatureRegistry()`

Clears feature registry.

#### `getFeatureCount()`

Gets feature count.

---

### Auto-Registration

#### `autoRegisterFeatures(glob, options?)`

Auto-registers features using import.meta.glob.

```typescript
import { autoRegisterFeatures } from '@defendr/enzyme/feature';

await autoRegisterFeatures(
  import.meta.glob('./features/*/index.tsx')
);
```

#### `registerFeaturesSync(modules)`

Registers features synchronously.

#### `getFeatureRegistrySnapshot()`

Gets registry snapshot.

#### `getFeaturesByCategory(category)`

Gets features by category.

```typescript
const mainFeatures = getFeaturesByCategory('main');
```

#### `initializeFeatureRegistry()`

Initializes feature registry (if not already).

#### `isFeatureRegistryInitialized()`

Checks if registry is initialized.

#### `resetFeatureRegistry()`

Resets feature registry.

#### `waitForFeatureRegistry()`

Waits for registry to be initialized.

```typescript
await waitForFeatureRegistry();
```

---

### Feature Flag Integration

#### `useFeatureVisibility(featureId)`

Gets feature visibility based on flags and access.

```typescript
function FeatureGate({ featureId, children }) {
  const { isVisible, reason } = useFeatureVisibility(featureId);

  if (!isVisible) {
    return <div>Access denied: {reason}</div>;
  }

  return <>{children}</>;
}
```

#### `useAccessibleFeatures()`

Gets all accessible features for current user.

```typescript
const accessibleFeatures = useAccessibleFeatures();
```

#### `useVisibleFeatures()`

Gets all visible features.

#### `useIsFeatureAccessible(featureId)`

Checks if feature is accessible.

```typescript
const canAccessDashboard = useIsFeatureAccessible('dashboard');
```

#### `useIsTabAccessible(featureId, tabId)`

Checks if tab is accessible.

#### `useAccessibleTabs(featureId)`

Gets accessible tabs for a feature.

```typescript
const tabs = useAccessibleTabs('dashboard');
```

#### `useFeatureAccessChecker()`

Gets access checker function.

```typescript
const checkAccess = useFeatureAccessChecker();

if (checkAccess(featureConfig.access)) {
  // Show feature
}
```

#### `useDisabledFeatures()`

Gets all disabled features.

---

### Dependency Injection

#### `FeatureDIContainer`

Dependency injection container for features.

**Methods:**

##### `register<T>(contract, implementation, options?)`

Registers a service.

```typescript
container.register(AnalyticsContract, GoogleAnalytics, {
  singleton: true,
  tags: ['analytics'],
});
```

##### `resolve<T>(contract)`

Resolves a service.

```typescript
const analytics = container.resolve(AnalyticsContract);
```

##### `tryResolve<T>(contract)`

Tries to resolve (returns null if not found).

##### `has(contract)`

Checks if service is registered.

##### `getByTag(tag)`

Gets all services with a tag.

##### `clear()`

Clears all registrations.

#### `getContainer()`

Gets global DI container.

#### `registerService<T>(contract, implementation, options?)`

Registers a service globally.

#### `createServiceContract<T>(name, description?)`

Creates a service contract.

```typescript
const LoggerContract = createServiceContract<Logger>('Logger');
```

#### `<FeatureDIProvider>`

DI provider component.

```tsx
<FeatureDIProvider container={customContainer}>
  <App />
</FeatureDIProvider>
```

#### `useDIContainer()`

Gets DI container from context.

#### `useService<T>(contract)`

Resolves a service in a component.

```tsx
function Analytics() {
  const analytics = useService(AnalyticsContract);

  useEffect(() => {
    analytics.track('page_view');
  }, [analytics]);

  return null;
}
```

#### `useTryService<T>(contract)`

Tries to resolve a service (returns null if not found).

#### `useHasService(contract)`

Checks if service is available.

#### `useServicesByTag(tag)`

Gets services by tag.

---

### Common Service Contracts

```typescript
// Analytics
interface AnalyticsService {
  track(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page(name: string, properties?: Record<string, unknown>): void;
}

const AnalyticsContract = createServiceContract<AnalyticsService>('Analytics');

// Notifications
interface NotificationService {
  success(message: string, options?: NotificationOptions): void;
  error(message: string, options?: NotificationOptions): void;
  info(message: string, options?: NotificationOptions): void;
  warning(message: string, options?: NotificationOptions): void;
}

const NotificationContract = createServiceContract<NotificationService>('Notification');

// Navigation
interface NavigationService {
  navigate(path: string, options?: NavigationOptions): void;
  goBack(): void;
  goForward(): void;
  replace(path: string): void;
}

const NavigationContract = createServiceContract<NavigationService>('Navigation');

// Storage
interface StorageService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

const StorageContract = createServiceContract<StorageService>('Storage');
```

---

### Feature Event Bus

#### `FeatureEventBus`

Event bus for feature communication.

```typescript
interface FeatureEventBus {
  on<T>(event: string, handler: (payload: T) => void): () => void;
  emit<T>(event: string, payload: T): void;
  off(event: string, handler: Function): void;
  clear(): void;
}

const FeatureEventBusContract = createServiceContract<FeatureEventBus>('FeatureEventBus');
```

#### `SimpleFeatureEventBus`

Simple implementation of feature event bus.

#### `useFeatureEventBus()`

Gets feature event bus.

```tsx
function FeatureA() {
  const eventBus = useFeatureEventBus();

  useEffect(() => {
    const unsubscribe = eventBus.on('data:updated', (data) => {
      console.log('Data updated:', data);
    });

    return unsubscribe;
  }, [eventBus]);

  return null;
}
```

#### `useFeatureEvent<T>(event, handler)`

Subscribes to a feature event.

```tsx
useFeatureEvent('data:updated', (data) => {
  console.log('Received:', data);
});
```

---

### Code Splitting

#### `createLazyFeatureComponent(loader, options?)`

Creates a lazy-loaded feature component.

```typescript
const LazyDashboard = createLazyFeatureComponent(
  () => import('./Dashboard'),
  {
    preload: true,
    priority: 'high',
  }
);
```

#### `createResilientLazyComponent(loader, options?)`

Creates a resilient lazy component with retry logic.

#### `FeatureChunkManager`

Manages feature chunks.

**Methods:**

##### `registerChunk(featureId, chunkInfo)`

Registers a chunk.

##### `preloadChunk(featureId)`

Preloads a chunk.

##### `getChunkStatus(featureId)`

Gets chunk status.

#### `featureChunkManager`

Global chunk manager instance.

#### `useFeaturePreload(featureId, trigger?)`

Preloads a feature.

```tsx
function Navigation() {
  // Preload dashboard on hover
  useFeaturePreload('dashboard', 'hover');

  return <NavLink to="/dashboard">Dashboard</NavLink>;
}
```

#### `useFeatureChunkStatus(featureId)`

Gets chunk loading status.

#### `usePreloadOnVisible(featureId, ref)`

Preloads when element is visible.

```tsx
const ref = useRef();
usePreloadOnVisible('dashboard', ref);

<div ref={ref}>...</div>
```

#### `withFeatureSuspense(Component, options?)`

HOC that wraps component in Suspense.

```typescript
const SuspendedDashboard = withFeatureSuspense(Dashboard, {
  fallback: <Loading />,
});
```

#### `generateSplitRoutes(features)`

Generates code-split routes.

```typescript
const routes = generateSplitRoutes([
  { id: 'dashboard', path: '/dashboard', component: () => import('./Dashboard') },
  { id: 'settings', path: '/settings', component: () => import('./Settings') },
]);
```

#### `initializeFeaturePreloading(options?)`

Initializes feature preloading strategy.

---

### Shared Components

#### `<GenericList>`

Generic list component.

```tsx
<GenericList
  items={users}
  renderItem={(user) => <UserCard user={user} />}
  loading={isLoading}
  empty={<Empty message="No users" />}
  pagination={{
    page: 1,
    pageSize: 20,
    total: 100,
    onPageChange: setPage,
  }}
/>
```

#### `<GenericDetail>`

Generic detail view component.

#### `<StatsCard>`

Statistics card component.

```tsx
<StatsCard
  title="Total Users"
  value={1234}
  change={+12}
  icon="users"
/>
```

#### `<ActionToolbar>`

Action toolbar with buttons.

```tsx
<ActionToolbar
  actions={[
    { id: 'new', label: 'New', icon: 'plus', onClick: handleNew },
    { id: 'delete', label: 'Delete', icon: 'trash', onClick: handleDelete, disabled: !selected },
  ]}
/>
```

#### `<FilterPanel>`

Filter panel component.

#### `<Pagination>`

Pagination component.

#### `<SearchInput>`

Search input with debouncing.

```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  placeholder="Search..."
  debounce={300}
/>
```

---

### Testing Utilities

#### `createTestQueryClient()`

Creates a query client for testing.

```typescript
const queryClient = createTestQueryClient();
```

#### `FeatureTestWrapper`

Test wrapper component.

```tsx
<FeatureTestWrapper queryClient={queryClient}>
  <YourComponent />
</FeatureTestWrapper>
```

#### `createFeatureRenderer(options?)`

Creates a feature test renderer.

```typescript
const renderFeature = createFeatureRenderer({
  queryClient,
  initialEntries: ['/dashboard'],
});

const { getByText } = renderFeature(<Dashboard />);
```

#### `createMockFeature(options?)`

Creates a mock feature.

```typescript
const mockFeature = createMockFeature({
  id: 'test-feature',
  name: 'Test Feature',
});
```

#### `createMockFeatures(count, options?)`

Creates multiple mock features.

#### `createMockEntity(schema, overrides?)`

Creates a mock entity.

```typescript
const mockUser = createMockEntity('user', {
  name: 'John Doe',
  email: 'john@example.com',
});
```

#### `createMockEntities(schema, count, overrides?)`

Creates multiple mock entities.

#### `createMockApiResponse<T>(data, options?)`

Creates a mock API response.

#### `createMockService<T>(implementation)`

Creates a mock service.

#### `createMockQueryData<T>(data, options?)`

Creates mock query data.

#### `createMockMutationResult<T>(options?)`

Creates mock mutation result.

#### `createFeatureTestFixture(featureId, options?)`

Creates a test fixture.

```typescript
const fixture = createFeatureTestFixture('dashboard', {
  user: mockUser,
  data: mockData,
});
```

#### `seedQueryCache(queryClient, data)`

Seeds query cache with data.

#### `assertQueryCache(queryClient, key, expected)`

Asserts query cache contents.

#### `clearQueryCache(queryClient)`

Clears query cache.

#### `waitForQueries(queryClient, keys?)`

Waits for queries to settle.

#### `createFeatureSnapshot(component)`

Creates a snapshot for testing.

#### `compareSnapshots(snapshot1, snapshot2)`

Compares snapshots.

#### `waitFor(condition, options?)`

Waits for a condition.

```typescript
await waitFor(() => getByText('Loaded'), { timeout: 5000 });
```

#### `delay(ms)`

Delays execution.

```typescript
await delay(1000);
```

#### `generateId()`

Generates a unique ID.

#### `generateDate(offset?)`

Generates a date.

#### `testData`

Test data generators.

```typescript
const user = testData.user();
const users = testData.users(10);
```

---

## Module: @defendr/enzyme/hooks

Production-ready custom hooks for common patterns.

### Import Path

```typescript
import { /* exports */ } from '@defendr/enzyme/hooks';
```

---

### Shared Utilities

#### `useIsMounted()`

Tracks mounted state.

```tsx
function Component() {
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchData().then(data => {
      if (isMounted()) {
        setData(data);
      }
    });
  }, [isMounted]);
}
```

#### `useMountedState()`

Returns a setter that only works when mounted.

```tsx
const setStateSafe = useMountedState();

// Only sets state if component is still mounted
setStateSafe(newValue);
```

#### `useLatestRef<T>(value)`

Keeps a ref with the latest value.

```tsx
const latestCallback = useLatestRef(callback);

// latestCallback.current always has the latest callback
```

#### `useLatestCallback<T>(callback)`

Creates a stable callback that uses latest values.

```tsx
const handleClick = useLatestCallback(() => {
  // Always uses latest state/props
  console.log(count);
});
```

#### `useLatestRefs(values)`

Creates latest refs for multiple values.

```tsx
const refs = useLatestRefs({ count, user, settings });

// refs.count.current, refs.user.current, etc.
```

---

### Network Utilities

#### `getNetworkInfo()`

Gets current network information.

```typescript
const info = getNetworkInfo();
// { type: '4g', downlink: 10, rtt: 50, effectiveType: '4g', saveData: false }
```

#### `meetsMinimumQuality(threshold)`

Checks if network meets minimum quality.

```typescript
if (meetsMinimumQuality('3g')) {
  // Network is 3g or better
}
```

#### `shouldAllowPrefetch()`

Checks if prefetching should be allowed.

```typescript
if (shouldAllowPrefetch()) {
  prefetchData();
}
```

#### `monitorNetworkQuality(callback)`

Monitors network quality changes.

```typescript
const unsubscribe = monitorNetworkQuality((info) => {
  console.log('Network changed:', info);
});
```

#### `isSlowConnection()`

Checks if connection is slow.

#### `getConnectionQualityLabel()`

Gets human-readable connection quality.

```typescript
const quality = getConnectionQualityLabel();
// 'Excellent', 'Good', 'Fair', 'Poor'
```

---

### Buffering Utilities

#### `useBuffer<T>(options)`

Generic buffering hook.

```tsx
const { add, flush, items } = useBuffer<LogEntry>({
  maxSize: 100,
  flushInterval: 5000,
  onFlush: (items) => sendLogs(items),
});

add({ level: 'info', message: 'Test' });
```

#### `useTimeWindowBuffer<T>(windowMs, callback)`

Time-based buffering.

```tsx
const addEvent = useTimeWindowBuffer(1000, (events) => {
  sendEvents(events);
});

addEvent({ type: 'click', target: 'button' });
```

#### `useBatchBuffer<T>(batchSize, callback)`

Size-based buffering.

```tsx
const addItem = useBatchBuffer(50, (batch) => {
  processBatch(batch);
});
```

---

### Theme Hooks

#### `useTheme()`

Gets current theme and theme utilities.

```tsx
function ThemedComponent() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <div className={theme}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

**Returns:**

```typescript
interface UseThemeReturn {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  systemPreference: 'light' | 'dark';
}
```

#### `useSystemThemePreference()`

Gets system theme preference.

```tsx
const systemTheme = useSystemThemePreference();
```

---

### Route Prefetch Hooks

#### `usePrefetchRoute(route, options?)`

Prefetches a route.

```tsx
function Navigation() {
  usePrefetchRoute('/dashboard', {
    trigger: 'hover',
    delay: 100,
  });

  return <Link to="/dashboard">Dashboard</Link>;
}
```

#### `usePrefetchOnHover(route, ref?, options?)`

Prefetches on hover.

```tsx
const linkRef = useRef();
usePrefetchOnHover('/dashboard', linkRef);

<a ref={linkRef} href="/dashboard">Dashboard</a>
```

---

### Global Store Hooks

#### `useGlobalStore(selector?)`

Accesses global store.

```tsx
const user = useGlobalStore(state => state.user);
```

#### `useGlobalStoreMultiple(selectors)`

Selects multiple values.

```tsx
const { user, settings } = useGlobalStoreMultiple({
  user: state => state.user,
  settings: state => state.settings,
});
```

#### `useGlobalStoreComputed(compute, deps)`

Computes derived value.

```tsx
const fullName = useGlobalStoreComputed(
  (state) => `${state.user.firstName} ${state.user.lastName}`,
  []
);
```

#### `useGlobalStoreActions()`

Gets store actions.

```tsx
const { setUser, updateSettings } = useGlobalStoreActions();
```

#### `useStoreHydrated()`

Checks if store is hydrated.

```tsx
const isHydrated = useStoreHydrated();
```

#### `createSliceHook(selector)`

Creates a slice hook.

```typescript
const useUser = createSliceHook(state => state.user);

// In components
const user = useUser();
```

#### `createActionHook(actionName)`

Creates an action hook.

```typescript
const useSetUser = createActionHook('setUser');

// In components
const setUser = useSetUser();
```

#### `useGlobalStoreSubscription(selector, callback)`

Subscribes to store changes.

```tsx
useGlobalStoreSubscription(
  state => state.count,
  (count) => console.log('Count changed:', count)
);
```

#### `globalSelectors`

Pre-defined selectors.

```typescript
const {
  selectUser,
  selectSettings,
  selectTheme,
  // ...
} = globalSelectors;
```

#### `useIsSidebarOpen()`

Checks if sidebar is open.

#### `useCurrentUser()`

Gets current user.

#### `useIsAuthenticated()`

Checks if user is authenticated.

#### `useUnreadNotificationCount()`

Gets unread notification count.

---

### Debounce Hooks

#### `useDebouncedValue<T>(value, delay, options?)`

Debounces a value.

```tsx
function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

#### `useDebouncedCallback(callback, delay, options?)`

Debounces a callback.

```tsx
const debouncedSave = useDebouncedCallback(
  (data) => save(data),
  1000,
  { leading: false, trailing: true }
);

<input onChange={e => debouncedSave(e.target.value)} />
```

#### `useThrottledValue<T>(value, delay)`

Throttles a value.

```tsx
const throttledScroll = useThrottledValue(scrollY, 100);
```

---

### Resource Cleanup Hooks

#### `useDisposable(create, deps)`

Creates a disposable resource.

```tsx
useDisposable(
  () => {
    const subscription = eventBus.subscribe('event', handler);
    return () => subscription.unsubscribe();
  },
  []
);
```

#### `useAbortController(deps?)`

Creates an AbortController.

```tsx
const abortController = useAbortController([query]);

fetch('/api/data', { signal: abortController.signal });
```

#### `useTimeout(callback, delay)`

Sets a timeout.

```tsx
useTimeout(() => {
  console.log('5 seconds passed');
}, 5000);
```

#### `useInterval(callback, delay)`

Sets an interval.

```tsx
useInterval(() => {
  fetchLatestData();
}, 30000);
```

#### `useEventListener(target, event, handler, options?)`

Adds an event listener.

```tsx
useEventListener(window, 'resize', handleResize);
```

#### `useSubscription(subscribe, deps)`

Manages a subscription.

```tsx
useSubscription(
  () => eventBus.on('event', handler),
  [handler]
);
```

#### `useUnmountEffect(callback)`

Runs effect only on unmount.

```tsx
useUnmountEffect(() => {
  cleanup();
});
```

#### `useMounted()`

Alternative to useIsMounted.

#### `useSafeState(initialState)`

State that only updates when mounted.

```tsx
const [data, setData] = useSafeState(null);

// Won't update if unmounted
fetchData().then(setData);
```

#### `useRefCleanup(cleanup)`

Cleans up a ref.

```tsx
const elementRef = useRefCleanup<HTMLElement>((element) => {
  // Cleanup when ref changes or unmounts
});
```

#### `useWebSocketCleanup(url, options?)`

Manages WebSocket with cleanup.

```tsx
const ws = useWebSocketCleanup('wss://example.com');
```

#### `useAsync(asyncFn, deps)`

Manages async operation.

```tsx
const { data, loading, error, execute } = useAsync(
  () => fetchData(id),
  [id]
);
```

---

### Network Status Hooks

#### `useOnlineStatus()`

Tracks online/offline status.

```tsx
const isOnline = useOnlineStatus();

if (!isOnline) {
  return <div>You are offline</div>;
}
```

#### `useNetworkStatus()`

Gets detailed network status.

```tsx
const { isOnline, type, downlink, effectiveType } = useNetworkStatus();
```

#### `useNetworkQuality()`

Gets network quality assessment.

```tsx
const { quality, label, shouldReduceData } = useNetworkQuality();
```

#### `useNetworkSuggestions()`

Gets network-based suggestions.

```tsx
const { suggestPrefetch, suggestQuality } = useNetworkSuggestions();

if (suggestPrefetch) {
  prefetchNextPage();
}
```

#### `useSlowConnection()`

Detects slow connection.

```tsx
const isSlow = useSlowConnection();

if (isSlow) {
  return <LowQualityImage />;
}
```

#### `useOfflineFallback(content, fallback, options?)`

Renders fallback when offline.

```tsx
const content = useOfflineFallback(
  <OnlineContent />,
  <OfflineContent />
);
```

#### `useOnReconnect(callback)`

Runs callback on reconnect.

```tsx
useOnReconnect(() => {
  refetch();
});
```

#### `useWaitForOnline()`

Waits for online status.

```tsx
const waitForOnline = useWaitForOnline();

await waitForOnline();
// Now online, proceed
```

#### `useNetworkAwareFetch(url, options?)`

Fetch with network awareness.

```tsx
const { data, loading, error } = useNetworkAwareFetch('/api/data', {
  skipIfOffline: true,
  lowQualityWhenSlow: true,
});
```

#### `useOfflineIndicator()`

Shows offline indicator.

```tsx
const showIndicator = useOfflineIndicator();

{showIndicator && <OfflineBanner />}
```

#### `useConnectionTracker()`

Tracks connection history.

```tsx
const { history, averageDownlink, recentDisconnects } = useConnectionTracker();
```

---

### Analytics Hooks

#### `usePageView(pageName?, properties?)`

Tracks page view.

```tsx
usePageView('Dashboard', { category: 'main' });
```

#### `useTrackEvent(eventName, properties?, options?)`

Gets event tracking function.

```tsx
const trackClick = useTrackEvent('button_click');

<button onClick={() => trackClick({ button: 'submit' })}>
  Submit
</button>
```

#### `useTrackFeature(featureName, options?)`

Tracks feature usage.

```tsx
useTrackFeature('new_dashboard');
```

#### `useTrackRenderPerformance(componentName)`

Tracks render performance.

```tsx
useTrackRenderPerformance('Dashboard');
```

#### `useTrackInteractionTiming(eventName)`

Tracks interaction timing.

```tsx
const trackInteraction = useTrackInteractionTiming('form_submit');

const handleSubmit = async () => {
  const end = trackInteraction();
  await submit();
  end();
};
```

#### `useTrackForm(formName, options?)`

Tracks form interactions.

```tsx
const { trackFieldChange, trackSubmit, trackError } = useTrackForm('login');
```

#### `useTrackClick(elementName, properties?)`

Tracks clicks.

```tsx
const handleClick = useTrackClick('cta_button');

<button onClick={handleClick}>Click Me</button>
```

#### `useAnalyticsConsent()`

Manages analytics consent.

```tsx
const { hasConsent, grantConsent, revokeConsent } = useAnalyticsConsent();
```

#### `useAnalyticsIdentify(userId?, traits?)`

Identifies user.

```tsx
useAnalyticsIdentify(user.id, {
  email: user.email,
  plan: user.plan,
});
```

#### `useAnalyticsReset()`

Resets analytics.

```tsx
const reset = useAnalyticsReset();

// On logout
reset();
```

#### `useTrackSearch(searchContext)`

Tracks search.

```tsx
const trackSearch = useTrackSearch('products');

trackSearch({
  query: 'laptop',
  results: 42,
  filters: { category: 'electronics' },
});
```

#### `useTrackScrollDepth(threshold?)`

Tracks scroll depth.

```tsx
useTrackScrollDepth([25, 50, 75, 100]);
```

#### `useTrackTimeOnPage()`

Tracks time on page.

```tsx
useTrackTimeOnPage();
```

#### `useTrackedSection(sectionName)`

Tracks section visibility.

```tsx
const ref = useTrackedSection('hero');

<section ref={ref}>...</section>
```

---

### Smart Prefetch Hooks

#### `useSmartPrefetch(targets, options?)`

Smart prefetching with network awareness.

```tsx
useSmartPrefetch([
  { url: '/api/dashboard', priority: 'high' },
  { url: '/api/notifications', priority: 'low' },
], {
  respectDataSaver: true,
  minConnectionQuality: '3g',
});
```

#### `createPrefetchConfig(options)`

Creates prefetch configuration.

```typescript
const config = createPrefetchConfig({
  strategy: 'idle',
  maxConcurrent: 3,
});
```

---

### Error Recovery Hooks

#### `useAsyncWithRecovery(asyncFn, options?)`

Async operation with automatic recovery.

```tsx
const { execute, data, loading, error, retry } = useAsyncWithRecovery(
  () => fetchData(),
  {
    retries: 3,
    retryDelay: 1000,
    onError: (error) => console.error(error),
  }
);
```

#### `useNetworkAwareOperation(operation, options?)`

Operation that adapts to network.

```tsx
const { execute, ...state } = useNetworkAwareOperation(
  () => uploadFile(file),
  {
    skipIfOffline: true,
    lowQualityIfSlow: true,
  }
);
```

#### `useOptimisticUpdate(mutationFn, options?)`

Optimistic updates with rollback.

```tsx
const { mutate, rollback } = useOptimisticUpdate(
  (newData) => api.update(newData),
  {
    optimisticData: { status: 'saving' },
    onError: (error) => rollback(),
  }
);
```

#### `useSafeCallback(callback, deps)`

Callback that won't crash on error.

```tsx
const handleClick = useSafeCallback(
  () => {
    // Errors are caught and logged
    riskyOperation();
  },
  [riskyOperation]
);
```

#### `useErrorToast()`

Shows error toasts.

```tsx
const { showError, dismiss } = useErrorToast();

try {
  await save();
} catch (error) {
  showError(error);
}
```

#### `useRecoveryState()`

Manages recovery state.

```tsx
const { isRecovering, startRecovery, completeRecovery } = useRecoveryState();
```

#### `useErrorContext()`

Gets error context.

```tsx
const { errors, clearError, clearAllErrors } = useErrorContext();
```

---

### Accessibility Hooks

#### `useScreenReaderAnnounce(message?, priority?)`

Announces to screen readers.

```tsx
const announce = useScreenReaderAnnounce();

announce('Form submitted successfully', 'polite');
```

#### `announceToScreenReader(message, priority?)`

Direct announcement function.

```typescript
announceToScreenReader('Loading complete', 'assertive');
```

#### `<ScreenReaderAnnouncementRegion>`

ARIA live region component.

```tsx
<ScreenReaderAnnouncementRegion />
```

#### `useKeyboardShortcuts(shortcuts, options?)`

Manages keyboard shortcuts.

```tsx
useKeyboardShortcuts([
  {
    key: 'ctrl+s',
    description: 'Save',
    handler: () => save(),
  },
  {
    key: 'ctrl+k',
    description: 'Search',
    handler: () => openSearch(),
  },
], {
  enabled: true,
  preventDefault: true,
});
```

#### `formatKeyCombo(combo)`

Formats key combination.

```typescript
const formatted = formatKeyCombo('ctrl+shift+s');
// 'Ctrl+Shift+S' (platform-aware)
```

#### `<KeyboardShortcutsHelp>`

Shows keyboard shortcuts help.

```tsx
<KeyboardShortcutsHelp
  shortcuts={shortcuts}
  title="Keyboard Shortcuts"
/>
```

---

## Complete Usage Example

Here's a comprehensive example showing how to use multiple modules together:

```tsx
import React, { useEffect } from 'react';
import {
  ModuleProvider,
  ModuleBoundary,
  ModuleSlot,
  useModule,
  useModuleState,
  useModuleHydration,
  useSecureModule,
  HydrationPriority,
  HydrationTrigger,
} from '@defendr/enzyme/vdom';

import {
  useLibConfig,
  useEndpointUrl,
  registerEndpoint,
} from '@defendr/enzyme/core';

import {
  createFeaturePage,
  useFeatureVisibility,
  useService,
  AnalyticsContract,
} from '@defendr/enzyme/feature';

import {
  useOnlineStatus,
  useDeboun cedValue,
  useTrackEvent,
  useKeyboardShortcuts,
} from '@defendr/enzyme/hooks';

// Register API endpoint
registerEndpoint({
  name: 'dashboard.data',
  path: '/api/dashboard',
  method: 'GET',
  auth: true,
  cache: {
    strategy: 'stale-while-revalidate',
    ttl: 60000,
  },
});

// Dashboard feature component
function DashboardFeature() {
  const { moduleId, emit } = useModule();
  const { state: filters, setState: setFilters } = useModuleState('filters', {
    initialValue: { search: '', category: 'all' },
  });
  const { isHydrated } = useModuleHydration();
  const { sanitize } = useSecureModule();
  const isOnline = useOnlineStatus();
  const config = useLibConfig();
  const apiUrl = useEndpointUrl('dashboard.data');
  const analytics = useService(AnalyticsContract);
  const trackClick = useTrackEvent('dashboard_click');
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'ctrl+k',
      description: 'Open search',
      handler: () => {
        // Focus search
        document.getElementById('search')?.focus();
      },
    },
  ]);

  useEffect(() => {
    if (isHydrated && debouncedSearch) {
      analytics.track('search', { query: debouncedSearch });
    }
  }, [isHydrated, debouncedSearch, analytics]);

  if (!isOnline) {
    return <div>You are offline</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <input
        id="search"
        type="text"
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        placeholder="Search..."
      />

      <ModuleSlot name="header" />

      <div>
        <p>Module: {moduleId}</p>
        <p>Timeout: {config.network.defaultTimeout}ms</p>
        <p>API: {apiUrl}</p>
      </div>

      <button
        onClick={() => {
          trackClick({ action: 'refresh' });
          emit('dashboard:refresh', {});
        }}
      >
        Refresh
      </button>

      <ModuleSlot name="content" required />
    </div>
  );
}

// Create feature page
const DashboardPage = createFeaturePage({
  config: {
    metadata: {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Main dashboard',
      category: 'main',
    },
    access: {
      requireAuth: true,
      allowedRoles: ['user', 'admin'],
    },
  },
  useViewModel: () => {
    const [data, setData] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    const refresh = React.useCallback(() => {
      setIsLoading(true);
      fetch('/api/dashboard')
        .then(res => res.json())
        .then(setData)
        .catch(setError)
        .finally(() => setIsLoading(false));
    }, []);

    React.useEffect(() => { refresh(); }, [refresh]);

    return { data, isLoading, error, refresh };
  },
  View: ({ viewModel }) => <DashboardFeature />,
});

// App root
function App() {
  return (
    <ModuleProvider
      config={{
        devMode: process.env.NODE_ENV === 'development',
        enableTelemetry: true,
        performanceBudget: {
          maxRenderTime: 16,
          maxInitTime: 100,
        },
      }}
    >
      <ModuleBoundary
        id="app"
        name="Application"
        hydration={{
          priority: HydrationPriority.CRITICAL,
          trigger: HydrationTrigger.IMMEDIATE,
        }}
      >
        <DashboardPage />
      </ModuleBoundary>
    </ModuleProvider>
  );
}

export default App;
```

---

## Best Practices

### VDOM Module

1. **Always use ModuleProvider at root**: Wrap your app in `<ModuleProvider>` to initialize the system
2. **Define clear module boundaries**: Use `<ModuleBoundary>` to create isolated module contexts
3. **Leverage object pooling**: The VDOM pool automatically manages memory - use it for large lists
4. **Implement proper hydration**: Configure hydration triggers based on visibility and priority
5. **Secure user content**: Always use `useSecureModule` when rendering user-provided content
6. **Monitor performance**: Use performance budgets to catch regressions early

### Core Module

1. **Centralize configuration**: Use the config registry instead of scattered constants
2. **Register endpoints**: Register all API endpoints for type-safe URL building
3. **Use hooks in components**: Prefer `useLibConfig()` over direct imports in React components
4. **Monitor endpoint health**: Track endpoint health to implement circuit breakers
5. **Runtime updates**: Use runtime config for A/B testing and feature flags

### Feature Module

1. **Use createFeaturePage**: Leverage the feature factory for consistent structure
2. **Implement access control**: Always define `FeatureAccess` for security
3. **Code split features**: Use lazy loading to reduce initial bundle size
4. **DI for services**: Use dependency injection for testability
5. **Share components**: Use shared components for consistency

### Hooks Module

1. **Clean up resources**: Use cleanup hooks (`useDisposable`, `useAbortController`) to prevent memory leaks
2. **Network awareness**: Use network hooks to provide better offline/slow connection experiences
3. **Track analytics**: Use analytics hooks consistently across features
4. **Accessibility first**: Use keyboard and screen reader hooks for inclusive UX
5. **Debounce user input**: Always debounce search and filter inputs

---

## Migration Guide

### From Plain React

```tsx
// Before
function MyComponent() {
  const [data, setData] = useState(null);

  return <div>{data}</div>;
}

// After
function MyComponent() {
  const { state, setState } = useModuleState('data', {
    initialValue: null,
  });

  return (
    <ModuleBoundary id="my-component" name="My Component">
      <div>{state}</div>
    </ModuleBoundary>
  );
}
```

### From Global Constants

```tsx
// Before
const API_TIMEOUT = 30000;

fetch(url, { timeout: API_TIMEOUT });

// After
import { useLibConfig } from '@defendr/enzyme/core';

const config = useLibConfig();
fetch(url, { timeout: config.network.defaultTimeout });
```

### From Manual Features

```tsx
// Before
const DashboardRoute = {
  path: '/dashboard',
  component: Dashboard,
};

// After
const DashboardPage = createFeaturePage({
  config: {
    metadata: { id: 'dashboard', name: 'Dashboard' },
    access: { requireAuth: true },
  },
  useViewModel: useDashboardViewModel,
  View: DashboardView,
});
```

---

## Performance Considerations

1. **VDOM Pool**: Initial size 100, max 10,000 nodes. Tune based on your app's needs.
2. **Hydration**: Use `HydrationTrigger.VISIBLE` for below-fold content to improve TTI.
3. **Code Splitting**: Features are auto-split. Use prefetch hints for predicted navigation.
4. **Event Bus**: Events are processed by priority. Use `EventPriority.LOW` for non-critical events.
5. **Module Loading**: Maximum 6 concurrent loads. Queue is priority-based.
6. **Security Sandbox**: Sanitization has overhead. Cache sanitized content when possible.

---

## Security Considerations

1. **Content Sanitization**: All user content MUST go through `useSecureModule().sanitize()`
2. **CSP Integration**: Configure CSP directives in `ModuleSecurityConfig`
3. **Event Validation**: Whitelist allowed cross-module events
4. **Hydration Security**: Always enable `sanitizeHydration` for SSR
5. **Origin Validation**: Enable `validateOrigins` in production
6. **Message Size Limits**: Default 1MB max. Adjust based on requirements.

---

## Troubleshooting

### Module won't mount

```
Error: Cannot mount module in state: initialized
```

**Solution**: Module must be initialized before mounting. Call `await module.initialize()` first.

### Hydration mismatch

```
Warning: Hydration mismatch detected
```

**Solution**: Ensure server-rendered HTML matches client hydration. Use `useHydrationGuard()`.

### Security violation

```
[Security Violation] XSS: Dangerous content detected
```

**Solution**: Content blocked by security sandbox. Use `sanitize()` before rendering.

### Memory leak detected

```
Warning: Pool utilization exceeds 90%
```

**Solution**: Nodes not being released. Ensure `releaseNode()` is called or increase pool size.

### Configuration not found

```
Error: useLibConfig must be used within a ModuleProvider
```

**Solution**: Wrap your app in `<ModuleProvider>`.

---

## API Reference Summary

### Module Exports

| Module | Classes | Hooks | Components | Utilities |
|--------|---------|-------|------------|-----------|
| vdom | 7 | 40+ | 8 | 20+ |
| core | 3 | 25+ | 0 | 15+ |
| feature | 2 | 15+ | 7 | 30+ |
| hooks | 0 | 50+ | 2 | 10+ |

**Total**: 12 Classes, 130+ Hooks, 17 Components, 75+ Utility Functions

---

## Support

For issues, questions, or contributions:
- GitHub: https://github.com/harborgrid/enzyme
- Documentation: https://enzyme.defendr.ai
- Support: support@harborgrid.com

---

**End of Documentation**
