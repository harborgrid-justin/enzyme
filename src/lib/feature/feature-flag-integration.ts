/**
 * @file Feature Flag Integration
 * @description Deep integration between features and feature flags
 */

import { useMemo, useCallback } from 'react';
import type { FeatureRegistryEntry, FeatureTab } from './types';
import { getAllFeatures, getFeature } from './registry';
import { useFeatureFlagsStatus } from '../flags/useFeatureFlag';
import { useAuth } from '../auth/useAuth';
import { hasFeatureAccess } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Feature visibility state
 */
export interface FeatureVisibility {
  featureId: string;
  isVisible: boolean;
  isAccessible: boolean;
  reason?: 'flag_disabled' | 'insufficient_permissions' | 'not_authenticated' | undefined;
  tabs: TabVisibility[];
}

/**
 * Tab visibility state
 */
export interface TabVisibility {
  tabId: string;
  isVisible: boolean;
  isAccessible: boolean;
  reason?: 'flag_disabled' | 'insufficient_permissions' | undefined;
}

/**
 * Feature flag manifest entry
 */
export interface FeatureFlagManifestEntry {
  flag: string;
  featureId: string;
  tabId?: string;
  description?: string;
}

// ============================================================================
// Flag Extraction
// ============================================================================

/**
 * Extract all feature flags from registered features
 * Returns a unique list of all flags used across features
 */
export function extractFeatureFlags(): string[] {
  const features = getAllFeatures();
  const flags = new Set<string>();

  for (const feature of features) {
    const { access, tabs } = feature.config;

    // Main feature flag
    if (access.featureFlag !== undefined && access.featureFlag !== null && access.featureFlag !== '') {
      flags.add(access.featureFlag);
    }

    // Required flags
    access.requiredFlags?.forEach((flag) => flags.add(flag));

    // Tab-level flags
    tabs?.forEach((tab) => {
      if (tab.access?.featureFlag != null && tab.access.featureFlag.length > 0) {
        flags.add(tab.access.featureFlag);
      }
      tab.access?.requiredFlags?.forEach((flag) => flags.add(flag));
    });
  }

  return Array.from(flags).sort();
}

/**
 * Generate a manifest of all feature flags with their associations
 * Useful for documentation and flag management
 */
export function generateFeatureFlagManifest(): FeatureFlagManifestEntry[] {
  const features = getAllFeatures();
  const manifest: FeatureFlagManifestEntry[] = [];

  for (const feature of features) {
    const { metadata, access, tabs } = feature.config;

    // Main feature flag
    if (access.featureFlag != null && access.featureFlag.length > 0) {
      manifest.push({
        flag: access.featureFlag,
        featureId: metadata.id,
        description: `Enables the ${metadata.name} feature`,
      });
    }

    // Required flags at feature level
    access.requiredFlags?.forEach((flag) => {
      manifest.push({
        flag,
        featureId: metadata.id,
        description: `Required for ${metadata.name}`,
      });
    });

    // Tab-level flags
    tabs?.forEach((tab) => {
      if (tab.access?.featureFlag != null && tab.access.featureFlag.length > 0) {
        manifest.push({
          flag: tab.access.featureFlag,
          featureId: metadata.id,
          tabId: tab.id,
          description: `Enables the ${tab.label} tab in ${metadata.name}`,
        });
      }
      tab.access?.requiredFlags?.forEach((flag) => {
        manifest.push({
          flag,
          featureId: metadata.id,
          tabId: tab.id,
          description: `Required for ${tab.label} tab in ${metadata.name}`,
        });
      });
    });
  }

  return manifest;
}

/**
 * Generate flag keys constant from features
 * Useful for type-safe flag key generation
 */
export function generateFeatureFlagKeys(): Record<string, string> {
  const flags = extractFeatureFlags();
  const keys: Record<string, string> = {};

  for (const flag of flags) {
    // Convert flag name to constant key: "reports_enabled" -> "REPORTS_ENABLED"
    const key = flag.toUpperCase().replace(/-/g, '_');
    keys[key] = flag;
  }

  return keys;
}

// ============================================================================
// Visibility Hooks
// ============================================================================

/**
 * Hook to get visibility status for all features
 */
export function useFeatureVisibility(): FeatureVisibility[] {
  const features = getAllFeatures();
  const allFlags = extractFeatureFlags();
  const flagStatus = useFeatureFlagsStatus(allFlags);
  const { roles, isAuthenticated } = useAuth();

  return useMemo(() => {
    const enabledFlags = Object.entries(flagStatus)
      .filter(([, enabled]) => enabled)
      .map(([flag]) => flag);

    return features.map((feature) => {
      const { config } = feature;
      const { access, tabs } = config;

      // Check authentication
      if (access.requireAuth === true && !isAuthenticated) {
        return {
          featureId: config.metadata.id,
          isVisible: false,
          isAccessible: false,
          reason: 'not_authenticated' as const,
          tabs: [],
        };
      }

      // Check main feature visibility (flag enabled)
      const isVisible = access.featureFlag == null || access.featureFlag === '' || flagStatus[access.featureFlag] === true;

      // Check main feature access (roles/permissions)
      const isAccessible = hasFeatureAccess(access, roles, enabledFlags);

      // Determine reason for inaccessibility
      let reason: FeatureVisibility['reason'];
      if (!isVisible) {
        reason = 'flag_disabled';
      } else if (!isAccessible) {
        reason = 'insufficient_permissions';
      }

      // Check tab access
      const tabVisibility: TabVisibility[] = (tabs ?? []).map((tab) => {
        const tabVisible = tab.access?.featureFlag == null || tab.access?.featureFlag === '' ||
          flagStatus[tab.access.featureFlag] === true;

        const tabAccessible = tab.access
          ? hasFeatureAccess(tab.access, roles, enabledFlags)
          : isAccessible;

        let tabReason: TabVisibility['reason'];
        if (!tabVisible) {
          tabReason = 'flag_disabled';
        } else if (!tabAccessible) {
          tabReason = 'insufficient_permissions';
        }

        return {
          tabId: tab.id,
          isVisible: tabVisible,
          isAccessible: tabAccessible,
          reason: tabReason,
        };
      });

      return {
        featureId: config.metadata.id,
        isVisible,
        isAccessible,
        reason,
        tabs: tabVisibility,
      };
    });
  }, [features, flagStatus, roles, isAuthenticated]);
}

/**
 * Hook to get only accessible features (visible AND accessible)
 */
export function useAccessibleFeatures(): FeatureRegistryEntry[] {
  const features = getAllFeatures();
  const visibility = useFeatureVisibility();

  return useMemo(() => {
    const accessibleIds = new Set(
      visibility
        .filter((v) => v.isVisible && v.isAccessible)
        .map((v) => v.featureId)
    );

    return features.filter((f) => accessibleIds.has(f.config.metadata.id));
  }, [features, visibility]);
}

/**
 * Hook to get only visible features (flag enabled, regardless of permissions)
 */
export function useVisibleFeatures(): FeatureRegistryEntry[] {
  const features = getAllFeatures();
  const visibility = useFeatureVisibility();

  return useMemo(() => {
    const visibleIds = new Set(
      visibility
        .filter((v) => v.isVisible)
        .map((v) => v.featureId)
    );

    return features.filter((f) => visibleIds.has(f.config.metadata.id));
  }, [features, visibility]);
}

/**
 * Hook to check if a specific feature is accessible
 */
export function useIsFeatureAccessible(featureId: string): {
  isAccessible: boolean;
  isVisible: boolean;
  reason?: FeatureVisibility['reason'];
} {
  const visibility = useFeatureVisibility();

  return useMemo(() => {
    const feature = visibility.find((v) => v.featureId === featureId);
    return {
      isAccessible: feature?.isAccessible ?? false,
      isVisible: feature?.isVisible ?? false,
      reason: feature?.reason,
    };
  }, [visibility, featureId]);
}

/**
 * Hook to check if a specific tab is accessible within a feature
 */
export function useIsTabAccessible(featureId: string, tabId: string): {
  isAccessible: boolean;
  isVisible: boolean;
  reason?: TabVisibility['reason'];
} {
  const visibility = useFeatureVisibility();

  return useMemo(() => {
    const feature = visibility.find((v) => v.featureId === featureId);
    const tab = feature?.tabs.find((t) => t.tabId === tabId);

    return {
      isAccessible: tab?.isAccessible ?? false,
      isVisible: tab?.isVisible ?? false,
      reason: tab?.reason,
    };
  }, [visibility, featureId, tabId]);
}

/**
 * Hook to get accessible tabs for a feature
 */
export function useAccessibleTabs(featureId: string): FeatureTab[] {
  const feature = getFeature(featureId);
  const visibility = useFeatureVisibility();

  return useMemo(() => {
    if (!feature?.config.tabs) return [];

    const featureVisibility = visibility.find((v) => v.featureId === featureId);
    if (!featureVisibility) return [];

    const accessibleTabIds = new Set(
      featureVisibility.tabs
        .filter((t) => t.isVisible && t.isAccessible)
        .map((t) => t.tabId)
    );

    return feature.config.tabs.filter((tab) => accessibleTabIds.has(tab.id));
  }, [feature, visibility, featureId]);
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get a callback for checking feature accessibility
 * Useful for programmatic checks without re-renders
 */
export function useFeatureAccessChecker(): (featureId: string) => boolean {
  const visibility = useFeatureVisibility();

  return useCallback(
    (featureId: string) => {
      const feature = visibility.find((v) => v.featureId === featureId);
      return feature?.isVisible === true && feature?.isAccessible === true;
    },
    [visibility]
  );
}

/**
 * Hook to get all disabled features with reasons
 * Useful for debugging and admin dashboards
 */
export function useDisabledFeatures(): Array<{
  featureId: string;
  featureName: string;
  reason: FeatureVisibility['reason'];
}> {
  const features = getAllFeatures();
  const visibility = useFeatureVisibility();

  return useMemo(() => {
    return visibility
      .filter((v) => !v.isVisible || !v.isAccessible)
      .map((v) => {
        const feature = features.find((f) => f.config.metadata.id === v.featureId);
        return {
          featureId: v.featureId,
          featureName: feature?.config.metadata.name ?? v.featureId,
          reason: v.reason,
        };
      });
  }, [features, visibility]);
}
