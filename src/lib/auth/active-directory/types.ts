/**
 * Active Directory Integration Types
 *
 * Comprehensive type definitions for Active Directory authentication,
 * including Azure AD, AD FS, and on-premises AD support.
 *
 * @module auth/active-directory/types
 */

import type { User, Role, Permission } from '../types';

// =============================================================================
// AD Provider Types
// =============================================================================

/**
 * Supported Active Directory provider types.
 */
export type ADProviderType = 'azure-ad' | 'azure-ad-b2c' | 'adfs' | 'on-premises' | 'custom';

/**
 * OAuth2/OIDC grant types supported by AD providers.
 */
export type ADGrantType =
  | 'authorization_code'
  | 'client_credentials'
  | 'implicit'
  | 'device_code'
  | 'refresh_token'
  | 'password';

/**
 * Authentication prompt behaviors for AD login flows.
 */
export type ADPromptBehavior = 'login' | 'consent' | 'select_account' | 'none';

// =============================================================================
// AD Configuration Types
// =============================================================================

/**
 * Azure AD specific configuration options.
 */
export interface AzureADConfig {
  /** Azure AD tenant ID */
  tenantId: string;
  /** Application (client) ID registered in Azure AD */
  clientId: string;
  /** Client secret for confidential clients (server-side only) */
  clientSecret?: string;
  /** Redirect URI for authentication callbacks */
  redirectUri: string;
  /** Post-logout redirect URI */
  postLogoutRedirectUri?: string;
  /** OAuth2 scopes to request */
  scopes: string[];
  /** Authority URL (defaults to Azure AD common endpoint) */
  authority?: string;
  /** Enable PKCE for authorization code flow */
  usePkce?: boolean;
  /** Cache location for tokens */
  cacheLocation?: 'localStorage' | 'sessionStorage' | 'memory';
  /** Enable popup-based authentication */
  usePopup?: boolean;
  /** Navigate to request URL after login */
  navigateToLoginRequestUrl?: boolean;
}

/**
 * Azure AD B2C specific configuration.
 */
export interface AzureADB2CConfig extends AzureADConfig {
  /** B2C policy/user flow names */
  policies: {
    signUpSignIn: string;
    resetPassword?: string;
    editProfile?: string;
    custom?: Record<string, string>;
  };
  /** Known authorities for B2C */
  knownAuthorities: string[];
  /** B2C tenant name */
  b2cTenantName: string;
}

/**
 * AD FS (Active Directory Federation Services) configuration.
 */
export interface ADFSConfig {
  /** AD FS server URL */
  serverUrl: string;
  /** Application identifier in AD FS */
  clientId: string;
  /** Redirect URI registered in AD FS */
  redirectUri: string;
  /** Resource identifier */
  resource?: string;
  /** OAuth2 scopes */
  scopes: string[];
  /** Use Windows Integrated Authentication */
  useWia?: boolean;
  /** Certificate thumbprint for mutual TLS */
  certificateThumbprint?: string;
}

/**
 * On-premises Active Directory configuration (via LDAP/Graph).
 */
export interface OnPremisesADConfig {
  /** LDAP server URL */
  ldapUrl: string;
  /** LDAP base DN for searches */
  baseDn: string;
  /** Service account username */
  bindDn: string;
  /** Service account password (should come from secure config) */
  bindPassword: string;
  /** Use TLS for LDAP connection */
  useTls: boolean;
  /** Custom CA certificate for TLS */
  tlsCaCert?: string;
  /** User search filter template */
  userSearchFilter?: string;
  /** Group search filter template */
  groupSearchFilter?: string;
  /** Sync interval in milliseconds */
  syncInterval?: number;
}

/**
 * Unified AD configuration that supports all provider types.
 */
export interface ADConfig {
  /** Provider type */
  providerType: ADProviderType;
  /** Provider-specific configuration */
  azure?: AzureADConfig;
  azureB2C?: AzureADB2CConfig;
  adfs?: ADFSConfig;
  onPremises?: OnPremisesADConfig;
  /** Custom provider configuration */
  custom?: Record<string, unknown>;
  /** Enable debug logging */
  debug?: boolean;
  /** Enable multi-tenancy */
  multiTenant?: boolean;
  /** Session timeout in milliseconds */
  sessionTimeout?: number;
  /** Enable silent token refresh */
  silentRefresh?: boolean;
  /** Feature flag to enable/disable AD authentication */
  featureFlag?: string;
}

// =============================================================================
// AD User & Token Types
// =============================================================================

/**
 * Active Directory user attributes from token claims or Graph API.
 */
export interface ADUserAttributes {
  /** User principal name (UPN) */
  upn: string;
  /** Object ID (GUID) */
  objectId: string;
  /** Display name */
  displayName: string;
  /** Email address */
  email?: string;
  /** Given (first) name */
  givenName?: string;
  /** Surname (last name) */
  surname?: string;
  /** Job title */
  jobTitle?: string;
  /** Department */
  department?: string;
  /** Office location */
  officeLocation?: string;
  /** Mobile phone */
  mobilePhone?: string;
  /** Business phones */
  businessPhones?: string[];
  /** Manager's user principal name */
  manager?: string;
  /** Direct reports */
  directReports?: string[];
  /** Employee ID */
  employeeId?: string;
  /** Company name */
  companyName?: string;
  /** User type (Member, Guest, etc.) */
  userType?: string;
  /** Account enabled status */
  accountEnabled?: boolean;
  /** Creation timestamp */
  createdDateTime?: string;
  /** Last sign-in timestamp */
  lastSignInDateTime?: string;
  /** On-premises SAM account name */
  onPremisesSamAccountName?: string;
  /** On-premises domain name */
  onPremisesDomainName?: string;
  /** Custom extension attributes */
  extensionAttributes?: Record<string, unknown>;
  /** Raw claims from token */
  rawClaims?: Record<string, unknown>;
}

/**
 * Extended user interface with AD-specific attributes.
 */
export interface ADUser extends User {
  /** AD-specific user attributes */
  adAttributes: ADUserAttributes;
  /** AD groups the user belongs to */
  adGroups: ADGroup[];
  /** Source AD provider */
  adProvider: ADProviderType;
  /** Tenant ID for multi-tenant scenarios */
  tenantId?: string;
  /** Is the user a guest/external user */
  isGuest?: boolean;
  /** User's effective permissions from AD groups */
  effectivePermissions: Permission[];
  /** Original raw token claims */
  tokenClaims?: Record<string, unknown>;
}

/**
 * Active Directory group information.
 */
export interface ADGroup {
  /** Group object ID */
  id: string;
  /** Display name */
  displayName: string;
  /** Description */
  description?: string;
  /** Group type (Security, Microsoft 365, Distribution, etc.) */
  groupType: 'security' | 'microsoft365' | 'distribution' | 'mailEnabled';
  /** Mail address for mail-enabled groups */
  mail?: string;
  /** Membership type */
  membershipType?: 'assigned' | 'dynamic';
  /** Whether this is a role-assignable group */
  isAssignableToRole?: boolean;
  /** Nested group IDs */
  memberOf?: string[];
  /** On-premises security identifier */
  onPremisesSecurityIdentifier?: string;
}

/**
 * AD authentication tokens.
 */
export interface ADTokens {
  /** Access token for API calls */
  accessToken: string;
  /** ID token containing user claims */
  idToken: string;
  /** Refresh token for silent renewal */
  refreshToken?: string;
  /** Token expiration timestamp (Unix epoch milliseconds) */
  expiresAt: number;
  /** Scopes granted by the token */
  scopes: string[];
  /** Token type (usually 'Bearer') */
  tokenType: string;
  /** Account identifier for MSAL cache */
  accountId?: string;
  /** Correlation ID for debugging */
  correlationId?: string;
}

/**
 * Token acquisition request options.
 */
export interface TokenAcquisitionRequest {
  /** Scopes to request */
  scopes: string[];
  /** Specific account to use */
  account?: string;
  /** Force interactive authentication */
  forceRefresh?: boolean;
  /** Login hint (pre-filled username) */
  loginHint?: string;
  /** Domain hint to skip realm discovery */
  domainHint?: string;
  /** Prompt behavior */
  prompt?: ADPromptBehavior;
  /** Extra query parameters */
  extraQueryParameters?: Record<string, string>;
  /** Claims request for conditional access */
  claims?: string;
  /** Correlation ID for request tracking */
  correlationId?: string;
}

/**
 * Token refresh result.
 */
export interface TokenRefreshResult {
  /** Whether refresh was successful */
  success: boolean;
  /** New tokens if successful */
  tokens?: ADTokens;
  /** Error if refresh failed */
  error?: ADAuthError;
  /** Whether interaction is required */
  requiresInteraction?: boolean;
}

// =============================================================================
// AD Group to Role Mapping Types
// =============================================================================

/**
 * Mapping between AD groups and application roles.
 */
export interface ADGroupRoleMapping {
  /** AD group ID or display name pattern */
  groupIdentifier: string;
  /** Match type for group identification */
  matchType: 'exact' | 'pattern' | 'prefix' | 'suffix';
  /** Application role to assign */
  role: Role;
  /** Additional permissions granted by this group */
  additionalPermissions?: Permission[];
  /** Priority for role resolution (higher wins) */
  priority?: number;
  /** Whether this mapping is enabled */
  enabled?: boolean;
  /** Optional condition for dynamic mapping */
  condition?: (user: ADUser, group: ADGroup) => boolean;
}

/**
 * Complete group to role mapping configuration.
 */
export interface ADGroupMappingConfig {
  /** Individual group mappings */
  mappings: ADGroupRoleMapping[];
  /** Default role if no groups match */
  defaultRole: Role;
  /** Default permissions if no groups match */
  defaultPermissions: Permission[];
  /** Whether to use nested group memberships */
  resolveNestedGroups?: boolean;
  /** Cache duration for group memberships in milliseconds */
  cacheDuration?: number;
  /** Fallback behavior when Graph API is unavailable */
  fallbackBehavior?: 'use-claims' | 'deny' | 'default-role';
}

// =============================================================================
// AD Authentication State Types
// =============================================================================

/**
 * AD authentication state.
 */
export interface ADAuthState {
  /** Current authenticated user */
  user: ADUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
  /** Whether token refresh is in progress */
  isRefreshing: boolean;
  /** Current tokens */
  tokens: ADTokens | null;
  /** Current authentication error */
  error: ADAuthError | null;
  /** AD provider being used */
  provider: ADProviderType | null;
  /** Current account identifier */
  accountId: string | null;
  /** Whether SSO session exists */
  hasSsoSession: boolean;
  /** Last successful authentication timestamp */
  lastAuthTime: number | null;
  /** Token expiration timestamp */
  tokenExpiresAt: number | null;
}

/**
 * AD authentication error information.
 */
export interface ADAuthError {
  /** Error code from AD/MSAL */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Detailed error description */
  description?: string;
  /** Correlation ID for troubleshooting */
  correlationId?: string;
  /** Suberror code for more specific handling */
  subError?: string;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Suggested recovery action */
  recoveryAction?: 'retry' | 'reauth' | 'contact-admin' | 'none';
  /** Original error object */
  originalError?: unknown;
}

// =============================================================================
// AD Context & Provider Types
// =============================================================================

/**
 * AD authentication context value for React context.
 */
export interface ADContextValue extends ADAuthState {
  /** Configuration being used */
  config: ADConfig | null;
  /** Initialize AD authentication */
  initialize: () => Promise<void>;
  /** Trigger interactive login */
  login: (options?: TokenAcquisitionRequest) => Promise<void>;
  /** Perform silent SSO login */
  loginSilent: (options?: TokenAcquisitionRequest) => Promise<void>;
  /** Logout and clear session */
  logout: (options?: ADLogoutOptions) => Promise<void>;
  /** Acquire token for specific scopes */
  acquireToken: (request: TokenAcquisitionRequest) => Promise<ADTokens>;
  /** Acquire token silently */
  acquireTokenSilent: (request: TokenAcquisitionRequest) => Promise<ADTokens | null>;
  /** Refresh current tokens */
  refreshTokens: () => Promise<TokenRefreshResult>;
  /** Get user's AD groups */
  getUserGroups: () => Promise<ADGroup[]>;
  /** Check if user belongs to specific group */
  isInGroup: (groupId: string) => boolean;
  /** Check if user has specific AD attribute value */
  hasAttribute: (attribute: keyof ADUserAttributes, value: unknown) => boolean;
  /** Get mapped roles from AD groups */
  getMappedRoles: () => Role[];
  /** Get effective permissions */
  getEffectivePermissions: () => Permission[];
  /** Clear any authentication errors */
  clearError: () => void;
  /** Force a full re-authentication */
  forceReauth: () => Promise<void>;
}

/**
 * Logout options for AD.
 */
export interface ADLogoutOptions {
  /** Clear local session only (no AD signout) */
  localOnly?: boolean;
  /** Post-logout redirect URI */
  postLogoutRedirectUri?: string;
  /** Logout hint to identify session */
  logoutHint?: string;
  /** Correlation ID for request tracking */
  correlationId?: string;
}

// =============================================================================
// SSO Types
// =============================================================================

/**
 * SSO session information.
 */
export interface SSOSession {
  /** Session identifier */
  sessionId: string;
  /** User principal name */
  upn: string;
  /** Session creation time */
  createdAt: number;
  /** Last activity time */
  lastActivity: number;
  /** Session expiration time */
  expiresAt: number;
  /** Whether session is still valid */
  isValid: boolean;
  /** Origin domain */
  domain: string;
  /** Additional session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * SSO configuration options.
 */
export interface SSOConfig {
  /** Enable cross-tab session sync */
  crossTabSync?: boolean;
  /** Session storage key prefix */
  storagePrefix?: string;
  /** Session timeout in milliseconds */
  sessionTimeout?: number;
  /** Allowed domains for cross-domain SSO */
  allowedDomains?: string[];
  /** Enable session activity tracking */
  trackActivity?: boolean;
  /** Activity check interval in milliseconds */
  activityCheckInterval?: number;
  /** Enable automatic session extension */
  autoExtendSession?: boolean;
}

// =============================================================================
// Graph API Types
// =============================================================================

/**
 * Microsoft Graph API request options.
 */
export interface GraphAPIRequest {
  /** API endpoint path */
  endpoint: string;
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Request body */
  body?: unknown;
  /** Query parameters */
  query?: Record<string, string | number | boolean>;
  /** Request headers */
  headers?: Record<string, string>;
  /** Graph API version */
  version?: 'v1.0' | 'beta';
  /** Scopes required for this request */
  scopes?: string[];
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Microsoft Graph API response.
 */
export interface GraphAPIResponse<T = unknown> {
  /** Response data */
  data: T;
  /** Response headers */
  headers: Record<string, string>;
  /** HTTP status code */
  status: number;
  /** Request correlation ID */
  correlationId?: string;
  /** Pagination info for collection responses */
  pagination?: {
    nextLink?: string;
    count?: number;
    skipToken?: string;
  };
}

/**
 * Graph API error response.
 */
export interface GraphAPIError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Inner error details */
  innerError?: {
    code?: string;
    message?: string;
    date?: string;
    requestId?: string;
    clientRequestId?: string;
  };
  /** Additional error details */
  details?: Array<{
    code: string;
    message: string;
    target?: string;
  }>;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * AD authentication events for observability.
 */
export type ADAuthEvent =
  | { type: 'login_initiated'; provider: ADProviderType; correlationId: string }
  | { type: 'login_success'; user: ADUser; correlationId: string }
  | { type: 'login_failed'; error: ADAuthError; correlationId: string }
  | { type: 'logout_initiated'; correlationId: string }
  | { type: 'logout_success'; correlationId: string }
  | { type: 'token_acquired'; scopes: string[]; correlationId: string }
  | { type: 'token_refreshed'; correlationId: string }
  | { type: 'token_refresh_failed'; error: ADAuthError; correlationId: string }
  | { type: 'session_expired'; correlationId: string }
  | { type: 'sso_detected'; upn: string; correlationId: string }
  | { type: 'group_sync_completed'; groupCount: number; correlationId: string }
  | { type: 'error'; error: ADAuthError; correlationId: string };

/**
 * Event handler for AD authentication events.
 */
export type ADAuthEventHandler = (event: ADAuthEvent) => void;

/**
 * AD event emitter interface.
 */
export interface ADEventEmitter {
  /** Subscribe to events */
  on: (handler: ADAuthEventHandler) => () => void;
  /** Emit an event */
  emit: (event: ADAuthEvent) => void;
  /** Remove all handlers */
  clear: () => void;
}
