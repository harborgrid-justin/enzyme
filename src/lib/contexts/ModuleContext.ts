/**
 * @file Module Context
 * @description Context for module system management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Module metadata
 */
export interface ModuleMetadata {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];
}

/**
 * Module system context value
 */
export interface ModuleSystemContextValue {
  registerModule: (metadata: ModuleMetadata) => void;
  unregisterModule: (id: string) => void;
  getModule: (id: string) => ModuleMetadata | undefined;
  hasModule: (id: string) => boolean;
  getAllModules: () => ModuleMetadata[];
}

/**
 * Module hierarchy context value
 */
export interface ModuleHierarchyContextValue {
  parentId: string | null;
  depth: number;
  path: string[];
}

/**
 * Module system context - extracted for Fast Refresh compliance
 */
export const ModuleSystemContext = createContext<ModuleSystemContextValue | null>(null);

ModuleSystemContext.displayName = 'ModuleSystemContext';

/**
 * Module hierarchy context - extracted for Fast Refresh compliance
 */
export const ModuleHierarchyContext = createContext<ModuleHierarchyContextValue>({
  parentId: null,
  depth: 0,
  path: [],
});

ModuleHierarchyContext.displayName = 'ModuleHierarchyContext';
