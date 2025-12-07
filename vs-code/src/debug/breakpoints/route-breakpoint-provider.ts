/**
 * @file Route Breakpoint Provider
 * @description Breakpoints on route navigation and lifecycle
 */

// ============================================================================
// Types
// ============================================================================

export enum RouteEventType {
  NAVIGATION = 'navigation',
  GUARD_EXECUTION = 'guard_execution',
  LOADER_EXECUTION = 'loader_execution',
  ROUTE_MOUNT = 'route_mount',
  ROUTE_UNMOUNT = 'route_unmount',
  ERROR = 'error',
}

/**
 *
 */
export interface RouteBreakpoint {
  id: string;
  enabled: boolean;
  eventType: RouteEventType;
  pattern?: string | RegExp;
  condition?: (event: RouteEvent) => boolean;
  hitCount: number;
  logMessage?: string;
}

/**
 *
 */
export interface RouteEvent {
  type: RouteEventType;
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 *
 */
export interface RouteBreakpointHit {
  breakpoint: RouteBreakpoint;
  event: RouteEvent;
  timestamp: number;
  stackTrace?: string[];
}

/**
 *
 */
export type RouteBreakpointCallback = (hit: RouteBreakpointHit) => void | Promise<void>;

// ============================================================================
// Route Breakpoint Provider
// ============================================================================

/**
 *
 */
export class RouteBreakpointProvider {
  private readonly breakpoints = new Map<string, RouteBreakpoint>();
  private hits: RouteBreakpointHit[] = [];
  private readonly callbacks = new Set<RouteBreakpointCallback>();
  private breakpointIdCounter = 0;

  /**
   * Add a route breakpoint
   * @param eventType
   * @param pattern
   * @param condition
   * @param logMessage
   */
  addBreakpoint(
    eventType: RouteEventType,
    pattern?: string | RegExp,
    condition?: (event: RouteEvent) => boolean,
    logMessage?: string
  ): RouteBreakpoint {
    const breakpoint: RouteBreakpoint = {
      id: this.generateBreakpointId(),
      enabled: true,
      eventType,
      ...(pattern !== undefined && { pattern }),
      ...(condition !== undefined && { condition }),
      hitCount: 0,
      ...(logMessage !== undefined && { logMessage }),
    };

    this.breakpoints.set(breakpoint.id, breakpoint);
    return breakpoint;
  }

  /**
   * Remove a breakpoint
   * @param id
   */
  removeBreakpoint(id: string): boolean {
    return this.breakpoints.delete(id);
  }

  /**
   * Enable a breakpoint
   * @param id
   */
  enableBreakpoint(id: string): void {
    const breakpoint = this.breakpoints.get(id);
    if (breakpoint) {
      breakpoint.enabled = true;
    }
  }

  /**
   * Disable a breakpoint
   * @param id
   */
  disableBreakpoint(id: string): void {
    const breakpoint = this.breakpoints.get(id);
    if (breakpoint) {
      breakpoint.enabled = false;
    }
  }

  /**
   * Get all breakpoints
   * @param eventType
   */
  getBreakpoints(eventType?: RouteEventType): RouteBreakpoint[] {
    const breakpoints = [...this.breakpoints.values()];
    if (eventType) {
      return breakpoints.filter((bp) => bp.eventType === eventType);
    }
    return breakpoints;
  }

  /**
   * Get breakpoint by ID
   * @param id
   */
  getBreakpoint(id: string): RouteBreakpoint | undefined {
    return this.breakpoints.get(id);
  }

  /**
   * Clear all breakpoints
   */
  clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  /**
   * Register breakpoint callback
   * @param callback
   */
  onBreakpoint(callback: RouteBreakpointCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Check route event against breakpoints
   * @param event
   */
  async checkBreakpoints(event: RouteEvent): Promise<void> {
    const breakpoints = this.getBreakpoints(event.type);

    for (const breakpoint of breakpoints) {
      if (!breakpoint.enabled) {
        continue;
      }

      // Check pattern
      if (breakpoint.pattern) {
        if (!this.matchesPattern(event.path, breakpoint.pattern)) {
          continue;
        }
      }

      // Check condition
      if (breakpoint.condition) {
        try {
          if (!breakpoint.condition(event)) {
            continue;
          }
        } catch (error) {
          console.error('Breakpoint condition error:', error);
          continue;
        }
      }

      // Breakpoint hit
      breakpoint.hitCount++;

      const hit: RouteBreakpointHit = {
        breakpoint,
        event,
        timestamp: Date.now(),
        stackTrace: this.captureStackTrace(),
      };

      this.hits.push(hit);

      // Log message if specified
      if (breakpoint.logMessage) {
        const message = this.formatLogMessage(breakpoint.logMessage, hit);
        console.log(`[Route Breakpoint] ${message}`);
      }

      // Notify callbacks
      await this.notifyCallbacks(hit);
    }
  }

  /**
   * Trigger navigation event
   * @param path
   * @param params
   * @param query
   */
  async onNavigation(
    path: string,
    params?: Record<string, string>,
    query?: Record<string, string>
  ): Promise<void> {
    await this.checkBreakpoints({
      type: RouteEventType.NAVIGATION,
      path,
      ...(params !== undefined && { params }),
      ...(query !== undefined && { query }),
      timestamp: Date.now(),
    });
  }

  /**
   * Trigger guard execution event
   * @param path
   * @param guardName
   * @param result
   */
  async onGuardExecution(
    path: string,
    guardName: string,
    result: boolean
  ): Promise<void> {
    await this.checkBreakpoints({
      type: RouteEventType.GUARD_EXECUTION,
      path,
      timestamp: Date.now(),
      metadata: { guardName, result },
    });
  }

  /**
   * Trigger loader execution event
   * @param path
   * @param loaderName
   * @param duration
   */
  async onLoaderExecution(
    path: string,
    loaderName: string,
    duration: number
  ): Promise<void> {
    await this.checkBreakpoints({
      type: RouteEventType.LOADER_EXECUTION,
      path,
      timestamp: Date.now(),
      metadata: { loaderName, duration },
    });
  }

  /**
   * Trigger route mount event
   * @param path
   */
  async onRouteMount(path: string): Promise<void> {
    await this.checkBreakpoints({
      type: RouteEventType.ROUTE_MOUNT,
      path,
      timestamp: Date.now(),
    });
  }

  /**
   * Trigger route unmount event
   * @param path
   */
  async onRouteUnmount(path: string): Promise<void> {
    await this.checkBreakpoints({
      type: RouteEventType.ROUTE_UNMOUNT,
      path,
      timestamp: Date.now(),
    });
  }

  /**
   * Trigger route error event
   * @param path
   * @param error
   */
  async onRouteError(path: string, error: Error): Promise<void> {
    await this.checkBreakpoints({
      type: RouteEventType.ERROR,
      path,
      timestamp: Date.now(),
      metadata: { error: error.message, stack: error.stack },
    });
  }

  /**
   * Get breakpoint hits
   * @param breakpointId
   */
  getHits(breakpointId?: string): RouteBreakpointHit[] {
    if (breakpointId) {
      return this.hits.filter((hit) => hit.breakpoint.id === breakpointId);
    }
    return [...this.hits];
  }

  /**
   * Clear breakpoint hits
   */
  clearHits(): void {
    this.hits = [];
  }

  /**
   * Check if path matches pattern
   * @param path
   * @param pattern
   */
  private matchesPattern(path: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      // Simple string matching with wildcards
      const regex = new RegExp(`^${  pattern.replace(/\*/g, '.*')  }$`);
      return regex.test(path);
    }
    return pattern.test(path);
  }

  /**
   * Capture stack trace
   */
  private captureStackTrace(): string[] {
    const stack = new Error().stack ?? '';
    return stack
      .split('\n')
      .slice(3) // Skip Error and this function
      .map((line) => line.trim());
  }

  /**
   * Format log message with placeholders
   * @param template
   * @param hit
   */
  private formatLogMessage(template: string, hit: RouteBreakpointHit): string {
    return template
      .replace(/{path}/g, hit.event.path)
      .replace(/{type}/g, hit.event.type)
      .replace(/{params}/g, JSON.stringify(hit.event.params ?? {}))
      .replace(/{query}/g, JSON.stringify(hit.event.query ?? {}));
  }

  /**
   * Notify callbacks
   * @param hit
   */
  private async notifyCallbacks(hit: RouteBreakpointHit): Promise<void> {
    for (const callback of this.callbacks) {
      try {
        await callback(hit);
      } catch (error) {
        console.error('Route breakpoint callback error:', error);
      }
    }
  }

  /**
   * Generate breakpoint ID
   */
  private generateBreakpointId(): string {
    return `route_bp_${Date.now()}_${this.breakpointIdCounter++}`;
  }
}

// ============================================================================
// Global Provider Instance
// ============================================================================

let globalProvider: RouteBreakpointProvider | null = null;

/**
 * Get or create global provider instance
 */
export function getGlobalRouteBreakpointProvider(): RouteBreakpointProvider {
  if (!globalProvider) {
    globalProvider = new RouteBreakpointProvider();
  }
  return globalProvider;
}

/**
 * Reset global provider
 */
export function resetGlobalRouteBreakpointProvider(): void {
  globalProvider = null;
}
