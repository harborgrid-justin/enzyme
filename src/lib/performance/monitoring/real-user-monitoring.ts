/**
 * @file Real User Monitoring (RUM)
 * @description Comprehensive Real User Monitoring implementation for capturing
 * actual user experience metrics, session tracking, and behavioral analytics.
 *
 * Features:
 * - Session management and tracking
 * - Page view tracking
 * - User journey mapping
 * - Error tracking
 * - Custom event recording
 * - Network request monitoring
 * - Resource timing collection
 * - Rage click detection
 * - Form abandonment tracking
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Session status
 */
export type SessionStatus = 'active' | 'idle' | 'expired';

/**
 * Event type for RUM
 */
export type RUMEventType =
  | 'session_start'
  | 'session_end'
  | 'page_view'
  | 'navigation'
  | 'interaction'
  | 'error'
  | 'resource'
  | 'long_task'
  | 'rage_click'
  | 'form_abandonment'
  | 'custom';

/**
 * User session data
 */
export interface UserSession {
  /** Unique session ID */
  sessionId: string;
  /** User ID if authenticated */
  userId?: string;
  /** Anonymous visitor ID */
  visitorId: string;
  /** Session start time */
  startTime: number;
  /** Last activity time */
  lastActivityTime: number;
  /** Session status */
  status: SessionStatus;
  /** Number of page views */
  pageViews: number;
  /** Total interactions */
  interactions: number;
  /** Total errors */
  errors: number;
  /** Session duration in ms */
  duration: number;
  /** Device information */
  device: DeviceInfo;
  /** Referrer URL */
  referrer: string;
  /** Landing page */
  landingPage: string;
  /** UTM parameters */
  utmParams?: UTMParams;
}

/**
 * Device information
 */
export interface DeviceInfo {
  /** User agent string */
  userAgent: string;
  /** Device type */
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  /** Screen resolution */
  screenResolution: string;
  /** Viewport size */
  viewportSize: string;
  /** Color depth */
  colorDepth: number;
  /** Device pixel ratio */
  pixelRatio: number;
  /** Timezone */
  timezone: string;
  /** Language */
  language: string;
  /** Connection type */
  connectionType?: string;
  /** Hardware concurrency */
  hardwareConcurrency?: number;
  /** Device memory */
  deviceMemory?: number;
}

/**
 * UTM parameters
 */
export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/**
 * Page view event
 */
export interface PageViewEvent {
  /** Page URL */
  url: string;
  /** Page path */
  path: string;
  /** Page title */
  title: string;
  /** Previous page path */
  previousPath?: string;
  /** Timestamp */
  timestamp: number;
  /** Time on previous page (ms) */
  timeOnPreviousPage?: number;
  /** Performance metrics */
  metrics?: {
    dns?: number;
    tcp?: number;
    ttfb?: number;
    domContentLoaded?: number;
    load?: number;
  };
}

/**
 * Interaction event
 */
export interface InteractionEvent {
  /** Event type (click, scroll, etc.) */
  type: string;
  /** Target element selector */
  target: string;
  /** Target element text (truncated) */
  targetText?: string;
  /** Timestamp */
  timestamp: number;
  /** X coordinate */
  x?: number;
  /** Y coordinate */
  y?: number;
  /** Duration (for scrolls, etc.) */
  duration?: number;
  /** Custom data */
  data?: Record<string, unknown>;
}

/**
 * Error event
 */
export interface ErrorEvent {
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Error type */
  type: 'js' | 'resource' | 'promise' | 'network' | 'custom';
  /** Source URL */
  source?: string;
  /** Line number */
  line?: number;
  /** Column number */
  column?: number;
  /** Timestamp */
  timestamp: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Resource timing event
 */
export interface ResourceEvent {
  /** Resource URL */
  url: string;
  /** Resource type */
  type: string;
  /** Duration */
  duration: number;
  /** Transfer size */
  transferSize: number;
  /** Encoded body size */
  encodedBodySize: number;
  /** DNS time */
  dnsTime: number;
  /** Connection time */
  connectTime: number;
  /** Request time */
  requestTime: number;
  /** Response time */
  responseTime: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Rage click event
 */
export interface RageClickEvent {
  /** Target element selector */
  target: string;
  /** Number of clicks */
  clickCount: number;
  /** Time span of clicks */
  timeSpan: number;
  /** First click X */
  x: number;
  /** First click Y */
  y: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Form abandonment event
 */
export interface FormAbandonmentEvent {
  /** Form identifier */
  formId: string;
  /** Form name */
  formName?: string;
  /** Fields started */
  fieldsStarted: string[];
  /** Fields completed */
  fieldsCompleted: string[];
  /** Time spent in form (ms) */
  timeSpent: number;
  /** Last focused field */
  lastFocusedField?: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * RUM event wrapper
 */
export interface RUMEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: RUMEventType;
  /** Session ID */
  sessionId: string;
  /** Timestamp */
  timestamp: number;
  /** Page URL */
  url: string;
  /** Event payload */
  payload: unknown;
}

/**
 * RUM configuration
 */
export interface RUMConfig {
  /** Enable RUM */
  enabled: boolean;
  /** Endpoint URL for sending data */
  endpoint?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Sample rate (0-1) */
  sampleRate: number;
  /** Session timeout in ms */
  sessionTimeout: number;
  /** Enable page view tracking */
  trackPageViews: boolean;
  /** Enable click tracking */
  trackClicks: boolean;
  /** Enable scroll tracking */
  trackScrolls: boolean;
  /** Enable error tracking */
  trackErrors: boolean;
  /** Enable resource timing */
  trackResources: boolean;
  /** Enable long task tracking */
  trackLongTasks: boolean;
  /** Enable rage click detection */
  detectRageClicks: boolean;
  /** Enable form abandonment tracking */
  trackFormAbandonment: boolean;
  /** Rage click threshold */
  rageClickThreshold: number;
  /** Rage click time window (ms) */
  rageClickTimeWindow: number;
  /** Batch size for sending events */
  batchSize: number;
  /** Batch flush interval (ms) */
  flushInterval: number;
  /** Mask sensitive data */
  maskSensitiveData: boolean;
  /** Sensitive field patterns */
  sensitivePatterns: RegExp[];
  /** Callback for events */
  onEvent?: (event: RUMEvent) => void;
  /** Debug mode */
  debug: boolean;
}

/**
 * RUM session summary
 */
export interface SessionSummary {
  session: UserSession;
  pageViews: PageViewEvent[];
  interactions: number;
  errors: ErrorEvent[];
  averagePageDuration: number;
  bounced: boolean;
  conversionEvents: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: RUMConfig = {
  enabled: true,
  sampleRate: 1.0,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  trackPageViews: true,
  trackClicks: true,
  trackScrolls: false,
  trackErrors: true,
  trackResources: true,
  trackLongTasks: true,
  detectRageClicks: true,
  trackFormAbandonment: true,
  rageClickThreshold: 3,
  rageClickTimeWindow: 1000,
  batchSize: 10,
  flushInterval: 5000,
  maskSensitiveData: true,
  sensitivePatterns: [
    /password/i,
    /credit.?card/i,
    /card.?number/i,
    /cvv/i,
    /ssn/i,
    /social.?security/i,
  ],
  debug: false,
};

const VISITOR_ID_KEY = 'rum_visitor_id';
const SESSION_KEY = 'rum_session';

// ============================================================================
// Real User Monitoring Class
// ============================================================================

/**
 * Real User Monitoring manager
 */
export class RealUserMonitoring {
  private config: RUMConfig;
  private session: UserSession | null = null;
  private eventBuffer: RUMEvent[] = [];
  private pageViews: PageViewEvent[] = [];
  private errors: ErrorEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private clickTracker: { timestamps: number[]; positions: Array<{ x: number; y: number }> } = {
    timestamps: [],
    positions: [],
  };
  private formTrackers: Map<string, { startTime: number; fields: Set<string> }> = new Map();
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;
  private idCounter = 0;

  constructor(config: Partial<RUMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize RUM
   */
  init(): () => void {
    if (this.isInitialized || !this.config.enabled) {
      return () => {};
    }

    // Check sample rate
    if (Math.random() > this.config.sampleRate) {
      this.log('Skipping RUM initialization (sample rate)');
      return () => {};
    }

    this.isInitialized = true;
    this.log('Initializing RUM');

    // Initialize or resume session
    this.initSession();

    // Set up event listeners
    this.setupEventListeners();

    // Set up performance observers
    this.setupPerformanceObservers();

    // Start flush timer
    this.startFlushTimer();

    // Track initial page view
    if (this.config.trackPageViews) {
      this.trackPageView();
    }

    // Return cleanup function
    return () => this.cleanup();
  }

  /**
   * Get current session
   */
  getSession(): UserSession | null {
    return this.session;
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    if (this.session) {
      this.session.userId = userId;
      this.saveSession();
    }
  }

  /**
   * Track page view
   */
  trackPageView(customData?: Record<string, unknown>): void {
    if (!this.session) return;

    const previousPage = this.pageViews[this.pageViews.length - 1];
    const now = Date.now();

    const pageView: PageViewEvent = {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      previousPath: previousPage?.path,
      timestamp: now,
      timeOnPreviousPage: previousPage ? now - previousPage.timestamp : undefined,
      metrics: this.getNavigationMetrics(),
    };

    this.pageViews.push(pageView);
    this.session.pageViews++;
    this.updateActivity();

    this.recordEvent('page_view', { ...pageView, ...customData });
  }

  /**
   * Track custom event
   */
  trackEvent(name: string, data?: Record<string, unknown>): void {
    if (!this.session) return;

    this.recordEvent('custom', {
      name,
      data: this.maskSensitiveData(data ?? {}),
      timestamp: Date.now(),
    });
  }

  /**
   * Track error
   */
  trackError(
    error: Error | string,
    type: ErrorEvent['type'] = 'custom',
    context?: Record<string, unknown>
  ): void {
    if (!this.session) return;

    const errorEvent: ErrorEvent = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      type,
      timestamp: Date.now(),
      context: this.maskSensitiveData(context ?? {}),
    };

    this.errors.push(errorEvent);
    this.session.errors++;

    this.recordEvent('error', errorEvent);
  }

  /**
   * Get session summary
   */
  getSessionSummary(): SessionSummary | null {
    if (!this.session) return null;

    const totalDuration = this.pageViews.reduce((sum, pv, i) => {
      if (i === this.pageViews.length - 1) return sum;
      const nextPv = this.pageViews[i + 1];
      return sum + ((nextPv?.timestamp ?? 0) - pv.timestamp);
    }, 0);

    return {
      session: { ...this.session },
      pageViews: [...this.pageViews],
      interactions: this.session.interactions,
      errors: [...this.errors],
      averagePageDuration:
        this.pageViews.length > 1 ? totalDuration / (this.pageViews.length - 1) : 0,
      bounced: this.pageViews.length === 1,
      conversionEvents: [], // Would be populated by custom event tracking
    };
  }

  /**
   * Flush events immediately
   */
  flush(): void {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    if (this.config.endpoint !== null && this.config.endpoint !== undefined) {
      void this.sendToEndpoint(events);
    }
  }

  /**
   * End current session
   */
  endSession(): void {
    if (!this.session) return;

    this.session.status = 'expired';
    this.session.duration = Date.now() - this.session.startTime;

    this.recordEvent('session_end', {
      duration: this.session.duration,
      pageViews: this.session.pageViews,
      interactions: this.session.interactions,
      errors: this.session.errors,
    });

    this.flush();
    this.clearSession();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initSession(): void {
    const visitorId = this.getOrCreateVisitorId();
    const existingSession = this.loadSession();
    const now = Date.now();

    if (existingSession && now - existingSession.lastActivityTime < this.config.sessionTimeout) {
      // Resume existing session
      this.session = {
        ...existingSession,
        lastActivityTime: now,
        status: 'active',
      };
      this.log('Resumed existing session:', this.session.sessionId);
    } else {
      // Create new session
      this.session = {
        sessionId: this.generateSessionId(),
        visitorId,
        startTime: now,
        lastActivityTime: now,
        status: 'active',
        pageViews: 0,
        interactions: 0,
        errors: 0,
        duration: 0,
        device: this.getDeviceInfo(),
        referrer: document.referrer,
        landingPage: window.location.pathname,
        utmParams: this.parseUTMParams(),
      };
      this.log('Created new session:', this.session.sessionId);

      this.recordEvent('session_start', {
        device: this.session.device,
        referrer: this.session.referrer,
        landingPage: this.session.landingPage,
        utmParams: this.session.utmParams,
      });
    }

    this.saveSession();
    this.startActivityMonitor();
  }

  private getOrCreateVisitorId(): string {
    try {
      let visitorId = localStorage.getItem(VISITOR_ID_KEY);
      if (visitorId === null || visitorId === undefined) {
        visitorId = this.generateVisitorId();
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
      }
      return visitorId;
    } catch {
      return this.generateVisitorId();
    }
  }

  private loadSession(): UserSession | null {
    try {
      const data = sessionStorage.getItem(SESSION_KEY);
      if (data === null || data === undefined) {
        return null;
      }
      return JSON.parse(data) as UserSession;
    } catch {
      return null;
    }
  }

  private saveSession(): void {
    if (!this.session) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    } catch {
      // Storage might be full or disabled
    }
  }

  private clearSession(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore
    }
    this.session = null;
    this.pageViews = [];
    this.errors = [];
  }

  private setupEventListeners(): void {
    // Click tracking
    if (this.config.trackClicks || this.config.detectRageClicks) {
      document.addEventListener('click', this.handleClick.bind(this), true);
    }

    // Scroll tracking
    if (this.config.trackScrolls) {
      document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    }

    // Error tracking
    if (this.config.trackErrors) {
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }

    // Form tracking
    if (this.config.trackFormAbandonment) {
      document.addEventListener('focusin', this.handleFormFocus.bind(this));
      document.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    // Page visibility
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private setupPerformanceObservers(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Resource timing
    if (this.config.trackResources) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
            this.handleResourceEntry(entry);
          }
        });
        resourceObserver.observe({ type: 'resource', buffered: true });
        this.observers.push(resourceObserver);
      } catch (e) {
        this.log('Failed to observe resources', e);
      }
    }

    // Long tasks
    if (this.config.trackLongTasks) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleLongTask(entry);
          }
        });
        longTaskObserver.observe({ type: 'longtask', buffered: true });
        this.observers.push(longTaskObserver);
      } catch (e) {
        this.log('Failed to observe long tasks', e);
      }
    }
  }

  private handleClick(event: MouseEvent): void {
    if (!this.session) return;

    const now = Date.now();
    const target = event.target as HTMLElement;

    // Track click
    if (this.config.trackClicks) {
      this.session.interactions++;
      this.updateActivity();

      const interaction: InteractionEvent = {
        type: 'click',
        target: this.getElementSelector(target),
        targetText: this.getElementText(target),
        timestamp: now,
        x: event.clientX,
        y: event.clientY,
      };

      this.recordEvent('interaction', interaction);
    }

    // Rage click detection
    if (this.config.detectRageClicks) {
      this.clickTracker.timestamps.push(now);
      this.clickTracker.positions.push({ x: event.clientX, y: event.clientY });

      // Keep only recent clicks
      const cutoff = now - this.config.rageClickTimeWindow;
      while (
        this.clickTracker.timestamps.length > 0 &&
        (this.clickTracker.timestamps[0] ?? 0) < cutoff
      ) {
        this.clickTracker.timestamps.shift();
        this.clickTracker.positions.shift();
      }

      // Check for rage click
      if (this.clickTracker.timestamps.length >= this.config.rageClickThreshold) {
        const rageClick: RageClickEvent = {
          target: this.getElementSelector(target),
          clickCount: this.clickTracker.timestamps.length,
          timeSpan: now - (this.clickTracker.timestamps[0] ?? now),
          x: this.clickTracker.positions[0]?.x ?? 0,
          y: this.clickTracker.positions[0]?.y ?? 0,
          timestamp: now,
        };

        this.recordEvent('rage_click', rageClick);

        // Reset tracker
        this.clickTracker.timestamps = [];
        this.clickTracker.positions = [];
      }
    }
  }

  private handleScroll(_event: Event): void {
    if (!this.session) return;
    this.updateActivity();
    // Scroll tracking would be debounced and track scroll depth
  }

  private handleGlobalError(event: globalThis.ErrorEvent): void {
    // ErrorEvent properties vary by browser - access safely
    const errorEvent = event as unknown as {
      message: string;
      filename?: string;
      lineno?: number;
      colno?: number;
    };
    this.trackError(event.message, 'js', {
      filename: errorEvent.filename,
      lineno: errorEvent.lineno,
      colno: errorEvent.colno,
    });
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
    this.trackError(message, 'promise');
  }

  private handleFormFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.tagName !== 'INPUT' &&
      target.tagName !== 'TEXTAREA' &&
      target.tagName !== 'SELECT'
    ) {
      return;
    }

    const form = target.closest('form');
    if (!form) return;

    const formId = form.id || form.name || `form-${this.idCounter++}`;

    if (!this.formTrackers.has(formId)) {
      this.formTrackers.set(formId, {
        startTime: Date.now(),
        fields: new Set(),
      });
    }

    const tracker = this.formTrackers.get(formId);
    if (!tracker) return;
    const fieldName = (target as HTMLInputElement).name || (target as HTMLInputElement).id;
    if (fieldName) {
      tracker.fields.add(fieldName);
    }
  }

  private handleBeforeUnload(): void {
    // Track form abandonments
    for (const [formId, tracker] of this.formTrackers) {
      if (tracker.fields.size > 0) {
        const abandonment: FormAbandonmentEvent = {
          formId,
          fieldsStarted: Array.from(tracker.fields),
          fieldsCompleted: [], // Would need more tracking to determine
          timeSpent: Date.now() - tracker.startTime,
          timestamp: Date.now(),
        };

        this.recordEvent('form_abandonment', abandonment);
      }
    }

    this.flush();
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      if (this.session) {
        this.session.status = 'idle';
        this.saveSession();
      }
      this.flush();
    } else {
      this.updateActivity();
    }
  }

  private handleResourceEntry(entry: PerformanceResourceTiming): void {
    if (!this.session) return;

    const resource: ResourceEvent = {
      url: entry.name,
      type: entry.initiatorType,
      duration: entry.duration,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
      connectTime: entry.connectEnd - entry.connectStart,
      requestTime: entry.responseStart - entry.requestStart,
      responseTime: entry.responseEnd - entry.responseStart,
      timestamp: Date.now(),
    };

    this.recordEvent('resource', resource);
  }

  private handleLongTask(entry: PerformanceEntry): void {
    if (!this.session) return;

    this.recordEvent('long_task', {
      duration: entry.duration,
      startTime: entry.startTime,
      timestamp: Date.now(),
    });
  }

  private recordEvent(type: RUMEventType, payload: unknown): void {
    if (!this.session) return;

    const event: RUMEvent = {
      id: this.generateEventId(),
      type,
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      url: window.location.href,
      payload,
    };

    this.eventBuffer.push(event);
    this.config.onEvent?.(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private startActivityMonitor(): void {
    this.resetActivityTimer();
  }

  private updateActivity(): void {
    if (this.session) {
      this.session.lastActivityTime = Date.now();
      this.session.status = 'active';
      this.saveSession();
    }
    this.resetActivityTimer();
  }

  private resetActivityTimer(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    this.activityTimer = setTimeout(() => {
      if (this.session) {
        this.session.status = 'idle';
        this.saveSession();
      }
    }, this.config.sessionTimeout);
  }

  /**
   * Send RUM events to the reporting endpoint.
   *
   * Note: This method intentionally uses raw fetch/sendBeacon because:
   * 1. RUM reporting should be independent of the main API client
   * 2. Uses keepalive/sendBeacon for reliability when page is unloading
   * 3. RUM endpoints may be third-party analytics services
   *
   * @see {@link @/lib/api/api-client} for application API calls
   */
  private async sendToEndpoint(events: RUMEvent[]): Promise<void> {
    if (this.config.endpoint === null || this.config.endpoint === undefined) return;

    try {
      const payload = {
        events,
        session: this.session,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey !== null && this.config.apiKey !== undefined) {
        headers['X-API-Key'] = this.config.apiKey;
      }

      if (navigator.sendBeacon !== null && navigator.sendBeacon !== undefined) {
        navigator.sendBeacon(this.config.endpoint, JSON.stringify(payload));
      } else {
        // Raw fetch is intentional - uses keepalive for page unload reliability
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }

      this.log(`Sent ${events.length} events to endpoint`);
    } catch (e) {
      this.log('Failed to send events', e);
    }
  }

  private getDeviceInfo(): DeviceInfo {
    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string };
      deviceMemory?: number;
    };

    return {
      userAgent: navigator.userAgent,
      deviceType: this.detectDeviceType(),
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      connectionType: nav.connection?.effectiveType,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
    };
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' | 'unknown' {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getNavigationMetrics(): PageViewEvent['metrics'] {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!nav) return undefined;

    // Use startTime as the navigation start reference (replaces deprecated navigationStart)
    const navStart = nav.startTime || 0;

    return {
      dns: nav.domainLookupEnd - nav.domainLookupStart,
      tcp: nav.connectEnd - nav.connectStart,
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - navStart,
      load: nav.loadEventEnd - navStart,
    };
  }

  private parseUTMParams(): UTMParams | undefined {
    const params = new URLSearchParams(window.location.search);
    const utm: UTMParams = {};

    const utmSource = params.get('utm_source');
    if (utmSource !== null) utm.source = utmSource;
    const utmMedium = params.get('utm_medium');
    if (utmMedium !== null) utm.medium = utmMedium;
    const utmCampaign = params.get('utm_campaign');
    if (utmCampaign !== null) utm.campaign = utmCampaign;
    const utmTerm = params.get('utm_term');
    if (utmTerm !== null) utm.term = utmTerm;
    const utmContent = params.get('utm_content');
    if (utmContent !== null) utm.content = utmContent;

    return Object.keys(utm).length > 0 ? utm : undefined;
  }

  private getElementSelector(element: HTMLElement | null): string {
    if (!element) return '';

    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes =
      element.classList.length > 0 ? `.${Array.from(element.classList).slice(0, 3).join('.')}` : '';

    return `${tag}${id}${classes}`;
  }

  private getElementText(element: HTMLElement | null): string | undefined {
    if (!element) return undefined;

    const text = element.textContent?.trim().slice(0, 50);
    return text || undefined;
  }

  private maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    if (!this.config.maskSensitiveData) return data;

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = this.config.sensitivePatterns.some((pattern) => pattern.test(key));
      masked[key] = isSensitive ? '[REDACTED]' : value;
    }
    return masked;
  }

  private generateSessionId(): string {
    return `ses-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVisitorId(): string {
    return `vis-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${++this.idCounter}`;
  }

  private cleanup(): void {
    this.isInitialized = false;

    // Clear timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }

    // Disconnect observers
    this.observers.forEach((o) => o.disconnect());
    this.observers = [];

    // Final flush
    this.flush();
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[RUM] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let rumInstance: RealUserMonitoring | null = null;

/**
 * Get or create the global RUM instance
 */
export function getRUM(config?: Partial<RUMConfig>): RealUserMonitoring {
  rumInstance ??= new RealUserMonitoring(config);
  return rumInstance;
}

/**
 * Initialize RUM with configuration
 */
export function initRUM(config?: Partial<RUMConfig>): () => void {
  return getRUM(config).init();
}

/**
 * Reset the RUM instance
 */
export function resetRUM(): void {
  rumInstance?.endSession();
  rumInstance = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Track a page view
 */
export function trackPageView(customData?: Record<string, unknown>): void {
  getRUM().trackPageView(customData);
}

/**
 * Track a custom event
 */
export function trackCustomEvent(name: string, data?: Record<string, unknown>): void {
  getRUM().trackEvent(name, data);
}

/**
 * Track an error
 */
export function trackRUMError(error: Error | string, context?: Record<string, unknown>): void {
  getRUM().trackError(error, 'custom', context);
}

/**
 * Set the authenticated user ID
 */
export function setRUMUserId(userId: string): void {
  getRUM().setUserId(userId);
}

/**
 * Get current session summary
 */
export function getRUMSessionSummary(): SessionSummary | null {
  return getRUM().getSessionSummary();
}
