/**
 * @file useConfigContext Hook
 * @description Hook for accessing configuration context.
 *
 * @module config/use-config-context
 */

import { useContext } from 'react';
import { ConfigContext, defaultContextValue, type ConfigContextValue } from './config-context';

/**
 * Hook for accessing configuration context
 *
 * @throws Error if used outside ConfigProvider
 * @returns Configuration context value
 */
export function useConfigContext(): ConfigContextValue {
  const context = useContext(ConfigContext);

  if (context === defaultContextValue) {
    throw new Error(
      'useConfigContext must be used within a ConfigProvider. ' +
        'Make sure to wrap your app with <ConfigProvider>.'
    );
  }

  return context;
}
