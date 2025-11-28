/**
 * @file Intercepting Routes Support
 * @description Implements route interception patterns inspired by Next.js App Router.
 * Enables intercepting navigation to show content in a different context (e.g., modal).
 *
 * @module @/lib/routing/advanced/intercepting-routes
 *
 * This module provides:
 * - Route interception definitions
 * - Context-aware route rendering
 * - Modal/overlay pattern support
 * - Soft navigation handling
 * - Interception level configuration
 *
 * @example
 * ```typescript
 * import { createInterceptingRoute, InterceptionLevel } from '@/lib/routing/advanced/intercepting-routes';
 *
 * // Intercept /photo/[id] and show in modal when navigating from same route
 * const photoInterceptor = createInterceptingRoute({
 *   pattern: '/photo/:id',
 *   level: InterceptionLevel.SameLevel,
 *   interceptWith: PhotoModal,
 *   fallback: PhotoPage,
 * });
 * ```
 */

import type { ComponentType } from 'react';
import {
  matchPathPattern as coreMatchPathPattern,
  getPathDepth as coreGetPathDepth,
} from '../core/path-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Interception level determines how far up the route tree to intercept
 *
 * - SameLevel (.) - Intercept from same route level
 * - OneUp (..) - Intercept from one level up
 * - TwoUp (...) - Intercept from two levels up
 * - Root (...) - Intercept from any level (root)
 */
export enum InterceptionLevel {
  /** Intercept from same route level */
  SameLevel = '.',
  /** Intercept from one level up */
  OneUp = '..',
  /** Intercept from two levels up */
  TwoUp = '...',
  /** Intercept from root (any level) */
  Root = '....',
}

/**
 * Intercepting route configuration
 */
export interface InterceptingRouteConfig<TProps = unknown> {
  /** Route pattern to intercept */
  readonly pattern: string;
  /** Interception level */
  readonly level: InterceptionLevel;
  /** Component to render when intercepted */
  readonly interceptWith: ComponentType<TProps & InterceptedRouteProps>;
  /** Fallback component for direct navigation */
  readonly fallback: ComponentType<TProps>;
  /** Origins from which interception is allowed */
  readonly allowedOrigins?: readonly string[];
  /** Origins from which interception is denied */
  readonly deniedOrigins?: readonly string[];
  /** Custom condition for interception */
  readonly shouldIntercept?: (context: InterceptionContext) => boolean;
  /** Feature flag for this interception */
  readonly featureFlag?: string;
}

/**
 * Props passed to intercepted route component
 */
export interface InterceptedRouteProps {
  /** Whether route is currently intercepted */
  readonly isIntercepted: boolean;
  /** Original navigation context */
  readonly interceptionContext: InterceptionContext;
  /** Close the interception (return to origin) */
  readonly closeInterception: () => void;
  /** Navigate to the full page (break out of interception) */
  readonly navigateToFull: () => void;
}

/**
 * Context for interception decision making
 */
export interface InterceptionContext {
  /** Current URL path */
  readonly currentPath: string;
  /** Previous URL path (origin of navigation) */
  readonly originPath: string;
  /** Target URL path */
  readonly targetPath: string;
  /** Extracted route parameters */
  readonly params: Record<string, string>;
  /** Navigation trigger type */
  readonly triggerType: NavigationTrigger;
  /** Navigation state data */
  readonly state?: unknown;
  /** Whether this is a back/forward navigation */
  readonly isPopState: boolean;
}

/**
 * Navigation trigger types
 */
export type NavigationTrigger =
  | 'link'        // User clicked a link
  | 'programmatic' // navigate() call
  | 'popstate'    // Browser back/forward
  | 'replace'     // replace() call
  | 'external';   // External navigation

/**
 * Interception resolution result
 */
export interface InterceptionResolution {
  /** Whether route should be intercepted */
  readonly shouldIntercept: boolean;
  /** Component to render */
  readonly component: ComponentType<unknown>;
  /** Props for the component */
  readonly props: InterceptedRouteProps | Record<string, unknown>;
  /** Interception context if intercepted */
  readonly context: InterceptionContext | null;
  /** Reason if not intercepted */
  readonly skipReason?: string;
}

/**
 * Registered intercepting route
 */
export interface RegisteredInterceptor {
  /** Unique interceptor ID */
  readonly id: string;
  /** Route pattern */
  readonly pattern: string;
  /** Interception configuration */
  readonly config: InterceptingRouteConfig;
  /** Registration timestamp */
  readonly registeredAt: number;
}

/**
 * Interception manager state
 */
export interface InterceptionManagerState {
  /** Currently active interception */
  readonly activeInterception: InterceptionContext | null;
  /** Navigation history for interception tracking */
  readonly history: readonly InterceptionContext[];
  /** Registered interceptors */
  readonly interceptors: readonly RegisteredInterceptor[];
}

// =============================================================================
// InterceptingRouteManager Class
// =============================================================================

/**
 * Manages route interception logic
 *
 * @example
 * ```typescript
 * const manager = new InterceptingRouteManager();
 *
 * manager.register({
 *   pattern: '/photo/:id',
 *   level: InterceptionLevel.SameLevel,
 *   interceptWith: PhotoModal,
 *   fallback: PhotoPage,
 * });
 *
 * const resolution = manager.resolve({
 *   currentPath: '/gallery',
 *   originPath: '/gallery',
 *   targetPath: '/photo/123',
 *   params: { id: '123' },
 *   triggerType: 'link',
 *   isPopState: false,
 * });
 * ```
 */
export class InterceptingRouteManager {
  private interceptors: Map<string, RegisteredInterceptor> = new Map();
  private activeInterception: InterceptionContext | null = null;
  private history: InterceptionContext[] = [];
  private idCounter = 0;

  /**
   * Register an intercepting route
   *
   * @param config - Interception configuration
   * @returns Interceptor ID for later reference
   */
  register(config: InterceptingRouteConfig): string {
    const id = `interceptor_${++this.idCounter}`;
    const interceptor: RegisteredInterceptor = {
      id,
      pattern: config.pattern,
      config,
      registeredAt: Date.now(),
    };
    this.interceptors.set(id, interceptor);
    return id;
  }

  /**
   * Unregister an intercepting route
   *
   * @param id - Interceptor ID
   * @returns True if interceptor was found and removed
   */
  unregister(id: string): boolean {
    return this.interceptors.delete(id);
  }

  /**
   * Resolve whether a navigation should be intercepted
   *
   * @param context - Interception context
   * @returns Resolution result
   */
  resolve(context: InterceptionContext): InterceptionResolution {
    // Find matching interceptor
    for (const interceptor of this.interceptors.values()) {
      if (this.matchesPattern(interceptor.pattern, context.targetPath)) {
        const shouldIntercept = this.shouldIntercept(interceptor.config, context);

        if (shouldIntercept) {
          const props: InterceptedRouteProps = {
            isIntercepted: true,
            interceptionContext: context,
            closeInterception: () => this.closeInterception(),
            navigateToFull: () => this.navigateToFull(context.targetPath),
          };

          this.activeInterception = context;
          this.history.push(context);

          return {
            shouldIntercept: true,
            component: interceptor.config.interceptWith as ComponentType<unknown>,
            props,
            context,
          };
        }

        // Return fallback if pattern matches but interception condition fails
        return {
          shouldIntercept: false,
          component: interceptor.config.fallback,
          props: { ...context.params },
          context: null,
          skipReason: 'Interception condition not met',
        };
      }
    }

    // No matching interceptor
    return {
      shouldIntercept: false,
      component: EmptyComponent,
      props: {},
      context: null,
      skipReason: 'No matching interceptor',
    };
  }

  /**
   * Check if a path matches a pattern
   *
   * Delegates to core path matching utility.
   */
  private matchesPattern(pattern: string, path: string): boolean {
    return coreMatchPathPattern(pattern, path);
  }

  /**
   * Determine if navigation should be intercepted
   */
  private shouldIntercept(
    config: InterceptingRouteConfig,
    context: InterceptionContext
  ): boolean {
    // Don't intercept popstate (back/forward)
    if (context.isPopState) {
      return false;
    }

    // Check custom condition
    if (config.shouldIntercept) {
      return config.shouldIntercept(context);
    }

    // Check allowed/denied origins
    if (config.deniedOrigins?.some(o => this.matchesPattern(o, context.originPath)) === true) {
      return false;
    }

    if (config.allowedOrigins && config.allowedOrigins.length > 0) {
      if (!config.allowedOrigins.some(o => this.matchesPattern(o, context.originPath))) {
        return false;
      }
    }

    // Check interception level
    return this.checkInterceptionLevel(config.level, context.originPath, context.targetPath);
  }

  /**
   * Check if interception level condition is met
   *
   * Uses core path depth utility.
   */
  private checkInterceptionLevel(
    level: InterceptionLevel,
    originPath: string,
    targetPath: string
  ): boolean {
    const originDepth = coreGetPathDepth(originPath);
    const targetDepth = coreGetPathDepth(targetPath);
    const depthDiff = Math.abs(originDepth - targetDepth);

    switch (level) {
      case InterceptionLevel.SameLevel:
        return depthDiff === 0 || depthDiff === 1;
      case InterceptionLevel.OneUp:
        return depthDiff <= 1;
      case InterceptionLevel.TwoUp:
        return depthDiff <= 2;
      case InterceptionLevel.Root:
        return true; // Always intercept
      default:
        return false;
    }
  }

  /**
   * Close the current interception
   */
  closeInterception(): void {
    if (this.activeInterception) {
      // Navigation would be handled by the consuming application
      this.activeInterception = null;
    }
  }

  /**
   * Navigate to full page (break out of interception)
   */
  navigateToFull(_path: string): void {
    this.activeInterception = null;
    // Full navigation would be handled by the consuming application
    // This would typically trigger a hard navigation or router.push

  }

  /**
   * Get current interception state
   */
  getState(): InterceptionManagerState {
    return {
      activeInterception: this.activeInterception,
      history: [...this.history],
      interceptors: Array.from(this.interceptors.values()),
    };
  }

  /**
   * Check if currently in an interception
   */
  isIntercepted(): boolean {
    return this.activeInterception !== null;
  }

  /**
   * Get active interception context
   */
  getActiveInterception(): InterceptionContext | null {
    return this.activeInterception;
  }

  /**
   * Clear all interceptors
   */
  clearAll(): void {
    this.interceptors.clear();
    this.activeInterception = null;
    this.history = [];
  }

  /**
   * Get all registered interceptors
   */
  getInterceptors(): readonly RegisteredInterceptor[] {
    return Array.from(this.interceptors.values());
  }
}

// =============================================================================
// Empty Component (for no-op rendering)
// =============================================================================

/**
 * Empty component for no-op rendering
 */
function EmptyComponent(): null {
  return null;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an intercepting route configuration
 *
 * @param config - Interception configuration
 * @returns Validated configuration
 */
export function createInterceptingRoute<TProps = unknown>(
  config: InterceptingRouteConfig<TProps>
): InterceptingRouteConfig<TProps> {
  return {
    ...config,
    allowedOrigins: config.allowedOrigins ?? [],
    deniedOrigins: config.deniedOrigins ?? [],
  };
}

/**
 * Create an interception context from navigation event
 *
 * @param event - Navigation event details
 * @returns Interception context
 */
export function createInterceptionContext(event: {
  currentPath: string;
  originPath: string;
  targetPath: string;
  params?: Record<string, string>;
  state?: unknown;
  isPopState?: boolean;
  triggerType?: NavigationTrigger;
}): InterceptionContext {
  return {
    currentPath: event.currentPath,
    originPath: event.originPath,
    targetPath: event.targetPath,
    params: event.params ?? {},
    triggerType: event.triggerType ?? 'link',
    state: event.state,
    isPopState: event.isPopState ?? false,
  };
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultManager: InterceptingRouteManager | null = null;

/**
 * Get the default interception manager
 */
export function getInterceptionManager(): InterceptingRouteManager {
  defaultManager ??= new InterceptingRouteManager();
  return defaultManager;
}

/**
 * Reset the default interception manager
 */
export function resetInterceptionManager(): void {
  defaultManager?.clearAll();
  defaultManager = null;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse interception level from string notation
 *
 * @param notation - Dot notation (e.g., '.', '..', '...')
 * @returns Interception level
 */
export function parseInterceptionLevel(notation: string): InterceptionLevel {
  switch (notation) {
    case '.':
      return InterceptionLevel.SameLevel;
    case '..':
      return InterceptionLevel.OneUp;
    case '...':
      return InterceptionLevel.TwoUp;
    case '....':
      return InterceptionLevel.Root;
    default:
      return InterceptionLevel.SameLevel;
  }
}

/**
 * Get dot notation for interception level
 *
 * @param level - Interception level
 * @returns Dot notation string
 */
export function getInterceptionNotation(level: InterceptionLevel): string {
  return level;
}

/**
 * Check if a route pattern contains interception markers
 *
 * @param pattern - Route pattern
 * @returns True if pattern has interception markers
 */
export function hasInterceptionMarker(pattern: string): boolean {
  return /\(\.+\)/.test(pattern);
}

/**
 * Extract interception level from route pattern
 *
 * @param pattern - Route pattern with interception marker
 * @returns Level and cleaned pattern, or null if no marker
 */
export function extractInterceptionFromPattern(
  pattern: string
): { level: InterceptionLevel; cleanPattern: string } | null {
  const match = pattern.match(/\((\.+)\)/);
  if (!match?.[1]) {
    return null;
  }

  const level = parseInterceptionLevel(match[1]);
  const cleanPattern = pattern.replace(/\(\.+\)/, '');

  return { level, cleanPattern };
}

/**
 * Build intercepted route path
 *
 * @param basePath - Base path
 * @param level - Interception level
 * @param targetSegment - Target segment
 * @returns Intercepted route path
 */
export function buildInterceptedPath(
  basePath: string,
  level: InterceptionLevel,
  targetSegment: string
): string {
  const notation = getInterceptionNotation(level);
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `${normalizedBase}/(${notation})${targetSegment}`;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for InterceptionContext
 */
export function isInterceptionContext(value: unknown): value is InterceptionContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'currentPath' in value &&
    'originPath' in value &&
    'targetPath' in value &&
    'triggerType' in value
  );
}

/**
 * Type guard for InterceptionLevel
 */
export function isInterceptionLevel(value: unknown): value is InterceptionLevel {
  return Object.values(InterceptionLevel).includes(value as InterceptionLevel);
}
