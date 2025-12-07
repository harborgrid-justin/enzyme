/**
 * @file Generator Types
 * @description Shared types for all generators
 */

// ============================================================================
// Component Types
// ============================================================================

export type ComponentType = 'ui' | 'feature' | 'shared' | 'layout';

export interface ComponentOptions {
  name: string;
  type?: ComponentType;
  path?: string;
  withStyles?: boolean;
  withStory?: boolean;
  withTest?: boolean;
  memo?: boolean;
  forwardRef?: boolean;
}

// ============================================================================
// Hook Types
// ============================================================================

export type HookType = 'query' | 'mutation' | 'state' | 'effect' | 'callback' | 'custom';

export interface HookOptions {
  name: string;
  type?: HookType;
  path?: string;
  withTest?: boolean;
}

// ============================================================================
// Page Types
// ============================================================================

export interface PageOptions {
  name: string;
  route?: string;
  layout?: string;
  withState?: boolean;
  withQuery?: boolean;
  withForm?: boolean;
  path?: string;
}

// ============================================================================
// Route Types
// ============================================================================

export interface RouteOptions {
  path: string;
  layout?: string;
  guard?: string;
  loader?: boolean;
  action?: boolean;
  lazy?: boolean;
  meta?: string;
}

// ============================================================================
// Module Types
// ============================================================================

export interface ModuleOptions {
  name: string;
  withRoutes?: boolean;
  withState?: boolean;
  withApi?: boolean;
  withComponents?: boolean;
  withHooks?: boolean;
  full?: boolean;
}

// ============================================================================
// Slice Types
// ============================================================================

export type SliceActionType = 'simple' | 'async' | 'crud';

export interface SliceOptions {
  name: string;
  withCrud?: boolean;
  withSelectors?: boolean;
  withPersistence?: boolean;
  actions?: SliceActionType[];
}

// ============================================================================
// Service Types
// ============================================================================

export type ServiceEndpointType = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface ServiceOptions {
  name: string;
  endpoints?: ServiceEndpointType[];
  withCrud?: boolean;
  withCache?: boolean;
  withOptimistic?: boolean;
  baseUrl?: string;
}

// ============================================================================
// Common Types
// ============================================================================

export interface ImportStatement {
  module: string;
  imports: string[];
  type?: boolean;
  default?: string;
}

export interface ExportStatement {
  name: string;
  type?: 'named' | 'default';
}
