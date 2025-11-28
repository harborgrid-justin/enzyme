/**
 * @file Module Provider Exports
 * @module vdom/ModuleProviderExports
 * @description Re-exports for hooks and components.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

export {
  useModuleSystem,
  useModuleHierarchy,
  useVDOMPool,
  useModuleRegistry,
  useModuleLoader,
  useEventBus,
  useDevMode,
} from './hooks/useModuleSystem';

export { ModuleHierarchyProvider } from './components/ModuleHierarchyProvider';