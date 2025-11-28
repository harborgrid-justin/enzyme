/**
 * Active Directory Token Handler
 *
 * Manages token acquisition, caching, and refresh for AD authentication.
 * Provides both MSAL-compatible and custom OAuth implementations.
 *
 * @module auth/active-directory/ad-token-handler
 */

import type {
  ADConfig,
  ADTokens,
  TokenAcquisitionRequest,
  TokenRefreshResult,
  ADAuthError,
  ADProviderType,
} from './types';
import { getAuthorityUrl, getConfiguredScopes } from './ad-config';
import {
  SecureStorage,
  createSecureLocalStorage,
  createSecureSessionStorage,
  isSecureStorageAvailable,
} from '@/lib/security/secure-storage';

// =============================================================================
// Constants
// =============================================================================

const TOKEN_CACHE_PREFIX = 'ad_token_';
const DEFAULT_TOKEN_LIFETIME = 3600; // 1 hour in seconds
const REFRESH_BUFFER_MS = 300000; // 5 minutes before expiry

/**
 * Session encryption key for AD token storage.
 *
 * SECURITY: The encryption key is generated using cryptographically secure
 * random bytes via the Web Crypto API. This key is:
 * - Generated fresh per session/initialization
 * - Stored only in memory (never persisted)
 * - Used for encrypting AD tokens at rest
 */
let adSessionEncryptionKey: string | null = null;

/**
 * Generates a cryptographically secure encryption key for AD tokens.
 *
 * SECURITY: Uses crypto.getRandomValues() for true cryptographic randomness.
 * The key is 256 bits (32 bytes) encoded as base64.
 *
 * @returns A base64-encoded 256-bit random key
 */
function generateADSessionKey(): string {
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  return btoa(String.fromCharCode(...keyBytes));
}

/**
 * Gets or creates the AD session encryption key.
 */
function getADSessionEncryptionKey(): string {
  if (!adSessionEncryptionKey) {
    adSessionEncryptionKey = generateADSessionKey();
  }
  return adSessionEncryptionKey;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Token cache entry structure.
 */
interface TokenCacheEntry {
  tokens: ADTokens;
  accountId: string;
  scopes: string[];
  cachedAt: number;
}

/**
 * Token handler options.
 */
export interface TokenHandlerOptions {
  /** Cache location for tokens */
  cacheLocation?: 'memory' | 'sessionStorage' | 'localStorage';
  /** Enable automatic silent refresh */
  autoRefresh?: boolean;
  /** Refresh buffer in milliseconds */
  refreshBuffer?: number;
  /** Callback when tokens are refreshed */
  onTokenRefresh?: (tokens: ADTokens) => void;
  /** Callback when refresh fails */
  onRefreshFailed?: (error: ADAuthError) => void;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Token acquisition options for different flows.
 */
export interface AcquisitionOptions extends TokenAcquisitionRequest {
  /** Use popup instead of redirect */
  usePopup?: boolean;
  /** Timeout for popup window */
  popupTimeout?: number;
  /** Custom state parameter */
  state?: string;
  /** Nonce for ID token validation */
  nonce?: string;
}

// =============================================================================
// Token Handler Class
// =============================================================================

/**
 * AD Token Handler for managing authentication tokens.
 *
 * Provides a unified interface for token acquisition, caching, and refresh
 * across different AD providers. Supports both interactive and silent
 * token acquisition flows.
 *
 * @example
 * ```typescript
 * const handler = new ADTokenHandler(config, {
 *   cacheLocation: 'sessionStorage',
 *   autoRefresh: true,
 *   onTokenRefresh: (tokens) => console.log('Tokens refreshed'),
 * });
 *
 * // Acquire token silently
 * const tokens = await handler.acquireTokenSilent({
 *   scopes: ['User.Read'],
 * });
 *
 * // Force interactive acquisition
 * const interactiveTokens = await handler.acquireTokenInteractive({
 *   scopes: ['User.Read', 'GroupMember.Read.All'],
 *   prompt: 'consent',
 * });
 * ```
 */
export class ADTokenHandler {
  private config: ADConfig;
  private options: Required<TokenHandlerOptions>;
  private memoryCache: Map<string, TokenCacheEntry>;
  private refreshPromises: Map<string, Promise<TokenRefreshResult>>;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private currentAccountId: string | null = null;

  /**
   * Secure storage instance for encrypted token persistence.
   *
   * SECURITY: Tokens are encrypted using AES-GCM before being stored
   * in sessionStorage or localStorage. The encryption key is
   * cryptographically random and stored only in memory.
   */
  private secureStorage: SecureStorage | null = null;

  /**
   * Create a new token handler.
   *
   * @param config - AD configuration
   * @param options - Handler options
   */
  constructor(config: ADConfig, options: TokenHandlerOptions = {}) {
    this.config = config;
    this.options = {
      cacheLocation: options.cacheLocation ?? 'sessionStorage',
      autoRefresh: options.autoRefresh ?? true,
      refreshBuffer: options.refreshBuffer ?? REFRESH_BUFFER_MS,
      onTokenRefresh: options.onTokenRefresh ?? (() => {}),
      onRefreshFailed: options.onRefreshFailed ?? (() => {}),
      debug: options.debug ?? config.debug ?? false,
    };
    this.memoryCache = new Map();
    this.refreshPromises = new Map();

    // Initialize secure storage if persistent storage is configured
    this.initializeSecureStorage();
  }

  /**
   * Initializes secure storage for encrypted token persistence.
   *
   * SECURITY: Creates a SecureStorage instance with a cryptographically
   * random session key. Falls back to raw storage if secure storage
   * is unavailable (SSR or unsupported browser).
   */
  private initializeSecureStorage(): void {
    if (this.options.cacheLocation === 'memory') {
      return; // No persistent storage needed
    }

    if (!isSecureStorageAvailable()) {
      this.log('Secure storage unavailable, falling back to unencrypted storage');
      return;
    }

    try {
      const encryptionKey = getADSessionEncryptionKey();
      this.secureStorage = this.options.cacheLocation === 'localStorage'
        ? createSecureLocalStorage(encryptionKey)
        : createSecureSessionStorage(encryptionKey);
      this.log('Secure storage initialized for AD tokens');
    } catch (error) {
      this.log('Failed to initialize secure storage:', error);
      this.secureStorage = null;
    }
  }

  // ===========================================================================
  // Token Acquisition Methods
  // ===========================================================================

  /**
   * Acquire token silently using cached tokens or refresh token.
   *
   * SECURITY: Tokens are retrieved from encrypted storage when available.
   *
   * @param request - Token acquisition request
   * @returns Tokens if successful, null if interaction required
   */
  async acquireTokenSilent(
    request: TokenAcquisitionRequest
  ): Promise<ADTokens | null> {
    const cacheKey = this.getCacheKey(request.scopes, request.account);

    // Check cache first (async to support encrypted storage)
    const cached = await this.getFromCache(cacheKey);
    if (cached && !this.isTokenExpired(cached.tokens)) {
      this.log('Returning cached token');
      return cached.tokens;
    }

    // Try to refresh if we have a refresh token
    if (cached?.tokens.refreshToken) {
      const refreshResult = await this.refreshToken(cached.tokens.refreshToken, request);
      if (refreshResult.success && refreshResult.tokens) {
        return refreshResult.tokens;
      }

      if (refreshResult.requiresInteraction) {
        return null;
      }
    }

    // No cached token and no refresh token
    return null;
  }

  /**
   * Acquire token interactively (redirect or popup).
   *
   * @param request - Token acquisition options
   * @returns Acquired tokens
   */
  async acquireTokenInteractive(
    request: AcquisitionOptions
  ): Promise<ADTokens> {
    const authority = getAuthorityUrl(this.config);
    if (!authority) {
      throw this.createError('config_error', 'No authority URL configured');
    }

    const authUrl = this.buildAuthorizationUrl(request);

    if (request.usePopup) {
      return this.acquireTokenPopup(authUrl, request);
    }

    return this.acquireTokenRedirect(authUrl, request);
  }

  /**
   * Acquire token using popup window.
   *
   * SECURITY: Tokens are encrypted before storage.
   */
  private async acquireTokenPopup(
    authUrl: string,
    request: AcquisitionOptions
  ): Promise<ADTokens> {
    return new Promise((resolve, reject) => {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'adauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (!popup) {
        reject(this.createError('popup_blocked', 'Popup window was blocked'));
        return;
      }

      const timeout = request.popupTimeout ?? 120000; // 2 minute default
      const timeoutId = setTimeout(() => {
        popup.close();
        reject(this.createError('popup_timeout', 'Authentication timed out'));
      }, timeout);

      // Poll for redirect completion
      const pollTimer = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer);
            clearTimeout(timeoutId);
            reject(this.createError('popup_closed', 'Popup was closed before authentication completed'));
            return;
          }

          // Check if we're back at our redirect URI
          if (popup.location.href.startsWith(this.getRedirectUri())) {
            clearInterval(pollTimer);
            clearTimeout(timeoutId);

            const urlParams = new URLSearchParams(popup.location.hash.substring(1));
            popup.close();

            const tokens = this.parseTokenResponse(urlParams);
            if (tokens) {
              await this.cacheTokens(tokens, request.scopes);
              resolve(tokens);
            } else {
              reject(this.createError('token_parse_error', 'Failed to parse token response'));
            }
          }
        } catch {
          // Cross-origin error - popup is on different domain, keep polling
        }
      }, 100);
    });
  }

  /**
   * Acquire token using redirect flow.
   */
  private async acquireTokenRedirect(
    authUrl: string,
    request: AcquisitionOptions
  ): Promise<ADTokens> {
    // Store request state for handling the redirect response
    const state = request.state ?? this.generateRandomString(32);
    const nonce = request.nonce ?? this.generateRandomString(32);

    sessionStorage.setItem('ad_auth_state', state);
    sessionStorage.setItem('ad_auth_nonce', nonce);
    sessionStorage.setItem('ad_auth_scopes', JSON.stringify(request.scopes));

    // This will redirect, so we return a never-resolving promise
    // The actual token handling happens in handleRedirectResponse
    window.location.href = authUrl;

    return new Promise(() => {});
  }

  /**
   * Handle redirect response after authentication.
   *
   * SECURITY: Tokens are encrypted before storage.
   *
   * @returns Tokens if redirect was handled, null otherwise
   */
  async handleRedirectResponse(): Promise<ADTokens | null> {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#')) {
      return null;
    }

    const urlParams = new URLSearchParams(hash.substring(1));

    // Check for error
    const error = urlParams.get('error');
    if (error) {
      const errorDescription = urlParams.get('error_description') || 'Authentication failed';
      throw this.createError(error, errorDescription);
    }

    // Validate state
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('ad_auth_state');
    if (state !== storedState) {
      throw this.createError('state_mismatch', 'State parameter does not match');
    }

    // Parse tokens
    const tokens = this.parseTokenResponse(urlParams);
    if (!tokens) {
      throw this.createError('token_parse_error', 'Failed to parse token response');
    }

    // Get stored scopes for caching
    const scopesJson = sessionStorage.getItem('ad_auth_scopes');
    const scopes = scopesJson ? JSON.parse(scopesJson) : [];

    // Cache tokens (encrypted)
    await this.cacheTokens(tokens, scopes);

    // Clean up
    sessionStorage.removeItem('ad_auth_state');
    sessionStorage.removeItem('ad_auth_nonce');
    sessionStorage.removeItem('ad_auth_scopes');

    // Clear hash from URL
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    return tokens;
  }

  // ===========================================================================
  // Token Refresh Methods
  // ===========================================================================

  /**
   * Refresh tokens using refresh token.
   *
   * @param refreshToken - The refresh token
   * @param request - Original token request for scope context
   * @returns Refresh result
   */
  async refreshToken(
    refreshToken: string,
    request?: TokenAcquisitionRequest
  ): Promise<TokenRefreshResult> {
    const cacheKey = this.getCacheKey(
      request?.scopes ?? getConfiguredScopes(this.config),
      request?.account
    );

    // Check for existing refresh promise
    const existingPromise = this.refreshPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const refreshPromise = this.performRefresh(refreshToken, request);
    this.refreshPromises.set(cacheKey, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      this.refreshPromises.delete(cacheKey);
    }
  }

  /**
   * Perform the actual token refresh.
   */
  private async performRefresh(
    refreshToken: string,
    request?: TokenAcquisitionRequest
  ): Promise<TokenRefreshResult> {
    const authority = getAuthorityUrl(this.config);
    if (!authority) {
      return {
        success: false,
        error: this.createError('config_error', 'No authority URL configured'),
      };
    }

    try {
      const tokenEndpoint = `${authority}/oauth2/v2.0/token`;
      const scopes = request?.scopes ?? getConfiguredScopes(this.config);

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.getClientId(),
          scope: scopes.join(' '),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        const error = this.createError(
          errorData.error || 'refresh_failed',
          errorData.error_description || 'Token refresh failed'
        );

        // Check if interaction is required
        const requiresInteraction = [
          'invalid_grant',
          'interaction_required',
          'consent_required',
        ].includes(errorData.error);

        this.options.onRefreshFailed(error);

        return {
          success: false,
          error,
          requiresInteraction,
        };
      }

      const data = await response.json();
      const tokens: ADTokens = {
        accessToken: data.access_token,
        idToken: data.id_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
        scopes: data.scope?.split(' ') || scopes,
        tokenType: data.token_type || 'Bearer',
      };

      // Cache (encrypted) and notify
      await this.cacheTokens(tokens, scopes);
      this.options.onTokenRefresh(tokens);
      this.scheduleRefresh(tokens);

      return { success: true, tokens };
    } catch (error) {
      const authError = this.createError(
        'network_error',
        'Network error during token refresh',
        error
      );

      this.options.onRefreshFailed(authError);

      return { success: false, error: authError };
    }
  }

  /**
   * Schedule automatic token refresh before expiry.
   */
  private scheduleRefresh(tokens: ADTokens): void {
    if (!this.options.autoRefresh || !tokens.refreshToken) {
      return;
    }

    // Clear any existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Calculate refresh time
    const expiresIn = tokens.expiresAt - Date.now();
    const refreshIn = Math.max(0, expiresIn - this.options.refreshBuffer);

    this.log(`Scheduling token refresh in ${refreshIn}ms`);

    this.refreshTimer = setTimeout(async () => {
      this.log('Auto-refreshing token');
      await this.refreshToken(tokens.refreshToken!);
    }, refreshIn);
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Cache tokens with encryption for persistent storage.
   *
   * SECURITY: When storing to persistent storage (sessionStorage/localStorage),
   * tokens are encrypted using AES-GCM before being written. The encryption
   * key is cryptographically random and stored only in memory, providing
   * defense-in-depth against:
   * - XSS attacks reading raw tokens from storage
   * - Browser extension access to storage
   * - Debugging tools inspecting storage
   */
  private async cacheTokens(tokens: ADTokens, scopes: string[]): Promise<void> {
    const cacheKey = this.getCacheKey(scopes, tokens.accountId);
    const entry: TokenCacheEntry = {
      tokens,
      accountId: tokens.accountId || '',
      scopes,
      cachedAt: Date.now(),
    };

    // Store in memory
    this.memoryCache.set(cacheKey, entry);

    // Store in persistent storage if configured
    if (this.options.cacheLocation !== 'memory') {
      const storageKey = `${TOKEN_CACHE_PREFIX}${cacheKey}`;

      // Use secure storage if available
      if (this.secureStorage) {
        try {
          const result = await this.secureStorage.setItem(storageKey, entry);
          if (!result.success) {
            this.log('Failed to store encrypted AD tokens:', result.error);
            // Fall back to raw storage (logged warning)
            this.fallbackStoreTokens(storageKey, entry);
          }
        } catch (error) {
          this.log('Error encrypting AD tokens:', error);
          this.fallbackStoreTokens(storageKey, entry);
        }
      } else {
        // No secure storage available - use raw storage with warning
        this.log('Warning: Storing AD tokens without encryption');
        this.fallbackStoreTokens(storageKey, entry);
      }
    }

    this.currentAccountId = tokens.accountId || null;
  }

  /**
   * Fallback storage for when secure storage is unavailable.
   *
   * SECURITY WARNING: This stores tokens in plaintext. Only used when
   * secure storage is not available (e.g., SSR, unsupported browser).
   */
  private fallbackStoreTokens(key: string, entry: TokenCacheEntry): void {
    const storage = this.getStorage();
    storage.setItem(key, JSON.stringify(entry));
  }

  /**
   * Get tokens from cache with decryption support.
   *
   * SECURITY: When retrieving from persistent storage, attempts to decrypt
   * using SecureStorage first. Falls back to raw storage for backwards
   * compatibility with unencrypted entries.
   */
  private async getFromCache(cacheKey: string): Promise<TokenCacheEntry | null> {
    // Check memory first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry) {
      return memoryEntry;
    }

    // Check persistent storage
    if (this.options.cacheLocation !== 'memory') {
      const storageKey = `${TOKEN_CACHE_PREFIX}${cacheKey}`;

      // Try secure storage first
      if (this.secureStorage) {
        try {
          const result = await this.secureStorage.getItem<TokenCacheEntry>(storageKey);
          if (result.success && result.data) {
            // Restore to memory cache
            this.memoryCache.set(cacheKey, result.data);
            return result.data;
          }
        } catch {
          this.log('Failed to decrypt AD tokens, trying raw storage');
        }
      }

      // Fall back to raw storage (for migration from unencrypted)
      const storage = this.getStorage();
      const stored = storage.getItem(storageKey);
      if (stored) {
        try {
          const entry = JSON.parse(stored) as TokenCacheEntry;
          // Restore to memory cache
          this.memoryCache.set(cacheKey, entry);

          // Migrate to encrypted storage if available
          if (this.secureStorage) {
            this.log('Migrating unencrypted AD tokens to secure storage');
            // Store encrypted version (don't await to not block)
            this.secureStorage.setItem(storageKey, entry).catch(() => {});
            // Remove unencrypted version
            storage.removeItem(storageKey);
          }

          return entry;
        } catch {
          // Invalid cache entry
          storage.removeItem(storageKey);
        }
      }
    }

    return null;
  }

  /**
   * Synchronous cache retrieval for backwards compatibility.
   *
   * SECURITY NOTE: This method only returns cached memory entries.
   * For full support including encrypted persistent storage,
   * use getFromCache (async) instead.
   */
  private getFromCacheSync(cacheKey: string): TokenCacheEntry | null {
    return this.memoryCache.get(cacheKey) ?? null;
  }

  /**
   * Clear all cached tokens from memory and secure storage.
   *
   * SECURITY: Clears tokens from both encrypted and unencrypted storage
   * to ensure complete cleanup during logout.
   */
  async clearCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear persistent storage
    if (this.options.cacheLocation !== 'memory') {
      // Clear from secure storage if available
      if (this.secureStorage) {
        try {
          await this.secureStorage.clear();
        } catch (error) {
          this.log('Error clearing secure storage:', error);
        }
      }

      // Also clear raw storage (for any unencrypted entries)
      const storage = this.getStorage();
      const keysToRemove: string[] = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(TOKEN_CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key));
    }

    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.currentAccountId = null;
  }

  /**
   * Get cached tokens for current account.
   *
   * SECURITY: Retrieves tokens from encrypted storage when available.
   */
  async getCachedTokens(): Promise<ADTokens | null> {
    if (!this.currentAccountId) {
      return null;
    }

    const cacheKey = this.getCacheKey(
      getConfiguredScopes(this.config),
      this.currentAccountId
    );
    const entry = await this.getFromCache(cacheKey);

    return entry?.tokens ?? null;
  }

  /**
   * Get cached tokens synchronously (memory only).
   *
   * SECURITY NOTE: This only returns tokens from in-memory cache.
   * Use getCachedTokens() for full encrypted storage support.
   */
  getCachedTokensSync(): ADTokens | null {
    if (!this.currentAccountId) {
      return null;
    }

    const cacheKey = this.getCacheKey(
      getConfiguredScopes(this.config),
      this.currentAccountId
    );
    const entry = this.getFromCacheSync(cacheKey);

    return entry?.tokens ?? null;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Build authorization URL for interactive flows.
   */
  private buildAuthorizationUrl(request: AcquisitionOptions): string {
    const authority = getAuthorityUrl(this.config)!;
    const authorizeEndpoint = `${authority}/oauth2/v2.0/authorize`;

    const state = request.state ?? this.generateRandomString(32);
    const nonce = request.nonce ?? this.generateRandomString(32);

    const params = new URLSearchParams({
      client_id: this.getClientId(),
      response_type: 'token id_token',
      redirect_uri: this.getRedirectUri(),
      scope: request.scopes.join(' '),
      state,
      nonce,
      response_mode: 'fragment',
    });

    if (request.prompt) {
      params.set('prompt', request.prompt);
    }

    if (request.loginHint) {
      params.set('login_hint', request.loginHint);
    }

    if (request.domainHint) {
      params.set('domain_hint', request.domainHint);
    }

    if (request.extraQueryParameters) {
      Object.entries(request.extraQueryParameters).forEach(([key, value]) => {
        params.set(key, value);
      });
    }

    return `${authorizeEndpoint}?${params.toString()}`;
  }

  /**
   * Parse token response from URL parameters.
   */
  private parseTokenResponse(params: URLSearchParams): ADTokens | null {
    const accessToken = params.get('access_token');
    const idToken = params.get('id_token');

    if (!accessToken || !idToken) {
      return null;
    }

    const expiresIn = parseInt(params.get('expires_in') || String(DEFAULT_TOKEN_LIFETIME), 10);

    return {
      accessToken,
      idToken,
      expiresAt: Date.now() + (expiresIn * 1000),
      scopes: (params.get('scope') || '').split(' '),
      tokenType: params.get('token_type') || 'Bearer',
    };
  }

  /**
   * Check if token is expired.
   */
  private isTokenExpired(tokens: ADTokens): boolean {
    return Date.now() >= tokens.expiresAt - this.options.refreshBuffer;
  }

  /**
   * Generate cache key from scopes and account.
   */
  private getCacheKey(scopes: string[], account?: string): string {
    const sortedScopes = [...scopes].sort().join('|');
    return `${account || 'default'}_${sortedScopes}`;
  }

  /**
   * Get the appropriate storage object.
   */
  private getStorage(): Storage {
    return this.options.cacheLocation === 'localStorage'
      ? localStorage
      : sessionStorage;
  }

  /**
   * Get client ID from configuration.
   */
  private getClientId(): string {
    switch (this.config.providerType) {
      case 'azure-ad':
        return this.config.azure?.clientId ?? '';
      case 'azure-ad-b2c':
        return this.config.azureB2C?.clientId ?? '';
      case 'adfs':
        return this.config.adfs?.clientId ?? '';
      default:
        return '';
    }
  }

  /**
   * Get redirect URI from configuration.
   */
  private getRedirectUri(): string {
    switch (this.config.providerType) {
      case 'azure-ad':
        return this.config.azure?.redirectUri ?? '';
      case 'azure-ad-b2c':
        return this.config.azureB2C?.redirectUri ?? '';
      case 'adfs':
        return this.config.adfs?.redirectUri ?? '';
      default:
        return window.location.origin;
    }
  }

  /**
   * Generate random string for state/nonce.
   */
  private generateRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create error object.
   */
  private createError(
    code: string,
    message: string,
    originalError?: unknown
  ): ADAuthError {
    return {
      code,
      message,
      timestamp: Date.now(),
      recoverable: !['config_error', 'state_mismatch'].includes(code),
      originalError,
    };
  }

  /**
   * Log debug message.
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug) {
      console.log(`[ADTokenHandler] ${message}`, ...args);
    }
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.refreshPromises.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new token handler.
 *
 * @param config - AD configuration
 * @param options - Handler options
 * @returns Configured ADTokenHandler
 */
export function createTokenHandler(
  config: ADConfig,
  options?: TokenHandlerOptions
): ADTokenHandler {
  return new ADTokenHandler(config, options);
}
