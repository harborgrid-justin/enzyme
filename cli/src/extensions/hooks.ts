/**
 * @file React Hooks for Extension System
 * @description React hooks for accessing and using the extension system
 *
 * Pattern from: @tanstack/react-query, zustand, jotai
 *
 * @example
 * import { ExtensionProvider, useExtension } from '@enzyme/cli/extensions/hooks'
 *
 * function App() {
 *   return (
 *     <ExtensionProvider>
 *       <MyComponent />
 *     </ExtensionProvider>
 *   )
 * }
 *
 * function MyComponent() {
 *   const logging = useExtension('enzyme:logging')
 *   // ...
 * }
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { EnzymeExtension } from './types.js';
import {
  EnzymeExtensionManager,
  EnzymeClient,
  createExtensionManager,
  createEnzymeClient,
} from './manager.js';

// ============================================================================
// Extension Context
// ============================================================================

export interface ExtensionContextValue {
  /** The extension manager instance */
  manager: EnzymeExtensionManager;
  /** The enzyme client instance */
  client: EnzymeClient;
  /** Register a new extension */
  register: (extension: EnzymeExtension) => void;
  /** Unregister an extension */
  unregister: (name: string) => boolean;
  /** Get all registered extensions */
  getExtensions: () => EnzymeExtension[];
  /** Get extension by name */
  getExtension: (name: string) => EnzymeExtension | undefined;
  /** Check if extension is registered */
  hasExtension: (name: string) => boolean;
  /** List all extension names */
  listExtensions: () => string[];
}

const ExtensionContext = createContext<ExtensionContextValue | null>(null);

// ============================================================================
// Extension Provider
// ============================================================================

export interface ExtensionProviderProps {
  /** Child components */
  children: ReactNode;
  /** Initial extensions to register */
  extensions?: EnzymeExtension[];
  /** Custom extension manager (optional) */
  manager?: EnzymeExtensionManager;
  /** Custom enzyme client (optional) */
  client?: EnzymeClient;
}

/**
 * Extension Provider component
 * Wraps your app to provide extension context
 *
 * @example
 * <ExtensionProvider extensions={[loggingExtension, validationExtension]}>
 *   <App />
 * </ExtensionProvider>
 */
export function ExtensionProvider({
  children,
  extensions = [],
  manager: customManager,
  client: customClient,
}: ExtensionProviderProps): JSX.Element {
  const [manager] = useState(() => customManager ?? createExtensionManager());
  const [client, setClient] = useState(() => {
    if (customClient) return customClient;

    let enzymeClient = createEnzymeClient();
    for (const ext of extensions) {
      enzymeClient = enzymeClient.$extends(ext);
    }
    return enzymeClient;
  });

  // Register initial extensions in manager
  useEffect(() => {
    for (const ext of extensions) {
      manager.register(ext);
    }
  }, [manager, extensions]);

  const register = useCallback(
    (extension: EnzymeExtension) => {
      manager.register(extension);
      setClient((prev) => prev.$extends(extension));
    },
    [manager]
  );

  const unregister = useCallback(
    (name: string) => {
      return manager.unregister(name);
    },
    [manager]
  );

  const getExtensions = useCallback(() => {
    return manager.getExtensions();
  }, [manager]);

  const getExtension = useCallback(
    (name: string) => {
      return manager.getExtension(name);
    },
    [manager]
  );

  const hasExtension = useCallback(
    (name: string) => {
      return manager.hasExtension(name);
    },
    [manager]
  );

  const listExtensions = useCallback(() => {
    return manager.list();
  }, [manager]);

  const value = useMemo(
    () => ({
      manager,
      client,
      register,
      unregister,
      getExtensions,
      getExtension,
      hasExtension,
      listExtensions,
    }),
    [
      manager,
      client,
      register,
      unregister,
      getExtensions,
      getExtension,
      hasExtension,
      listExtensions,
    ]
  );

  return (
    <ExtensionContext.Provider value={value}>
      {children}
    </ExtensionContext.Provider>
  );
}

// ============================================================================
// useExtensionManager Hook
// ============================================================================

/**
 * Access the extension manager
 *
 * @example
 * const manager = useExtensionManager()
 * manager.register(myExtension)
 */
export function useExtensionManager(): EnzymeExtensionManager {
  const context = useContext(ExtensionContext);

  if (!context) {
    throw new Error(
      'useExtensionManager must be used within an ExtensionProvider'
    );
  }

  return context.manager;
}

// ============================================================================
// useExtensionClient Hook
// ============================================================================

/**
 * Access the enzyme client
 *
 * @example
 * const client = useExtensionClient()
 * await client.executeHooks('beforeGenerate', 'component', context)
 */
export function useExtensionClient(): EnzymeClient {
  const context = useContext(ExtensionContext);

  if (!context) {
    throw new Error(
      'useExtensionClient must be used within an ExtensionProvider'
    );
  }

  return context.client;
}

// ============================================================================
// useExtension Hook
// ============================================================================

/**
 * Get a specific extension by name
 * Returns undefined if the extension is not registered
 *
 * @example
 * const logging = useExtension('enzyme:logging')
 * if (logging) {
 *   console.log('Logging extension is active')
 * }
 */
export function useExtension(name: string): EnzymeExtension | undefined {
  const context = useContext(ExtensionContext);

  if (!context) {
    throw new Error('useExtension must be used within an ExtensionProvider');
  }

  const [extension, setExtension] = useState<EnzymeExtension | undefined>(() =>
    context.getExtension(name)
  );

  // Update extension if the manager changes
  useEffect(() => {
    const ext = context.getExtension(name);
    setExtension(ext);
  }, [context, name]);

  return extension;
}

// ============================================================================
// useExtensions Hook
// ============================================================================

/**
 * Get all registered extensions
 *
 * @example
 * const extensions = useExtensions()
 * console.log(`${extensions.length} extensions registered`)
 */
export function useExtensions(): EnzymeExtension[] {
  const context = useContext(ExtensionContext);

  if (!context) {
    throw new Error('useExtensions must be used within an ExtensionProvider');
  }

  const [extensions, setExtensions] = useState<EnzymeExtension[]>(() =>
    context.getExtensions()
  );

  // Update extensions list when manager changes
  useEffect(() => {
    const exts = context.getExtensions();
    setExtensions(exts);
  }, [context]);

  return extensions;
}

// ============================================================================
// useHasExtension Hook
// ============================================================================

/**
 * Check if a specific extension is registered
 *
 * @example
 * const hasLogging = useHasExtension('enzyme:logging')
 * if (hasLogging) {
 *   console.log('Logging is enabled')
 * }
 */
export function useHasExtension(name: string): boolean {
  const context = useContext(ExtensionContext);

  if (!context) {
    throw new Error(
      'useHasExtension must be used within an ExtensionProvider'
    );
  }

  const [hasExtension, setHasExtension] = useState(() =>
    context.hasExtension(name)
  );

  useEffect(() => {
    setHasExtension(context.hasExtension(name));
  }, [context, name]);

  return hasExtension;
}

// ============================================================================
// useRegisterExtension Hook
// ============================================================================

/**
 * Register an extension dynamically
 * Returns a function to unregister the extension
 *
 * @example
 * function MyComponent() {
 *   const unregister = useRegisterExtension(myExtension)
 *
 *   // Unregister on unmount
 *   useEffect(() => {
 *     return () => unregister()
 *   }, [unregister])
 * }
 */
export function useRegisterExtension(
  extension: EnzymeExtension
): () => boolean {
  const context = useContext(ExtensionContext);

  if (!context) {
    throw new Error(
      'useRegisterExtension must be used within an ExtensionProvider'
    );
  }

  // Register on mount
  useEffect(() => {
    context.register(extension);

    // Unregister on unmount
    return () => {
      context.unregister(extension.name);
    };
  }, [context, extension]);

  // Return unregister function
  return useCallback(() => {
    return context.unregister(extension.name);
  }, [context, extension.name]);
}

// ============================================================================
// useExtensionMethod Hook
// ============================================================================

/**
 * Get a client method from an extension
 *
 * @example
 * const getMetrics = useExtensionMethod('enzyme:performance', '$getMetrics')
 * const metrics = getMetrics()
 */
export function useExtensionMethod<TArgs extends unknown[], TReturn>(
  extensionName: string,
  methodName: string
): ((...args: TArgs) => TReturn) | undefined {
  const client = useExtensionClient();
  const extension = useExtension(extensionName);

  return useMemo(() => {
    if (!extension?.client) return undefined;

    const method = extension.client[methodName];
    if (typeof method !== 'function') return undefined;

    return (...args: TArgs) => {
      return (method as (...args: TArgs) => TReturn).apply(client, args);
    };
  }, [client, extension, methodName]);
}

// ============================================================================
// useExtensionCommands Hook
// ============================================================================

/**
 * Get all custom commands from extensions
 *
 * @example
 * const commands = useExtensionCommands()
 * console.log(`Available commands: ${Array.from(commands.keys()).join(', ')}`)
 */
export function useExtensionCommands(): Map<
  string,
  {
    description: string;
    handler: (...args: unknown[]) => Promise<void> | void;
  }
> {
  const manager = useExtensionManager();

  const [commands, setCommands] = useState(() => manager.getCommands());

  useEffect(() => {
    setCommands(manager.getCommands());
  }, [manager]);

  return commands;
}

// ============================================================================
// useTemplateHelpers Hook
// ============================================================================

/**
 * Get all template helpers from extensions
 *
 * @example
 * const helpers = useTemplateHelpers()
 * const pascalCase = helpers.pascalCase
 */
export function useTemplateHelpers(): Record<
  string,
  (...args: unknown[]) => unknown
> {
  const manager = useExtensionManager();

  const [helpers, setHelpers] = useState(() => manager.getTemplateHelpers());

  useEffect(() => {
    setHelpers(manager.getTemplateHelpers());
  }, [manager]);

  return helpers;
}

// ============================================================================
// useTemplateFilters Hook
// ============================================================================

/**
 * Get all template filters from extensions
 *
 * @example
 * const filters = useTemplateFilters()
 * const capitalize = filters.capitalize
 */
export function useTemplateFilters(): Record<
  string,
  (value: unknown, ...args: unknown[]) => unknown
> {
  const manager = useExtensionManager();

  const [filters, setFilters] = useState(() => manager.getTemplateFilters());

  useEffect(() => {
    setFilters(manager.getTemplateFilters());
  }, [manager]);

  return filters;
}

// ============================================================================
// Type Exports
// ============================================================================

export type { ExtensionContextValue, ExtensionProviderProps };
