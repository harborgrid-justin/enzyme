/**
 * @file Crash Analytics
 * @description Session recording, breadcrumbs, and crash diagnostics
 *
 * This module provides comprehensive crash analytics capabilities:
 * - Breadcrumb tracking for user action history
 * - Session recording for debugging
 * - Performance metrics collection
 * - Device information capture
 * - Error context aggregation
 */

import type { AppError } from './errorTypes';

// ============================================================================
// Types
// ============================================================================

/**
 * Breadcrumb types for categorization
 */
export type BreadcrumbType =
  | 'navigation'
  | 'ui'
  | 'http'
  | 'console'
  | 'error'
  | 'user'
  | 'custom';

/**
 * Breadcrumb severity levels
 */
export type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';

/**
 * Single breadcrumb entry
 */
export interface Breadcrumb {
  /** Type of breadcrumb */
  type: BreadcrumbType;
  /** Category for grouping */
  category: string;
  /** Human-readable message */
  message: string;
  /** Additional data */
  data?: Record<string, unknown>;
  /** Timestamp in ms */
  timestamp: number;
  /** Severity level */
  level: BreadcrumbLevel;
}

/**
 * User action for session recording
 */
export interface UserAction {
  /** Action type */
  type: 'click' | 'input' | 'scroll' | 'navigation' | 'focus' | 'blur';
  /** CSS selector or element identifier */
  target: string;
  /** Value (masked if sensitive) */
  value?: string;
  /** Timestamp in ms */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Performance metrics snapshot
 */
export interface PerformanceMetrics {
  /** Page load time in ms */
  pageLoadTime?: number;
  /** DOM content loaded time in ms */
  domContentLoaded?: number;
  /** First contentful paint in ms */
  firstContentfulPaint?: number;
  /** Largest contentful paint in ms */
  largestContentfulPaint?: number;
  /** First input delay in ms */
  firstInputDelay?: number;
  /** Cumulative layout shift score */
  cumulativeLayoutShift?: number;
  /** JS heap size in bytes */
  jsHeapSize?: number;
  /** Total memory usage in bytes */
  memoryUsage?: number;
}

/**
 * Device information
 */
export interface DeviceInfo {
  /** User agent string */
  userAgent: string;
  /** Platform (OS) */
  platform: string;
  /** Browser language */
  language: string;
  /** Screen resolution */
  screenResolution: string;
  /** Viewport size */
  viewportSize: string;
  /** Device pixel ratio */
  devicePixelRatio: number;
  /** Color depth */
  colorDepth: number;
  /** Timezone */
  timezone: string;
  /** Cookies enabled */
  cookiesEnabled: boolean;
  /** Do Not Track enabled */
  doNotTrack: boolean;
}

/**
 * Complete session data for crash report
 */
export interface SessionData {
  /** Unique session ID */
  sessionId: string;
  /** User ID if available */
  userId?: string;
  /** Session start time */
  startTime: number;
  /** Session end time (if ended) */
  endTime?: number;
  /** Breadcrumb trail */
  breadcrumbs: Breadcrumb[];
  /** Recorded user actions */
  userActions: UserAction[];
  /** Performance metrics */
  performanceMetrics: PerformanceMetrics;
  /** Device information */
  deviceInfo: DeviceInfo;
  /** Errors that occurred */
  errors: AppError[];
}

/**
 * Crash analytics configuration
 */
export interface CrashAnalyticsConfig {
  /** Maximum breadcrumbs to keep */
  maxBreadcrumbs?: number;
  /** Maximum user actions to keep */
  maxUserActions?: number;
  /** Auto-capture click events */
  autoCaptureClicks?: boolean;
  /** Auto-capture navigation events */
  autoCaptureNavigation?: boolean;
  /** Auto-capture console messages */
  autoCaptureConsole?: boolean;
  /** Auto-capture network requests */
  autoCaptureNetwork?: boolean;
  /** Mask sensitive input values */
  maskInputs?: boolean;
  /** Session recording sample rate (0-1) */
  sessionSampleRate?: number;
  /** Custom user ID getter */
  getUserId?: () => string | undefined;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<CrashAnalyticsConfig, 'getUserId'>> & {
  getUserId?: CrashAnalyticsConfig['getUserId'];
} = {
  maxBreadcrumbs: 100,
  maxUserActions: 500,
  autoCaptureClicks: true,
  autoCaptureNavigation: true,
  autoCaptureConsole: true,
  autoCaptureNetwork: true,
  maskInputs: true,
  sessionSampleRate: 1.0,
  getUserId: undefined,
};

// ============================================================================
// Crash Analytics Manager
// ============================================================================

/**
 * Crash analytics manager for session recording and breadcrumb tracking
 *
 * @example
 * ```tsx
 * // Initialize crash analytics
 * crashAnalytics.init();
 *
 * // Add custom breadcrumb
 * crashAnalytics.addBreadcrumb({
 *   type: 'custom',
 *   category: 'checkout',
 *   message: 'User started checkout',
 *   level: 'info',
 *   data: { cartItems: 3 }
 * });
 *
 * // Get session data for crash report
 * const sessionData = crashAnalytics.getSessionData();
 * ```
 */
class CrashAnalyticsManager {
  private config: typeof DEFAULT_CONFIG;
  private sessionId: string;
  private breadcrumbs: Breadcrumb[] = [];
  private userActions: UserAction[] = [];
  private errors: AppError[] = [];
  private startTime: number;
  private isRecording: boolean;
  private cleanupFns: Array<() => void> = [];
  private initialized = false;

  constructor(config: CrashAnalyticsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.isRecording = Math.random() < this.config.sessionSampleRate;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Initialize crash analytics
   */
  init(): void {
    if (this.initialized || typeof window === 'undefined') return;

    this.initialized = true;

    if (this.config.autoCaptureClicks) {
      this.setupClickCapture();
    }

    if (this.config.autoCaptureNavigation) {
      this.setupNavigationCapture();
    }

    if (this.config.autoCaptureConsole) {
      this.setupConsoleCapture();
    }

    if (this.config.autoCaptureNetwork) {
      this.setupNetworkCapture();
    }

    // Capture performance metrics after page load
    this.capturePerformanceMetrics();

    // Record initial breadcrumb
    this.addBreadcrumb({
      type: 'navigation',
      category: 'session',
      message: 'Session started',
      level: 'info',
      data: {
        url: window.location.href,
        referrer: document.referrer,
      },
    });
  }

  /**
   * Setup click capture
   */
  private setupClickCapture(): void {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const selector = this.getElementSelector(target);
      const text = this.getElementText(target);

      this.addUserAction({
        type: 'click',
        target: selector,
        metadata: {
          text: text.substring(0, 100),
          tagName: target.tagName,
          className: target.className,
        },
      });

      this.addBreadcrumb({
        type: 'ui',
        category: 'click',
        message: `Clicked ${target.tagName.toLowerCase()}`,
        level: 'info',
        data: { selector, text: text.substring(0, 50) },
      });
    };

    document.addEventListener('click', handler, { capture: true, passive: true });
    this.cleanupFns.push(() =>
      document.removeEventListener('click', handler, { capture: true })
    );
  }

  /**
   * Setup navigation capture
   */
  private setupNavigationCapture(): void {
    // History API
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      this.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: `Navigated to ${String(args[2])}`,
        level: 'info',
        data: { to: args[2], from: window.location.href },
      });
      return originalPushState(...args);
    };

    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      this.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: `Replaced state: ${String(args[2])}`,
        level: 'info',
      });
      return originalReplaceState(...args);
    };

    // Popstate
    const popstateHandler = () => {
      this.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: `Navigated back/forward to ${window.location.href}`,
        level: 'info',
      });
    };

    window.addEventListener('popstate', popstateHandler);
    this.cleanupFns.push(() => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', popstateHandler);
    });
  }

  /**
   * Setup console capture
   */
  private setupConsoleCapture(): void {
    const levels = ['log', 'warn', 'error'] as const;
    const originals = {} as Record<typeof levels[number], typeof console.log>;

    levels.forEach((level) => {
      originals[level] = console[level].bind(console);
      console[level] = (...args: unknown[]) => {
        this.addBreadcrumb({
          type: 'console',
          category: `console.${level}`,
          message: args.map((arg) => this.stringify(arg)).join(' ').substring(0, 500),
          level: level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'debug',
        });
        originals[level](...args);
      };
    });

    this.cleanupFns.push(() => {
      levels.forEach((level) => {
        console[level] = originals[level];
      });
    });
  }

  /**
   * Setup network capture
   */
  private setupNetworkCapture(): void {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? 'GET';
      const startTime = performance.now();

      this.addBreadcrumb({
        type: 'http',
        category: 'fetch',
        message: `${method} ${url}`,
        level: 'info',
        data: { url, method },
      });

      try {
        const response = await originalFetch(input, init);
        const duration = performance.now() - startTime;

        this.addBreadcrumb({
          type: 'http',
          category: 'fetch',
          message: `${method} ${url} - ${response.status}`,
          level: response.ok ? 'info' : 'warning',
          data: { url, method, status: response.status, duration: Math.round(duration) },
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        this.addBreadcrumb({
          type: 'http',
          category: 'fetch',
          message: `${method} ${url} - Failed`,
          level: 'error',
          data: {
            url,
            method,
            error: error instanceof Error ? error.message : String(error),
            duration: Math.round(duration),
          },
        });

        throw error;
      }
    };

    this.cleanupFns.push(() => {
      window.fetch = originalFetch;
    });
  }

  /**
   * Capture performance metrics
   */
  private capturePerformanceMetrics(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // Wait for page load
    const captureMetrics = () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        const metrics: Partial<PerformanceMetrics> = {};

        if (navigation) {
          metrics.pageLoadTime = navigation.loadEventEnd - navigation.startTime;
          metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.startTime;
        }

        paint.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        });

        // Memory (Chrome only)
        const performanceWithMemory = performance as Performance & {
          memory?: { usedJSHeapSize: number };
        };
        if (performanceWithMemory.memory) {
          metrics.jsHeapSize = performanceWithMemory.memory.usedJSHeapSize;
        }

        this.addBreadcrumb({
          type: 'custom',
          category: 'performance',
          message: 'Performance metrics captured',
          level: 'info',
          data: metrics,
        });
      }, 1000);
    };

    if (document.readyState === 'complete') {
      captureMetrics();
    } else {
      window.addEventListener('load', captureMetrics, { once: true });
    }
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(crumb: Omit<Breadcrumb, 'timestamp'>): void {
    const breadcrumb: Breadcrumb = {
      ...crumb,
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(breadcrumb);

    // Trim to max size
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Add a user action
   */
  addUserAction(action: Omit<UserAction, 'timestamp'>): void {
    if (!this.isRecording) return;

    const userAction: UserAction = {
      ...action,
      timestamp: Date.now(),
    };

    // Mask sensitive input values
    if (this.config.maskInputs && action.value) {
      userAction.value = '***';
    }

    this.userActions.push(userAction);

    // Trim to max size
    if (this.userActions.length > this.config.maxUserActions) {
      this.userActions = this.userActions.slice(-this.config.maxUserActions);
    }
  }

  /**
   * Record an error
   */
  recordError(error: AppError): void {
    this.errors.push(error);

    this.addBreadcrumb({
      type: 'error',
      category: error.category,
      message: error.message,
      level: 'error',
      data: {
        id: error.id,
        severity: error.severity,
      },
    });
  }

  /**
   * Get session data for crash report
   */
  getSessionData(): SessionData {
    return {
      sessionId: this.sessionId,
      userId: this.config.getUserId?.(),
      startTime: this.startTime,
      breadcrumbs: [...this.breadcrumbs],
      userActions: [...this.userActions],
      performanceMetrics: this.getPerformanceMetrics(),
      deviceInfo: this.getDeviceInfo(),
      errors: [...this.errors],
    };
  }

  /**
   * Get current performance metrics
   */
  private getPerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    if (typeof window === 'undefined' || !window.performance) {
      return metrics;
    }

    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.pageLoadTime = navigation.loadEventEnd - navigation.startTime;
      metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.startTime;
    }

    // Memory (Chrome only)
    const performanceWithMemory = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    if (performanceWithMemory.memory) {
      metrics.jsHeapSize = performanceWithMemory.memory.usedJSHeapSize;
    }

    return metrics;
  }

  /**
   * Get device info
   */
  private getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        userAgent: 'unknown',
        platform: 'unknown',
        language: 'unknown',
        screenResolution: 'unknown',
        viewportSize: 'unknown',
        devicePixelRatio: 1,
        colorDepth: 24,
        timezone: 'unknown',
        cookiesEnabled: false,
        doNotTrack: true,
      };
    }

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
    };
  }

  /**
   * Get CSS selector for element
   */
  private getElementSelector(element: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && parts.length < 5) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        parts.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(Boolean).slice(0, 2);
        if (classes.length) {
          selector += `.${classes.join('.')}`;
        }
      }

      parts.unshift(selector);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  /**
   * Get element text content
   */
  private getElementText(element: HTMLElement): string {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return this.config.maskInputs ? '[MASKED]' : (element as HTMLInputElement).value;
    }
    return element.textContent?.trim() ?? '';
  }

  /**
   * Stringify value safely
   */
  private stringify(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (value instanceof Error) return value.message;
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }

  /**
   * Get breadcrumbs
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Get recent breadcrumbs (last N)
   */
  getRecentBreadcrumbs(count: number = 20): Breadcrumb[] {
    return this.breadcrumbs.slice(-count);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.breadcrumbs = [];
    this.userActions = [];
    this.errors = [];
  }

  /**
   * Start new session
   */
  startNewSession(): void {
    this.clear();
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.isRecording = Math.random() < this.config.sessionSampleRate;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.initialized = false;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * Global crash analytics instance
 */
export const crashAnalytics = new CrashAnalyticsManager();
