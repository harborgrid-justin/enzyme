/**
 * @file Extension System
 * @description Prisma-inspired extension system for Enzyme
 *
 * This module provides a comprehensive extension system with:
 * - Type-safe extension definitions
 * - Priority-based hook execution
 * - Immutable extension composition via $extends API
 * - React lifecycle integration (onMount, onUnmount)
 * - Component, state, and API extensions
 * - Error isolation per extension
 * - Event-based inter-extension communication
 *
 * @example
 * ```ts
 * import {
 *   createExtensionClient,
 *   defineExtension,
 *   ExtensionPriorities,
 * } from '@/lib/extensions';
 *
 * // Define an extension
 * const loggingExtension = defineExtension({
 *   name: 'logging',
 *   version: '1.0.0',
 *   priority: ExtensionPriorities.HIGH,
 *   hooks: {
 *     beforeOperation: async (ctx) => {
 *       console.log(`[${ctx.operation}] Starting with args:`, ctx.args);
 *     },
 *     afterOperation: async (ctx) => {
 *       console.log(`[${ctx.operation}] Completed in ${ctx.duration}ms`);
 *     },
 *   },
 *   client: {
 *     log: (message: string) => console.log('[LOG]', message),
 *   },
 * });
 *
 * // Create client and apply extensions
 * const client = createExtensionClient()
 *   .$extends(loggingExtension)
 *   .$extends(cacheExtension);
 *
 * // Use extension methods
 * client.log('Hello from extension!');
 *
 * // Wrap operations with hooks
 * const result = await client.$wrap('fetchUser', { userId: 123 }, async (args) => {
 *   return await fetchUserFromApi(args.userId);
 * });
 * ```
 *
 * @module lib/extensions
 */

// ============================================================================
// Core Exports
// ============================================================================

// Types
export type {
  // Main types
  EnzymeExtension,
  IExtensionManager,
  IExtensionEventEmitter,
  // Branded types
  ExtensionId,
  HookId,
  ComponentExtensionId,
  ExtensionPriority,
  // Context types
  InitContext,
  MountContext,
  UnmountContext,
  ErrorContext,
  BeforeOperationContext,
  AfterOperationContext,
  // Hook types
  InitHook,
  MountHook,
  UnmountHook,
  ErrorHook,
  BeforeOperationHook,
  AfterOperationHook,
  LifecycleHooks,
  // Component extension types
  ComponentEnhancer,
  ComponentHook,
  ComponentExtensions,
  // State extension types
  StateSelector,
  StateActionCreator,
  StateMiddleware,
  StateExtensions,
  // API extension types
  ApiEndpoint,
  ApiInterceptor,
  RequestConfig,
  ApiExtensions,
  // Event types
  ExtensionEvent,
  ExtensionEventHandler,
  // Type utilities
  Exact,
  DeepPartial,
  ExtensionClientMethods,
  MergeExtensionMethods,
  ExtendedClient,
} from './types.js';

// Type constructors and constants
export {
  createExtensionId,
  createHookId,
  ExtensionPriorities,
  ExtensionBuilder,
  Enzyme,
} from './types.js';

// Manager
export {
  EnzymeExtensionManager,
  createExtensionManager,
  createDefaultExtensionManager,
} from './manager.js';

// Client
export {
  EnzymeExtensionClient,
  createExtensionClient,
  createClientWithExtensions,
  defineExtension,
} from './client.js';

export type {
  EnzymeExtensionClientConfig,
} from './client.js';

// ============================================================================
// Re-export Namespace
// ============================================================================

/**
 * Re-export Enzyme namespace for convenience
 *
 * @example
 * ```ts
 * import { Enzyme } from '@/lib/extensions';
 *
 * const extension = Enzyme.defineExtension({
 *   name: 'my-extension',
 *   // ...
 * });
 *
 * // Or use the builder
 * const ext = Enzyme.extension('my-ext')
 *   .version('1.0.0')
 *   .priority(100)
 *   .onInit(async (ctx) => { ... })
 *   .build();
 * ```
 */
export { Enzyme as Extensions } from './types.js';

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default export: factory function to create a new extension client
 *
 * @example
 * ```ts
 * import createEnzymeClient from '@/lib/extensions';
 *
 * const client = createEnzymeClient({ debug: true });
 * ```
 */
export { createExtensionClient as default } from './client.js';

// ============================================================================
// Documentation Examples
// ============================================================================

/**
 * @example Basic Extension
 * ```ts
 * import { defineExtension, ExtensionPriorities } from '@/lib/extensions';
 *
 * const basicExtension = defineExtension({
 *   name: 'basic',
 *   version: '1.0.0',
 *   description: 'A basic extension example',
 *   priority: ExtensionPriorities.NORMAL,
 *   hooks: {
 *     onInit: async (ctx) => {
 *       console.log('Extension initialized at:', ctx.timestamp);
 *     },
 *   },
 * });
 * ```
 *
 * @example Logging Extension
 * ```ts
 * import { defineExtension, ExtensionPriorities } from '@/lib/extensions';
 *
 * const loggingExtension = defineExtension({
 *   name: 'logging',
 *   version: '1.0.0',
 *   priority: ExtensionPriorities.HIGH,
 *   hooks: {
 *     beforeOperation: async (ctx) => {
 *       console.log(`[${ctx.operation}] Starting...`);
 *       console.log('Args:', ctx.args);
 *     },
 *     afterOperation: async (ctx) => {
 *       console.log(`[${ctx.operation}] Completed in ${ctx.duration}ms`);
 *       console.log('Result:', ctx.result);
 *     },
 *     onError: async (ctx) => {
 *       console.error(`[${ctx.hookName}] Error:`, ctx.error);
 *     },
 *   },
 * });
 * ```
 *
 * @example Cache Extension
 * ```ts
 * import { defineExtension } from '@/lib/extensions';
 *
 * const cache = new Map();
 *
 * const cacheExtension = defineExtension({
 *   name: 'cache',
 *   version: '1.0.0',
 *   hooks: {
 *     beforeOperation: async (ctx) => {
 *       const cacheKey = `${ctx.operation}:${JSON.stringify(ctx.args)}`;
 *       const cached = cache.get(cacheKey);
 *
 *       if (cached) {
 *         console.log('Cache hit:', cacheKey);
 *         // Return cached value to skip operation
 *         return cached;
 *       }
 *     },
 *     afterOperation: async (ctx) => {
 *       const cacheKey = `${ctx.operation}:${JSON.stringify(ctx.args)}`;
 *       cache.set(cacheKey, ctx.result);
 *     },
 *   },
 *   client: {
 *     clearCache: () => {
 *       cache.clear();
 *       console.log('Cache cleared');
 *     },
 *   },
 * });
 * ```
 *
 * @example React Integration Extension
 * ```ts
 * import { defineExtension } from '@/lib/extensions';
 *
 * const reactExtension = defineExtension({
 *   name: 'react-integration',
 *   version: '1.0.0',
 *   component: {
 *     enhancers: {
 *       withLogging: (Component) => (props) => {
 *         console.log('Rendering component with props:', props);
 *         return <Component {...props} />;
 *       },
 *     },
 *     hooks: {
 *       useExtensionData: () => {
 *         const [data, setData] = useState(null);
 *         // Custom hook implementation
 *         return data;
 *       },
 *     },
 *   },
 *   hooks: {
 *     onMount: async (ctx) => {
 *       console.log(`Component ${ctx.component} mounted`);
 *     },
 *     onUnmount: async (ctx) => {
 *       console.log(`Component ${ctx.component} unmounted`);
 *     },
 *   },
 * });
 * ```
 *
 * @example State Management Extension
 * ```ts
 * import { defineExtension } from '@/lib/extensions';
 *
 * const stateExtension = defineExtension({
 *   name: 'state-management',
 *   version: '1.0.0',
 *   state: {
 *     initialState: {
 *       user: null,
 *       isAuthenticated: false,
 *     },
 *     selectors: {
 *       getUser: (state) => state.user,
 *       isAuthenticated: (state) => state.isAuthenticated,
 *     },
 *     actions: {
 *       setUser: (user) => ({ type: 'SET_USER', payload: user }),
 *       logout: () => ({ type: 'LOGOUT', payload: null }),
 *     },
 *   },
 * });
 * ```
 *
 * @example API Extension
 * ```ts
 * import { defineExtension } from '@/lib/extensions';
 *
 * const apiExtension = defineExtension({
 *   name: 'api',
 *   version: '1.0.0',
 *   api: {
 *     endpoints: {
 *       fetchUser: {
 *         method: 'GET',
 *         path: '/api/users/:id',
 *         handler: async (args) => {
 *           const response = await fetch(`/api/users/${args.id}`);
 *           return response.json();
 *         },
 *       },
 *     },
 *     interceptors: [
 *       {
 *         request: async (config) => {
 *           // Add auth token
 *           config.headers = {
 *             ...config.headers,
 *             Authorization: `Bearer ${getToken()}`,
 *           };
 *           return config;
 *         },
 *         response: async (response) => {
 *           // Transform response
 *           return response;
 *         },
 *       },
 *     ],
 *   },
 * });
 * ```
 *
 * @example Using Client
 * ```ts
 * import { createExtensionClient } from '@/lib/extensions';
 *
 * const client = createExtensionClient({ debug: true })
 *   .$extends(loggingExtension)
 *   .$extends(cacheExtension)
 *   .$extends(apiExtension);
 *
 * // Use extension methods
 * client.log('Application started');
 *
 * // Wrap operations with hooks
 * const user = await client.$wrap('fetchUser', { userId: 123 }, async (args) => {
 *   return await fetchUserFromApi(args.userId);
 * });
 *
 * // Listen to events
 * client.$events.on('user:updated', (event) => {
 *   console.log('User updated:', event.payload);
 * });
 *
 * // Emit events
 * client.$events.emit('user:updated', { userId: 123, name: 'John' });
 * ```
 *
 * @example React Hook Integration
 * ```tsx
 * import { createExtensionClient } from '@/lib/extensions';
 * import { useEffect } from 'react';
 *
 * const client = createExtensionClient().$extends(reactExtension);
 *
 * function MyComponent() {
 *   useEffect(() => {
 *     // Notify extensions of mount/unmount
 *     client.$mount('MyComponent');
 *     return () => client.$unmount('MyComponent');
 *   }, []);
 *
 *   return <div>My Component</div>;
 * }
 * ```
 */
