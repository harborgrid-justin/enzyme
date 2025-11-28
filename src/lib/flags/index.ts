/**
 * @fileoverview Feature flag system exports.
 *
 * This module provides a comprehensive feature flag system including:
 * - Basic flag evaluation with React integration
 * - Advanced targeting rules and rollout strategies
 * - Multiple provider implementations (local, remote, cached, etc.)
 * - Analytics, exposure tracking, and impact analysis
 * - Library integration for flag-aware configuration across all modules
 * - Configurable features with dynamic toggles
 * - Flag-driven module loading and code splitting
 * - Domain-specific flags for API, routing, UI, and performance
 *
 * @module flags
 *
 * @example
 * ```tsx
 * // Basic usage
 * import {
 *   FeatureFlagProvider,
 *   useFeatureFlag,
 *   FlagGate,
 * } from '@/lib/flags';
 *
 * function App() {
 *   return (
 *     <FeatureFlagProvider>
 *       <FlagGate flagKey="new-feature">
 *         <NewFeature />
 *       </FlagGate>
 *     </FeatureFlagProvider>
 *   );
 * }
 *
 * // Advanced usage with providers and analytics
 * import {
 *   FlagEngine,
 *   createProviderChain,
 *   createAnalyticsSuite,
 * } from '@/lib/flags';
 *
 * const provider = createProviderChain({
 *   remote: { endpoint: '/api/flags' },
 *   local: { flags: defaultFlags },
 *   cache: { ttl: 60000 },
 * });
 *
 * const analytics = createAnalyticsSuite({
 *   analytics: { endpoint: '/api/analytics' },
 * });
 *
 * // Library integration usage
 * import {
 *   FlagConfigurable,
 *   useFeatureFlaggedModule,
 *   apiFlags,
 *   uiFlags,
 * } from '@/lib/flags';
 *
 * function Dashboard() {
 *   const { module: Chart } = useFeatureFlaggedModule({
 *     flagKey: 'new-charts',
 *     enabledModule: () => import('./NewChart'),
 *     fallbackModule: () => import('./OldChart'),
 *   });
 *
 *   return (
 *     <FlagConfigurable flagKey="dark-mode">
 *       {({ isEnabled }) => <Chart theme={isEnabled ? 'dark' : 'light'} />}
 *     </FlagConfigurable>
 *   );
 * }
 * ```
 */

// ============================================================================
// Basic Feature Flag Components
// ============================================================================

export { FeatureFlagProvider, useFeatureFlagContext } from './FeatureFlagProvider';
export { flagKeys, flagCategories, type FlagKey, type FlagCategory } from './flagKeys';
export { useFeatureFlag, useFeatureFlags, useFeatureFlagsStatus } from './useFeatureFlag';
export { withFeatureFlag, withoutFeatureFlag } from './withFeatureFlag';
export { FlagGate, FlagGateAll, FlagGateAny } from './FlagGate';
export { isDebugModeEnabled, isFlagEnabled, isDevelopmentEnv } from './debugMode';

// ============================================================================
// Advanced Module Re-exports
// ============================================================================

export * from './advanced';

// ============================================================================
// Providers Module Re-exports
// ============================================================================

export * from './providers';

// Re-export FlagChangeEvent explicitly from advanced (preferred source)
export type { FlagChangeEvent } from './advanced';

// ============================================================================
// Analytics Module Re-exports
// ============================================================================

export * from './analytics';

// Re-export VariantComparison explicitly from analytics (preferred source)
export type { VariantComparison } from './analytics';

// ============================================================================
// Integration Module Re-exports
// ============================================================================

export * from './integration';

// Re-export event types explicitly from advanced (preferred source)
export type { FlagEvaluationEvent, FlagExposureEvent } from './advanced';
