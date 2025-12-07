/**
 * @file TreeView Providers Index
 * @description Exports all TreeView providers for the Enzyme VS Code extension
 */

// Base provider
export { BaseTreeProvider } from './base-tree-provider';
export type { TreeProviderOptions } from './base-tree-provider';

// Tree items
export {
  EnzymeFeatureItem,
  EnzymeRouteItem,
  EnzymeComponentItem,
  EnzymeStoreItem,
  EnzymeHookItem,
  EnzymeAPIItem,
  EnzymeCategoryItem,
} from './tree-items';
export type { EnzymeTreeItemData } from './tree-items';

// Icon utilities
export {
  getIconForType,
  getIconForHttpMethod,
  getIconForFileType,
  getCustomIconPath,
  getIconForFeatureStatus,
  getIconForRoute,
  getIconForComponent,
  getIconForStore,
  getIconForHook,
  createBadgeIcon,
  getStatusIcon,
} from './icons';
export type { EnzymeIconType } from './icons';

// Specialized providers
export { EnzymeFeaturesTreeProvider } from './features-tree-provider';
export { EnzymeRoutesTreeProvider } from './routes-tree-provider';
export { EnzymeComponentsTreeProvider } from './components-tree-provider';
export { EnzymeStateTreeProvider } from './state-tree-provider';
export { EnzymeHooksTreeProvider } from './hooks-tree-provider';
export { EnzymeAPITreeProvider } from './api-tree-provider';

/**
 * Re-export all providers as a named object for convenience
 */
export const TreeProviders = {
  Features: EnzymeFeaturesTreeProvider,
  Routes: EnzymeRoutesTreeProvider,
  Components: EnzymeComponentsTreeProvider,
  State: EnzymeStateTreeProvider,
  Hooks: EnzymeHooksTreeProvider,
  API: EnzymeAPITreeProvider,
} as const;
