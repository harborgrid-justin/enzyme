/**
 * @file Logging Extension Examples
 * @description Comprehensive examples for using the Enzyme logging extension
 *
 * This file demonstrates all features of the logging extension with real-world
 * usage patterns for React applications.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState } from 'react';
import {
  initializeLogger,
  getLogger,
  useLogger,
  createRemoteTransport,
  consoleTransport,
  localStorageTransport,
  type LoggerConfig,
  type Logger,
} from './logging';

// ============================================================================
// Example 1: Basic Setup
// ============================================================================

/**
 * Initialize the global logger at app startup
 */
export function initializeAppLogging() {
  const logger = initializeLogger({
    level: 'info',
    enableBreadcrumbs: true,
    maxBreadcrumbs: 50,
    bufferSize: 100,
    flushInterval: 5000,
    enableMasking: true,
    enablePerformanceTracking: true,
    slowOperationThreshold: 1000,
    context: {
      appVersion: '1.0.0',
      environment: process.env.NODE_ENV,
    },
  });

  logger.$info('Application logging initialized');
  return logger;
}

// ============================================================================
// Example 2: Basic Logging
// ============================================================================

export function basicLoggingExample() {
  const logger = getLogger();

  // Different log levels
  logger.$trace('Very detailed debug information');
  logger.$debug('Debug information for developers');
  logger.$info('General information about app state');
  logger.$warn('Warning about potential issues');
  logger.$error('Error occurred', new Error('Something went wrong'));
  logger.$fatal('Critical failure', new Error('System failure'));

  // With context
  logger.$info('User action', {
    userId: '123',
    action: 'click',
    component: 'LoginButton',
  });
}

// ============================================================================
// Example 3: Operation Tracking
// ============================================================================

export async function operationTrackingExample() {
  const logger = getLogger();

  // Track API call
  const apiOp = logger.$startOperation('fetchUserData', 'api', {
    endpoint: '/api/users/123',
  });

  try {
    const response = await fetch('/api/users/123');
    const data = await response.json();
    logger.$endOperation(apiOp);
    return data;
  } catch (error) {
    logger.$error('API call failed', error as Error);
    logger.$endOperation(apiOp);
    throw error;
  }
}

// ============================================================================
// Example 4: React Component with Logging
// ============================================================================

export function UserProfileComponent({ userId }: { userId: string }) {
  const logger = useLogger();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Log component mount
    logger.$addBreadcrumb({
      type: 'navigation',
      message: 'UserProfile component mounted',
      data: { userId },
    });

    // Track data fetching operation
    const op = logger.$startOperation('loadUserProfile', 'api', { userId });

    fetch(`/api/users/${userId}`)
      .then(async (res) => await res.json())
      .then((data) => {
        setUser(data);
        logger.$endOperation(op);
        logger.$info('User profile loaded', { userId });
      })
      .catch((error) => {
        logger.$error('Failed to load user profile', error, { userId });
        logger.$endOperation(op);
      })
      .finally(() => {
        setLoading(false);
      });

    // Log component unmount
    return () => {
      logger.$addBreadcrumb({
        type: 'navigation',
        message: 'UserProfile component unmounted',
        data: { userId },
      });
    };
  }, [userId, logger]);

  if (loading) return <div>Loading...</div>;
  return <div>{JSON.stringify(user)}</div>;
}

// ============================================================================
// Example 5: Performance Tracking
// ============================================================================

export function performanceTrackingExample() {
  const logger = getLogger();

  // Track render performance
  const renderOp = logger.$startOperation('renderDashboard', 'render');

  // Simulate heavy rendering
  const startTime = performance.now();

  // ... complex rendering logic ...

  const endTime = performance.now();
  logger.$endOperation(renderOp);

  // Get performance metrics
  const metrics = logger.$getMetrics();
  logger.$info('Performance metrics', {
    totalOperations: metrics.totalOperations,
    averageDuration: metrics.averageDuration,
    slowestOperations: metrics.slowestOperations.slice(0, 5),
  });
}

// ============================================================================
// Example 6: Breadcrumbs for Debugging
// ============================================================================

export function breadcrumbsExample() {
  const logger = getLogger();

  // Track user navigation
  logger.$addBreadcrumb({
    type: 'navigation',
    message: 'User navigated to /dashboard',
    data: { from: '/home' },
  });

  // Track user actions
  logger.$addBreadcrumb({
    type: 'user-action',
    message: 'User clicked edit button',
    data: { itemId: '123' },
  });

  // Track state changes
  logger.$addBreadcrumb({
    type: 'state-change',
    message: 'Cart updated',
    data: { items: 3, total: 99.99 },
  });

  // When error occurs, breadcrumbs provide context
  try {
    throw new Error('Payment failed');
  } catch (error) {
    logger.$error('Payment processing failed', error as Error);

    // Get breadcrumbs to understand what led to the error
    const breadcrumbs = logger.$getBreadcrumbs();
    logger.$info('Error context breadcrumbs', { breadcrumbs });
  }
}

// ============================================================================
// Example 7: Remote Logging
// ============================================================================

export function remoteLoggingExample() {
  const logger = initializeLogger({
    level: 'info',
    transports: [
      consoleTransport,
      createRemoteTransport('https://logs.example.com/api/logs', {
        headers: {
          'X-API-Key': 'your-api-key',
        },
      }),
    ],
  });

  logger.$info('This log will be sent to both console and remote server');

  // Flush logs immediately
  void logger.$flushLogs();
}

// ============================================================================
// Example 8: Custom Filtering
// ============================================================================

export function filteringExample() {
  const logger = getLogger();

  // Filter out all trace and debug logs
  logger.$addFilter((entry) => {
    return entry.levelName !== 'trace' && entry.levelName !== 'debug';
  });

  // Filter by component
  logger.$addFilter((entry) => {
    // Only log entries from specific components
    const allowedComponents = ['UserProfile', 'Dashboard', 'Checkout'];
    return !entry.context.component || allowedComponents.includes(entry.context.component as string);
  });

  // Filter by user ID (e.g., only log for beta users)
  logger.$addFilter((entry) => {
    const betaUsers = ['user-123', 'user-456'];
    return !entry.context.userId || betaUsers.includes(entry.context.userId as string);
  });
}

// ============================================================================
// Example 9: Sensitive Data Masking
// ============================================================================

export function sensitiveDataExample() {
  const logger = initializeLogger({
    level: 'info',
    enableMasking: true,
    maskPatterns: [
      // Custom pattern for internal IDs
      /\bINT-\d{6}\b/g,
    ],
  });

  // This will automatically mask sensitive data
  logger.$info('User login', {
    email: 'user@example.com', // Will be masked
    password: 'secret123', // Will be masked
    creditCard: '4532-1234-5678-9010', // Will be masked
    ssn: '123-45-6789', // Will be masked
  });

  // Log message with sensitive data
  logger.$info('Processing payment for card 4532-1234-5678-9010'); // Card number masked
}

// ============================================================================
// Example 10: Dynamic Log Level
// ============================================================================

export function dynamicLogLevelExample() {
  const logger = getLogger();

  // Start with info level
  logger.$setLogLevel('info');

  // In development, enable debug
  if (process.env.NODE_ENV === 'development') {
    logger.$setLogLevel('debug');
  }

  // In production, only warn and above
  if (process.env.NODE_ENV === 'production') {
    logger.$setLogLevel('warn');
  }

  // Enable trace for specific users
  const currentUser = { isAdmin: true };
  if (currentUser.isAdmin) {
    logger.$setLogLevel('trace');
  }
}

// ============================================================================
// Example 11: Context Injection
// ============================================================================

export function contextInjectionExample() {
  const logger = getLogger();

  // Set user context after login
  logger.$updateContext({
    userId: '123',
    username: 'john.doe',
    role: 'admin',
  });

  // All subsequent logs will include this context
  logger.$info('User performed action'); // Includes userId, username, role

  // Add request-specific context
  logger.$updateContext({
    requestId: 'req-abc123',
  });

  logger.$info('Processing request'); // Includes all context
}

// ============================================================================
// Example 12: Error Recovery Pattern
// ============================================================================

export async function errorRecoveryExample() {
  const logger = getLogger();

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    const op = logger.$startOperation('apiCall', 'api', { attempt });

    try {
      const result = await fetch('/api/data');
      logger.$endOperation(op);
      return result;
    } catch (error) {
      attempt++;
      logger.$warn(`API call failed (attempt ${attempt}/${maxRetries})`, {
        error: (error as Error).message,
      });
      logger.$endOperation(op);

      if (attempt >= maxRetries) {
        logger.$error('Max retries reached', error as Error);
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// ============================================================================
// Example 13: Log History and Analysis
// ============================================================================

export function logHistoryExample() {
  const logger = getLogger();

  // Get all error logs
  const errors = logger.$getLogHistory({ level: 'error' });
  console.log('Recent errors:', errors);

  // Get API operation logs
  const apiLogs = logger.$getLogHistory({ category: 'api', limit: 10 });
  console.log('Recent API calls:', apiLogs);

  // Get recent logs with pagination
  const recentLogs = logger.$getLogHistory({ limit: 20, offset: 0 });
  console.log('Most recent logs:', recentLogs);
}

// ============================================================================
// Example 14: Production Configuration
// ============================================================================

export function productionLoggingSetup() {
  const logger = initializeLogger({
    // Only log warnings and errors in production
    level: 'warn',

    // Keep breadcrumbs for error context
    enableBreadcrumbs: true,
    maxBreadcrumbs: 30,

    // Buffer and batch logs
    bufferSize: 50,
    flushInterval: 10000, // 10 seconds

    // Mask sensitive data
    enableMasking: true,

    // Track performance issues
    enablePerformanceTracking: true,
    slowOperationThreshold: 2000, // 2 seconds

    // Send to multiple destinations
    transports: [
      // Console for development
      consoleTransport,

      // Remote logging service
      createRemoteTransport('https://logs.example.com/api/logs', {
        headers: {
          'Authorization': `Bearer ${process.env.LOG_API_KEY}`,
          'X-App-Version': '1.0.0',
        },
      }),

      // Local storage for offline support
      localStorageTransport,
    ],

    // Global context
    context: {
      appVersion: '1.0.0',
      environment: 'production',
      region: 'us-east-1',
    },
  });

  return logger;
}

// ============================================================================
// Example 15: Testing with Logger
// ============================================================================

export function testLoggingExample() {
  // Create isolated logger for testing
  const testLogger = initializeLogger({
    level: 'trace',
    enableBreadcrumbs: true,
    bufferSize: 1000, // Large buffer for test inspection
    flushInterval: 60000, // Don't auto-flush during tests
    transports: [], // No transports in tests
  });

  // Perform operations
  testLogger.$info('Test operation');
  const op = testLogger.$startOperation('testOp', 'custom');
  testLogger.$endOperation(op);

  // Inspect logs
  const logs = testLogger.$getLogHistory();
  expect(logs).toHaveLength(2);
  expect(logs[0]?.levelName).toBe('info');

  // Inspect metrics
  const metrics = testLogger.$getMetrics();
  expect(metrics.totalOperations).toBe(1);

  // Clear for next test
  testLogger.$clear();
}

// Helper function for test expectations (pseudo-code)
function expect(value: unknown) {
  return {
    toBe: (expected: unknown) => value === expected,
    toHaveLength: (expected: number) => Array.isArray(value) && value.length === expected,
  };
}
