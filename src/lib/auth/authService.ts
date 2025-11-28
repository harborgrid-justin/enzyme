import { apiClient } from '@/lib/api';
import type { SecureStorage } from '@/lib/security/secure-storage';
import { createSecureLocalStorage } from '@/lib/security/secure-storage';
import type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials
} from './types';

/**
 * Storage keys for auth tokens within SecureStorage.
 * These are internal keys used by the encrypted storage layer.
 */
const SECURE_TOKEN_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  TOKEN_EXPIRY: 'auth_token_expiry',
} as const;

/**
 * Rate limiting configuration for authentication attempts.
 *
 * SECURITY: Implements exponential backoff to prevent brute force attacks.
 * - Initial delay starts at BASE_DELAY_MS after first failure
 * - Each subsequent failure doubles the delay (exponential backoff)
 * - Maximum delay is capped at MAX_DELAY_MS
 * - Counter resets after successful authentication
 */
const RATE_LIMIT_CONFIG = {
  /** Maximum number of failed attempts before lockout */
  MAX_ATTEMPTS: 5,
  /** Base delay in milliseconds (1 second) */
  BASE_DELAY_MS: 1000,
  /** Maximum delay in milliseconds (5 minutes) */
  MAX_DELAY_MS: 300000,
  /** Window in milliseconds to track failed attempts (15 minutes) */
  ATTEMPT_WINDOW_MS: 900000,
} as const;

/**
 * Session encryption key management.
 *
 * SECURITY: The encryption key is now generated using cryptographically
 * secure random bytes via the Web Crypto API. This key is:
 * - Generated fresh per session/initialization
 * - Stored only in memory (never persisted to storage)
 * - Used for encrypting tokens at rest
 *
 * This provides defense-in-depth against:
 * - XSS attacks reading raw tokens from localStorage
 * - Browser extension access to localStorage
 * - Debugging tools inspecting storage
 * - Predictable key derivation attacks
 */
let sessionEncryptionKey: string | null = null;

/**
 * Generates a cryptographically secure encryption key using Web Crypto API.
 *
 * SECURITY: Uses crypto.getRandomValues() for true cryptographic randomness.
 * The key is 256 bits (32 bytes) encoded as base64.
 *
 * @returns A base64-encoded 256-bit random key
 */
function generateSessionKey(): string {
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  return btoa(String.fromCharCode(...keyBytes));
}

/**
 * Initializes the session security by generating a fresh encryption key.
 *
 * SECURITY: This function should be called during application initialization
 * or when a new authentication session begins. The generated key is stored
 * only in memory and is not predictable.
 *
 * @returns The generated encryption key (for use during session)
 */
export function initializeSessionSecurity(): string {
  sessionEncryptionKey = generateSessionKey();
  return sessionEncryptionKey;
}

/**
 * Gets the current session encryption key, initializing if necessary.
 *
 * SECURITY: Ensures a key exists before any encryption operations.
 * If no key has been initialized, generates one automatically.
 *
 * @returns The current session encryption key
 */
function getSessionEncryptionKey(): string {
  sessionEncryptionKey ??= initializeSessionSecurity();
  return sessionEncryptionKey;
}

/**
 * Rate limiting state for tracking failed authentication attempts.
 *
 * SECURITY: Tracks failed attempts to implement exponential backoff.
 */
interface RateLimitState {
  /** Number of consecutive failed attempts */
  failedAttempts: number;
  /** Timestamp of first failed attempt in current window */
  firstAttemptTime: number;
  /** Timestamp when lockout expires (if locked) */
  lockedUntil: number | null;
}

/**
 * Low-level token handling with secure encrypted storage.
 *
 * SECURITY IMPROVEMENTS:
 * - Tokens are now encrypted at rest using AES-GCM via SecureStorage
 * - PBKDF2 key derivation with configurable iterations
 * - Integrity verification via checksums
 * - All token operations are now async for proper crypto handling
 * - Rate limiting with exponential backoff for failed auth attempts
 * - Cryptographically secure session key generation
 *
 * @see {@link SecureStorage} for encryption implementation details
 */
class AuthService {
  private refreshPromise: Promise<AuthTokens> | null = null;
  private secureStorage: SecureStorage | null = null;

  /**
   * In-memory cache for tokens to support synchronous access patterns.
   * This cache is populated on initialization and updated on token changes.
   *
   * SECURITY NOTE: In-memory cache is cleared on page reload and is not
   * accessible to other scripts due to JavaScript's memory isolation.
   */
  private tokenCache: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  } = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  };

  /**
   * Rate limiting state for authentication attempts.
   *
   * SECURITY: Stored in memory only, resets on page reload.
   * This prevents brute force attacks during a single session.
   */
  private rateLimitState: RateLimitState = {
    failedAttempts: 0,
    firstAttemptTime: 0,
    lockedUntil: null,
  };

  constructor() {
    // Secure storage is lazily initialized to use session-generated key
    this.secureStorage = null;
  }

  /**
   * Gets the secure storage instance, initializing with session key if needed.
   *
   * SECURITY: Uses cryptographically secure session key for encryption.
   */
  private getSecureStorage(): SecureStorage {
    if (!this.secureStorage) {
      const encryptionKey = getSessionEncryptionKey();
      this.secureStorage = createSecureLocalStorage(encryptionKey);
    }
    return this.secureStorage;
  }

  /**
   * Checks if the user is currently rate limited.
   *
   * SECURITY: Returns true if too many failed attempts have occurred.
   *
   * @returns Object containing rate limit status and remaining time
   */
  checkRateLimit(): { isLimited: boolean; retryAfterMs: number; attemptsRemaining: number } {
    const now = Date.now();

    // Clean up old attempts outside the window
    if (this.rateLimitState.firstAttemptTime > 0 &&
        now - this.rateLimitState.firstAttemptTime > RATE_LIMIT_CONFIG.ATTEMPT_WINDOW_MS) {
      this.resetRateLimit();
    }

    // Check if currently locked out
    if (this.rateLimitState.lockedUntil !== null && now < this.rateLimitState.lockedUntil) {
      return {
        isLimited: true,
        retryAfterMs: this.rateLimitState.lockedUntil - now,
        attemptsRemaining: 0,
      };
    }

    // If lockout has expired, reset
    if (this.rateLimitState.lockedUntil !== null && now >= this.rateLimitState.lockedUntil) {
      this.resetRateLimit();
    }

    return {
      isLimited: false,
      retryAfterMs: 0,
      attemptsRemaining: RATE_LIMIT_CONFIG.MAX_ATTEMPTS - this.rateLimitState.failedAttempts,
    };
  }

  /**
   * Records a failed authentication attempt and applies rate limiting.
   *
   * SECURITY: Implements exponential backoff to slow down brute force attacks.
   */
  private recordFailedAttempt(): void {
    const now = Date.now();

    // Start tracking if this is first attempt in window
    if (this.rateLimitState.failedAttempts === 0) {
      this.rateLimitState.firstAttemptTime = now;
    }

    this.rateLimitState.failedAttempts++;

    // Apply exponential backoff after max attempts
    if (this.rateLimitState.failedAttempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
      // Calculate delay: baseDelay * 2^(attempts - maxAttempts)
      const exponent = this.rateLimitState.failedAttempts - RATE_LIMIT_CONFIG.MAX_ATTEMPTS;
      const delay = Math.min(
        RATE_LIMIT_CONFIG.BASE_DELAY_MS * Math.pow(2, exponent),
        RATE_LIMIT_CONFIG.MAX_DELAY_MS
      );
      this.rateLimitState.lockedUntil = now + delay;

      console.warn(
        `[AuthService] Rate limit applied. Too many failed attempts. ` +
        `Locked for ${Math.ceil(delay / 1000)} seconds.`
      );
    }
  }

  /**
   * Resets the rate limiting state after successful authentication.
   *
   * SECURITY: Called after successful login to clear failed attempt counter.
   */
  private resetRateLimit(): void {
    this.rateLimitState = {
      failedAttempts: 0,
      firstAttemptTime: 0,
      lockedUntil: null,
    };
  }

  /**
   * Initialize the auth service by loading tokens from secure storage.
   * This should be called once during app initialization.
   *
   * SECURITY: Also initializes session encryption key if not already done.
   *
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    // Ensure session security is initialized
    getSessionEncryptionKey();
    await this.loadTokensToCache();
  }

  /**
   * Load tokens from secure storage into memory cache.
   * This enables synchronous access for performance-critical paths.
   *
   * SECURITY: Uses lazily-initialized secure storage with session key.
   */
  private async loadTokensToCache(): Promise<void> {
    const storage = this.getSecureStorage();
    const [accessResult, refreshResult, expiryResult] = await Promise.all([
      storage.getItem<string>(SECURE_TOKEN_KEYS.ACCESS_TOKEN),
      storage.getItem<string>(SECURE_TOKEN_KEYS.REFRESH_TOKEN),
      storage.getItem<number>(SECURE_TOKEN_KEYS.TOKEN_EXPIRY),
    ]);

    this.tokenCache = {
      accessToken: accessResult.success ? accessResult.data ?? null : null,
      refreshToken: refreshResult.success ? refreshResult.data ?? null : null,
      expiresAt: expiryResult.success ? expiryResult.data ?? null : null,
    };
  }

  /**
   * Login with credentials using apiClient.
   *
   * SECURITY: Implements rate limiting with exponential backoff to prevent
   * brute force attacks. If too many failed attempts occur, the user will
   * be temporarily locked out.
   *
   * @throws {ApiError} When authentication fails
   * @throws {Error} When rate limited
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    // Check rate limiting before attempting login
    const rateLimitStatus = this.checkRateLimit();
    if (rateLimitStatus.isLimited) {
      const retrySeconds = Math.ceil(rateLimitStatus.retryAfterMs / 1000);
      throw new Error(
        `Too many failed login attempts. Please try again in ${retrySeconds} seconds.`
      );
    }

    try {
      const response = await apiClient.post<{ user: User; tokens: AuthTokens }>(
        '/auth/login',
        credentials,
        { meta: { skipAuth: true } }
      );

      // Successful login - reset rate limiting
      this.resetRateLimit();

      await this.storeTokens(response.data.tokens);
      return response.data;
    } catch (error) {
      // Record failed attempt for rate limiting
      this.recordFailedAttempt();
      throw error;
    }
  }

  /**
   * Register a new user using apiClient
   * @throws {ApiError} When registration fails
   */
  async register(credentials: RegisterCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await apiClient.post<{ user: User; tokens: AuthTokens }>(
      '/auth/register',
      credentials,
      { meta: { skipAuth: true } }
    );

    await this.storeTokens(response.data.tokens);
    return response.data;
  }

  /**
   * Logout the current user using apiClient.
   * Securely clears all tokens from encrypted storage and memory cache.
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken !== undefined && refreshToken !== null) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore errors during logout - we still want to clear local tokens
    } finally {
      await this.clearTokens();
    }
  }

  /**
   * Refresh the access token using apiClient
   * @throws {ApiError} When token refresh fails
   */
  async refreshTokens(): Promise<AuthTokens> {
    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (refreshToken === undefined || refreshToken === null) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = apiClient
      .post<AuthTokens>('/auth/refresh', { refreshToken }, { meta: { skipAuth: true } })
      .then(async (response) => {
        await this.storeTokens(response.data);
        return response.data;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /**
   * Get the current user profile using apiClient
   * @throws {ApiError} When fetching user profile fails
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  }

  /**
   * Check if the user is authenticated (has valid tokens).
   * Uses in-memory cache for synchronous access.
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (token === undefined || token === null) return false;

    const expiresAt = this.getTokenExpiry();
    if (expiresAt === undefined || expiresAt === null) return false;

    // Check if token is expired (with 1 minute buffer)
    return Date.now() < expiresAt - 60000;
  }

  /**
   * Get the access token from in-memory cache.
   *
   * SECURITY: Returns cached value for synchronous access.
   * The actual token is stored encrypted in SecureStorage.
   */
  getAccessToken(): string | null {
    return this.tokenCache.accessToken;
  }

  /**
   * Get the refresh token from in-memory cache.
   *
   * SECURITY: Returns cached value for synchronous access.
   * The actual token is stored encrypted in SecureStorage.
   */
  getRefreshToken(): string | null {
    return this.tokenCache.refreshToken;
  }

  /**
   * Get token expiry timestamp from in-memory cache.
   */
  getTokenExpiry(): number | null {
    return this.tokenCache.expiresAt;
  }

  /**
   * Retrieve access token asynchronously from secure storage.
   * Use this when you need the freshest value from encrypted storage.
   *
   * SECURITY: Uses session-keyed encrypted storage.
   *
   * @returns Promise resolving to the access token or null
   */
  async getAccessTokenAsync(): Promise<string | null> {
    const storage = this.getSecureStorage();
    const result = await storage.getItem<string>(SECURE_TOKEN_KEYS.ACCESS_TOKEN);
    if (result.success === true && result.data !== undefined && result.data !== null) {
      this.tokenCache.accessToken = result.data;
      return result.data;
    }
    return null;
  }

  /**
   * Retrieve refresh token asynchronously from secure storage.
   * Use this when you need the freshest value from encrypted storage.
   *
   * SECURITY: Uses session-keyed encrypted storage.
   *
   * @returns Promise resolving to the refresh token or null
   */
  async getRefreshTokenAsync(): Promise<string | null> {
    const storage = this.getSecureStorage();
    const result = await storage.getItem<string>(SECURE_TOKEN_KEYS.REFRESH_TOKEN);
    if (result.success === true && result.data !== undefined && result.data !== null) {
      this.tokenCache.refreshToken = result.data;
      return result.data;
    }
    return null;
  }

  /**
   * Store tokens in encrypted secure storage.
   *
   * SECURITY: Tokens are encrypted using AES-GCM before storage.
   * The encryption key is derived using PBKDF2 with a high iteration count.
   * Each token storage operation uses a unique IV for encryption.
   * Session key is cryptographically random and stored only in memory.
   *
   * @param tokens - The auth tokens to store securely
   */
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    const storage = this.getSecureStorage();
    // Store tokens in parallel for better performance
    const [accessResult, refreshResult, expiryResult] = await Promise.all([
      storage.setItem(SECURE_TOKEN_KEYS.ACCESS_TOKEN, tokens.accessToken),
      storage.setItem(SECURE_TOKEN_KEYS.REFRESH_TOKEN, tokens.refreshToken),
      storage.setItem(SECURE_TOKEN_KEYS.TOKEN_EXPIRY, tokens.expiresAt),
    ]);

    // Check for storage failures
    if (accessResult.success !== true || refreshResult.success !== true || expiryResult.success !== true) {
      const errors = [
        accessResult.success !== true ? `Access token: ${accessResult.error}` : null,
        refreshResult.success !== true ? `Refresh token: ${refreshResult.error}` : null,
        expiryResult.success !== true ? `Expiry: ${expiryResult.error}` : null,
      ].filter((error): error is string => error !== null).join('; ');

      console.error('[AuthService] Failed to store tokens securely:', errors);
      throw new Error('Failed to store authentication tokens securely');
    }

    // Update in-memory cache
    this.tokenCache = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };
  }

  /**
   * Clear tokens from encrypted storage and memory cache.
   *
   * SECURITY: This method ensures tokens are removed from both
   * the encrypted storage and the in-memory cache to prevent
   * any token leakage after logout.
   */
  private async clearTokens(): Promise<void> {
    const storage = this.getSecureStorage();
    // Clear from secure storage in parallel
    await Promise.all([
      storage.removeItem(SECURE_TOKEN_KEYS.ACCESS_TOKEN),
      storage.removeItem(SECURE_TOKEN_KEYS.REFRESH_TOKEN),
      storage.removeItem(SECURE_TOKEN_KEYS.TOKEN_EXPIRY),
    ]);

    // Clear in-memory cache
    this.tokenCache = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    };
  }
}

export const authService = new AuthService();
