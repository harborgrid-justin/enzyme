/**
 * @file Library Integration Context
 * @description Context for third-party library integration (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Library state
 */
export type LibraryState = 'uninitialized' | 'initializing' | 'ready' | 'error';

/**
 * Library integration
 */
export interface LibraryIntegration {
  name: string;
  version: string;
  state: LibraryState;
  initialize: () => Promise<void>;
  isReady: boolean;
}

/**
 * Library integration context value
 */
export interface LibraryIntegrationContextValue {
  libraries: Map<string, LibraryIntegration>;
  registerLibrary: (name: string, integration: LibraryIntegration) => void;
  getLibrary: (name: string) => LibraryIntegration | undefined;
  isLibraryReady: (name: string) => boolean;
  initializeLibrary: (name: string) => Promise<void>;
}

/**
 * Library integration context - extracted for Fast Refresh compliance
 */
export const LibraryIntegrationContext = createContext<LibraryIntegrationContextValue | null>(null);

LibraryIntegrationContext.displayName = 'LibraryIntegrationContext';
