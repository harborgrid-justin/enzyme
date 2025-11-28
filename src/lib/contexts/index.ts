/**
 * @file Context Definitions
 * @description Centralized context definitions for Fast Refresh compliance.
 * 
 * Contexts are extracted into separate files to comply with Fast Refresh rules:
 * - Contexts must not be defined in files with components
 * - Each context should have a dedicated file
 * - Context providers should be in separate files from context definitions
 */

// Re-export all context definitions
export { LoadingContext } from './LoadingContext';
export { ProgressiveEnhancementContext } from './ProgressiveEnhancementContext';
export { ThemeContext } from './ThemeContext';
export { SecurityContext } from './SecurityContext';
export { StreamContext } from './StreamContext';
export { RealtimeContext, defaultRealtimeContext } from './RealtimeContext';
export { PerformanceObservatoryContext } from './PerformanceObservatoryContext';
export { ScrollContainerContext } from './ScrollContainerContext';
export { PortalBridgeContext } from './PortalBridgeContext';
export { DOMContextReactContext, DOMContextUpdateContext, defaultDOMContext } from './DOMContext';
export { AdaptiveLayoutContext } from './AdaptiveLayoutContext';
export { ContainerContext } from './ContainerContext';
export { ErrorBoundaryContext } from './ErrorBoundaryContext';
export { HydrationContext } from './HydrationContext';
export { DIContext } from './DIContext';
export { FeatureFlagContext } from './FeatureFlagContext';
export { CoordinationContext } from './CoordinationContext';
export { BridgeManagerContext } from './BridgeManagerContext';
export { RBACContext } from './RBACContext';
export { AuthContext } from './AuthContext';
export { ConfigContext } from './ConfigContext';
export { ADContext } from './ADContext';
export { ApiClientContext } from './ApiClientContext';
export { ModuleSystemContext, ModuleHierarchyContext } from './ModuleContext';
export { ModuleBoundaryContext } from './ModuleBoundaryContext';
export { ToastContext } from './ToastContext';
export { FlagConfigurableContext } from './FlagConfigurableContext';
export { LibraryIntegrationContext } from './LibraryIntegrationContext';
export { FlagAnalyticsContext } from './FlagAnalyticsContext';
export { ConfigurableFeaturesContext } from './ConfigurableFeaturesContext';

// Re-export types
export type { LoadingContextValue, LoadingState, LoadingPhase } from './LoadingContext';
export type { ProgressiveEnhancementContextValue, BrowserCapabilities } from './ProgressiveEnhancementContext';
export type { ThemeContextValue, ThemeConfig, ColorScheme as ThemeColorScheme } from './ThemeContext';
export type { SecurityContextValue, SanitizationLevel } from './SecurityContext';
export type { StreamContextValue } from './StreamContext';
export type { RealtimeContextValue, ConnectionState } from './RealtimeContext';
export type { PerformanceObservatoryContextValue, PerformanceMetric } from './PerformanceObservatoryContext';
export type { ScrollContainer, ScrollPosition } from './ScrollContainerContext';
export type { PortalContext } from './PortalBridgeContext';
export type { DOMContext, ColorScheme as DOMColorScheme } from './DOMContext';
export type { AdaptiveLayoutContextValue, Breakpoint, LayoutMode } from './AdaptiveLayoutContext';
export type { ContainerContextValue, ContainerBreakpoints } from './ContainerContext';
export type { ErrorBoundaryContextValue } from './ErrorBoundaryContext';
export type { HydrationContextValue, HydrationStatus, HydrationPriority } from './HydrationContext';
export type { FeatureDIContainer, ServiceContract } from './DIContext';
export type { FeatureFlagContextValue } from './FeatureFlagContext';
export type { CoordinationContextValue, CoordinationEvent } from './CoordinationContext';
export type { ContextBridgeImpl, BridgeConfig } from './BridgeManagerContext';
export type { RBACContextValue, Role, Permission } from './RBACContext';
export type { AuthContextValue, User, UserRole } from './AuthContext';
export type { ConfigContextValue, ConfigValue, ConfigRecord } from './ConfigContext';
export type { ADContextValue, ADUser } from './ADContext';
export type { ApiClientContextValue, HttpMethod, RequestOptions } from './ApiClientContext';
export type { ModuleSystemContextValue, ModuleHierarchyContextValue, ModuleMetadata } from './ModuleContext';
export type { ModuleBoundaryContextValue } from './ModuleBoundaryContext';
export type { ToastContextValue, Toast, ToastVariant, ToastPosition } from './ToastContext';
export type { FlagConfigurableContextValue, FlagConfiguration } from './FlagConfigurableContext';
export type { LibraryIntegrationContextValue, LibraryIntegration } from './LibraryIntegrationContext';
export type { FlagAnalyticsContextValue, FlagAnalyticsEvent } from './FlagAnalyticsContext';
export type { ConfigurableFeaturesContextValue, FeatureDefinition, FeatureConfig } from './ConfigurableFeaturesContext';
