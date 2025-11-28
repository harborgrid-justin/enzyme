/**
 * @file UX Module
 * @description User experience utilities for React applications.
 *
 * Provides loading states, skeleton loading, optimistic updates,
 * error recovery, accessibility, responsive design, and animations.
 */

import { loadingStateStyles } from './loading-states';
import { errorRecoveryStyles } from './error-recovery-ui';
import { accessibilityStyles } from './accessibility-enhancer';
import { responsiveStyles } from './responsive-optimizer';

// ============================================================================
// Loading States
// ============================================================================
export {
  // Components
  LoadingProvider,
  LoadingIndicator,
  ProgressiveLoader,
  ProgressBar,
  // Hooks
  useLoading,
  useOptionalLoading,
  useLoadingState,
  // Styles
  loadingStateStyles,
  // Types
  type LoadingState,
  type LoadingPhase,
  type LoadingConfig,
  type LoadingContextValue,
  type LoadingProviderProps,
  type LoadingIndicatorProps,
  type ProgressiveLoaderProps,
  type ProgressBarProps,
} from './loading-states';

// ============================================================================
// Skeleton Factory
// ============================================================================
export {
  // Class
  SkeletonFactory,
  // Factory functions
  getSkeletonFactory,
  resetSkeletonFactory,
  // Convenience functions
  createTextSkeleton,
  createParagraphSkeleton,
  createCardSkeleton,
  createListSkeleton,
  createTableSkeleton,
  // Types
  type SkeletonElementType,
  type SkeletonAnimation,
  type SkeletonElement,
  type SkeletonPattern,
  type SkeletonFactoryConfig,
  // type SkeletonCSS,
} from './skeleton-factory';

// ============================================================================
// Optimistic UI
// ============================================================================
export {
  // Classes
  OptimisticUpdateManager,
  OptimisticListManager,
  // Factory functions
  createOptimisticManager,
  createOptimisticListManager,
  // Utilities
  applyOptimistic,
  mergeWithConflictResolution,
  serverWinsResolver,
  clientWinsResolver,
  lastWriteWinsResolver,
  // Types
  type OptimisticStatus,
  type OptimisticUpdate,
  type OptimisticResult,
  type OptimisticConfig,
  type MutationFn,
  type OptimisticUpdater,
  type ConflictResolver,
  type UpdateListener,
} from './optimistic-ui';

// ============================================================================
// Error Recovery UI
// ============================================================================
export {
  // Components
  ErrorRecovery,
  OfflineRecovery,
  DegradedState,
  // Utilities
  classifyError,
  isRetryable,
  getUserMessage,
  getRecoverySuggestions,
  createErrorInfo,
  // Styles
  errorRecoveryStyles,
  // Types
  type ErrorSeverity,
  type ErrorCategory,
  type ErrorInfo,
  type RecoveryAction,
  type ErrorRecoveryProps,
  type OfflineRecoveryProps,
  type DegradedStateProps,
} from './error-recovery-ui';

// ============================================================================
// Accessibility Enhancer
// ============================================================================
export {
  // Initialization
  initAnnouncer,
  installSkipLinks,
  // Announcements
  announce,
  announceAssertive,
  announceRouteChange,
  announceLoading,
  announceError,
  announceSuccess,
  // Focus management
  getFocusableElements,
  getFirstFocusable,
  getLastFocusable,
  focusFirst,
  focusLast,
  createFocusTrap,
  createRovingTabindex,
  createSkipLink,
  // ARIA utilities
  setExpanded,
  setPressed,
  setSelected,
  setBusy,
  setDisabled,
  setHidden,
  generateAriaId,
  // Reduced motion
  prefersReducedMotion,
  onReducedMotionChange,
  getSafeAnimationDuration,
  // Color contrast
  getLuminance,
  getContrastRatio,
  checkContrast,
  hexToRgb,
  // Styles
  accessibilityStyles,
  // Types
  type AnnouncementPriority,
  type FocusTrapOptions,
  type FocusTrapController,
  type RovingTabindexOptions,
  type SkipLinkOptions,
  type ContrastResult,
} from './accessibility-enhancer';

// ============================================================================
// Responsive Optimizer
// ============================================================================
export {
  // Classes
  ResponsiveManager,
  // Factory functions
  getResponsiveManager,
  resetResponsiveManager,
  // Container queries
  createContainerQueryObserver,
  // Image utilities
  generateSrcSet,
  generateSizes,
  getOptimalImageWidth,
  // Adaptive loading
  getAdaptiveLoadingRecommendations,
  // Constants
  DEFAULT_BREAKPOINTS,
  // Styles
  responsiveStyles,
  // Types
  type Breakpoint,
  type DeviceCapabilities,
  type ViewportInfo,
  type ResponsiveConfig,
  type MediaQueryCondition,
  type ResponsiveCallback,
  type ContainerQueryCondition,
  type AdaptiveLoadingConfig,
} from './responsive-optimizer';

// ============================================================================
// Animation Orchestrator
// ============================================================================
export {
  // Class
  AnimationOrchestrator,
  // Factory function
  getAnimationOrchestrator,
  // Convenience functions
  animate,
  animateSequence,
  animateStagger,
  animateSpring,
  // Constants
  EASING,
  PRESETS,
  // Types
  type TimingFunction,
  type AnimationState,
  type AnimationOptions,
  type AnimationKeyframe,
  type SequenceItem,
  type StaggerOptions,
  type AnimationController,
  type IntersectionAnimationOptions,
} from './animation-orchestrator';

// ============================================================================
// Convenience Initialization
// ============================================================================

import { initAnnouncer, installSkipLinks } from './accessibility-enhancer';
import { getResponsiveManager, type ResponsiveConfig } from './responsive-optimizer';
import { getSkeletonFactory, type SkeletonFactoryConfig } from './skeleton-factory';
import { getAnimationOrchestrator } from './animation-orchestrator';

/**
 * UX system configuration
 */
export interface UXSystemConfig {
  /** Initialize accessibility features */
  initAccessibility?: boolean;
  /** Install skip links */
  installSkipLinks?: boolean;
  /** Responsive manager config */
  responsive?: ResponsiveConfig;
  /** Skeleton factory config */
  skeleton?: Partial<SkeletonFactoryConfig>;
}

/**
 * Initialize the UX system
 */
export function initUXSystem(config: UXSystemConfig = {}): {
  responsive: ReturnType<typeof getResponsiveManager>;
  skeleton: ReturnType<typeof getSkeletonFactory>;
  animation: ReturnType<typeof getAnimationOrchestrator>;
} {
  // Initialize accessibility
  if (config.initAccessibility !== false) {
    initAnnouncer();
  }

  // Install skip links
  if (config.installSkipLinks !== false) {
    installSkipLinks();
  }

  return {
    responsive: getResponsiveManager(config.responsive),
    skeleton: getSkeletonFactory(config.skeleton),
    animation: getAnimationOrchestrator(),
  };
}

/**
 * Get combined CSS for all UX components
 */
export function getUXStyles(): string {
  return `
    /* Loading States */
    ${loadingStateStyles}

    /* Error Recovery */
    ${errorRecoveryStyles}

    /* Accessibility */
    ${accessibilityStyles}

    /* Responsive */
    ${responsiveStyles}

    /* Skeleton Factory */
    ${getSkeletonFactory().generateCSS()}
  `;
}

// ============================================================================
// Agent 7 PhD-Level UX Additions
// ============================================================================

// Auto-Setup System
export {
  // Class
  AutoSetup,
  // Functions
  autoSetup,
  getAutoSetup,
  resetAutoSetup,
  detectEnvironment,
  detectAvailableFeatures,
  composeProviders,
  // Hook
  useAutoSetup,
  // Types
  type Environment,
  type EnvironmentInfo,
  type AutoSetupFeatures,
  type ProviderConfig,
  type AutoSetupConfig,
  type AutoSetupResult,
} from './auto-setup';

// Smart Defaults System
export {
  // Class
  SmartDefaultsManager,
  // Detection
  detectDeviceTier,
  detectNetworkTier,
  detectUserPreferences,
  // Functions
  getSmartDefaults,
  setSmartDefaultsOverrides,
  resetSmartDefaults,
  // Hooks
  useSmartDefaults,
  useAnimationDefaults,
  useImageDefaults,
  useFetchDefaults,
  usePerformanceDefaults,
  useRenderDefaults,
  useConditionalFeature,
  // Types
  type DeviceTier as SmartDeviceTier,
  type NetworkTier as SmartNetworkTier,
  type UserPreferences,
  type AnimationDefaults,
  type ImageDefaults,
  type FetchDefaults,
  type PerformanceDefaults,
  type RenderDefaults,
  type SmartDefaults,
  type SmartDefaultsOverrides,
} from './smart-defaults';

// Progressive Enhancement System
export {
  // Provider and Components
  ProgressiveEnhancementProvider,
  CapabilityGate,
  FeatureGate,
  // Types
  type CapabilityLevel,
  type BrowserCapabilities,
  type FeatureDefinition,
  type FeatureStatus,
  type ProgressiveEnhancementProviderProps,
} from './progressive-enhancement';

export {
  // Hooks
  useProgressiveEnhancement,
  useProgressiveFeature,
  useCapability,
  useCapabilities,
  useCapabilityConditional,
} from './progressive-enhancement-hooks';

export {
  // Detection and Utilities
  detectCapabilities,
  getCapabilities,
  checkWebPSupport,
  checkAVIFSupport,
  createFeature,
} from './progressive-enhancement-utils';

export type { ProgressiveEnhancementContextValue } from '../contexts/ProgressiveEnhancementContext';

// Error Recovery UX System
export {
  // Class
  RecoveryEngine,
  // Classification
  classifyRecoveryError,
  getUserFriendlyErrorMessage,
  // Utilities
  createRecoveryEngine,
  executeWithRecovery,
  // Hooks
  useRecovery,
  useCircuitBreaker,
  useNetworkAwareRecovery,
  // Types
  type RecoveryErrorSeverity,
  type RecoveryStrategy,
  type RecoveryState,
  type RecoveryProgress,
  type ErrorClassification,
  type RecoveryOptions,
  type CircuitBreakerState,
} from './error-recovery-ux';

// Automatic Accessibility System
export {
  // Classes
  AutoAccessibility,
  FocusManager,
  ARIAEnhancer,
  // Initialization
  initAutoAccessibility,
  getAutoAccessibility,
  resetAutoAccessibility,
  // Detection
  detectAccessibilityPreferences,
  // Utilities
  adaptMotion,
  // Hooks
  useAccessibilityPreferences,
  useFocusTrap,
  useAnnounce,
  useKeyboardNavigation,
  // Types
  type AccessibilityPreferences,
  type FocusManagementOptions,
  type ARIAEnhancementRule,
  type AutoAccessibilityConfig,
} from './accessibility-auto';
