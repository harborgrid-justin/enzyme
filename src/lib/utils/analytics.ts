/**
 * @file Analytics Utilities
 * @description Telemetry and analytics wrapper with privacy controls,
 * consent management, and multiple provider support
 */

import { logger } from './logging';
import { globalEventBus } from './eventEmitter';

// ============================================================================
// Types
// ============================================================================

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'page_view'
  | 'click'
  | 'form_submit'
  | 'error'
  | 'performance'
  | 'feature_usage'
  | 'search'
  | 'conversion'
  | 'custom';

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

/**
 * User properties for identification
 */
export interface UserProperties {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  organization?: string;
  plan?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/**
 * Analytics provider interface
 */
export interface AnalyticsProvider {
  name: string;
  initialize(config: Record<string, unknown>): Promise<void>;
  identify(userId: string, properties?: UserProperties): void;
  track(event: AnalyticsEvent): void;
  page(name: string, properties?: Record<string, unknown>): void;
  reset(): void;
  setUserProperties(properties: UserProperties): void;
}

/**
 * Consent categories
 */
export interface ConsentCategories {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Enable analytics */
  enabled?: boolean;
  /** Enable debug mode */
  debug?: boolean;
  /** Default consent settings */
  defaultConsent?: Partial<ConsentCategories>;
  /** PHI fields to exclude */
  phiFields?: string[];
  /** PII fields to hash */
  piiFields?: string[];
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Session timeout in ms */
  sessionTimeout?: number;
  /** Queue events when offline */
  offlineQueue?: boolean;
  /** Max queue size */
  maxQueueSize?: number;
}

/**
 * Analytics context
 */
export interface AnalyticsContext {
  page?: {
    path: string;
    title: string;
    referrer: string;
  };
  device?: {
    type: string;
    os: string;
    browser: string;
    screen: string;
  };
  location?: {
    timezone: string;
    language: string;
  };
  campaign?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

// ============================================================================
// Analytics Manager
// ============================================================================

/**
 * Analytics manager with privacy controls and multi-provider support
 */
export class AnalyticsManager {
  private config: Required<AnalyticsConfig>;
  private providers = new Map<string, AnalyticsProvider>();
  private consent: ConsentCategories;
  private userId: string | null = null;
  private sessionId: string;
  private sessionStart: number;
  private eventQueue: AnalyticsEvent[] = [];
  private context: AnalyticsContext = {};

  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      debug: config.debug ?? false,
      defaultConsent: config.defaultConsent ?? {},
      phiFields: config.phiFields ?? [
        'ssn',
        'medicalRecordNumber',
        'healthCondition',
        'diagnosis',
        'treatment',
        'prescription',
      ],
      piiFields: config.piiFields ?? ['email', 'phone', 'address', 'name'],
      sampleRate: config.sampleRate ?? 1,
      sessionTimeout: config.sessionTimeout ?? 30 * 60 * 1000, // 30 minutes
      offlineQueue: config.offlineQueue ?? true,
      maxQueueSize: config.maxQueueSize ?? 100,
    };

    this.consent = {
      necessary: true,
      analytics: config.defaultConsent?.analytics ?? false,
      marketing: config.defaultConsent?.marketing ?? false,
      preferences: config.defaultConsent?.preferences ?? true,
    };

    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();

    this.setupContext();
    this.setupSessionTracking();
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup context information
   */
  private setupContext(): void {
    if (typeof window === 'undefined') return;

    this.context = {
      page: {
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
      },
      device: {
        type: this.getDeviceType(),
        os: this.getOS(),
        browser: this.getBrowser(),
        screen: `${window.screen.width}x${window.screen.height}`,
      },
      location: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
      },
      campaign: this.getUTMParams(),
    };
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/tablet/i.test(ua)) return 'tablet';
    if (/mobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  /**
   * Get OS
   */
  private getOS(): string {
    const ua = navigator.userAgent;
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    if (/android/i.test(ua)) return 'Android';
    if (/ios|iphone|ipad/i.test(ua)) return 'iOS';
    return 'Unknown';
  }

  /**
   * Get browser
   */
  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (/chrome/i.test(ua)) return 'Chrome';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua)) return 'Safari';
    if (/edge/i.test(ua)) return 'Edge';
    return 'Unknown';
  }

  /**
   * Get UTM parameters
   */
  private getUTMParams(): AnalyticsContext['campaign'] {
    if (typeof window === 'undefined') return {};

    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') ?? undefined,
      medium: params.get('utm_medium') ?? undefined,
      campaign: params.get('utm_campaign') ?? undefined,
      term: params.get('utm_term') ?? undefined,
      content: params.get('utm_content') ?? undefined,
    };
  }

  /**
   * Setup session tracking
   */
  private setupSessionTracking(): void {
    if (typeof window === 'undefined') return;

    // Reset session on activity after timeout
    let lastActivity = Date.now();

    const resetSessionIfNeeded = (): void => {
      const now = Date.now();
      if (now - lastActivity > this.config.sessionTimeout) {
        this.sessionId = this.generateSessionId();
        this.sessionStart = now;
      }
      lastActivity = now;
    };

    window.addEventListener('click', resetSessionIfNeeded, { passive: true });
    window.addEventListener('keydown', resetSessionIfNeeded, { passive: true });
    window.addEventListener('scroll', resetSessionIfNeeded, { passive: true });
  }

  /**
   * Register analytics provider
   */
  async registerProvider(
    provider: AnalyticsProvider,
    config: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await provider.initialize(config);
      this.providers.set(provider.name, provider);
      logger.debug('[Analytics] Provider registered', { name: provider.name });
    } catch (error) {
      logger.error('[Analytics] Failed to register provider', {
        name: provider.name,
        error,
      });
    }
  }

  /**
   * Remove provider
   */
  removeProvider(name: string): void {
    this.providers.delete(name);
  }

  /**
   * Set consent
   */
  setConsent(consent: Partial<ConsentCategories>): void {
    this.consent = { ...this.consent, ...consent };

    // Flush queue if analytics consent granted
    if (consent.analytics === true && this.eventQueue.length > 0) {
      this.flushQueue();
    }

    globalEventBus.emitSync('analytics:consentChanged', { consent: this.consent });
    logger.debug('[Analytics] Consent updated', { consent: this.consent });
  }

  /**
   * Get consent
   */
  getConsent(): ConsentCategories {
    return { ...this.consent };
  }

  /**
   * Check if tracking is allowed
   */
  private canTrack(): boolean {
    if (!this.config.enabled) return false;
    if (this.consent.analytics !== true) return false;

    // Sample rate check
    if (this.config.sampleRate < 1) {
      if (Math.random() > this.config.sampleRate) return false;
    }

    return true;
  }

  /**
   * Sanitize event properties
   */
  private sanitizeProperties(
    properties: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Remove PHI fields entirely
      if (this.config.phiFields.includes(key.toLowerCase())) {
        continue;
      }

      // Hash PII fields
      if (this.config.piiFields.includes(key.toLowerCase())) {
        sanitized[key] = this.hashValue(String(value));
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Simple hash function for PII
   */
  private hashValue(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `hashed_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Identify user
   */
  identify(userId: string, properties?: UserProperties): void {
    this.userId = userId;

    if (!this.canTrack()) return;

    const sanitizedProps = properties
      ? (this.sanitizeProperties(properties as Record<string, unknown>) as UserProperties)
      : undefined;

    for (const provider of this.providers.values()) {
      try {
        provider.identify(userId, sanitizedProps);
      } catch (error) {
        logger.error('[Analytics] Identify failed', { provider: provider.name, error });
      }
    }

    if (this.config.debug) {
      logger.debug('[Analytics] User identified', { userId });
    }
  }

  /**
   * Track event
   */
  track(
    name: string,
    properties?: Record<string, unknown>,
    type: AnalyticsEventType = 'custom'
  ): void {
    const event: AnalyticsEvent = {
      type,
      name,
      properties: properties ? this.sanitizeProperties(properties) : undefined,
      timestamp: Date.now(),
      userId: this.userId ?? undefined,
      sessionId: this.sessionId,
    };

    if (!this.canTrack()) {
      // Queue event if offline queuing enabled
      if (this.config.offlineQueue) {
        this.queueEvent(event);
      }
      return;
    }

    this.sendEvent(event);
  }

  /**
   * Send event to providers
   */
  private sendEvent(event: AnalyticsEvent): void {
    for (const provider of this.providers.values()) {
      try {
        provider.track(event);
      } catch (error) {
        logger.error('[Analytics] Track failed', { provider: provider.name, error });
      }
    }

    if (this.config.debug) {
      logger.debug('[Analytics] Event tracked', { event });
    }
  }

  /**
   * Queue event for later
   */
  private queueEvent(event: AnalyticsEvent): void {
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.eventQueue.shift(); // Remove oldest
    }
    this.eventQueue.push(event);
  }

  /**
   * Flush event queue
   */
  private flushQueue(): void {
    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      this.sendEvent(event);
    }

    if (events.length > 0) {
      logger.debug('[Analytics] Queue flushed', { count: events.length });
    }
  }

  /**
   * Track page view
   */
  page(name?: string, properties?: Record<string, unknown>): void {
    const pageName = name ?? (typeof window !== 'undefined' ? window.location.pathname : '/');

    // Update context
    if (typeof window !== 'undefined') {
      this.context.page = {
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
      };
    }

    if (!this.canTrack()) return;

    const sanitizedProps = properties
      ? this.sanitizeProperties(properties)
      : undefined;

    for (const provider of this.providers.values()) {
      try {
        provider.page(pageName, sanitizedProps);
      } catch (error) {
        logger.error('[Analytics] Page view failed', { provider: provider.name, error });
      }
    }

    if (this.config.debug) {
      logger.debug('[Analytics] Page view tracked', { name: pageName });
    }
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    this.track(
      'error',
      {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500),
        ...context,
      },
      'error'
    );
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, value: number, context?: Record<string, unknown>): void {
    this.track(
      metric,
      {
        value,
        ...context,
      },
      'performance'
    );
  }

  /**
   * Track feature usage
   */
  trackFeature(feature: string, action: string, context?: Record<string, unknown>): void {
    this.track(
      `${feature}:${action}`,
      context,
      'feature_usage'
    );
  }

  /**
   * Track conversion
   */
  trackConversion(name: string, value?: number, context?: Record<string, unknown>): void {
    this.track(
      name,
      {
        value,
        ...context,
      },
      'conversion'
    );
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.canTrack()) return;

    const sanitizedProps = this.sanitizeProperties(
      properties as Record<string, unknown>
    ) as UserProperties;

    for (const provider of this.providers.values()) {
      try {
        provider.setUserProperties(sanitizedProps);
      } catch (error) {
        logger.error('[Analytics] Set user properties failed', {
          provider: provider.name,
          error,
        });
      }
    }
  }

  /**
   * Reset analytics (on logout)
   */
  reset(): void {
    this.userId = null;
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.eventQueue = [];

    for (const provider of this.providers.values()) {
      try {
        provider.reset();
      } catch (error) {
        logger.error('[Analytics] Reset failed', { provider: provider.name, error });
      }
    }

    logger.debug('[Analytics] Reset complete');
  }

  /**
   * Get analytics context
   */
  getContext(): AnalyticsContext {
    return { ...this.context };
  }

  /**
   * Get session info
   */
  getSessionInfo(): { sessionId: string; duration: number } {
    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStart,
    };
  }
}

// ============================================================================
// Console Analytics Provider (for development)
// ============================================================================

/**
 * Console analytics provider for development
 */
export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  name = 'console';

  async initialize(): Promise<void> {
    logger.info('[ConsoleAnalytics] Initialized');
  }

  identify(userId: string, properties?: UserProperties): void {
    console.group('🔵 Analytics: Identify');
    console.info('User ID:', userId);
    if (properties) console.info('Properties:', properties);
    console.groupEnd();
  }

  track(event: AnalyticsEvent): void {
    console.group(`📊 Analytics: ${event.type}`);
    console.info('Event:', event.name);
    if (event.properties) console.info('Properties:', event.properties);
    console.info('Timestamp:', new Date(event.timestamp ?? Date.now()).toISOString());
    console.groupEnd();
  }

  page(name: string, properties?: Record<string, unknown>): void {
    console.group('📄 Analytics: Page View');
    console.info('Page:', name);
    if (properties) console.info('Properties:', properties);
    console.groupEnd();
  }

  reset(): void {
    logger.info('[ConsoleAnalytics] Reset');
  }

  setUserProperties(properties: UserProperties): void {
    console.info('👤 Analytics: User Properties', properties);
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Global analytics manager instance
 */
export const analytics = new AnalyticsManager({
  debug: import.meta.env.DEV,
});

// Register console provider in development
if (import.meta.env.DEV) {
  void analytics.registerProvider(new ConsoleAnalyticsProvider());
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Track event
 */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
  type?: AnalyticsEventType
): void {
  analytics.track(name, properties, type);
}

/**
 * Track page view
 */
export function trackPageView(name?: string, properties?: Record<string, unknown>): void {
  analytics.page(name, properties);
}

/**
 * Identify user
 */
export function identifyUser(userId: string, properties?: UserProperties): void {
  analytics.identify(userId, properties);
}

/**
 * Track error
 */
export function trackError(error: Error, context?: Record<string, unknown>): void {
  analytics.trackError(error, context);
}

/**
 * Track performance metric
 */
export function trackPerformance(
  metric: string,
  value: number,
  context?: Record<string, unknown>
): void {
  analytics.trackPerformance(metric, value, context);
}

/**
 * Track feature usage
 */
export function trackFeature(
  feature: string,
  action: string,
  context?: Record<string, unknown>
): void {
  analytics.trackFeature(feature, action, context);
}

/**
 * Set analytics consent
 */
export function setAnalyticsConsent(consent: Partial<ConsentCategories>): void {
  analytics.setConsent(consent);
}

/**
 * Reset analytics
 */
export function resetAnalytics(): void {
  analytics.reset();
}
