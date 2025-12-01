/**
 * @file Feature Testing Utilities
 * @description Isolated testing utilities for feature modules
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactElement, type ReactNode } from 'react';
import type { FeatureRegistryEntry, FeatureConfig, FeatureAccess } from '../types';
import { FeatureDIContainer, FeatureDIProvider } from '../featureDI';
import { vi, type Mock, expect } from 'vitest';

/**
 * Simple render result type
 */
export interface RenderResult {
  element: ReactElement;
  queryClient: QueryClient;
  diContainer: FeatureDIContainer;
}

// ============================================================================
// Test Query Client
// ============================================================================

/**
 * Create a test query client with sensible defaults
 */
export function createTestQueryClient(
  options: {
    defaultOptions?: {
      queries?: {
        retry?: number | boolean;
        gcTime?: number;
        staleTime?: number;
      };
      mutations?: {
        retry?: number | boolean;
      };
    };
  } = {}
): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        ...options.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...options.defaultOptions?.mutations,
      },
    },
  });
}

// ============================================================================
// Feature Test Wrapper
// ============================================================================

/**
 * Props for FeatureTestWrapper
 */
export interface FeatureTestWrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
  diContainer?: FeatureDIContainer;
  initialRouterEntries?: string[];
}

/**
 * Comprehensive test wrapper for feature testing
 */
export function FeatureTestWrapper({
  children,
  queryClient = createTestQueryClient(),
  diContainer = new FeatureDIContainer(),
}: FeatureTestWrapperProps): ReactElement {
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      FeatureDIProvider,
      { container: diContainer, children }
    )
  );
}

/**
 * Create a custom render function for a feature
 */
export function createFeatureRenderer(
  defaultOptions: Partial<FeatureTestWrapperProps> = {}
): (ui: ReactElement, options?: Partial<FeatureTestWrapperProps>) => RenderResult {
  return function renderFeature(
    ui: ReactElement,
    options: Partial<FeatureTestWrapperProps> = {}
  ): RenderResult {
    const mergedOptions = { ...defaultOptions, ...options };
    const queryClient = mergedOptions.queryClient ?? createTestQueryClient();
    const diContainer = mergedOptions.diContainer ?? new FeatureDIContainer();

    return {
      element: React.createElement(
        FeatureTestWrapper,
        {
          ...mergedOptions,
          queryClient,
          diContainer,
          children: ui,
        }
      ),
      queryClient,
      diContainer,
    };
  };
}

// ============================================================================
// Mock Feature Factory
// ============================================================================

/**
 * Options for creating a mock feature
 */
export interface MockFeatureOptions {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  order?: number;
  access?: Partial<FeatureAccess>;
  config?: Partial<FeatureConfig>;
}

/**
 * Create a mock feature for testing
 */
export function createMockFeature(
  overrides: MockFeatureOptions = {}
): FeatureRegistryEntry {
  const {
    id = 'mock-feature',
    name = 'Mock Feature',
    description = 'Mock feature for testing',
    category = 'test',
    order = 999,
    access: accessOverrides = {},
    config: configOverrides = {},
  } = overrides;

  const mockConfig: FeatureConfig = {
    metadata: {
      id,
      name,
      description,
      category,
      order,
    },
    access: {
      requiredRoles: [],
      featureFlag: `${id}_enabled`,
      ...accessOverrides,
    },
    ...configOverrides,
  };

  const MockComponent = (): React.ReactElement =>
    React.createElement('div', { 'data-testid': id }, name);

  return {
    config: mockConfig,
    component: React.lazy(async () => Promise.resolve({ default: MockComponent })),
  };
}

/**
 * Create multiple mock features
 */
export function createMockFeatures(
  count: number,
  baseOptions: MockFeatureOptions = {}
): FeatureRegistryEntry[] {
  return Array.from({ length: count }, (_, index) =>
    createMockFeature({
      ...baseOptions,
      id: `${baseOptions.id ?? 'mock-feature'}-${index + 1}`,
      name: `${baseOptions.name ?? 'Mock Feature'} ${index + 1}`,
      order: (baseOptions.order ?? 0) + index,
    })
  );
}

// ============================================================================
// Mock Entity Factory
// ============================================================================

/**
 * Base entity interface for mocking
 */
export interface MockEntityBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a mock entity with common fields
 */
export function createMockEntity<T extends Partial<MockEntityBase>>(
  overrides: T & { id?: string } = {} as T
): MockEntityBase & T {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? `mock-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as MockEntityBase & T;
}

/**
 * Create multiple mock entities
 */
export function createMockEntities<T extends Partial<MockEntityBase>>(
  count: number,
  factory: (index: number) => T
): Array<MockEntityBase & T> {
  return Array.from({ length: count }, (_, index) =>
    createMockEntity(factory(index))
  );
}

// ============================================================================
// API Mocking Utilities
// ============================================================================

/**
 * Mock API response wrapper
 */
export interface MockApiResponse<T> {
  data: T;
  status: number;
  headers?: Record<string, string>;
}

/**
 * Create a mock API response
 */
export function createMockApiResponse<T>(
  data: T,
  options: { status?: number; headers?: Record<string, string> } = {}
): MockApiResponse<T> {
  return {
    data,
    status: options.status ?? 200,
    headers: options.headers,
  };
}

/**
 * Mock service method type
 */
type MockFn = Mock | ((...args: unknown[]) => unknown);

/**
 * Create a mock service with typed methods
 */
export function createMockService<
  T extends Record<string, (...args: unknown[]) => unknown>
>(
  implementations: Partial<{
    [K in keyof T]: MockFn;
  }>
): { [K in keyof T]: Mock } {
  const service = {} as { [K in keyof T]: Mock };

  for (const [key, impl] of Object.entries(implementations)) {
    const typedKey = key as keyof T;
    if (typeof impl === 'function' && 'mockImplementation' in impl) {
      service[typedKey] = impl;
    } else {
      service[typedKey] = vi.fn().mockImplementation(impl as MockFn);
    }
  }

  return service;
}

/**
 * Create mock query data for testing
 */
export function createMockQueryData<T>(
  data: T,
  options: {
    isLoading?: boolean;
    isFetching?: boolean;
    error?: Error | null;
    isError?: boolean;
    isSuccess?: boolean;
  } = {}
): {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  isError: boolean;
  isSuccess: boolean;
  refetch: Mock;
} {
  const isLoading = options.isLoading ?? false;
  const isError = options.isError ?? !!options.error;
  const isSuccess = options.isSuccess ?? (!isLoading && !isError);

  return {
    data: isLoading ? undefined : data,
    isLoading,
    isFetching: options.isFetching ?? isLoading,
    error: options.error ?? null,
    isError,
    isSuccess,
    refetch: vi.fn().mockResolvedValue({ data }),
  };
}

/**
 * Create mock mutation result
 */
export function createMockMutationResult<TData, _TVariables>(
  options: {
    isLoading?: boolean;
    isSuccess?: boolean;
    isError?: boolean;
    error?: Error | null;
    data?: TData;
  } = {}
): {
  mutate: Mock;
  mutateAsync: Mock;
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  data: TData | undefined;
  reset: Mock;
} {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(options.data),
    isLoading: options.isLoading ?? false,
    isPending: options.isLoading ?? false,
    isSuccess: options.isSuccess ?? false,
    isError: options.isError ?? false,
    error: options.error ?? null,
    data: options.data,
    reset: vi.fn(),
  };
}

// ============================================================================
// Feature Integration Test Helpers
// ============================================================================

/**
 * Test fixture for feature integration tests
 */
export interface FeatureTestFixture<TData> {
  featureId: string;
  initialData: TData;
  mockApi: Record<string, Mock>;
  queryClient: QueryClient;
  diContainer: FeatureDIContainer;
}

/**
 * Create a complete test fixture for a feature
 */
export function createFeatureTestFixture<TData>(
  featureId: string,
  options: {
    initialData: TData;
    apiMethods?: string[];
  }
): FeatureTestFixture<TData> {
  const queryClient = createTestQueryClient();
  const diContainer = new FeatureDIContainer();

  const mockApi: Record<string, Mock> = {};

  const methods =
    options.apiMethods ?? ['getAll', 'getById', 'create', 'update', 'delete'];

  methods.forEach((method) => {
    mockApi[method] = vi.fn();
  });

  // Setup default implementations
  if (mockApi.getAll) {
    mockApi.getAll.mockResolvedValue({
      items: Array.isArray(options.initialData)
        ? options.initialData
        : [options.initialData],
      total: Array.isArray(options.initialData)
        ? options.initialData.length
        : 1,
      page: 1,
      pageSize: 20,
    });
  }

  if (mockApi.getById) {
    mockApi.getById.mockImplementation(async (id: string) => {
      const items = Array.isArray(options.initialData)
        ? options.initialData
        : [options.initialData];
      const item = (items as Array<{ id: string }>).find((i) => i.id === id);
      return Promise.resolve(item);
    });
  }

  return {
    featureId,
    initialData: options.initialData,
    mockApi,
    queryClient,
    diContainer,
  };
}

/**
 * Seed query cache with initial data
 */
export function seedQueryCache<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  data: T
): void {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Assert query cache contains expected data
 */
export function assertQueryCache<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  expectedData: T
): void {
  const cachedData = queryClient.getQueryData<T>(queryKey);
  expect(cachedData).toEqual(expectedData);
}

/**
 * Clear specific query from cache
 */
export function clearQueryCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
): void {
  queryClient.removeQueries({ queryKey });
}

/**
 * Wait for queries to settle
 */
export async function waitForQueries(queryClient: QueryClient): Promise<void> {
  while (queryClient.isFetching()) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// ============================================================================
// Snapshot Testing Helpers
// ============================================================================

/**
 * Create a serializable snapshot of feature state
 */
export function createFeatureSnapshot(
  queryClient: QueryClient,
  queryKeys: readonly (readonly unknown[])[]
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};

  queryKeys.forEach((key) => {
    const data = queryClient.getQueryData(key);
    snapshot[JSON.stringify(key)] = data;
  });

  return snapshot;
}

/**
 * Compare two feature snapshots
 */
export function compareSnapshots(
  snapshot1: Record<string, unknown>,
  snapshot2: Record<string, unknown>
): {
  added: string[];
  removed: string[];
  changed: string[];
} {
  const keys1 = new Set(Object.keys(snapshot1));
  const keys2 = new Set(Object.keys(snapshot2));

  const added = Array.from(keys2).filter((k) => !keys1.has(k));
  const removed = Array.from(keys1).filter((k) => !keys2.has(k));
  const changed = Array.from(keys1)
    .filter((k) => keys2.has(k))
    .filter(
      (k) => JSON.stringify(snapshot1[k]) !== JSON.stringify(snapshot2[k])
    );

  return { added, removed, changed };
}

// ============================================================================
// Timing Utilities
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Delay execution for testing async behavior
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a random ID
 */
export function generateId(prefix = ''): string {
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}-${random}` : random;
}

/**
 * Generate a random date within a range
 */
export function generateDate(
  options: { min?: Date; max?: Date } = {}
): string {
  const min = options.min?.getTime() ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
  const max = options.max?.getTime() ?? Date.now();
  const timestamp = min + Math.random() * (max - min);
  return new Date(timestamp).toISOString();
}

/**
 * Generate test data with faker-like utilities
 */
export const testData = {
  id: generateId,
  date: generateDate,

  string: (length = 10): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  },

  number: (min = 0, max = 100): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  boolean: (): boolean => Math.random() > 0.5,

  email: (): string =>
    `test-${generateId()}@example.com`,

  name: (): string => {
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  },

  pick: <T>(array: T[]): T => {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const index = Math.floor(Math.random() * array.length);
    const item = array[index];
    if (item === undefined) {
      throw new Error('Unexpected undefined value in array');
    }
    return item;
  },

  array: <T>(length: number, factory: (index: number) => T): T[] =>
    Array.from({ length }, (_, i) => factory(i)),
};
