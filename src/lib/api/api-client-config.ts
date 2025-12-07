import type { ApiClientConfig, RetryConfig } from './types';
import { API_CONFIG, TIMING } from '@/config';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: TIMING.RETRY.API_ATTEMPTS,
  baseDelay: TIMING.API.RETRY_BASE_DELAY,
  maxDelay: TIMING.API.RETRY_MAX_DELAY,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
};

/**
 * Default client configuration
 */
export const DEFAULT_CLIENT_CONFIG: Partial<ApiClientConfig> = {
  timeout: API_CONFIG.TIMEOUT.DEFAULT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  deduplicate: true,
  autoRefreshToken: true,
  tokenRefreshThreshold: TIMING.AUTH.TOKEN_EXPIRY_BUFFER,
  credentials: 'include',
};
