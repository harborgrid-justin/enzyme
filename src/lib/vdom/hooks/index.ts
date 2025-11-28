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


