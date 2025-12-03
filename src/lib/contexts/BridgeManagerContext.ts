/**
 * @file Bridge Manager Context
 * @description Context for context bridge management (Fast Refresh compliant).
 */

import { createContext } from 'react';
import type { ContextBridgeDefinition } from '@/lib/coordination';

/**
 * Context bridge implementation
 */
export interface ContextBridgeImpl {
  registerBridge: <TSource, TTarget>(definition: ContextBridgeDefinition<TSource, TTarget>) => void;
  unregisterBridge: (id: string) => void;
  updateBridge: <TSource>(id: string, sourceValue: TSource) => void;
  subscribe: <TTarget>(id: string, callback: (value: TTarget) => void) => () => void;
  getValue: <TTarget>(id: string) => TTarget | null;
  dispose: () => void;
}

/**
 * Bridge manager context - extracted for Fast Refresh compliance
 */
export const BridgeManagerContext = createContext<ContextBridgeImpl | null>(null);

BridgeManagerContext.displayName = 'BridgeManagerContext';
