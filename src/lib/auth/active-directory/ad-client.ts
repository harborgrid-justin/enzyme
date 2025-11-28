/**
 * Active Directory / Microsoft Graph API Client
 *
 * Enterprise-grade client for interacting with Azure AD, AD FS,
 * and Microsoft Graph API. Supports token management, user operations,
 * and group membership resolution.
 *
 * @module auth/active-directory/ad-client
 */

import type {
  ADConfig,
  ADTokens,
  ADUser,
  ADGroup,
  ADUserAttributes,
  GraphAPIRequest,
  GraphAPIResponse,
  GraphAPIError,

  TokenRefreshResult,
  ADAuthError,

} from './types';

import { getAuthorityUrl, getConfiguredScopes } from './ad-config';
import { ms } from '../../shared/type-utils';
import {
  GRAPH_API,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_BASE_DELAY,
  DEFAULT_MAX_RETRY_ATTEMPTS,
} from '@/lib/core/config/constants';

// =============================================================================
// Constants
// =============================================================================

const GRAPH_BASE_URL = GRAPH_API.BASE_URL;
const GRAPH_DEFAULT_VERSION = GRAPH_API.DEFAULT_VERSION;
const MAX_RETRIES = DEFAULT_MAX_RETRY_ATTEMPTS;
const RETRY_DELAY = DEFAULT_RETRY_BASE_DELAY;

/**
 * Common Graph API endpoints.
 */
export const GRAPH_ENDPOINTS = {
  ME: '/me',
  ME_PHOTO: '/me/photo/$value',
  ME_MEMBER_OF: '/me/memberOf',
  ME_TRANSITIVE_MEMBER_OF: '/me/transitiveMemberOf',
  USERS: '/users',
  GROUPS: '/groups',
  DIRECTORY_ROLES: '/directoryRoles',
} as const;

// =============================================================================
// AD Client Class
// =============================================================================

/**
 * Active Directory and Graph API client.
 *
 * Provides a unified interface for interacting with various AD providers
 * and the Microsoft Graph API. Handles token management, caching, and
 * automatic retries.
 *
 * @example
 * ```typescript
 * const client = new ADClient(config);
 * await client.initialize(tokens);
 *
 * const user = await client.getCurrentUser();
 * const groups = await client.getUserGroups();
 * ```
 */
export class ADClient {
  private config: ADConfig;
  private tokens: ADTokens | null = null;
  private tokenRefreshPromise: Promise<TokenRefreshResult> | null = null;
  private onTokenRefresh?: (tokens: ADTokens) => void;
  private onAuthError?: (error: ADAuthError) => void;
  private debug: boolean;

  /**
   * Create a new AD client instance.
   *
   * @param config - AD configuration
   * @param options - Additional options
   */
  constructor(
    config: ADConfig,
    options?: {
      onTokenRefresh?: (tokens: ADTokens) => void;
      onAuthError?: (error: ADAuthError) => void;
    }
  ) {
    this.config = config;
    this.debug = config.debug ?? false;
    this.onTokenRefresh = options?.onTokenRefresh;
    this.onAuthError = options?.onAuthError;
  }

  // ===========================================================================
  // Initialization & Token Management
  // ===========================================================================

  /**
   * Initialize the client with tokens.
   *
   * @param tokens - Initial AD tokens
   */
  initialize(tokens: ADTokens): void {
    this.tokens = tokens;
    this.log('Client initialized with tokens');
  }

  /**
   * Update the current tokens.
   *
   * @param tokens - New tokens to use
   */
  setTokens(tokens: ADTokens): void {
    this.tokens = tokens;
  }

  /**
   * Get the current access token.
   *
   * @returns Current access token or null
   */
  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  /**
   * Check if tokens are expired or about to expire.
   *
   * @param bufferMs - Buffer time in milliseconds (default: 5 minutes)
   * @returns Whether tokens need refresh
   */
  isTokenExpired(bufferMs = 300000): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt - bufferMs;
  }

  /**
   * Refresh tokens using the refresh token.
   *
   * This method handles concurrent refresh requests by returning
   * the same promise for overlapping calls.
   *
   * @returns Token refresh result
   */
  async refreshTokens(): Promise<TokenRefreshResult> {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    if (!this.tokens?.refreshToken) {
      return {
        success: false,
        requiresInteraction: true,
        error: this.createError('no_refresh_token', 'No refresh token available'),
      };
    }

    this.tokenRefreshPromise = this.performTokenRefresh();

    try {
      const result = await this.tokenRefreshPromise;
      return result;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh operation.
   *
   * Note: This method intentionally uses raw fetch() rather than apiClient because:
   * 1. OAuth token endpoints require specific Content-Type (x-www-form-urlencoded)
   * 2. Token refresh is a foundational auth operation that apiClient depends on
   * 3. Auth endpoints are identity providers (Azure AD, etc.), not the main API
   *
   * @see {@link @/lib/api/api-client} for authenticated application API calls
   */
  private async performTokenRefresh(): Promise<TokenRefreshResult> {
    const authority = getAuthorityUrl(this.config);
    if (!authority) {
      return {
        success: false,
        error: this.createError('config_error', 'No authority URL configured'),
      };
    }

    try {
      // This would integrate with MSAL or custom OAuth implementation
      // For now, we provide a placeholder that can be extended
      const tokenEndpoint = `${authority}/oauth2/v2.0/token`;

      // Raw fetch is intentional - OAuth requires x-www-form-urlencoded body
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokens!.refreshToken!,
          client_id: this.getClientId(),
          scope: getConfiguredScopes(this.config).join(' '),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = this.createError(
          errorData.error || 'token_refresh_failed',
          errorData.error_description || 'Failed to refresh token'
        );

        this.onAuthError?.(error);

        return {
          success: false,
          error,
          requiresInteraction: errorData.error === 'invalid_grant',
        };
      }

      const data = await response.json();
      const newTokens: ADTokens = {
        accessToken: data.access_token,
        idToken: data.id_token,
        refreshToken: data.refresh_token || this.tokens!.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
        scopes: data.scope?.split(' ') || [],
        tokenType: data.token_type || 'Bearer',
      };

      this.tokens = newTokens;
      this.onTokenRefresh?.(newTokens);

      return { success: true, tokens: newTokens };
    } catch (error) {
      const authError = this.createError(
        'network_error',
        'Network error during token refresh',
        error
      );
      this.onAuthError?.(authError);

      return { success: false, error: authError };
    }
  }

  /**
   * Get the client ID from configuration.
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

  // ===========================================================================
  // Graph API Operations
  // ===========================================================================

  /**
   * Make a request to the Microsoft Graph API.
   *
   * @param request - Graph API request configuration
   * @returns Graph API response
   */
  async graphRequest<T = unknown>(request: GraphAPIRequest): Promise<GraphAPIResponse<T>> {
    const version = request.version ?? GRAPH_DEFAULT_VERSION;
    const method = request.method ?? 'GET';
    const url = this.buildGraphUrl(request.endpoint, version, request.query);

    // Ensure we have valid tokens
    if (this.isTokenExpired()) {
      const refreshResult = await this.refreshTokens();
      if (!refreshResult.success) {
        throw new GraphAPIClientError(
          'token_expired',
          'Token expired and refresh failed',
          refreshResult.error
        );
      }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.tokens!.accessToken}`,
      'Content-Type': 'application/json',
      ...request.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    };

    return this.executeWithRetry<T>(url, fetchOptions, request.timeout ? ms(request.timeout) : undefined);
  }

  /**
   * Build the full Graph API URL.
   */
  private buildGraphUrl(
    endpoint: string,
    version: string,
    query?: Record<string, string | number | boolean>
  ): string {
    const baseUrl = `${GRAPH_BASE_URL}/${version}${endpoint}`;

    if (!query || Object.keys(query).length === 0) {
      return baseUrl;
    }

    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });

    return `${baseUrl}?${searchParams.toString()}`;
  }

  /**
   * Execute a request with automatic retries.
   */
  private async executeWithRetry<T>(
    url: string,
    options: RequestInit,
    timeout = DEFAULT_TIMEOUT
  ): Promise<GraphAPIResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const correlationId = response.headers.get('request-id') ?? undefined;

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({})) as GraphAPIError;

          // Don't retry 4xx errors (except 429 rate limiting)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new GraphAPIClientError(
              errorBody.code || 'unknown_error',
              errorBody.message || `Graph API error: ${response.status}`,
              errorBody
            );
          }

          // Retry 5xx errors and 429
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAY * (attempt + 1);
            await this.delay(delay);
            continue;
          }

          throw new Error(`Graph API error: ${response.status}`);
        }

        const data = await response.json() as T;

        // Extract pagination info for collection responses
        const pagination = this.extractPagination(data);

        return {
          data,
          headers: Object.fromEntries(response.headers.entries()),
          status: response.status,
          correlationId,
          pagination,
        };
      } catch (error) {
        lastError = error as Error;

        if (error instanceof GraphAPIClientError) {
          throw error;
        }

        if ((error as Error).name === 'AbortError') {
          throw new GraphAPIClientError('timeout', 'Request timed out');
        }

        // Retry on network errors
        if (attempt < MAX_RETRIES - 1) {
          await this.delay(RETRY_DELAY * (attempt + 1));
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after max retries');
  }

  /**
   * Extract pagination information from Graph API response.
   */
  private extractPagination(data: unknown): GraphAPIResponse['pagination'] | undefined {
    if (!data || typeof data !== 'object') return undefined;

    const obj = data as Record<string, unknown>;

    if ('@odata.nextLink' in obj || '@odata.count' in obj) {
      return {
        nextLink: obj['@odata.nextLink'] as string | undefined,
        count: obj['@odata.count'] as number | undefined,
        skipToken: this.extractSkipToken(obj['@odata.nextLink'] as string | undefined),
      };
    }

    return undefined;
  }

  /**
   * Extract skip token from next link URL.
   */
  private extractSkipToken(nextLink: string | undefined): string | undefined {
    if (!nextLink) return undefined;

    try {
      const url = new URL(nextLink);
      return url.searchParams.get('$skiptoken') ?? undefined;
    } catch {
      return undefined;
    }
  }

  // ===========================================================================
  // User Operations
  // ===========================================================================

  /**
   * Get the current authenticated user's profile from Graph API.
   *
   * @returns Current user with AD attributes
   */
  async getCurrentUser(): Promise<ADUser> {
    const [userResponse, groupsResponse] = await Promise.all([
      this.graphRequest<GraphUserProfile>({
        endpoint: GRAPH_ENDPOINTS.ME,
        query: {
          $select: [
            'id', 'userPrincipalName', 'displayName', 'givenName', 'surname',
            'mail', 'jobTitle', 'department', 'officeLocation', 'mobilePhone',
            'businessPhones', 'employeeId', 'companyName', 'userType',
            'accountEnabled', 'createdDateTime', 'onPremisesSamAccountName',
            'onPremisesDomainName'
          ].join(','),
        },
      }),
      this.getUserGroupsInternal(),
    ]);

    const profile = userResponse.data;
    const groups = groupsResponse;

    return this.mapGraphUserToADUser(profile, groups);
  }

  /**
   * Get a user by their ID or UPN.
   *
   * @param userId - User ID or UPN
   * @returns User profile
   */
  async getUser(userId: string): Promise<ADUser> {
    const [userResponse, groupsResponse] = await Promise.all([
      this.graphRequest<GraphUserProfile>({
        endpoint: `${GRAPH_ENDPOINTS.USERS}/${encodeURIComponent(userId)}`,
      }),
      this.graphRequest<GraphGroupListResponse>({
        endpoint: `${GRAPH_ENDPOINTS.USERS}/${encodeURIComponent(userId)}/memberOf`,
      }),
    ]);

    const groups = this.mapGraphGroups(groupsResponse.data.value);

    return this.mapGraphUserToADUser(userResponse.data, groups);
  }

  /**
   * Get the current user's profile photo.
   *
   * @returns Photo as blob URL or null
   */
  async getUserPhoto(): Promise<string | null> {
    try {
      const response = await fetch(
        `${GRAPH_BASE_URL}/${GRAPH_DEFAULT_VERSION}${GRAPH_ENDPOINTS.ME_PHOTO}`,
        {
          headers: {
            'Authorization': `Bearer ${this.tokens!.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // Group Operations
  // ===========================================================================

  /**
   * Get the current user's group memberships.
   *
   * @param transitive - Include transitive (nested) memberships
   * @returns Array of AD groups
   */
  async getUserGroups(transitive = false): Promise<ADGroup[]> {
    return this.getUserGroupsInternal(transitive);
  }

  /**
   * Internal method to get user groups.
   */
  private async getUserGroupsInternal(transitive = false): Promise<ADGroup[]> {
    const endpoint = transitive
      ? GRAPH_ENDPOINTS.ME_TRANSITIVE_MEMBER_OF
      : GRAPH_ENDPOINTS.ME_MEMBER_OF;

    const allGroups: GraphGroup[] = [];
    let nextLink: string | undefined;

    do {
      const response = await this.graphRequest<GraphGroupListResponse>({
        endpoint: nextLink ? '' : endpoint,
        query: nextLink ? undefined : { $top: 100 },
      });

      allGroups.push(
        ...response.data.value.filter(
          (item): item is GraphGroup => item['@odata.type'] === '#microsoft.graph.group'
        )
      );

      nextLink = response.pagination?.nextLink;
    } while (nextLink);

    return this.mapGraphGroups(allGroups);
  }

  /**
   * Check if user is a member of a specific group.
   *
   * @param groupId - Group ID to check
   * @param transitive - Check transitive membership
   * @returns Whether user is a member
   */
  async checkGroupMembership(groupId: string, transitive = true): Promise<boolean> {
    try {
      const response = await this.graphRequest<{ value: boolean }>({
        endpoint: `/me/checkMemberGroups`,
        method: 'POST',
        body: {
          groupIds: [groupId],
        },
      });

      return response.data.value;
    } catch {
      // Fall back to fetching all groups
      const groups = await this.getUserGroups(transitive);
      return groups.some(g => g.id === groupId);
    }
  }

  // ===========================================================================
  // Mapping Functions
  // ===========================================================================

  /**
   * Map Graph API user profile to ADUser.
   */
  private mapGraphUserToADUser(profile: GraphUserProfile, groups: ADGroup[]): ADUser {
    const adAttributes: ADUserAttributes = {
      upn: profile.userPrincipalName,
      objectId: profile.id,
      displayName: profile.displayName ?? '',
      email: profile.mail ?? undefined,
      givenName: profile.givenName ?? undefined,
      surname: profile.surname ?? undefined,
      jobTitle: profile.jobTitle ?? undefined,
      department: profile.department ?? undefined,
      officeLocation: profile.officeLocation ?? undefined,
      mobilePhone: profile.mobilePhone ?? undefined,
      businessPhones: profile.businessPhones,
      employeeId: profile.employeeId ?? undefined,
      companyName: profile.companyName ?? undefined,
      userType: profile.userType ?? undefined,
      accountEnabled: profile.accountEnabled,
      createdDateTime: profile.createdDateTime ?? undefined,
      onPremisesSamAccountName: profile.onPremisesSamAccountName ?? undefined,
      onPremisesDomainName: profile.onPremisesDomainName ?? undefined,
    };

    return {
      id: profile.id,
      email: profile.mail ?? profile.userPrincipalName,
      firstName: profile.givenName ?? '',
      lastName: profile.surname ?? '',
      displayName: profile.displayName ?? '',
      avatarUrl: undefined, // Set separately via getUserPhoto
      roles: [], // Set by role mapper
      permissions: [],
      metadata: {},
      createdAt: profile.createdDateTime ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adAttributes,
      adGroups: groups,
      adProvider: this.config.providerType,
      tenantId: this.getTenantId(),
      isGuest: profile.userType === 'Guest',
      effectivePermissions: [],
    };
  }

  /**
   * Map Graph API groups to ADGroup array.
   */
  private mapGraphGroups(graphGroups: GraphGroup[]): ADGroup[] {
    return graphGroups.map(group => ({
      id: group.id,
      displayName: group.displayName ?? '',
      description: group.description ?? undefined,
      groupType: this.determineGroupType(group),
      mail: group.mail ?? undefined,
      membershipType: group.membershipRule ? 'dynamic' : 'assigned',
      isAssignableToRole: group.isAssignableToRole,
      onPremisesSecurityIdentifier: group.onPremisesSecurityIdentifier ?? undefined,
    }));
  }

  /**
   * Determine the group type from Graph API response.
   */
  private determineGroupType(group: GraphGroup): ADGroup['groupType'] {
    if (group.mailEnabled && group.securityEnabled) {
      return 'mailEnabled';
    }
    if (group.securityEnabled) {
      return 'security';
    }
    if (group.groupTypes?.includes('Unified')) {
      return 'microsoft365';
    }
    return 'distribution';
  }

  /**
   * Get tenant ID from configuration.
   */
  private getTenantId(): string | undefined {
    switch (this.config.providerType) {
      case 'azure-ad':
        return this.config.azure?.tenantId;
      case 'azure-ad-b2c':
        return this.config.azureB2C?.tenantId;
      default:
        return undefined;
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Create an AD auth error object.
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
      recoverable: code !== 'no_refresh_token',
      originalError,
    };
  }

  /**
   * Delay helper for retries.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log debug messages.
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.debug) {
      console.log(`[ADClient] ${message}`, ...args);
    }
  }
}

// =============================================================================
// Graph API Types (Internal)
// =============================================================================

interface GraphUserProfile {
  id: string;
  userPrincipalName: string;
  displayName: string | null;
  givenName: string | null;
  surname: string | null;
  mail: string | null;
  jobTitle: string | null;
  department: string | null;
  officeLocation: string | null;
  mobilePhone: string | null;
  businessPhones: string[];
  employeeId: string | null;
  companyName: string | null;
  userType: string | null;
  accountEnabled: boolean;
  createdDateTime: string | null;
  onPremisesSamAccountName: string | null;
  onPremisesDomainName: string | null;
}

interface GraphGroup {
  '@odata.type'?: string;
  id: string;
  displayName: string | null;
  description: string | null;
  mail: string | null;
  mailEnabled: boolean;
  securityEnabled: boolean;
  groupTypes: string[];
  membershipRule: string | null;
  isAssignableToRole: boolean;
  onPremisesSecurityIdentifier: string | null;
}

interface GraphGroupListResponse {
  value: GraphGroup[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

// =============================================================================
// Error Class
// =============================================================================

/**
 * Custom error class for Graph API client errors.
 */
export class GraphAPIClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'GraphAPIClientError';
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new AD client instance.
 *
 * @param config - AD configuration
 * @param options - Additional options
 * @returns Configured AD client
 */
export function createADClient(
  config: ADConfig,
  options?: {
    onTokenRefresh?: (tokens: ADTokens) => void;
    onAuthError?: (error: ADAuthError) => void;
  }
): ADClient {
  return new ADClient(config, options);
}
