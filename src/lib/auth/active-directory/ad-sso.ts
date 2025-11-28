/**
 * Active Directory Single Sign-On (SSO) Support
 *
 * Provides cross-tab session synchronization, SSO detection,
 * and seamless authentication across applications.
 *
 * @module auth/active-directory/ad-sso
 */

import type {
  SSOSession,
  SSOConfig,
  ADTokens,
  ADUser,
} from './types';
import { DEFAULT_SSO_CONFIG } from './ad-config';

// =============================================================================
// Constants
// =============================================================================

const SSO_BROADCAST_CHANNEL = 'ad_sso_sync';
const SESSION_CHECK_INTERVAL = 60000; // 1 minute

// =============================================================================
// Types
// =============================================================================

/**
 * SSO event types for cross-tab communication.
 */
export type SSOEventType =
  | 'session_created'
  | 'session_updated'
  | 'session_expired'
  | 'session_ended'
  | 'activity_ping'
  | 'token_refreshed';

/**
 * SSO broadcast message structure.
 */
export interface SSOBroadcastMessage {
  type: SSOEventType;
  sessionId: string;
  timestamp: number;
  payload?: {
    tokens?: ADTokens;
    user?: Partial<ADUser>;
    source?: string;
  };
}

/**
 * SSO event handler function type.
 */
export type SSOEventHandler = (event: SSOBroadcastMessage) => void;

/**
 * SSO Manager options.
 */
export interface SSOManagerOptions extends SSOConfig {
  /** Callback when session changes */
  onSessionChange?: (session: SSOSession | null) => void;
  /** Callback when tokens are synced */
  onTokenSync?: (tokens: ADTokens) => void;
  /** Callback when session expires */
  onSessionExpired?: () => void;
  /** Enable debug logging */
  debug?: boolean;
}

// =============================================================================
// SSO Manager Class
// =============================================================================

/**
 * SSO Manager for cross-tab session synchronization.
 *
 * Manages Single Sign-On sessions across browser tabs and windows,
 * providing seamless authentication state synchronization.
 *
 * @example
 * ```typescript
 * const ssoManager = new SSOManager({
 *   crossTabSync: true,
 *   sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
 *   onSessionChange: (session) => {
 *     if (session) {
 *       console.log('Session active:', session.upn);
 *     } else {
 *       console.log('No active session');
 *     }
 *   },
 * });
 *
 * // Start a new SSO session
 * await ssoManager.startSession(user, tokens);
 *
 * // Check for existing session on load
 * const existingSession = await ssoManager.detectSession();
 * ```
 */
export class SSOManager {
  private options: Required<SSOManagerOptions>;
  private broadcastChannel: BroadcastChannel | null = null;
  private activityTimer: ReturnType<typeof setInterval> | null = null;
  private sessionCheckTimer: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: Set<SSOEventHandler> = new Set();
  private tabId: string;
  private currentSession: SSOSession | null = null;

  /**
   * Create a new SSO manager.
   *
   * @param options - SSO configuration options
   */
  constructor(options: Partial<SSOManagerOptions> = {}) {
    this.options = {
      crossTabSync: (options.crossTabSync ?? DEFAULT_SSO_CONFIG.crossTabSync) as boolean,
      storagePrefix: (options.storagePrefix ?? DEFAULT_SSO_CONFIG.storagePrefix) as string,
      sessionTimeout: (options.sessionTimeout ?? DEFAULT_SSO_CONFIG.sessionTimeout) as number,
      trackActivity: (options.trackActivity ?? DEFAULT_SSO_CONFIG.trackActivity) as boolean,
      activityCheckInterval: (options.activityCheckInterval ?? DEFAULT_SSO_CONFIG.activityCheckInterval) as number,
      autoExtendSession: (options.autoExtendSession ?? DEFAULT_SSO_CONFIG.autoExtendSession) as boolean,
      allowedDomains: options.allowedDomains ?? [],
      onSessionChange: options.onSessionChange ?? (() => {}),
      onTokenSync: options.onTokenSync ?? (() => {}),
      onSessionExpired: options.onSessionExpired ?? (() => {}),
      debug: options.debug ?? false,
    };

    this.tabId = this.generateTabId();

    if (this.options.crossTabSync) {
      this.initializeBroadcastChannel();
    }

    if (this.options.trackActivity) {
      this.initializeActivityTracking();
    }

    this.startSessionCheck();
  }

  // ===========================================================================
  // Session Management
  // ===========================================================================

  /**
   * Start a new SSO session.
   *
   * @param user - Authenticated user
   * @param tokens - Authentication tokens
   * @returns The created session
   */
  async startSession(user: ADUser, tokens: ADTokens): Promise<SSOSession> {
    const now = Date.now();
    const session: SSOSession = {
      sessionId: this.generateSessionId(),
      upn: user.adAttributes.upn,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.options.sessionTimeout!,
      isValid: true,
      domain: window.location.hostname,
      metadata: {
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
      },
    };

    this.currentSession = session;
    this.persistSession(session);
    this.persistTokens(tokens);

    this.log('Session started:', session.sessionId);

    // Notify other tabs
    this.broadcast({
      type: 'session_created',
      sessionId: session.sessionId,
      timestamp: now,
      payload: { user: { id: user.id, email: user.email }, tokens },
    });

    this.options.onSessionChange(session);

    return session;
  }

  /**
   * End the current SSO session.
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    const sessionId = this.currentSession.sessionId;

    // Clear session data
    this.clearSessionData();
    this.currentSession = null;

    this.log('Session ended:', sessionId);

    // Notify other tabs
    this.broadcast({
      type: 'session_ended',
      sessionId,
      timestamp: Date.now(),
    });

    this.options.onSessionChange(null);
  }

  /**
   * Detect and restore existing SSO session.
   *
   * @returns Existing session if found and valid, null otherwise
   */
  async detectSession(): Promise<SSOSession | null> {
    const session = this.loadSession();

    if (!session) {
      this.log('No existing session found');
      return null;
    }

    // Check if session is still valid
    if (!this.isSessionValid(session)) {
      this.log('Found expired session, cleaning up');
      this.clearSessionData();
      this.options.onSessionExpired();
      return null;
    }

    this.currentSession = session;
    this.log('Restored existing session:', session.sessionId);
    this.options.onSessionChange(session);

    return session;
  }

  /**
   * Get the current active session.
   */
  getCurrentSession(): SSOSession | null {
    return this.currentSession;
  }

  /**
   * Check if there's an active SSO session.
   */
  hasActiveSession(): boolean {
    return this.currentSession !== null && this.isSessionValid(this.currentSession);
  }

  /**
   * Update session activity timestamp.
   */
  recordActivity(): void {
    if (!this.currentSession) {
      return;
    }

    const now = Date.now();
    this.currentSession.lastActivity = now;

    // Extend session if auto-extend is enabled
    if (this.options.autoExtendSession) {
      this.currentSession.expiresAt = now + this.options.sessionTimeout!;
    }

    this.persistSession(this.currentSession);

    // Notify other tabs of activity
    this.broadcast({
      type: 'activity_ping',
      sessionId: this.currentSession.sessionId,
      timestamp: now,
    });
  }

  // ===========================================================================
  // Token Management
  // ===========================================================================

  /**
   * Get stored tokens for the current session.
   */
  getSessionTokens(): ADTokens | null {
    const stored = this.getStorage().getItem(
      `${this.options.storagePrefix}tokens`
    );

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as ADTokens;
    } catch {
      return null;
    }
  }

  /**
   * Update tokens and sync across tabs.
   *
   * @param tokens - New tokens
   */
  syncTokens(tokens: ADTokens): void {
    this.persistTokens(tokens);

    if (this.currentSession) {
      this.broadcast({
        type: 'token_refreshed',
        sessionId: this.currentSession.sessionId,
        timestamp: Date.now(),
        payload: { tokens },
      });
    }
  }

  // ===========================================================================
  // Cross-Tab Synchronization
  // ===========================================================================

  /**
   * Subscribe to SSO events.
   *
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  onEvent(handler: SSOEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Initialize BroadcastChannel for cross-tab communication.
   */
  private initializeBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      this.log('BroadcastChannel not supported, using storage events');
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
      return;
    }

    this.broadcastChannel = new BroadcastChannel(SSO_BROADCAST_CHANNEL);
    this.broadcastChannel.onmessage = (event) => {
      this.handleBroadcastMessage(event.data);
    };

    this.log('BroadcastChannel initialized');
  }

  /**
   * Broadcast a message to other tabs.
   */
  private broadcast(message: SSOBroadcastMessage): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    } else {
      // Fallback to localStorage events
      const key = `${this.options.storagePrefix}broadcast`;
      localStorage.setItem(key, JSON.stringify({ ...message, tabId: this.tabId }));
      localStorage.removeItem(key);
    }
  }

  /**
   * Handle incoming broadcast messages.
   */
  private handleBroadcastMessage(message: SSOBroadcastMessage): void {
    this.log('Received broadcast:', message.type);

    // Notify event handlers
    this.eventHandlers.forEach(handler => handler(message));

    switch (message.type) {
      case 'session_created':
      case 'session_updated':
        // Another tab created/updated a session
        const session = this.loadSession();
        if (session && session.sessionId === message.sessionId) {
          this.currentSession = session;
          this.options.onSessionChange(session);
        }
        break;

      case 'session_ended':
        // Another tab ended the session
        if (this.currentSession?.sessionId === message.sessionId) {
          this.currentSession = null;
          this.clearSessionData();
          this.options.onSessionChange(null);
        }
        break;

      case 'token_refreshed':
        // Tokens were refreshed in another tab
        if (message.payload?.tokens) {
          this.options.onTokenSync(message.payload.tokens);
        }
        break;

      case 'activity_ping':
        // Activity in another tab
        if (this.currentSession?.sessionId === message.sessionId) {
          this.currentSession.lastActivity = message.timestamp;
        }
        break;
    }
  }

  /**
   * Handle storage events for fallback sync.
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key !== `${this.options.storagePrefix}broadcast` || !event.newValue) {
      return;
    }

    try {
      const message = JSON.parse(event.newValue);
      // Ignore messages from this tab
      if (message.tabId === this.tabId) {
        return;
      }
      this.handleBroadcastMessage(message);
    } catch {
      // Invalid message, ignore
    }
  }

  // ===========================================================================
  // Activity Tracking
  // ===========================================================================

  /**
   * Initialize activity tracking.
   */
  private initializeActivityTracking(): void {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    let lastActivity = Date.now();

    const trackActivity = () => {
      const now = Date.now();
      // Debounce activity updates
      if (now - lastActivity > 10000) { // 10 seconds
        lastActivity = now;
        this.recordActivity();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    // Periodic activity check
    this.activityTimer = setInterval(() => {
      if (this.currentSession && this.options.trackActivity) {
        const inactiveTime = Date.now() - this.currentSession.lastActivity;
        // If inactive for more than session timeout, expire the session
        if (inactiveTime > this.options.sessionTimeout!) {
          this.log('Session expired due to inactivity');
          this.endSession();
          this.options.onSessionExpired();
        }
      }
    }, this.options.activityCheckInterval!);
  }

  /**
   * Start periodic session validity check.
   */
  private startSessionCheck(): void {
    this.sessionCheckTimer = setInterval(() => {
      if (this.currentSession && !this.isSessionValid(this.currentSession)) {
        this.log('Session expired during check');
        this.endSession();
        this.options.onSessionExpired();
      }
    }, SESSION_CHECK_INTERVAL);
  }

  // ===========================================================================
  // Storage Operations
  // ===========================================================================

  /**
   * Persist session to storage.
   */
  private persistSession(session: SSOSession): void {
    this.getStorage().setItem(
      `${this.options.storagePrefix}session`,
      JSON.stringify(session)
    );
  }

  /**
   * Load session from storage.
   */
  private loadSession(): SSOSession | null {
    const stored = this.getStorage().getItem(
      `${this.options.storagePrefix}session`
    );

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as SSOSession;
    } catch {
      return null;
    }
  }

  /**
   * Persist tokens to storage.
   */
  private persistTokens(tokens: ADTokens): void {
    this.getStorage().setItem(
      `${this.options.storagePrefix}tokens`,
      JSON.stringify(tokens)
    );
  }

  /**
   * Clear all session data.
   */
  private clearSessionData(): void {
    const storage = this.getStorage();
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.options.storagePrefix!)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => storage.removeItem(key));
  }

  /**
   * Get the storage object.
   */
  private getStorage(): Storage {
    return sessionStorage;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Check if a session is still valid.
   */
  private isSessionValid(session: SSOSession): boolean {
    if (!session.isValid) {
      return false;
    }

    const now = Date.now();

    // Check expiration
    if (now >= session.expiresAt) {
      return false;
    }

    // Check domain
    if (
      this.options.allowedDomains &&
      this.options.allowedDomains.length > 0 &&
      !this.options.allowedDomains.includes(session.domain)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Generate unique session ID.
   */
  private generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate unique tab ID.
   */
  private generateTabId(): string {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Log debug message.
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug) {
      console.log(`[SSOManager] ${message}`, ...args);
    }
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }

    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
      this.sessionCheckTimer = null;
    }

    this.eventHandlers.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new SSO manager.
 *
 * @param options - SSO configuration options
 * @returns Configured SSOManager
 */
export function createSSOManager(options?: Partial<SSOManagerOptions>): SSOManager {
  return new SSOManager(options);
}

// =============================================================================
// Cross-Domain SSO Support
// =============================================================================

/**
 * Cross-domain SSO helper for applications on different subdomains.
 *
 * Uses postMessage for secure cross-origin communication.
 */
export class CrossDomainSSO {
  private allowedOrigins: string[];
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(allowedOrigins: string[]) {
    this.allowedOrigins = allowedOrigins;
  }

  /**
   * Initialize cross-domain SSO listener.
   *
   * @param onSessionReceived - Callback when session is received
   */
  listen(onSessionReceived: (session: SSOSession, tokens: ADTokens) => void): void {
    this.messageHandler = (event: MessageEvent) => {
      if (!this.allowedOrigins.includes(event.origin)) {
        return;
      }

      if (event.data?.type === 'sso_session_share') {
        onSessionReceived(event.data.session, event.data.tokens);
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  /**
   * Share session with another domain.
   *
   * @param targetOrigin - Target origin URL
   * @param session - Session to share
   * @param tokens - Tokens to share
   */
  shareSession(
    targetOrigin: string,
    targetWindow: Window,
    session: SSOSession,
    tokens: ADTokens
  ): void {
    if (!this.allowedOrigins.includes(targetOrigin)) {
      throw new Error(`Origin ${targetOrigin} is not allowed`);
    }

    targetWindow.postMessage(
      {
        type: 'sso_session_share',
        session,
        tokens,
      },
      targetOrigin
    );
  }

  /**
   * Request session from parent window (for iframes).
   *
   * @param parentOrigin - Parent window origin
   */
  requestSession(parentOrigin: string): void {
    if (window.parent === window) {
      return; // Not in an iframe
    }

    window.parent.postMessage(
      { type: 'sso_session_request' },
      parentOrigin
    );
  }

  /**
   * Stop listening for cross-domain messages.
   */
  dispose(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }
}

/**
 * Create a cross-domain SSO helper.
 *
 * @param allowedOrigins - List of allowed origins
 * @returns CrossDomainSSO instance
 */
export function createCrossDomainSSO(allowedOrigins: string[]): CrossDomainSSO {
  return new CrossDomainSSO(allowedOrigins);
}
