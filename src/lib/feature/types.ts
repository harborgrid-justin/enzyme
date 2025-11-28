/**
 * @file Feature Types
 * @description Types for feature configuration (roles, flags, metadata)
 */

import type React from 'react';
import type { Role } from '../auth/types';

/**
 * Feature metadata
 */
export interface FeatureMetadata {
  /** Unique feature identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Description of the feature */
  description?: string;
  
  /** Feature icon name */
  icon?: string;
  
  /** Feature category for grouping */
  category?: string;
  
  /** Sort order in navigation */
  order?: number;
  
  /** Feature version */
  version?: string;
}

/**
 * Feature access configuration
 */
export interface FeatureAccess {
  /** Required roles to access the feature */
  requiredRoles?: Role[];
  
  /** Any of these roles grants access */
  allowedRoles?: Role[];
  
  /** Specific permissions required */
  permissions?: string[];
  
  /** Feature flag that must be enabled */
  featureFlag?: string;
  
  /** Additional feature flags that must be enabled */
  requiredFlags?: string[];
  
  /** Whether authentication is required */
  requireAuth?: boolean;
}

/**
 * Feature tab definition
 */
export interface FeatureTab {
  /** Tab identifier */
  id: string;
  
  /** Tab display label */
  label: string;
  
  /** Tab icon */
  icon?: string;
  
  /** Route path for the tab */
  path?: string;
  
  /** Whether tab is disabled */
  disabled?: boolean;
  
  /** Tab-specific access restrictions */
  access?: FeatureAccess;
  
  /** Badge count or indicator */
  badge?: number | string;
}

/**
 * Feature page configuration
 */
export interface FeatureConfig {
  /** Feature metadata */
  metadata: FeatureMetadata;
  
  /** Access configuration */
  access: FeatureAccess;
  
  /** Tab definitions */
  tabs?: FeatureTab[];
  
  /** Default tab ID */
  defaultTab?: string;
  
  /** Loading component override */
  loadingFallback?: React.ReactNode;
  
  /** Error component override */
  errorFallback?: React.ReactNode;
  
  /** Whether to show breadcrumbs */
  showBreadcrumbs?: boolean;
  
  /** Whether to show page title */
  showTitle?: boolean;
  
  /** Additional page metadata */
  pageMetadata?: {
    title?: string;
    description?: string;
  };
}

/**
 * Feature view model base interface
 */
export interface FeatureViewModel<TData = unknown> {
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Feature data */
  data: TData | null;
  
  /** Current tab (if applicable) */
  activeTab?: string;
  
  /** Tab change handler */
  setActiveTab?: (tab: string) => void;
  
  /** Refresh data */
  refresh: () => void;
}

/**
 * Feature page props
 */
export interface FeaturePageProps<TViewModel extends FeatureViewModel = FeatureViewModel> {
  /** Feature configuration */
  config: FeatureConfig;
  
  /** View model instance */
  viewModel: TViewModel;
}

/**
 * Feature component props
 */
export interface FeatureViewProps<TViewModel extends FeatureViewModel = FeatureViewModel> {
  /** View model */
  viewModel: TViewModel;
  
  /** Whether in loading state */
  isLoading?: boolean;
}

/**
 * Feature creation options
 */
export interface CreateFeatureOptions<
  TData = unknown,
  TViewModel extends FeatureViewModel<TData> = FeatureViewModel<TData>
> {
  /** Feature configuration */
  config: FeatureConfig;
  
  /** View model hook */
  useViewModel: () => TViewModel;
  
  /** View component */
  View: React.ComponentType<FeatureViewProps<TViewModel>>;
  
  /** Custom loading component */
  Loading?: React.ComponentType;
  
  /** Custom error component */
  Error?: React.ComponentType<{ error: Error; retry: () => void }>;
}

/**
 * Feature registry entry
 */
export interface FeatureRegistryEntry {
  config: FeatureConfig;
  component: React.LazyExoticComponent<React.ComponentType>;
}

/**
 * Feature registry
 */
export type FeatureRegistry = Map<string, FeatureRegistryEntry>;

/**
 * Check if user has access to feature
 */
export function hasFeatureAccess(
  access: FeatureAccess,
  userRoles: Role[],
  enabledFlags: string[]
): boolean {
  // Check authentication requirement
  if (access.requireAuth && !userRoles.length) {
    return false;
  }
  
  // Check feature flag
  if (access.featureFlag && !enabledFlags.includes(access.featureFlag)) {
    return false;
  }
  
  // Check required flags
  if (access.requiredFlags?.length) {
    const hasAllFlags = access.requiredFlags.every((flag) =>
      enabledFlags.includes(flag)
    );
    if (!hasAllFlags) return false;
  }
  
  // Check required roles (all must match)
  if (access.requiredRoles?.length) {
    const hasAllRoles = access.requiredRoles.every((role) =>
      userRoles.includes(role)
    );
    if (!hasAllRoles) return false;
  }
  
  // Check allowed roles (any must match)
  if (access.allowedRoles?.length) {
    const hasAnyRole = access.allowedRoles.some((role) =>
      userRoles.includes(role)
    );
    if (!hasAnyRole) return false;
  }
  
  return true;
}
