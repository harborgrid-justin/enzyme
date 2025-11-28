/**
 * @file Module Hooks Index
 * @module vdom/hooks
 * @description Exports all Virtual Modular DOM hooks for easy importing.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

// =============================================================================
// useModule - Primary module context hook
// =============================================================================
export {
  useModule,
  useModuleId,
  useModuleConfig,
  useIsModuleMounted,
  useModuleMetrics,
  useModuleEmit,
  useModuleSubscribe,
} from './useModule';

// =============================================================================
// useModuleState - Isolated module state management
// =============================================================================
export {
  useModuleState,
  useSimpleModuleState,
  useBooleanModuleState,
  useArrayModuleState,
  useRecordModuleState,
} from './useModuleState';

export type { UseModuleStateOptions } from './useModuleState';

// =============================================================================
// useModuleBoundary - Boundary information and slot management
// =============================================================================
export {
  useModuleBoundary,
  useBoundaryDimensions,
  useBoundaryVisibility,
  useModuleDepth,
  useModulePath,
  useIsNestedModule,
  useParentModuleId,
  useSlot,
  useSlots,
} from './useModuleBoundary';

// =============================================================================
// useModuleHydration - Hydration control and state
// =============================================================================
export {
  useModuleHydration,
  useIsHydrated,
  useHydrateTrigger,
  useHydrationProgress,
  useOnHydrated,
  useOnHydrationError,
  useHydrationGuard,
  useHydrationTiming,
} from './useModuleHydration';

// =============================================================================
// useSecureModule - Security context and validation
// =============================================================================
export {
  useSecureModule,
  useSecurityNonce,
  useIsSecure,
  useSanitizer,
  useContentValidator,
  useSecurityViolations,
  useSafeHtml,
  useSecureUrl,
  useSecureStyleProps,
  useSecureScriptProps,
  useIsEventAllowed,
  useSecureMessaging,
} from './useSecureModule';

// =============================================================================
// Default exports for tree-shaking
// =============================================================================

/**
 * All hooks object for convenience import.
 *
 * @example
 * ```tsx
 * import { hooks } from '@/lib/vdom';
 *
 * function MyComponent() {
 *   const module = hooks.useModule();
 *   const { state, setState } = hooks.useModuleState('key', { initialValue: 0 });
 * }
 * ```
 */
export const hooks = {
  // useModule
  useModule: () => require('./useModule').useModule(),
  useModuleId: () => require('./useModule').useModuleId(),
  useModuleConfig: () => require('./useModule').useModuleConfig(),
  useIsModuleMounted: () => require('./useModule').useIsModuleMounted(),
  useModuleMetrics: () => require('./useModule').useModuleMetrics(),
  useModuleEmit: () => require('./useModule').useModuleEmit(),
  useModuleSubscribe: () => require('./useModule').useModuleSubscribe(),

  // useModuleState
  useModuleState: <T>(key: string, options: { initialValue: T }) =>
    require('./useModuleState').useModuleState(key, options),
  useSimpleModuleState: <T>(key: string, initialValue: T) =>
    require('./useModuleState').useSimpleModuleState(key, initialValue),
  useBooleanModuleState: (key: string, initialValue?: boolean) =>
    require('./useModuleState').useBooleanModuleState(key, initialValue),
  useArrayModuleState: <T>(key: string, initialValue?: T[]) =>
    require('./useModuleState').useArrayModuleState(key, initialValue),
  useRecordModuleState: <K extends string, V>(
    key: string,
    initialValue?: Record<K, V>
  ) => require('./useModuleState').useRecordModuleState(key, initialValue),

  // useModuleBoundary
  useModuleBoundary: () => require('./useModuleBoundary').useModuleBoundary(),
  useBoundaryDimensions: () =>
    require('./useModuleBoundary').useBoundaryDimensions(),
  useBoundaryVisibility: () =>
    require('./useModuleBoundary').useBoundaryVisibility(),
  useModuleDepth: () => require('./useModuleBoundary').useModuleDepth(),
  useModulePath: () => require('./useModuleBoundary').useModulePath(),
  useIsNestedModule: () => require('./useModuleBoundary').useIsNestedModule(),
  useParentModuleId: () => require('./useModuleBoundary').useParentModuleId(),
  useSlot: (name: string) => require('./useModuleBoundary').useSlot(name),
  useSlots: (names: string[]) => require('./useModuleBoundary').useSlots(names),

  // useModuleHydration
  useModuleHydration: () =>
    require('./useModuleHydration').useModuleHydration(),
  useIsHydrated: () => require('./useModuleHydration').useIsHydrated(),
  useHydrateTrigger: () => require('./useModuleHydration').useHydrateTrigger(),
  useHydrationProgress: () =>
    require('./useModuleHydration').useHydrationProgress(),
  useOnHydrated: (callback: () => void) =>
    require('./useModuleHydration').useOnHydrated(callback),
  useOnHydrationError: (callback: (error: Error) => void) =>
    require('./useModuleHydration').useOnHydrationError(callback),
  useHydrationGuard: <T>(fallback: T, content: T) =>
    require('./useModuleHydration').useHydrationGuard(fallback, content),
  useHydrationTiming: (options: {
    delay?: number;
    priority?: number;
    trigger?: string;
  }) => require('./useModuleHydration').useHydrationTiming(options),

  // useSecureModule
  useSecureModule: () => require('./useSecureModule').useSecureModule(),
  useSecurityNonce: () => require('./useSecureModule').useSecurityNonce(),
  useIsSecure: () => require('./useSecureModule').useIsSecure(),
  useSanitizer: () => require('./useSecureModule').useSanitizer(),
  useContentValidator: () => require('./useSecureModule').useContentValidator(),
  useSecurityViolations: () =>
    require('./useSecureModule').useSecurityViolations(),
  useSafeHtml: (html: string) => require('./useSecureModule').useSafeHtml(html),
  useSecureUrl: (url: string) => require('./useSecureModule').useSecureUrl(url),
  useSecureStyleProps: () => require('./useSecureModule').useSecureStyleProps(),
  useSecureScriptProps: () =>
    require('./useSecureModule').useSecureScriptProps(),
  useIsEventAllowed: (eventName: string) =>
    require('./useSecureModule').useIsEventAllowed(eventName),
  useSecureMessaging: () => require('./useSecureModule').useSecureMessaging(),
} as const;
