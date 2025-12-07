/**
 * @file Vitest Configuration
 * @description Configuration for unit tests with enhanced coverage reporting
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Set explicit root to prevent parent directory config lookup
  root: __dirname,

  test: {
    // Enable globals like describe, it, expect
    globals: true,

    // Node environment for VS Code extension testing
    environment: 'node',

    // Include all unit test files
    include: ['src/test/unit/**/*.test.ts', 'src/test/helpers/**/*.test.ts'],

    // Exclude integration tests and build output
    exclude: ['node_modules', 'out', 'dist', 'test/suite/**', '**/*.d.ts'],

    // Coverage configuration
    coverage: {
      // Use V8 coverage provider for accurate coverage
      provider: 'v8',

      // Enable all reporters for comprehensive coverage reporting
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html', 'lcov', 'clover'],

      // Report coverage in the terminal
      reportOnFailure: true,

      // Exclude files from coverage
      exclude: [
        'node_modules/**',
        'out/**',
        'dist/**',
        'test/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/mockData/**',
        '**/__mocks__/**',
        '**/helpers/**',
        'src/types/**',
        'src/webview-ui/**', // Separate webview testing
      ],

      // Include source files for coverage
      include: [
        'src/**/*.ts'
      ],

      // Coverage thresholds - enforce quality standards
      thresholds: {
        lines: 75,       // 75% line coverage
        functions: 75,   // 75% function coverage
        branches: 70,    // 70% branch coverage
        statements: 75,  // 75% statement coverage

        // Per-file thresholds
        perFile: true,
      },

      // Generate coverage reports in the coverage directory
      reportsDirectory: './coverage',

      // Clean coverage directory before each run
      clean: true,

      // Report uncovered lines
      all: true,
    },

    // Test timeouts
    testTimeout: 10000,      // 10 seconds for tests
    hookTimeout: 10000,      // 10 seconds for hooks

    // Mock configuration
    mockReset: true,         // Reset mocks between tests
    restoreMocks: true,      // Restore original implementations
    clearMocks: true,        // Clear mock call history

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Silent console output during tests (cleaner output)
    silent: false,

    // Show test execution time
    logHeapUsage: true,

    // Retry failed tests
    retry: 0,

    // Setup files
    setupFiles: [],

    // CSS handling - mock CSS imports in tests
    css: false,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },

  // Don't process CSS in tests
  css: {
    modules: false,
  },
});
