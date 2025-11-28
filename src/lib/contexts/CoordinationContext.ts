/**
 * @file Coordination Context
 * @description Context for coordination management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Coordination event
 */
export interface CoordinationEvent {
  type: string;
  payload: unknown;
  timestamp: number;
}

/**
 * Coordination context value
 */
export interface CoordinationContextValue {
  emit: (event: CoordinationEvent) => void;
  subscribe: (eventType: string, handler: (event: CoordinationEvent) => void) => () => void;
  getState: <T = unknown>(key: string) => T | undefined;
  setState: <T = unknown>(key: string, value: T) => void;
}

/**
 * Coordination context - extracted for Fast Refresh compliance
 */
export const CoordinationContext = createContext<CoordinationContextValue | null>(null);

CoordinationContext.displayName = 'CoordinationContext';
