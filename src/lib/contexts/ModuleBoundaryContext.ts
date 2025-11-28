/**
 * @file Module Boundary Context
 * @description Context for module boundary management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Module boundary context value
 */
export interface ModuleBoundaryContextValue {
  moduleId: string;
  moduleName: string;
  isLoaded: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Module boundary context - extracted for Fast Refresh compliance
 */
export const ModuleBoundaryContext = createContext<ModuleBoundaryContextValue | null>(null);

ModuleBoundaryContext.displayName = 'ModuleBoundaryContext';
