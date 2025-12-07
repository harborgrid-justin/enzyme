/**
 * @file Feature Registry
 * @description Dynamic feature registration and route generation
 */

import type { RouteObject } from 'react-router-dom';
import type { FeatureRegistry, FeatureRegistryEntry } from './types';

/**
 * Global feature registry
 */
const featureRegistry: FeatureRegistry = new Map();

/**
 * Register a feature in the global registry
 * @param feature - Feature entry to register
 */
export function registerFeature(feature: FeatureRegistryEntry): void {
  const { metadata } = feature.config;

  if (featureRegistry.has(metadata.id)) {
    console.warn(`Feature "${metadata.id}" is already registered. Overwriting...`);
  }

  featureRegistry.set(metadata.id, feature);
}

/**
 * Unregister a feature from the registry
 * @param featureId - ID of the feature to unregister
 */
export function unregisterFeature(featureId: string): boolean {
  return featureRegistry.delete(featureId);
}

/**
 * Get a registered feature by ID
 * @param featureId - ID of the feature to retrieve
 */
export function getFeature(featureId: string): FeatureRegistryEntry | undefined {
  return featureRegistry.get(featureId);
}

/**
 * Get all registered features
 */
export function getAllFeatures(): FeatureRegistryEntry[] {
  return Array.from(featureRegistry.values());
}

/**
 * Get all registered feature IDs
 */
export function getFeatureIds(): string[] {
  return Array.from(featureRegistry.keys());
}

/**
 * Check if a feature is registered
 * @param featureId - ID of the feature to check
 */
export function isFeatureRegistered(featureId: string): boolean {
  return featureRegistry.has(featureId);
}

/**
 * Generate route configuration for a feature
 * @param feature - Feature entry to generate routes for
 */
function generateFeatureRoute(feature: FeatureRegistryEntry): RouteObject {
  const { config, component: FeatureComponent } = feature;
  const { metadata, tabs } = config;

  const baseRoute: RouteObject = {
    path: metadata.id,
    Component: FeatureComponent,
  };

  // If feature has tabs, generate child routes
  if (tabs !== undefined && tabs !== null && tabs.length > 0) {
    baseRoute.children = tabs.map((tab) => ({
      path: tab.path?.replace(`/${metadata.id}/`, '') ?? tab.id,
      Component: FeatureComponent,
    }));
  }

  return baseRoute;
}

/**
 * Get route objects for all registered features
 * Sorted by feature order
 */
export function getFeatureRoutes(): RouteObject[] {
  const features = getAllFeatures();

  // Sort by order (lower = first)
  const sortedFeatures = features.sort((a, b) => {
    const orderA = a.config.metadata.order ?? 999;
    const orderB = b.config.metadata.order ?? 999;
    return orderA - orderB;
  });

  return sortedFeatures.map(generateFeatureRoute);
}

/**
 * Get navigation items for all registered features
 * Useful for building dynamic navigation menus
 */
export function getFeatureNavItems(): Array<{
  id: string;
  name: string;
  path: string;
  icon?: string;
  order: number;
}> {
  const features = getAllFeatures();

  return features
    .map((feature) => {
      const navItem: {
        id: string;
        name: string;
        path: string;
        icon?: string;
        order: number;
      } = {
        id: feature.config.metadata.id,
        name: feature.config.metadata.name,
        path: `/${feature.config.metadata.id}`,
        order: feature.config.metadata.order ?? 999,
      };

      if (feature.config.metadata.icon !== undefined) {
        navItem.icon = feature.config.metadata.icon;
      }

      return navItem;
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * Initialize multiple features at once
 * @param features - Array of features to register
 */
export function initializeFeatures(features: FeatureRegistryEntry[]): void {
  features.forEach(registerFeature);
}

/**
 * Clear all registered features
 * Useful for testing or app reset
 */
export function clearFeatureRegistry(): void {
  featureRegistry.clear();
}

/**
 * Get feature count
 */
export function getFeatureCount(): number {
  return featureRegistry.size;
}
