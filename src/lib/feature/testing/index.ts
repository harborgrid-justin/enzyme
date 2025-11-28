/**
 * @file Feature Testing Utilities Index
 * @description Export all testing utilities for feature modules
 */

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
} from './featureTestUtils';
