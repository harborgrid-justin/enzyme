/**
 * @fileoverview React hooks for the endpoint registry.
 *
 * These hooks provide easy access to endpoint configuration and health
 * with automatic re-rendering on changes.
 *
 * @module core/config/hooks/useEndpoint
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ms } from '../../../shared/type-utils';

import type { EndpointChangeEvent, EndpointDefinition, EndpointHealth } from '../types';

import { getEndpoint, getEndpointRegistry } from '../registry/EndpointRegistry';

// =============================================================================
// Endpoint Access Hooks
// =============================================================================

/**
 * Hook to access an endpoint by name.
 *
 * @param name - The endpoint name
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const endpoint = useEndpoint('users.list');
 *
 *   if (!endpoint) {
 *     return <div>Endpoint not found</div>;
 *   }
 *
 *   return <div>Path: {endpoint.path}</div>;
 * }
 * ```
 */
export function useEndpoint(name: string): EndpointDefinition | undefined {
  const [endpoint, setEndpoint] = useState(() => getEndpoint(name));
  const nameRef = useRef(name);

  useEffect(() => {
    // Update state only if name changed
    if (nameRef.current !== name) {
      queueMicrotask(() => {
        nameRef.current = name;
        setEndpoint(getEndpoint(name));
      });
    }

    const registry = getEndpointRegistry();

    return registry.subscribe((event) => {
      if (event.name === name) {
        setEndpoint(event.endpoint);
      }
    });
  }, [name]);

  return endpoint;
}

/**
 * Hook to get all endpoints.
 */
export function useAllEndpoints(): readonly EndpointDefinition[] {
  const [endpoints, setEndpoints] = useState<readonly EndpointDefinition[]>(() =>
    getEndpointRegistry().getAll()
  );

  useEffect(() => {
    const registry = getEndpointRegistry();

    return registry.subscribe(() => {
      setEndpoints(registry.getAll());
    });
  }, []);

  return endpoints;
}

/**
 * Hook to get endpoints by tag.
 */
export function useEndpointsByTag(tag: string): readonly EndpointDefinition[] {
  const [endpoints, setEndpoints] = useState<readonly EndpointDefinition[]>(() =>
    getEndpointRegistry().getByTag(tag)
  );

  useEffect(() => {
    const registry = getEndpointRegistry();

    return registry.subscribe(() => {
      setEndpoints(registry.getByTag(tag));
    });
  }, [tag]);

  return endpoints;
}

// =============================================================================
// URL Building Hooks
// =============================================================================

/**
 * Hook to build an endpoint URL.
 *
 * @param name - The endpoint name
 * @param params - Path parameters
 * @param query - Query parameters
 *
 * @example
 * ```tsx
 * function UserDetail({ userId }: { userId: string }) {
 *   const url = useEndpointUrl('users.detail', { id: userId });
 *   // url = '/users/123'
 *
 *   return <div>URL: {url}</div>;
 * }
 * ```
 */
export function useEndpointUrl(
  name: string,
  params?: Record<string, string | number>,
  query?: Record<string, string | number | boolean>
): string | null {
  return useMemo(() => {
    try {
      const registry = getEndpointRegistry();
      return query
        ? registry.buildUrlWithQuery(name, params, query)
        : registry.buildUrl(name, params);
    } catch {
      return null;
    }
  }, [name, params, query]);
}

/**
 * Hook to get a URL builder function for an endpoint.
 *
 * @param name - The endpoint name
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const buildUserUrl = useEndpointUrlBuilder('users.detail');
 *
 *   return (
 *     <ul>
 *       {users.map((user) => (
 *         <li key={user.id}>
 *           <a href={buildUserUrl({ id: user.id })}>{user.name}</a>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useEndpointUrlBuilder(
  name: string
): (
  params?: Record<string, string | number>,
  query?: Record<string, string | number | boolean>
) => string | null {
  return useCallback(
    (params, query) => {
      try {
        const registry = getEndpointRegistry();
        return query
          ? registry.buildUrlWithQuery(name, params, query)
          : registry.buildUrl(name, params);
      } catch {
        return null;
      }
    },
    [name]
  );
}

// =============================================================================
// Health Monitoring Hooks
// =============================================================================

/**
 * Hook to monitor endpoint health.
 *
 * @param name - The endpoint name
 *
 * @example
 * ```tsx
 * function EndpointStatus({ name }: { name: string }) {
 *   const health = useEndpointHealth(name);
 *
 *   if (!health) {
 *     return <span>Unknown</span>;
 *   }
 *
 *   return (
 *     <span className={health.status}>
 *       {health.status} ({health.avgResponseTime}ms)
 *     </span>
 *   );
 * }
 * ```
 */
export function useEndpointHealth(name: string): EndpointHealth | undefined {
  const [health, setHealth] = useState<EndpointHealth | undefined>(() =>
    getEndpointRegistry().getHealth(name)
  );
  const nameRef = useRef(name);

  useEffect(() => {
    // Update state only if name changed
    if (nameRef.current !== name) {
      queueMicrotask(() => {
        nameRef.current = name;
        const registry = getEndpointRegistry();
        setHealth(registry.getHealth(name));
      });
    }

    const registry = getEndpointRegistry();

    return registry.subscribe((event) => {
      if (event.name === name && event.type === 'health-changed') {
        setHealth(event.newHealth);
      }
    });
  }, [name]);

  return health;
}

/**
 * Hook to check if an endpoint is healthy.
 */
export function useIsEndpointHealthy(name: string): boolean {
  const health = useEndpointHealth(name);
  return health?.status === 'healthy';
}

/**
 * Hook to get all unhealthy endpoints.
 */
export function useUnhealthyEndpoints(): readonly string[] {
  const [unhealthy, setUnhealthy] = useState<readonly string[]>(() =>
    getEndpointRegistry().getUnhealthyEndpoints()
  );

  useEffect(() => {
    const registry = getEndpointRegistry();

    return registry.subscribe((event) => {
      if (event.type === 'health-changed') {
        setUnhealthy(registry.getUnhealthyEndpoints());
      }
    });
  }, []);

  return unhealthy;
}

/**
 * Hook to get all degraded endpoints.
 */
export function useDegradedEndpoints(): readonly string[] {
  const [degraded, setDegraded] = useState<readonly string[]>(() =>
    getEndpointRegistry().getDegradedEndpoints()
  );

  useEffect(() => {
    const registry = getEndpointRegistry();

    return registry.subscribe((event) => {
      if (event.type === 'health-changed') {
        setDegraded(registry.getDegradedEndpoints());
      }
    });
  }, []);

  return degraded;
}

// =============================================================================
// Statistics Hooks
// =============================================================================

/**
 * Hook to get endpoint registry statistics.
 */
export function useEndpointStats(): ReturnType<
  typeof getEndpointRegistry
>['getStats'] extends () => infer R
  ? R
  : never {
  const [stats, setStats] = useState(() => getEndpointRegistry().getStats());

  useEffect(() => {
    const registry = getEndpointRegistry();

    return registry.subscribe(() => {
      setStats(registry.getStats());
    });
  }, []);

  return stats;
}

// =============================================================================
// Change Tracking Hooks
// =============================================================================

/**
 * Hook to track endpoint changes.
 *
 * @param onChangeCallback - Callback to invoke when endpoints change
 */
export function useEndpointChangeTracking(
  onChangeCallback: (event: EndpointChangeEvent) => void
): void {
  useEffect(() => {
    const registry = getEndpointRegistry();

    return registry.subscribe(onChangeCallback);
  }, [onChangeCallback]);
}

/**
 * Hook to get the last endpoint change.
 */
export function useLastEndpointChange(): EndpointChangeEvent | null {
  const [lastChange, setLastChange] = useState<EndpointChangeEvent | null>(null);

  useEffect(() => {
    const registry = getEndpointRegistry();

    return registry.subscribe((event) => {
      setLastChange(event);
    });
  }, []);

  return lastChange;
}

// =============================================================================
// Registration Hooks
// =============================================================================

/**
 * Hook to register an endpoint on mount and unregister on unmount.
 *
 * Useful for dynamic endpoints in feature modules.
 *
 * @param definition - The endpoint definition
 * @param autoRemove - Whether to remove on unmount (default: true)
 *
 * @example
 * ```tsx
 * function FeatureModule() {
 *   // Registers on mount, removes on unmount
 *   useRegisterEndpoint({
 *     name: 'feature.custom',
 *     path: '/feature/custom',
 *     method: 'GET',
 *     auth: true,
 *   });
 *
 *   return <div>Feature Module</div>;
 * }
 * ```
 */
export function useRegisterEndpoint(definition: EndpointDefinition, autoRemove = true): void {
  useEffect(() => {
    const registry = getEndpointRegistry();
    registry.register(definition);

    return () => {
      if (autoRemove) {
        registry.remove(definition.name);
      }
    };
  }, [definition, autoRemove]);
}

/**
 * Hook to get endpoint management functions.
 */
export function useEndpointRegistry(): {
  registry: ReturnType<typeof getEndpointRegistry>;
  register: (definition: EndpointDefinition) => void;
  update: (name: string, updates: Partial<EndpointDefinition>) => void;
  remove: (name: string) => void;
  markHealthy: (name: string, responseTime?: number) => void;
  markUnhealthy: (name: string, reason: string) => void;
} {
  const registry = useMemo(() => getEndpointRegistry(), []);

  const register = useCallback(
    (definition: EndpointDefinition) => {
      registry.register(definition);
    },
    [registry]
  );

  const update = useCallback(
    (name: string, updates: Partial<EndpointDefinition>) => {
      registry.update(name, updates);
    },
    [registry]
  );

  const remove = useCallback(
    (name: string) => {
      registry.remove(name);
    },
    [registry]
  );

  const markHealthy = useCallback(
    (name: string, responseTime?: number) => {
      registry.markHealthy(name, responseTime != null ? ms(responseTime) : undefined);
    },
    [registry]
  );

  const markUnhealthy = useCallback(
    (name: string, reason: string) => {
      registry.markUnhealthy(name, reason);
    },
    [registry]
  );

  return {
    registry,
    register,
    update,
    remove,
    markHealthy,
    markUnhealthy,
  };
}
