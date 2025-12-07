/**
 * @file Feature Module Index
 * @description Central export point for feature factory functionality
 *
 * This module provides a complete plug-and-play feature system including:
 * - Feature registration and registry management
 * - Auto-discovery via import.meta.glob
 * - Feature flag integration
 * - Dependency injection between features
 * - Code splitting and preloading
 * - Shared reusable components
 * - Testing utilities
 */

// ============================================================================
// Types
// ============================================================================

export {
  type FeatureMetadata,
  type FeatureAccess,
  type FeatureTab,
  type FeatureConfig,
  type FeatureViewModel,
  type FeaturePageProps,
  type FeatureViewProps,
  type CreateFeatureOptions,
  type FeatureRegistryEntry,
  type FeatureRegistry,
  hasFeatureAccess,
} from './types';

// ============================================================================
// Feature Page Factory
// ============================================================================

export { createFeaturePage, createLazyFeaturePage } from './createFeaturePage';

// ============================================================================
// Feature Registry
// ============================================================================

export {
  registerFeature,
  unregisterFeature,
  getFeature,
  getAllFeatures,
  getFeatureIds,
  isFeatureRegistered,
  getFeatureRoutes,
  getFeatureNavItems,
  initializeFeatures,
  clearFeatureRegistry,
  getFeatureCount,
} from './registry';

// ============================================================================
// Auto-Registration
// ============================================================================

export {
  // Types
  type FeatureModule,
  type FeatureDiscoveryResult,

  // Discovery
  autoRegisterFeatures,
  registerFeaturesSync,

  // Utilities
  getFeatureRegistrySnapshot,
  getFeaturesByCategory,

  // Initialization
  initializeFeatureRegistry,
  isFeatureRegistryInitialized,
  resetFeatureRegistry,
  waitForFeatureRegistry,
} from './auto-registry';

// ============================================================================
// Feature Flag Integration
// ============================================================================

export {
  // Types
  type FeatureVisibility,
  type TabVisibility,
  type FeatureFlagManifestEntry,

  // Flag Extraction
  extractFeatureFlags,
  generateFeatureFlagManifest,
  generateFeatureFlagKeys,

  // Visibility Hooks
  useFeatureVisibility,
  useAccessibleFeatures,
  useVisibleFeatures,
  useIsFeatureAccessible,
  useIsTabAccessible,
  useAccessibleTabs,

  // Utility Hooks
  useFeatureAccessChecker,
  useDisabledFeatures,
} from './feature-flag-integration';

// ============================================================================
// Dependency Injection
// ============================================================================

export {
  // Types
  type ServiceContract,
  type ServiceRegistrationOptions,

  // Container
  FeatureDIContainer,
  getContainer,
  registerService,
  createServiceContract,

  // React Integration
  FeatureDIProvider,
  useDIContainer,
  useService,
  useTryService,
  useHasService,
  useServicesByTag,

  // Common Service Contracts
  type AnalyticsService,
  AnalyticsContract,
  type NotificationService,
  NotificationContract,
  type NavigationService,
  NavigationContract,
  type StorageService,
  StorageContract,

  // Event Bus
  type FeatureEventBus,
  FeatureEventBusContract,
  SimpleFeatureEventBus,
  useFeatureEventBus,
  useFeatureEvent,
} from './featureDI';

// ============================================================================
// Code Splitting
// ============================================================================

export {
  // Types
  type PreloadPriority,
  type PreloadTrigger,
  type PreloadConfig,
  type FeatureChunkInfo,
  type PreloadableLazyComponent,
  type FeatureRoute,

  // Lazy Component Factory
  createLazyFeatureComponent,
  createResilientLazyComponent,

  // Chunk Manager
  FeatureChunkManager,
  featureChunkManager,

  // Hooks
  useFeaturePreload,
  useFeatureChunkStatus,
  usePreloadOnVisible,

  // HOCs
  withFeatureSuspense,

  // Route Integration
  generateSplitRoutes,

  // Initialization
  initializeFeaturePreloading,
} from './codeSplitting';

// ============================================================================
// Shared Components
// ============================================================================

export {
  // Types
  type ListItemBase,
  type GenericListProps,
  type GenericDetailProps,
  type StatsCardProps,
  type ActionConfig,
  type ActionToolbarProps,
  type FilterPanelProps,
  type PaginationProps,
  type SearchInputProps,

  // Components
  GenericList,
  GenericDetail,
  StatsCard,
  ActionToolbar,
  FilterPanel,
  Pagination,
  SearchInput,
} from './sharedComponents';

// ============================================================================
// Testing Utilities
// ============================================================================

export {
  // Test Query Client
  createTestQueryClient,

  // Feature Test Wrapper
  FeatureTestWrapper,
  type FeatureTestWrapperProps,
  createFeatureRenderer,

  // Mock Feature Factory
  createMockFeature,
  createMockFeatures,
  type MockFeatureOptions,

  // Mock Entity Factory
  createMockEntity,
  createMockEntities,
  type MockEntityBase,

  // API Mocking
  createMockApiResponse,
  createMockService,
  createMockQueryData,
  createMockMutationResult,
  type MockApiResponse,

  // Integration Test Helpers
  createFeatureTestFixture,
  seedQueryCache,
  assertQueryCache,
  clearQueryCache,
  waitForQueries,
  type FeatureTestFixture,

  // Snapshot Testing
  createFeatureSnapshot,
  compareSnapshots,

  // Timing Utilities
  waitFor,
  delay,

  // Test Data Generators
  generateId,
  generateDate,
  testData,
} from './testing';
