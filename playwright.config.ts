import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright E2E Testing Configuration
 * Enterprise-grade setup with comprehensive browser coverage,
 * authentication state management, and CI/CD integration.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// Test directories
const testDir = './src/test/e2e';
const outputDir = './test-results';

// Environment configuration
const isCI = !!process.env['CI'];
const baseURL = process.env['BASE_URL'] ?? 'http://localhost:3000';

export default defineConfig({
  testDir,
  outputDir,

  // Fail fast in CI, allow full run locally
  fullyParallel: true,
  forbidOnly: isCI,

  // Retry configuration
  retries: isCI ? 2 : 0,

  // Worker configuration
  workers: isCI ? 1 : undefined,

  // Test timeout
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: './playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: './test-results/results.json' }],
    ...(isCI ? [['github' as const], ['junit' as const, { outputFile: './test-results/junit.xml' }]] : []),
  ],

  // Global test settings
  use: {
    baseURL,

    // Trace, screenshots, and video configuration
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: !isCI,

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Test projects with different browser configurations
  projects: [
    // ==========================================================================
    // Setup Project - Runs first to establish authenticated state
    // ==========================================================================
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    // ==========================================================================
    // Desktop Browsers
    // ==========================================================================
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(outputDir, '.auth/user.json'),
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(outputDir, '.auth/user.json'),
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: path.join(outputDir, '.auth/user.json'),
      },
      dependencies: ['setup'],
    },

    // ==========================================================================
    // Mobile Browsers
    // ==========================================================================
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: path.join(outputDir, '.auth/user.json'),
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        storageState: path.join(outputDir, '.auth/user.json'),
      },
      dependencies: ['setup'],
    },

    // ==========================================================================
    // Special Test Projects
    // ==========================================================================
    {
      name: 'chromium-no-auth',
      testMatch: /.*\.anonymous\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'accessibility',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(outputDir, '.auth/user.json'),
      },
      dependencies: ['setup'],
    },
    {
      name: 'visual',
      testMatch: /.*\.visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(outputDir, '.auth/user.json'),
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Global test hooks (if needed)
  globalSetup: undefined,
  globalTeardown: undefined,

  // Metadata for test reports
  metadata: {
    browserName: 'chromium',
    platform: process.platform,
    env: isCI ? 'ci' : 'local',
  },
});
