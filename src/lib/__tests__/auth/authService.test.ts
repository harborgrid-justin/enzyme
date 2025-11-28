/**
 * @file Auth Service Tests
 * @description Comprehensive tests for the AuthService including:
 * - Token storage and retrieval
 * - Token refresh logic
 * - Session timeout handling
 * - Race condition prevention
 * - Login/logout flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockUser,
  createMockAuthTokens,
  createMockSecureStorage,
  createDeferred,
} from '../utils/test-utils';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the secure storage module
const mockSecureStorage = createMockSecureStorage();
vi.mock('@/lib/security/secure-storage', () => ({
  SecureStorage: vi.fn(),
  createSecureLocalStorage: vi.fn(() => mockSecureStorage),
  generateEncryptionKey: vi.fn(() => 'mock-key'),
}));

// Mock the environment config
vi.mock('@/config/env', () => ({
  env: {
    appName: 'TestApp',
    authTokenKey: 'test-auth-key',
    apiBaseUrl: 'http://localhost:3000/api',
  },
}));

// Mock the API client
const mockApiClient = {
  post: vi.fn(),
  get: vi.fn(),
};
vi.mock('@/lib/api', () => ({
  apiClient: mockApiClient,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

// ============================================================================
// Import after mocks
// ============================================================================

// We need to dynamically import to ensure mocks are set up first
let authService: Awaited<typeof import('@/lib/auth/authService')>['authService'];

describe('AuthService', () => {
  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    mockSecureStorage._store.clear();

    // Reset the API client mocks
    mockApiClient.post.mockReset();
    mockApiClient.get.mockReset();

    // Re-import to get fresh instance
    vi.resetModules();

    // Re-setup mocks after reset
    vi.doMock('@/lib/security/secure-storage', () => ({
      SecureStorage: vi.fn(),
      createSecureLocalStorage: vi.fn(() => mockSecureStorage),
      generateEncryptionKey: vi.fn(() => 'mock-key'),
    }));

    vi.doMock('@/config/env', () => ({
      env: {
        appName: 'TestApp',
        authTokenKey: 'test-auth-key',
        apiBaseUrl: 'http://localhost:3000/api',
      },
    }));

    vi.doMock('@/lib/api', () => ({
      apiClient: mockApiClient,
      ApiError: class ApiError extends Error {
        status: number;
        constructor(message: string, status: number) {
          super(message);
          this.status = status;
        }
      },
    }));

    const module = await import('@/lib/auth/authService');
    authService = module.authService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('initialization', () => {
    it('should initialize without errors', async () => {
      // Arrange - ensure storage returns empty
      mockSecureStorage.getItem.mockResolvedValue({ success: true, data: undefined });

      // Act
      await authService.initialize();

      // Assert
      expect(mockSecureStorage.getItem).toHaveBeenCalled();
    });

    it('should load tokens from secure storage on initialization', async () => {
      // Arrange
      const mockTokens = createMockAuthTokens();
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: mockTokens.accessToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.refreshToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.expiresAt });

      // Act
      await authService.initialize();

      // Assert - tokens should be loaded
      expect(mockSecureStorage.getItem).toHaveBeenCalledTimes(3);
      expect(authService.getAccessToken()).toBe(mockTokens.accessToken);
      expect(authService.getRefreshToken()).toBe(mockTokens.refreshToken);
    });

    it('should handle storage failures gracefully', async () => {
      // Arrange
      mockSecureStorage.getItem.mockResolvedValue({ success: false, error: 'Storage error' });

      // Act
      await authService.initialize();

      // Assert - should not throw, tokens should be null
      expect(authService.getAccessToken()).toBeNull();
      expect(authService.getRefreshToken()).toBeNull();
    });
  });

  // ==========================================================================
  // Token Storage and Retrieval Tests
  // ==========================================================================

  describe('token storage and retrieval', () => {
    it('should return null when no tokens are stored', async () => {
      // Arrange
      mockSecureStorage.getItem.mockResolvedValue({ success: true, data: undefined });

      // Act
      await authService.initialize();

      // Assert
      expect(authService.getAccessToken()).toBeNull();
      expect(authService.getRefreshToken()).toBeNull();
      expect(authService.getTokenExpiry()).toBeNull();
    });

    it('should cache tokens in memory for synchronous access', async () => {
      // Arrange
      const mockTokens = createMockAuthTokens();
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: mockTokens.accessToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.refreshToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.expiresAt });

      // Act
      await authService.initialize();

      // Assert - synchronous access should work
      expect(authService.getAccessToken()).toBe(mockTokens.accessToken);
      expect(authService.getRefreshToken()).toBe(mockTokens.refreshToken);
      expect(authService.getTokenExpiry()).toBe(mockTokens.expiresAt);
    });

    it('should retrieve tokens asynchronously from secure storage', async () => {
      // Arrange
      const mockTokens = createMockAuthTokens();
      mockSecureStorage.getItem.mockResolvedValue({ success: true, data: mockTokens.accessToken });

      // Act
      const token = await authService.getAccessTokenAsync();

      // Assert
      expect(token).toBe(mockTokens.accessToken);
      expect(mockSecureStorage.getItem).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Login Tests
  // ==========================================================================

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTokens = createMockAuthTokens();
      mockApiClient.post.mockResolvedValue({
        data: { user: mockUser, tokens: mockTokens },
      });
      mockSecureStorage.setItem.mockResolvedValue({ success: true });

      // Act
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'test@example.com', password: 'password123' },
        { meta: { skipAuth: true } }
      );
    });

    it('should store tokens securely after successful login', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTokens = createMockAuthTokens();
      mockApiClient.post.mockResolvedValue({
        data: { user: mockUser, tokens: mockTokens },
      });
      mockSecureStorage.setItem.mockResolvedValue({ success: true });

      // Act
      await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Assert - should store all token parts
      expect(mockSecureStorage.setItem).toHaveBeenCalledTimes(3);
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith(
        'auth_access_token',
        mockTokens.accessToken
      );
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith(
        'auth_refresh_token',
        mockTokens.refreshToken
      );
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith(
        'auth_token_expiry',
        mockTokens.expiresAt
      );
    });

    it('should throw error on login failure', async () => {
      // Arrange
      mockApiClient.post.mockRejectedValue(new Error('Invalid credentials'));

      // Act & Assert
      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if token storage fails', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTokens = createMockAuthTokens();
      mockApiClient.post.mockResolvedValue({
        data: { user: mockUser, tokens: mockTokens },
      });
      mockSecureStorage.setItem.mockResolvedValue({ success: false, error: 'Storage failed' });

      // Act & Assert
      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Failed to store authentication tokens securely');
    });
  });

  // ==========================================================================
  // Registration Tests
  // ==========================================================================

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTokens = createMockAuthTokens();
      mockApiClient.post.mockResolvedValue({
        data: { user: mockUser, tokens: mockTokens },
      });
      mockSecureStorage.setItem.mockResolvedValue({ success: true });

      // Act
      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      });

      // Assert
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({
          email: 'new@example.com',
          password: 'password123',
        }),
        { meta: { skipAuth: true } }
      );
    });

    it('should store tokens after successful registration', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockTokens = createMockAuthTokens();
      mockApiClient.post.mockResolvedValue({
        data: { user: mockUser, tokens: mockTokens },
      });
      mockSecureStorage.setItem.mockResolvedValue({ success: true });

      // Act
      await authService.register({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      });

      // Assert
      expect(mockSecureStorage.setItem).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Logout Tests
  // ==========================================================================

  describe('logout', () => {
    it('should clear tokens on logout', async () => {
      // Arrange
      const mockTokens = createMockAuthTokens();
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: mockTokens.accessToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.refreshToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.expiresAt });
      mockSecureStorage.removeItem.mockResolvedValue({ success: true });
      mockApiClient.post.mockResolvedValue({ data: { success: true } });

      await authService.initialize();

      // Act
      await authService.logout();

      // Assert
      expect(mockSecureStorage.removeItem).toHaveBeenCalledTimes(3);
      expect(authService.getAccessToken()).toBeNull();
      expect(authService.getRefreshToken()).toBeNull();
    });

    it('should call logout endpoint with refresh token', async () => {
      // Arrange
      const mockTokens = createMockAuthTokens();
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: mockTokens.accessToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.refreshToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.expiresAt });
      mockSecureStorage.removeItem.mockResolvedValue({ success: true });
      mockApiClient.post.mockResolvedValue({ data: { success: true } });

      await authService.initialize();

      // Act
      await authService.logout();

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should clear tokens even if logout API call fails', async () => {
      // Arrange
      const mockTokens = createMockAuthTokens();
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: mockTokens.accessToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.refreshToken })
        .mockResolvedValueOnce({ success: true, data: mockTokens.expiresAt });
      mockSecureStorage.removeItem.mockResolvedValue({ success: true });
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      await authService.initialize();

      // Act
      await authService.logout();

      // Assert - tokens should still be cleared
      expect(authService.getAccessToken()).toBeNull();
      expect(authService.getRefreshToken()).toBeNull();
    });
  });

  // ==========================================================================
  // Token Refresh Tests
  // ==========================================================================

  describe('token refresh', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      const initialTokens = createMockAuthTokens();
      const newTokens = createMockAuthTokens();

      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: initialTokens.accessToken })
        .mockResolvedValueOnce({ success: true, data: initialTokens.refreshToken })
        .mockResolvedValueOnce({ success: true, data: initialTokens.expiresAt });
      mockSecureStorage.setItem.mockResolvedValue({ success: true });
      mockApiClient.post.mockResolvedValue({ data: newTokens });

      await authService.initialize();

      // Act
      const result = await authService.refreshTokens();

      // Assert
      expect(result).toEqual(newTokens);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/refresh',
        { refreshToken: initialTokens.refreshToken },
        { meta: { skipAuth: true } }
      );
    });

    it('should throw error when no refresh token is available', async () => {
      // Arrange
      mockSecureStorage.getItem.mockResolvedValue({ success: true, data: undefined });
      await authService.initialize();

      // Act & Assert
      await expect(authService.refreshTokens()).rejects.toThrow('No refresh token available');
    });

    it('should prevent concurrent refresh requests (race condition)', async () => {
      // Arrange
      const initialTokens = createMockAuthTokens();
      const newTokens = createMockAuthTokens();

      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: initialTokens.accessToken })
        .mockResolvedValueOnce({ success: true, data: initialTokens.refreshToken })
        .mockResolvedValueOnce({ success: true, data: initialTokens.expiresAt });
      mockSecureStorage.setItem.mockResolvedValue({ success: true });

      // Create a deferred promise to control timing
      const deferred = createDeferred<{ data: typeof newTokens }>();
      mockApiClient.post.mockReturnValue(deferred.promise);

      await authService.initialize();

      // Act - start multiple concurrent refresh requests
      const promise1 = authService.refreshTokens();
      const promise2 = authService.refreshTokens();
      const promise3 = authService.refreshTokens();

      // Resolve the deferred promise
      deferred.resolve({ data: newTokens });

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // Assert - all should return the same result, API called only once
      expect(result1).toEqual(newTokens);
      expect(result2).toEqual(newTokens);
      expect(result3).toEqual(newTokens);
      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    });

    it('should update cached tokens after refresh', async () => {
      // Arrange
      const initialTokens = createMockAuthTokens();
      const newTokens = createMockAuthTokens();

      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: initialTokens.accessToken })
        .mockResolvedValueOnce({ success: true, data: initialTokens.refreshToken })
        .mockResolvedValueOnce({ success: true, data: initialTokens.expiresAt });
      mockSecureStorage.setItem.mockResolvedValue({ success: true });
      mockApiClient.post.mockResolvedValue({ data: newTokens });

      await authService.initialize();

      // Act
      await authService.refreshTokens();

      // Assert - cache should be updated
      expect(authService.getAccessToken()).toBe(newTokens.accessToken);
      expect(authService.getRefreshToken()).toBe(newTokens.refreshToken);
    });
  });

  // ==========================================================================
  // Authentication Status Tests
  // ==========================================================================

  describe('isAuthenticated', () => {
    it('should return false when no token exists', async () => {
      // Arrange
      mockSecureStorage.getItem.mockResolvedValue({ success: true, data: undefined });
      await authService.initialize();

      // Act & Assert
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true when valid token exists', async () => {
      // Arrange
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: 'valid-token' })
        .mockResolvedValueOnce({ success: true, data: 'refresh-token' })
        .mockResolvedValueOnce({ success: true, data: futureExpiry });

      await authService.initialize();

      // Act & Assert
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when token is expired', async () => {
      // Arrange
      const pastExpiry = Date.now() - 1000; // Already expired
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: 'expired-token' })
        .mockResolvedValueOnce({ success: true, data: 'refresh-token' })
        .mockResolvedValueOnce({ success: true, data: pastExpiry });

      await authService.initialize();

      // Act & Assert
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when token expires within 1 minute buffer', async () => {
      // Arrange
      const nearExpiry = Date.now() + 30000; // 30 seconds from now (within 1 min buffer)
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: 'almost-expired-token' })
        .mockResolvedValueOnce({ success: true, data: 'refresh-token' })
        .mockResolvedValueOnce({ success: true, data: nearExpiry });

      await authService.initialize();

      // Act & Assert
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when no expiry time exists', async () => {
      // Arrange
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: 'token' })
        .mockResolvedValueOnce({ success: true, data: 'refresh-token' })
        .mockResolvedValueOnce({ success: true, data: undefined });

      await authService.initialize();

      // Act & Assert
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  // ==========================================================================
  // Get Current User Tests
  // ==========================================================================

  describe('getCurrentUser', () => {
    it('should fetch current user from API', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockApiClient.get.mockResolvedValue({ data: mockUser });

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('should throw error when fetch fails', async () => {
      // Arrange
      mockApiClient.get.mockRejectedValue(new Error('Unauthorized'));

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  // ==========================================================================
  // Session Timeout Tests
  // ==========================================================================

  describe('session timeout handling', () => {
    it('should detect when token is about to expire', async () => {
      // Arrange - token expires in 2 minutes (within typical warning threshold)
      const soonExpiry = Date.now() + 120000;
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: 'token' })
        .mockResolvedValueOnce({ success: true, data: 'refresh-token' })
        .mockResolvedValueOnce({ success: true, data: soonExpiry });

      await authService.initialize();

      // Act
      const expiry = authService.getTokenExpiry();

      // Assert
      expect(expiry).toBe(soonExpiry);
      expect(expiry! - Date.now()).toBeLessThan(180000); // Less than 3 minutes
    });

    it('should allow checking authentication state after session changes', async () => {
      // Arrange - start with valid session
      const validExpiry = Date.now() + 3600000;
      mockSecureStorage.getItem
        .mockResolvedValueOnce({ success: true, data: 'token' })
        .mockResolvedValueOnce({ success: true, data: 'refresh-token' })
        .mockResolvedValueOnce({ success: true, data: validExpiry });
      mockSecureStorage.removeItem.mockResolvedValue({ success: true });
      mockApiClient.post.mockResolvedValue({ data: { success: true } });

      await authService.initialize();
      expect(authService.isAuthenticated()).toBe(true);

      // Act - logout
      await authService.logout();

      // Assert - session should be ended
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle undefined token gracefully', async () => {
      // Arrange
      mockSecureStorage.getItem.mockResolvedValue({ success: true, data: null });

      // Act
      const token = await authService.getAccessTokenAsync();

      // Assert
      expect(token).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      // Arrange
      mockSecureStorage.getItem.mockRejectedValue(new Error('Storage unavailable'));

      // Act & Assert - should not throw
      await expect(authService.getAccessTokenAsync()).resolves.toBeNull();
    });

    it('should handle multiple sequential logins', async () => {
      // Arrange
      const firstUser = createMockUser({ email: 'first@example.com' });
      const secondUser = createMockUser({ email: 'second@example.com' });
      const firstTokens = createMockAuthTokens();
      const secondTokens = createMockAuthTokens();

      mockSecureStorage.setItem.mockResolvedValue({ success: true });
      mockSecureStorage.removeItem.mockResolvedValue({ success: true });

      // First login
      mockApiClient.post.mockResolvedValueOnce({
        data: { user: firstUser, tokens: firstTokens },
      });
      await authService.login({ email: 'first@example.com', password: 'pass' });
      expect(authService.getAccessToken()).toBe(firstTokens.accessToken);

      // Logout
      mockApiClient.post.mockResolvedValueOnce({ data: { success: true } });
      await authService.logout();

      // Second login
      mockApiClient.post.mockResolvedValueOnce({
        data: { user: secondUser, tokens: secondTokens },
      });
      await authService.login({ email: 'second@example.com', password: 'pass' });

      // Assert
      expect(authService.getAccessToken()).toBe(secondTokens.accessToken);
    });
  });
});
