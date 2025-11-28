/**
 * @file Global Test Setup
 * @description Global test setup for Vitest. Configures testing-library,
 * mocks, and test environment.
 *
 * @module test/setup
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// ============================================================================
// Global Setup
// ============================================================================

beforeAll(() => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const mediaQueryList = {
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null as ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn().mockReturnValue(true),
      };
      return mediaQueryList;
    }),
  });

  // Mock IntersectionObserver
  const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: vi.fn().mockReturnValue([]),
  }));
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

  // Mock ResizeObserver
  const mockResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  vi.stubGlobal('ResizeObserver', mockResizeObserver);

  // Mock window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn(),
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ============================================================================
// Cleanup After Each Test
// ============================================================================

afterEach(() => {
  // Cleanup React Testing Library
  cleanup();
  // Clear all mocks
  vi.clearAllMocks();
  // Reset all modules
  vi.resetModules();
});

// ============================================================================
// Global Error Handling
// ============================================================================

// Suppress console errors during tests (optional - can be configured)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Filter out expected React warnings during tests
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render is no longer supported') ||
        message.includes('Warning: An update to') ||
        message.includes('act(...)'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
