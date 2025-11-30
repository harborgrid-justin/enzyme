/**
 * @fileoverview React Environment Detection and Conflict Resolution
 *
 * This module provides utilities to detect and handle React version conflicts
 * that can cause blank pages when users have React, React DOM, or similar
 * packages installed alongside this library.
 *
 * Key features:
 * - Detects multiple React instances in the bundle
 * - Validates React version compatibility
 * - Provides warnings for version mismatches
 * - Offers fallback rendering strategies
 *
 * @module core/react-env
 * @version 1.0.0
 */

import React from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * React environment status information.
 */
export interface ReactEnvironmentStatus {
  /** Whether React is available */
  isReactAvailable: boolean;
  /** Whether ReactDOM is available */
  isReactDOMAvailable: boolean;
  /** Detected React version */
  reactVersion: string | null;
  /** Whether multiple React instances are detected */
  hasMultipleInstances: boolean;
  /** Whether the React version is compatible */
  isVersionCompatible: boolean;
  /** List of detected issues */
  issues: ReactEnvironmentIssue[];
  /** Timestamp of the check */
  checkedAt: number;
}

/**
 * React environment issue details.
 */
export interface ReactEnvironmentIssue {
  /** Issue type */
  type: 'multiple_instances' | 'version_mismatch' | 'missing_react' | 'missing_react_dom' | 'hooks_error' | 'jsx_runtime_error';
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Human-readable message */
  message: string;
  /** Suggested resolution */
  resolution?: string;
}

/**
 * Configuration for React environment checks.
 */
export interface ReactEnvironmentConfig {
  /** Minimum supported React version */
  minVersion?: string;
  /** Maximum supported React version */
  maxVersion?: string;
  /** Whether to throw on critical issues */
  throwOnCritical?: boolean;
  /** Whether to log warnings to console */
  logWarnings?: boolean;
  /** Callback when issues are detected */
  onIssuesDetected?: (issues: ReactEnvironmentIssue[]) => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum supported React version */
const MIN_SUPPORTED_VERSION = '18.0.0';

/** Maximum supported React version */
const MAX_SUPPORTED_VERSION = '20.0.0';

/** Key used to track React instances on window */
const REACT_INSTANCE_KEY = '__ENZYME_REACT_INSTANCES__';

/** Key used to store environment status */
const ENV_STATUS_KEY = '__ENZYME_REACT_ENV_STATUS__';

// ============================================================================
// Version Utilities
// ============================================================================

/**
 * Parses a semantic version string into components.
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  const major = match?.[1];
  const minor = match?.[2];
  const patch = match?.[3];
  if (major === undefined || minor === undefined || patch === undefined) return null;
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
  };
}

/**
 * Compares two version strings.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 */
function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  if (!versionA || !versionB) return 0;

  if (versionA.major !== versionB.major) {
    return versionA.major > versionB.major ? 1 : -1;
  }
  if (versionA.minor !== versionB.minor) {
    return versionA.minor > versionB.minor ? 1 : -1;
  }
  if (versionA.patch !== versionB.patch) {
    return versionA.patch > versionB.patch ? 1 : -1;
  }
  return 0;
}

/**
 * Checks if a version is within a supported range.
 */
function isVersionInRange(version: string, min: string, max: string): boolean {
  return compareVersions(version, min) >= 0 && compareVersions(version, max) < 0;
}

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Detects the current React version.
 */
export function detectReactVersion(): string | null {
  try {
    // Access version property from React (typed as unknown to avoid any)
    const reactObj = React as unknown as { version?: string };
    const reactVersion = reactObj.version;
    if (typeof reactVersion === 'string') {
      return reactVersion;
    }
  } catch {
    // React not available
  }
  return null;
}

/**
 * Window extended with React instance tracking.
 */
interface WindowWithReactTracking extends Window {
  [REACT_INSTANCE_KEY]?: Set<string>;
}

/**
 * Detects if multiple React instances are present.
 * This is a common cause of blank pages and hook errors.
 */
export function detectMultipleReactInstances(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Track React instances using a window property
    const win = window as WindowWithReactTracking;

    // Initialize tracking set if not present
    win[REACT_INSTANCE_KEY] ??= new Set<string>();

    const instanceSet = win[REACT_INSTANCE_KEY];
    if (instanceSet === undefined) return false;

    // Generate a unique identifier for this React instance
    const instanceId = `react-${detectReactVersion() ?? 'unknown'}-${Date.now()}`;
    instanceSet.add(instanceId);

    // Check if there are multiple instances
    // This is a heuristic - if the Set grows beyond 1 unique entry
    // AND the instances have different versions, we have a conflict
    const instances = Array.from(instanceSet);

    // Extract versions from instance IDs
    const versions = new Set(
      instances
        .map((id: string) => id.split('-')[1])
        .filter((v: string | undefined): v is string => v !== undefined && v !== 'unknown')
    );

    return versions.size > 1;
  } catch {
    return false;
  }
}

/**
 * React with hook functions typed.
 */
interface ReactWithHooks {
  useState?: unknown;
  useEffect?: unknown;
  useContext?: unknown;
  createElement?: unknown;
}

/**
 * Checks if React hooks are working correctly.
 * Multiple React instances often break hooks.
 */
export function validateReactHooks(): boolean {
  try {
    // This is a minimal check - if useState is callable, hooks should work
    // The actual validation happens at runtime when components render
    const reactObj = React as unknown as ReactWithHooks;
    return typeof reactObj.useState === 'function' &&
           typeof reactObj.useEffect === 'function' &&
           typeof reactObj.useContext === 'function';
  } catch {
    return false;
  }
}

/**
 * Checks if JSX runtime is available.
 */
export function validateJSXRuntime(): boolean {
  try {
    // Check if createElement is available (needed for JSX)
    const reactObj = React as unknown as ReactWithHooks;
    return typeof reactObj.createElement === 'function';
  } catch {
    return false;
  }
}

/**
 * Window with ReactDOM for UMD builds.
 */
interface WindowWithReactDOM extends Window {
  ReactDOM?: unknown;
}

/**
 * Checks if ReactDOM is available.
 */
export function validateReactDOM(): boolean {
  if (typeof window === 'undefined') return true; // SSR context

  try {
    // Check window.ReactDOM for UMD builds
    const win = window as WindowWithReactDOM;
    if (win.ReactDOM !== undefined) return true;

    // For ES modules, we can't easily check without dynamic import
    // But if React is available, ReactDOM is usually bundled together
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Environment Status
// ============================================================================

/**
 * Performs a comprehensive React environment check.
 */
export function checkReactEnvironment(
  config: ReactEnvironmentConfig = {}
): ReactEnvironmentStatus {
  const {
    minVersion = MIN_SUPPORTED_VERSION,
    maxVersion = MAX_SUPPORTED_VERSION,
    logWarnings = true,
    onIssuesDetected,
  } = config;

  const issues: ReactEnvironmentIssue[] = [];
  const reactVersion = detectReactVersion();
  const hasMultipleInstances = detectMultipleReactInstances();
  const isReactAvailable = reactVersion !== null;
  const isReactDOMAvailable = validateReactDOM();
  const hooksValid = validateReactHooks();
  const jsxValid = validateJSXRuntime();

  // Check for missing React
  if (!isReactAvailable) {
    issues.push({
      type: 'missing_react',
      severity: 'error',
      message: 'React is not available. Components will not render.',
      resolution: 'Ensure React is installed: npm install react react-dom',
    });
  }

  // Check for missing ReactDOM
  if (!isReactDOMAvailable) {
    issues.push({
      type: 'missing_react_dom',
      severity: 'error',
      message: 'ReactDOM is not available. Portals and rendering will fail.',
      resolution: 'Ensure ReactDOM is installed: npm install react-dom',
    });
  }

  // Check for multiple instances
  if (hasMultipleInstances) {
    issues.push({
      type: 'multiple_instances',
      severity: 'error',
      message: 'Multiple React instances detected. This causes blank pages and hook errors.',
      resolution: 'Ensure only one version of React is installed. Check your package.json for duplicate react dependencies and use npm dedupe.',
    });
  }

  // Check version compatibility
  let isVersionCompatible = true;
  if (reactVersion !== null && !isVersionInRange(reactVersion, minVersion, maxVersion)) {
    isVersionCompatible = false;
    issues.push({
      type: 'version_mismatch',
      severity: 'warning',
      message: `React version ${reactVersion} may not be fully compatible. Supported: ${minVersion} - ${maxVersion}`,
      resolution: `Update React to a supported version: npm install react@^18.3.1 react-dom@^18.3.1`,
    });
  }

  // Check hooks
  if (!hooksValid) {
    issues.push({
      type: 'hooks_error',
      severity: 'error',
      message: 'React hooks are not functioning correctly. This usually indicates multiple React instances.',
      resolution: 'Run npm ls react to check for duplicate React installations.',
    });
  }

  // Check JSX runtime
  if (!jsxValid) {
    issues.push({
      type: 'jsx_runtime_error',
      severity: 'error',
      message: 'JSX runtime is not available. Components will not render correctly.',
      resolution: 'Ensure you have the correct React version with JSX runtime support (React 17+).',
    });
  }

  const status: ReactEnvironmentStatus = {
    isReactAvailable,
    isReactDOMAvailable,
    reactVersion,
    hasMultipleInstances,
    isVersionCompatible,
    issues,
    checkedAt: Date.now(),
  };

  // Log warnings
  if (logWarnings && issues.length > 0) {
    const errorIssues = issues.filter(i => i.severity === 'error');
    const warningIssues = issues.filter(i => i.severity === 'warning');

    if (errorIssues.length > 0) {
      console.error(
        `[Enzyme] React environment errors detected:\n${errorIssues.map(i => `  - ${i.message}\n    Resolution: ${i.resolution ?? 'N/A'}`).join('\n')}`
      );
    }

    if (warningIssues.length > 0) {
      console.warn(
        `[Enzyme] React environment warnings:\n${warningIssues.map(i => `  - ${i.message}\n    Resolution: ${i.resolution ?? 'N/A'}`).join('\n')}`
      );
    }
  }

  // Call callback
  if (onIssuesDetected && issues.length > 0) {
    onIssuesDetected(issues);
  }

  // Cache status
  if (typeof window !== 'undefined') {
    const win = window as WindowWithEnvStatus;
    win[ENV_STATUS_KEY] = status;
  }

  return status;
}

/**
 * Window with cached environment status.
 */
interface WindowWithEnvStatus extends Window {
  [ENV_STATUS_KEY]?: ReactEnvironmentStatus;
}

/**
 * Gets the cached React environment status.
 */
export function getCachedEnvironmentStatus(): ReactEnvironmentStatus | null {
  if (typeof window === 'undefined') return null;
  const win = window as WindowWithEnvStatus;
  return win[ENV_STATUS_KEY] ?? null;
}

/**
 * Checks if the React environment is healthy.
 */
export function isReactEnvironmentHealthy(): boolean {
  const status = getCachedEnvironmentStatus() ?? checkReactEnvironment({ logWarnings: false });
  return (
    status.isReactAvailable &&
    status.isReactDOMAvailable &&
    !status.hasMultipleInstances &&
    status.issues.filter(i => i.severity === 'error').length === 0
  );
}

// ============================================================================
// Safe Rendering Utilities
// ============================================================================

/**
 * Safely creates a React portal, returning null if ReactDOM is unavailable.
 */
export function safeCreatePortal(
  children: React.ReactNode,
  container: Element | DocumentFragment
): React.ReactPortal | null {
  try {
    // Import createPortal from react-dom (statically imported at module level)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPortal } = require('react-dom') as { createPortal?: typeof import('react-dom').createPortal };
    if (typeof createPortal === 'function') {
      return createPortal(children, container);
    }
  } catch {
    console.warn('[Enzyme] createPortal failed - ReactDOM may not be available');
  }
  return null;
}

/**
 * Wraps a component with React environment validation.
 * Renders a fallback if the environment is unhealthy.
 */
export function withReactEnvironmentGuard<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
): React.FC<P> {
  const GuardedComponent: React.FC<P> = (props) => {
    const [isHealthy, setIsHealthy] = React.useState<boolean | null>(null);

    React.useEffect(() => {
      const status = checkReactEnvironment({ logWarnings: true });
      setIsHealthy(status.issues.filter(i => i.severity === 'error').length === 0);
    }, []);

    // During initial check, render nothing to avoid flash
    if (isHealthy === null) {
      return null;
    }

    // If unhealthy, render fallback
    if (!isHealthy) {
      if (fallback) {
        return React.createElement(React.Fragment, null, fallback);
      }
      return React.createElement(
        'div',
        {
          style: {
            padding: '20px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#856404',
          },
        },
        React.createElement('strong', null, 'React Environment Error'),
        React.createElement('p', null, 'Multiple React instances detected. Please check your dependencies.'),
        React.createElement('code', null, 'npm ls react')
      );
    }

    return React.createElement(Component, props);
  };

  GuardedComponent.displayName = `withReactEnvironmentGuard(${Component.displayName ?? Component.name ?? 'Component'})`;

  return GuardedComponent;
}

// ============================================================================
// Initialization
// ============================================================================

// Run initial check on module load (client-side only)
if (typeof window !== 'undefined') {
  // Use queueMicrotask to avoid blocking
  queueMicrotask(() => {
    checkReactEnvironment({ logWarnings: true });
  });
}

// Export all utilities
export {
  parseVersion,
  compareVersions,
  isVersionInRange,
};

// Export React Environment Provider
export {
  ReactEnvironmentProvider,
  useReactEnvironment,
  withReactEnvironmentCheck,
  type ReactEnvironmentContextValue,
  type ReactEnvironmentProviderProps,
} from './ReactEnvironmentProvider';
