/**
 * @file Flag Analytics Context
 * @description Context for feature flag analytics (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Flag event type
 */
export type FlagEventType = 'viewed' | 'enabled' | 'disabled' | 'configured' | 'error';

/**
 * Flag analytics event
 */
export interface FlagAnalyticsEvent {
  flagKey: string;
  eventType: FlagEventType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Flag analytics context value
 */
export interface FlagAnalyticsContextValue {
  trackEvent: (event: FlagAnalyticsEvent) => void;
  trackFlagView: (flagKey: string, metadata?: Record<string, unknown>) => void;
  trackFlagToggle: (flagKey: string, enabled: boolean, metadata?: Record<string, unknown>) => void;
  getEvents: (flagKey?: string) => FlagAnalyticsEvent[];
  clearEvents: () => void;
}

/**
 * Flag analytics context - extracted for Fast Refresh compliance
 */
export const FlagAnalyticsContext = createContext<FlagAnalyticsContextValue | null>(null);

FlagAnalyticsContext.displayName = 'FlagAnalyticsContext';
