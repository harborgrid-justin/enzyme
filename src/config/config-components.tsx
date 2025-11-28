/**
 * @file Configuration Utility Components
 * @description React components for conditional rendering based on configuration.
 *
 * @module config/config-components
 */

import React, { type ReactNode } from 'react';
import { useConfigContext } from './use-config-context';

// =============================================================================
// Utility Components
// =============================================================================

/**
 * Component that renders only when configuration is initialized
 */
export function ConfigReady({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}): React.ReactElement | null {
  const { isInitialized } = useConfigContext();

  if (!isInitialized) {
    return fallback != null ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

ConfigReady.displayName = 'ConfigReady';

/**
 * Component that conditionally renders based on feature flag
 */
export function FeatureFlag({
  flag,
  children,
  fallback,
}: {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}): React.ReactElement | null {
  const { dynamicConfig } = useConfigContext();
  const isEnabled = dynamicConfig.isFlagEnabled(flag);

  if (!isEnabled) {
    return fallback != null ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

FeatureFlag.displayName = 'FeatureFlag';

/**
 * Component that renders based on A/B test variant
 */
export function ABTest({
  testId,
  userId,
  variants,
  fallback,
}: {
  testId: string;
  userId?: string;
  variants: Record<string, ReactNode>;
  fallback?: ReactNode;
}): React.ReactElement | null {
  const { dynamicConfig } = useConfigContext();
  const variant = dynamicConfig.getVariant(testId, userId);

  if (variant == null) {
    return fallback != null ? <>{fallback}</> : null;
  }

  const content = variants[variant.id];
  if (content == null) {
    return fallback != null ? <>{fallback}</> : null;
  }

  return <>{content}</>;
}

ABTest.displayName = 'ABTest';
