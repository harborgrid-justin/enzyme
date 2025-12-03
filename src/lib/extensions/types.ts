/**
 * @file Extension System Types
 * @description Prisma-inspired type-safe extension system for Enzyme Library
 *
 * Key patterns implemented:
 * - Prisma: $extends API with immutable composition
 * - axios: Interceptor chains with priority-based execution
 * - socket.io: Middleware chains with async/await
 * - React: Hook-compatible design for useExtension/useExtensionManager
 *
 * @module lib/extensions/types
 */

import type { Brand } from '../shared/type-utils.js';

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * Unique extension identifier
 * Prevents mixing different extension types (compile-time safety)
 */
export type ExtensionId = Brand<string, 'ExtensionId'>;

/**
 * Unique hook identifier
 */
export type HookId = Brand<string, 'HookId'>;

/**
 * Unique component extension identifier
 */
export type ComponentExtensionId = Brand<string, 'ComponentExtensionId'>;

/**
 * Type-safe extension ID constructor
 */
export function createExtensionId(id: string): ExtensionId {
  if (!id || id.length < 1) {
    throw new TypeError('Invalid extension ID: must be a non-empty string');
  }
  return id as ExtensionId;
}

/**
 * Type-safe hook ID constructor
 */
export function createHookId(id: string): HookId {
  if (!id || id.length < 1) {
    throw new TypeError('Invalid hook ID: must be a non-empty string');
  }
  return id as HookId;
}

// ============================================================================
// Extension Lifecycle Hooks
// ============================================================================

/**
 * Extension priority for execution order
 * Higher priority extensions execute first
 */
export type ExtensionPriority = number;

/**
 * Default priority values
 */
export const ExtensionPriorities = {
  CRITICAL: 1000,
  HIGH: 500,
  NORMAL: 0,
  LOW: -500,
  LOWEST: -1000,
} as const;

/**
 * Context provided to onInit hook
 */
export interface InitContext {
  /** Extension name */
  extensionName: string;
  /** Configuration passed to the client */
  config: Record<string, unknown>;
  /** Timestamp when initialized */
  timestamp: number;
}

/**
 * Context provided to onMount hook (React lifecycle)
 */
export interface MountContext {
  /** Extension name */
  extensionName: string;
  /** Component or module being mounted */
  component?: string;
  /** Mount-specific data */
  data?: Record<string, unknown>;
  /** Timestamp when mounted */
  timestamp: number;
}

/**
 * Context provided to onUnmount hook (React lifecycle)
 */
export interface UnmountContext {
  /** Extension name */
  extensionName: string;
  /** Component or module being unmounted */
  component?: string;
  /** Cleanup-specific data */
  data?: Record<string, unknown>;
  /** Timestamp when unmounted */
  timestamp: number;
}

/**
 * Context provided to onError hook
 */
export interface ErrorContext {
  /** Extension name where error occurred */
  extensionName: string;
  /** Hook name where error occurred */
  hookName: string;
  /** The error that was thrown */
  error: Error;
  /** Operation that was being performed */
  operation: string;
  /** Retry the failed operation */
  retry: () => Promise<void>;
  /** Timestamp when error occurred */
  timestamp: number;
}

/**
 * Context provided to beforeOperation hook
 */
export interface BeforeOperationContext<TArgs = unknown> {
  /** Extension name */
  extensionName: string;
  /** Operation name (e.g., 'fetch', 'mutate', 'render') */
  operation: string;
  /** Operation arguments (mutable) */
  args: TArgs;
  /** Modify arguments before execution */
  modify: (changes: Partial<TArgs>) => void;
  /** Cancel the operation */
  cancel: () => void;
  /** Operation metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
}

/**
 * Context provided to afterOperation hook
 */
export interface AfterOperationContext<TArgs = unknown, TResult = unknown> {
  /** Extension name */
  extensionName: string;
  /** Operation name */
  operation: string;
  /** Original operation arguments */
  args: TArgs;
  /** Operation result (mutable) */
  result: TResult;
  /** Modify result before returning */
  modify: (changes: Partial<TResult>) => void;
  /** Operation duration in ms */
  duration: number;
  /** Operation metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
}

/**
 * Extension lifecycle hook function types
 */
export type InitHook = (context: InitContext) => Promise<void> | void;
export type MountHook = (context: MountContext) => Promise<void> | void;
export type UnmountHook = (context: UnmountContext) => Promise<void> | void;
export type ErrorHook = (context: ErrorContext) => Promise<void> | void;
export type BeforeOperationHook<TArgs = unknown> = (
  context: BeforeOperationContext<TArgs>
) => Promise<void> | void;
export type AfterOperationHook<TArgs = unknown, TResult = unknown> = (
  context: AfterOperationContext<TArgs, TResult>
) => Promise<void> | void;

/**
 * Lifecycle hooks configuration
 */
export interface LifecycleHooks {
  /** Called when extension is registered */
  onInit?: InitHook;
  /** Called when component/module mounts (React lifecycle) */
  onMount?: MountHook;
  /** Called when component/module unmounts (React lifecycle) */
  onUnmount?: UnmountHook;
  /** Called when an error occurs in any hook */
  onError?: ErrorHook;
  /** Called before any operation (middleware pattern) */
  beforeOperation?: BeforeOperationHook;
  /** Called after any operation (middleware pattern) */
  afterOperation?: AfterOperationHook;
}

// ============================================================================
// Component Extensions
// ============================================================================

/**
 * Component enhancer function type
 * Used to wrap or enhance React components
 */
export type ComponentEnhancer<TProps = unknown> = (
  Component: React.ComponentType<TProps>
) => React.ComponentType<TProps>;

/**
 * Component hook type
 * Custom hooks provided by extensions
 */
export type ComponentHook<TResult = unknown> = (...args: unknown[]) => TResult;

/**
 * Component extensions configuration
 */
export interface ComponentExtensions {
  /** Component enhancers (HOCs) */
  enhancers?: Record<string, ComponentEnhancer>;
  /** Custom React hooks */
  hooks?: Record<string, ComponentHook>;
  /** Component-level utilities */
  utils?: Record<string, (...args: unknown[]) => unknown>;
}

// ============================================================================
// State Extensions
// ============================================================================

/**
 * State selector function type
 */
export type StateSelector<TState = unknown, TResult = unknown> = (
  state: TState
) => TResult;

/**
 * State action creator type
 */
export type StateActionCreator<TPayload = unknown> = (
  payload: TPayload
) => { type: string; payload: TPayload };

/**
 * State middleware function type
 */
export type StateMiddleware<TState = unknown> = (
  state: TState,
  action: { type: string; payload?: unknown }
) => TState;

/**
 * State extensions configuration
 */
export interface StateExtensions {
  /** State selectors */
  selectors?: Record<string, StateSelector>;
  /** Action creators */
  actions?: Record<string, StateActionCreator>;
  /** State middleware */
  middleware?: StateMiddleware[];
  /** Initial state contributions */
  initialState?: Record<string, unknown>;
}

// ============================================================================
// API Extensions
// ============================================================================

/**
 * API endpoint definition
 */
export interface ApiEndpoint<TArgs = unknown, TResult = unknown> {
  /** HTTP method or operation type */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | string;
  /** Endpoint path or operation name */
  path?: string;
  /** Endpoint handler */
  handler: (args: TArgs) => Promise<TResult> | TResult;
  /** Request transformer */
  transformRequest?: (args: TArgs) => unknown;
  /** Response transformer */
  transformResponse?: (response: unknown) => TResult;
  /** Error transformer */
  transformError?: (error: unknown) => Error;
}

/**
 * API interceptor for request/response modification
 */
export interface ApiInterceptor {
  /** Request interceptor */
  request?: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
  /** Response interceptor */
  response?: <T>(response: T) => Promise<T> | T;
  /** Error interceptor */
  error?: (error: Error) => Promise<never> | never;
}

/**
 * Request configuration
 */
export interface RequestConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

/**
 * API extensions configuration
 */
export interface ApiExtensions {
  /** Custom API endpoints */
  endpoints?: Record<string, ApiEndpoint>;
  /** Request/response interceptors */
  interceptors?: ApiInterceptor[];
  /** API-level utilities */
  utils?: Record<string, (...args: unknown[]) => unknown>;
}

// ============================================================================
// Main Extension Interface
// ============================================================================

/**
 * Complete Enzyme Extension definition
 * Inspired by Prisma's extension architecture
 *
 * @example
 * ```ts
 * const loggingExtension: EnzymeExtension = {
 *   name: 'logging',
 *   version: '1.0.0',
 *   description: 'Logs all operations',
 *   priority: ExtensionPriorities.HIGH,
 *   hooks: {
 *     beforeOperation: async (ctx) => {
 *       console.log(`[${ctx.operation}] Starting...`);
 *     },
 *     afterOperation: async (ctx) => {
 *       console.log(`[${ctx.operation}] Completed in ${ctx.duration}ms`);
 *     },
 *   },
 * };
 * ```
 */
export interface EnzymeExtension {
  /** Extension name (required, must be unique) */
  name: string;

  /** Extension version (semver recommended) */
  version?: string;

  /** Extension description */
  description?: string;

  /** Execution priority (higher = earlier execution) */
  priority?: ExtensionPriority;

  /** Lifecycle hooks */
  hooks?: LifecycleHooks;

  /** Component-level extensions */
  component?: ComponentExtensions;

  /** State management extensions */
  state?: StateExtensions;

  /** API/network extensions */
  api?: ApiExtensions;

  /** Client-level methods and utilities */
  client?: Record<string, (...args: unknown[]) => unknown>;

  /** Extension metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Extension Manager Interface
// ============================================================================

/**
 * Extension manager interface
 */
export interface IExtensionManager {
  /** Register an extension */
  register(extension: EnzymeExtension): void;

  /** Unregister an extension by name */
  unregister(name: string): boolean;

  /** Get all registered extensions */
  getExtensions(): EnzymeExtension[];

  /** Get extension by name */
  getExtension(name: string): EnzymeExtension | undefined;

  /** Check if extension is registered */
  hasExtension(name: string): boolean;

  /** Get extension count */
  readonly count: number;

  /** Execute lifecycle hooks */
  executeHooks<T = void>(
    hookName: keyof LifecycleHooks,
    context: unknown
  ): Promise<T | void>;

  /** Clear all extensions */
  clear(): void;
}

// ============================================================================
// Type Utilities (Prisma-inspired)
// ============================================================================

/**
 * Exact type matching for strict checking
 * Prevents excess properties in extension definitions
 */
export type Exact<Input, Shape> = Input extends Shape
  ? Exclude<keyof Input, keyof Shape> extends never
    ? Input
    : never
  : never;

/**
 * Deep partial type for configuration
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Extract extension client methods
 */
export type ExtensionClientMethods<T extends EnzymeExtension> =
  T['client'] extends Record<string, (...args: unknown[]) => unknown>
    ? T['client']
    : Record<string, never>;

/**
 * Merge multiple extension client methods
 */
export type MergeExtensionMethods<T extends EnzymeExtension[]> = T extends [
  infer First extends EnzymeExtension,
  ...infer Rest extends EnzymeExtension[]
]
  ? ExtensionClientMethods<First> & MergeExtensionMethods<Rest>
  : Record<string, never>;

/**
 * Extension client type with merged methods
 */
export type ExtendedClient<
  TBase,
  TExtensions extends EnzymeExtension[]
> = TBase & MergeExtensionMethods<TExtensions>;

// ============================================================================
// Enzyme Namespace with Type Utilities
// ============================================================================

/**
 * Enzyme namespace for extension utilities
 */
export namespace Enzyme {
  /**
   * Define an extension with type inference and validation
   *
   * @example
   * ```ts
   * const myExtension = Enzyme.defineExtension({
   *   name: 'my-extension',
   *   version: '1.0.0',
   *   hooks: {
   *     onInit: async (ctx) => {
   *       console.log('Initialized!');
   *     },
   *   },
   * });
   * ```
   */
  export function defineExtension<T extends EnzymeExtension>(extension: T): T {
    if (!extension.name) {
      throw new TypeError('Extension name is required');
    }
    return extension;
  }

  /**
   * Create a typed hook context
   */
  export function createHookContext<T extends keyof LifecycleHooks>(
    hookName: T,
    data: unknown
  ): unknown {
    return data;
  }

  /**
   * Type guard for extension validation
   */
  export function isValidExtension(value: unknown): value is EnzymeExtension {
    return (
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      typeof (value as EnzymeExtension).name === 'string'
    );
  }

  /**
   * Extension builder for fluent API
   *
   * @example
   * ```ts
   * const ext = Enzyme.extension('my-ext')
   *   .version('1.0.0')
   *   .priority(ExtensionPriorities.HIGH)
   *   .onInit(async (ctx) => { ... })
   *   .build();
   * ```
   */
  export function extension(name: string): ExtensionBuilder {
    return new ExtensionBuilder(name);
  }
}

/**
 * Fluent extension builder
 */
export class ExtensionBuilder {
  private ext: Partial<EnzymeExtension>;

  constructor(name: string) {
    this.ext = { name };
  }

  version(v: string): this {
    this.ext.version = v;
    return this;
  }

  description(d: string): this {
    this.ext.description = d;
    return this;
  }

  priority(p: ExtensionPriority): this {
    this.ext.priority = p;
    return this;
  }

  onInit(hook: InitHook): this {
    this.ext.hooks = { ...this.ext.hooks, onInit: hook };
    return this;
  }

  onMount(hook: MountHook): this {
    this.ext.hooks = { ...this.ext.hooks, onMount: hook };
    return this;
  }

  onUnmount(hook: UnmountHook): this {
    this.ext.hooks = { ...this.ext.hooks, onUnmount: hook };
    return this;
  }

  onError(hook: ErrorHook): this {
    this.ext.hooks = { ...this.ext.hooks, onError: hook };
    return this;
  }

  beforeOperation(hook: BeforeOperationHook): this {
    this.ext.hooks = { ...this.ext.hooks, beforeOperation: hook };
    return this;
  }

  afterOperation(hook: AfterOperationHook): this {
    this.ext.hooks = { ...this.ext.hooks, afterOperation: hook };
    return this;
  }

  withComponent(component: ComponentExtensions): this {
    this.ext.component = component;
    return this;
  }

  withState(state: StateExtensions): this {
    this.ext.state = state;
    return this;
  }

  withApi(api: ApiExtensions): this {
    this.ext.api = api;
    return this;
  }

  withClient(client: Record<string, (...args: unknown[]) => unknown>): this {
    this.ext.client = client;
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this.ext.metadata = metadata;
    return this;
  }

  build(): EnzymeExtension {
    if (!this.ext.name) {
      throw new TypeError('Extension name is required');
    }
    return this.ext as EnzymeExtension;
  }
}

// ============================================================================
// Event Types for Extension Communication
// ============================================================================

/**
 * Extension event for pub/sub communication between extensions
 */
export interface ExtensionEvent<TPayload = unknown> {
  /** Event type/name */
  type: string;
  /** Event payload */
  payload: TPayload;
  /** Source extension */
  source: string;
  /** Timestamp */
  timestamp: number;
  /** Event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Extension event handler
 */
export type ExtensionEventHandler<TPayload = unknown> = (
  event: ExtensionEvent<TPayload>
) => Promise<void> | void;

/**
 * Extension event emitter interface
 */
export interface IExtensionEventEmitter {
  /** Emit an event */
  emit<T>(type: string, payload: T, metadata?: Record<string, unknown>): void;

  /** Subscribe to events */
  on<T>(type: string, handler: ExtensionEventHandler<T>): () => void;

  /** Subscribe to events (once) */
  once<T>(type: string, handler: ExtensionEventHandler<T>): () => void;

  /** Unsubscribe from events */
  off<T>(type: string, handler: ExtensionEventHandler<T>): void;
}
