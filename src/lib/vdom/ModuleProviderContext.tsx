/**
 * @file Module Provider Context
 * @module vdom/ModuleProviderContext
 * @description Context definitions for the Module Provider.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import { createContext, type ReactNode } from 'react';
import { type ModuleId, type ModuleProviderConfig, type ModulePerformanceMetrics } from './types';
import { type VDOMPool } from './vdom-pool';
import { type ModuleRegistry } from './module-registry';
import { type ModuleLoader } from './module-loader';
import { type ModuleEventBus } from './event-bus';
import { type SecuritySandbox } from './security-sandbox';

// ============================================================================
// Types
// ============================================================================

/**
 * Module system context value.
 */
export interface ModuleSystemContextValue {
  /** Configuration */
  readonly config: ModuleProviderConfig;
  /** VDOM pool instance */
  readonly pool: VDOMPool;
  /** Module registry instance */
  readonly registry: ModuleRegistry;
  /** Module loader instance */
  readonly loader: ModuleLoader;
  /** Event bus instance */
  readonly eventBus: ModuleEventBus;
  /** Global security sandbox */
  readonly security: SecuritySandbox;
  /** Whether system is initialized */
  readonly isInitialized: boolean;
  /** Report performance metrics */
  readonly reportMetrics: (moduleId: ModuleId, metrics: ModulePerformanceMetrics) => void;
  /** Check performance budget */
  readonly checkBudget: (moduleId: ModuleId, metrics: ModulePerformanceMetrics) => void;
}

/**
 * Module provider props.
 */
export interface ModuleProviderProps {
  /** Child components */
  children: ReactNode;
  /** Provider configuration */
  config?: Partial<ModuleProviderConfig>;
  /** Custom VDOM pool (optional) */
  pool?: VDOMPool;
  /** Custom registry (optional) */
  registry?: ModuleRegistry;
  /** Custom loader (optional) */
  loader?: ModuleLoader;
  /** Custom event bus (optional) */
  eventBus?: ModuleEventBus;
  /** Callback when system is ready */
  onReady?: () => void;
  /** Callback on system error */
  onError?: (error: Error) => void;
}

// ============================================================================
// Context
// ============================================================================

/**
 * Module system context.
 */
export const ModuleSystemContext = createContext<ModuleSystemContextValue | null>(null);

/**
 * Internal module hierarchy context for tracking module nesting.
 */
export const ModuleHierarchyContext = createContext<{
  moduleId: ModuleId | null;
  depth: number;
  path: ModuleId[];
}>({
  moduleId: null,
  depth: 0,
  path: [],
});
