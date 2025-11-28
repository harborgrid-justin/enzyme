/**
 * @file Test Utilities
 * @description Custom render functions, mock factories, and testing helpers
 * for React components and hooks in the lib module.
 */

import React, { type ReactElement, type PropsWithChildren } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { renderHook, type RenderHookResult, type RenderHookOptions } from '@testing-library/react';
import { vi } from 'vitest';

// ============================================================================
// Provider Wrapper
// ============================================================================

/**
 * Props for the test wrapper
 */
interface TestWrapperProps extends PropsWithChildren {
  /** Initial authentication state */
  authenticated?: boolean;
  /** Initial store state overrides */
  initialState?: Record<string, unknown>;
}

/**
 * Default test wrapper with common providers
 */
function TestWrapper({ children }: TestWrapperProps): ReactElement {
  return <>{children}</>;
}

// ============================================================================
// Custom Render Functions
// ============================================================================

/**
 * Custom render options extending RTL options
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial authentication state */
  authenticated?: boolean;
  /** Initial store state overrides */
  initialState?: Record<string, unknown>;
  /** Custom wrapper component */
  wrapper?: React.ComponentType<PropsWithChildren>;
}

/**
 * Custom render function with providers
 *
 * @example
 * ```tsx
 * const { getByRole } = customRender(<MyComponent />, {
 *   authenticated: true,
 *   initialState: { theme: 'dark' }
 * });
 * ```
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { authenticated, initialState, wrapper: CustomWrapper, ...renderOptions } = options;

  function Wrapper({ children }: PropsWithChildren): ReactElement {
    const content = (
      <TestWrapper authenticated={authenticated} initialState={initialState}>
        {children}
      </TestWrapper>
    );

    if (CustomWrapper) {
      return <CustomWrapper>{content}</CustomWrapper>;
    }

    return content;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Custom render hook function with providers
 *
 * @example
 * ```tsx
 * const { result } = customRenderHook(() => useMyHook(), {
 *   authenticated: true
 * });
 * expect(result.current.value).toBe('expected');
 * ```
 */
export function customRenderHook<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options: Omit<RenderHookOptions<TProps>, 'wrapper'> & CustomRenderOptions = {}
): RenderHookResult<TResult, TProps> {
  const { authenticated, initialState, ...hookOptions } = options;

  function Wrapper({ children }: PropsWithChildren): ReactElement {
    return (
      <TestWrapper authenticated={authenticated} initialState={initialState}>
        {children}
      </TestWrapper>
    );
  }

  return renderHook(hook, { wrapper: Wrapper, ...hookOptions });
}

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Create a mock user object
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: `user-${Date.now()}`,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    displayName: 'Test User',
    roles: ['user'],
    permissions: ['read', 'write'],
    avatar: 'https://example.com/avatar.png',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock user interface
 */
export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create mock auth tokens
 */
export function createMockAuthTokens(overrides: Partial<MockAuthTokens> = {}): MockAuthTokens {
  const now = Date.now();
  return {
    accessToken: `mock-access-token-${now}`,
    refreshToken: `mock-refresh-token-${now}`,
    expiresAt: now + 3600000, // 1 hour
    ...overrides,
  };
}

/**
 * Mock auth tokens interface
 */
export interface MockAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Create a mock API response
 */
export function createMockApiResponse<T>(data: T, overrides: Partial<MockApiResponse<T>> = {}): MockApiResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    ...overrides,
  };
}

/**
 * Mock API response interface
 */
export interface MockApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Create a mock API error
 */
export function createMockApiError(overrides: Partial<MockApiError> = {}): MockApiError {
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    category: 'server',
    severity: 'error',
    retryable: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Mock API error interface
 */
export interface MockApiError {
  status: number;
  code: string;
  message: string;
  category: string;
  severity: string;
  retryable: boolean;
  timestamp: number;
  fieldErrors?: Array<{ field: string; message: string }>;
}

/**
 * Create mock store state
 */
export function createMockStoreState(overrides: Partial<MockStoreState> = {}): MockStoreState {
  return {
    // UI state
    sidebarOpen: true,
    sidebarCollapsed: false,
    layoutDensity: 'comfortable',
    animationsEnabled: true,
    globalLoading: false,
    activeModal: null,
    toasts: [],

    // Session state
    isAuthenticated: false,
    user: null,
    sessionStartedAt: null,
    lastActivity: null,

    // Settings state
    locale: 'en-US',
    timezone: 'America/New_York',
    theme: 'system',
    notificationsEnabled: true,
    reducedMotion: false,

    // Hydration state
    _hasHydrated: true,

    ...overrides,
  };
}

/**
 * Mock store state interface
 */
export interface MockStoreState {
  // UI state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  layoutDensity: string;
  animationsEnabled: boolean;
  globalLoading: boolean;
  activeModal: string | null;
  toasts: unknown[];

  // Session state
  isAuthenticated: boolean;
  user: MockUser | null;
  sessionStartedAt: number | null;
  lastActivity: number | null;

  // Settings state
  locale: string;
  timezone: string;
  theme: string;
  notificationsEnabled: boolean;
  reducedMotion: boolean;

  // Hydration
  _hasHydrated: boolean;
}

// ============================================================================
// Async Test Helpers
// ============================================================================

/**
 * Wait for all pending promises to resolve
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Wait for a specific amount of time
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise for controlling async flow in tests
 */
export function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Deferred promise interface
 */
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

// ============================================================================
// Mock Function Helpers
// ============================================================================

/**
 * Create a spy that tracks calls and can be resolved/rejected
 */
export function createAsyncSpy<T>(
  defaultResponse?: T
): AsyncSpy<T> {
  const spy = vi.fn().mockImplementation(() => Promise.resolve(defaultResponse));

  return Object.assign(spy, {
    resolveWith: (value: T) => spy.mockResolvedValue(value),
    rejectWith: (error: Error) => spy.mockRejectedValue(error),
    resolveOnce: (value: T) => spy.mockResolvedValueOnce(value),
    rejectOnce: (error: Error) => spy.mockRejectedValueOnce(error),
  });
}

/**
 * Async spy interface
 */
export interface AsyncSpy<T> extends ReturnType<typeof vi.fn> {
  resolveWith: (value: T) => void;
  rejectWith: (error: Error) => void;
  resolveOnce: (value: T) => void;
  rejectOnce: (error: Error) => void;
}

// ============================================================================
// Event Helpers
// ============================================================================

/**
 * Create a mock event
 */
export function createMockEvent<T extends Event>(
  type: string,
  props: Partial<T> = {}
): T {
  const event = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(event, props) as T;
}

/**
 * Create a mock keyboard event
 */
export function createMockKeyboardEvent(
  key: string,
  options: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

// ============================================================================
// Storage Mock Helpers
// ============================================================================

/**
 * Create a mock storage implementation
 */
export function createMockStorage(): MockStorage {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    },
    _store: store,
  };
}

/**
 * Mock storage interface
 */
export interface MockStorage {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  key: ReturnType<typeof vi.fn>;
  length: number;
  _store: Map<string, string>;
}

// ============================================================================
// Secure Storage Mock
// ============================================================================

/**
 * Create a mock secure storage implementation
 */
export function createMockSecureStorage(): MockSecureStorage {
  const store = new Map<string, unknown>();

  return {
    getItem: vi.fn(async (key: string) => {
      const value = store.get(key);
      if (value === undefined) {
        return { success: true, data: undefined };
      }
      return { success: true, data: value };
    }),
    setItem: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
      return { success: true };
    }),
    removeItem: vi.fn(async (key: string) => {
      store.delete(key);
      return { success: true };
    }),
    clear: vi.fn(async () => {
      store.clear();
      return { success: true };
    }),
    _store: store,
  };
}

/**
 * Mock secure storage interface
 */
export interface MockSecureStorage {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  _store: Map<string, unknown>;
}

// ============================================================================
// Fetch Mock Helpers
// ============================================================================

/**
 * Create a mock fetch function
 */
export function createMockFetch(): MockFetch {
  const mockFetch = vi.fn().mockImplementation(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
  }));

  return Object.assign(mockFetch, {
    mockResponse: (data: unknown, status = 200) => {
      mockFetch.mockResolvedValueOnce({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: new Headers(),
        json: async () => data,
        text: async () => JSON.stringify(data),
      });
    },
    mockError: (status: number, message: string) => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status,
        statusText: message,
        headers: new Headers(),
        json: async () => ({ error: message }),
        text: async () => JSON.stringify({ error: message }),
      });
    },
    mockNetworkError: () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    },
  });
}

/**
 * Mock fetch interface
 */
export interface MockFetch extends ReturnType<typeof vi.fn> {
  mockResponse: (data: unknown, status?: number) => void;
  mockError: (status: number, message: string) => void;
  mockNetworkError: () => void;
}

// ============================================================================
// Re-exports
// ============================================================================

// Re-export testing-library utilities for convenience
export { screen, within, waitFor, fireEvent } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { act } from 'react';

// Export custom render as default render
export { customRender as render, customRenderHook as renderHook };
