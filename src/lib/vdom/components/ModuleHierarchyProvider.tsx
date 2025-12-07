/**
 * @file Module Hierarchy Provider
 * @description Internal provider for module hierarchy tracking
 */

import { useMemo, type FC, type ReactNode } from 'react';
import type { ModuleId } from '../types';
import { ModuleHierarchyContext } from '../ModuleProviderContext';
import { useModuleHierarchy } from '../hooks/useModuleSystem';

/**
 * Internal provider for module hierarchy tracking.
 * Used by ModuleBoundary to establish parent-child relationships.
 */
export const ModuleHierarchyProvider: FC<{
  moduleId: ModuleId;
  children: ReactNode;
}> = ({ moduleId, children }) => {
  const parent = useModuleHierarchy();

  const value = useMemo(
    () => ({
      moduleId,
      depth: (parent?.depth ?? -1) + 1,
      path: [...(parent?.path ?? []), moduleId],
    }),
    [moduleId, parent]
  );

  return (
    <ModuleHierarchyContext.Provider value={value}>{children}</ModuleHierarchyContext.Provider>
  );
};

ModuleHierarchyProvider.displayName = 'ModuleHierarchyProvider';
