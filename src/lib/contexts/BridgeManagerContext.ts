/**
 * @file Bridge Manager Context
 * @description Context for context bridge management (Fast Refresh compliant).
 */

import { createContext, type Context } from 'react';

/**
 * Bridge configuration
 */
export interface BridgeConfig<TSource, TTarget> {
  sourceContext: Context<TSource>;
  targetContext: Context<TTarget>;
  transform?: (source: TSource) => TTarget;
}

/**
 * Context bridge implementation
 */
export interface ContextBridgeImpl {
  createBridge: <TSource, TTarget>(id: string, config: BridgeConfig<TSource, TTarget>) => void;
  removeBridge: (id: string) => void;
  getBridge: (id: string) => BridgeConfig<unknown, unknown> | undefined;
  hasBridge: (id: string) => boolean;
}

/**
 * Bridge manager context - extracted for Fast Refresh compliance
 */
export const BridgeManagerContext = createContext<ContextBridgeImpl | null>(null);

BridgeManagerContext.displayName = 'BridgeManagerContext';
