# Auth Type Definitions

Comprehensive TypeScript type definitions for the authentication and RBAC modules.

## Core Auth Types

### User

Represents an authenticated user in the system.

```tsx
interface User {
  /** Unique user identifier */
  id: string;

  /** User's email address */
  email: string;

  /** First name */
  firstName: string;

  /** Last name */
  lastName: string;

  /** Display name */
  displayName: string;

  /** Avatar URL */
  avatarUrl?: string;

  /** Assigned roles */
  roles: Role[];

  /** Granted permissions */
  permissions: Permission[];

  /** Additional user metadata */
  metadata?: Record<string, unknown>;

  /** Account creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Whether email is verified */
  emailVerified?: boolean;

  /** Whether account is active */
  active?: boolean;

  /** Last login timestamp */
  lastLoginAt?: string;
}
```

### AuthTokens

Authentication token pair.

```tsx
interface AuthTokens {
  /** JWT access token */
  accessToken: string;

  /** JWT refresh token */
  refreshToken: string;

  /** Expiration timestamp (Unix milliseconds) */
  expiresAt: number;

  /** Token type (usually 'Bearer') */
  tokenType?: string;
}
```

### Role

User role identifier (string literal union).

```tsx
type Role = 'admin' | 'manager' | 'user' | 'guest' | string;
```

### Permission

Permission identifier (string literal union).

```tsx
type Permission =
  | '*' // All permissions
  | `${string}:*` // All actions on a resource
  | `${string}:${string}` // Specific permission
  | string;
```

### AuthState

Current authentication state.

```tsx
interface AuthState {
  /** Current user */
  user: User | null;

  /** Whether user is authenticated */
  isAuthenticated: boolean;

  /** Whether authentication is in progress */
  isLoading: boolean;

  /** Whether login is in progress */
  isAuthenticating: boolean;

  /** Current authentication error */
  error: AuthError | null;

  /** Session data */
  session: SessionData | null;
}
```

### AuthError

Authentication error information.

```tsx
interface AuthError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Detailed description */
  description?: string;

  /** Whether error is recoverable */
  recoverable: boolean;

  /** Original error object */
  originalError?: unknown;

  /** Timestamp when error occurred */
  timestamp: number;
}
```

### SessionData

Session storage data.

```tsx
interface SessionData {
  /** User information */
  user: User;

  /** Authentication tokens */
  tokens: AuthTokens;

  /** Session expiration timestamp */
  expiresAt: number;

  /** Session creation timestamp */
  createdAt: number;

  /** Last activity timestamp */
  lastActivityAt: number;
}
```

## Authentication Request/Response Types

### LoginCredentials

User login credentials.

```tsx
interface LoginCredentials {
  /** Email address */
  email: string;

  /** Password */
  password: string;

  /** MFA code (if MFA is enabled) */
  mfaCode?: string;
}
```

### LoginOptions

Optional login configuration.

```tsx
interface LoginOptions {
  /** Remember user session */
  remember?: boolean;

  /** Device identifier */
  deviceId?: string;

  /** Post-login redirect URL */
  redirectTo?: string;
}
```

### LoginResult

Result of a login attempt.

```tsx
interface LoginResult {
  /** Authenticated user */
  user: User;

  /** Authentication tokens */
  tokens: AuthTokens;

  /** Whether MFA is required */
  requiresMfa: boolean;

  /** Temporary MFA token */
  mfaToken?: string;
}
```

### RegisterData

User registration data.

```tsx
interface RegisterData {
  /** Email address */
  email: string;

  /** Password */
  password: string;

  /** First name */
  firstName: string;

  /** Last name */
  lastName: string;

  /** Display name */
  displayName?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
```

### LogoutOptions

Logout configuration options.

```tsx
interface LogoutOptions {
  /** Logout from all devices */
  everywhere?: boolean;

  /** Post-logout redirect URL */
  redirectTo?: string;
}
```

## MFA Types

### MFASetupResult

Result of MFA setup.

```tsx
interface MFASetupResult {
  /** MFA secret key */
  secret: string;

  /** QR code data URL */
  qrCode: string;

  /** Backup recovery codes */
  backupCodes: string[];
}
```

## RBAC Types

### RBACConfig

RBAC system configuration.

```tsx
interface RBACConfig {
  /** Role definitions */
  roles: RoleDefinition[];

  /** Default decision when no rule matches */
  defaultDecision: 'allow' | 'deny';

  /** Enable permission caching */
  enableCaching?: boolean;

  /** Cache TTL in milliseconds */
  cacheTTL?: number;

  /** Feature flag to enable/disable RBAC */
  featureFlag?: string;
}
```

### RoleDefinition

Complete role definition.

```tsx
interface RoleDefinition {
  /** Unique role identifier */
  id: string;

  /** Human-readable role name */
  name: string;

  /** Role description */
  description?: string;

  /** Permissions granted by this role */
  permissions: Permission[];

  /** Parent roles to inherit from */
  inherits?: string[];

  /** Priority for role resolution (higher wins) */
  priority: number;

  /** Whether this role is enabled */
  enabled?: boolean;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
}
```

### PermissionAction

Standard CRUD actions.

```tsx
type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | string;
```

### AccessRequest

Access control evaluation request.

```tsx
interface AccessRequest {
  /** Subject (user) requesting access */
  subject: {
    id: string;
    type: 'user' | 'service';
    roles?: string[];
  };

  /** Resource being accessed */
  resource: {
    type: string;
    id: string;
    attributes?: Record<string, unknown>;
  };

  /** Action being performed */
  action: string;

  /** Additional context */
  context?: Record<string, unknown>;
}
```

### EvaluationResult

Result of access control evaluation.

```tsx
interface EvaluationResult {
  /** Whether access is allowed */
  allowed: boolean;

  /** Decision (allow or deny) */
  decision: 'allow' | 'deny';

  /** Reason for the decision */
  reason: string;

  /** Matching policy */
  matchedPolicy?: string;

  /** Evaluation timestamp */
  evaluatedAt: number;
}
```

### RBACState

RBAC system state.

```tsx
interface RBACState {
  /** Whether RBAC is initialized */
  initialized: boolean;

  /** Whether RBAC is loading */
  loading: boolean;

  /** User's role IDs */
  userRoles: string[];

  /** User's direct permissions */
  userPermissions: Permission[];

  /** Evaluation cache */
  evaluationCache: Map<string, EvaluationResult>;

  /** Last permission refresh timestamp */
  lastRefresh: number | null;

  /** Any initialization error */
  error: string | null;
}
```

## Active Directory Types

### ADProviderType

Supported AD provider types.

```tsx
type ADProviderType =
  | 'azure-ad'
  | 'azure-ad-b2c'
  | 'adfs'
  | 'on-premises'
  | 'custom';
```

### ADConfig

Unified AD configuration.

```tsx
interface ADConfig {
  /** Provider type */
  providerType: ADProviderType;

  /** Azure AD configuration */
  azure?: AzureADConfig;

  /** Azure AD B2C configuration */
  azureB2C?: AzureADB2CConfig;

  /** AD FS configuration */
  adfs?: ADFSConfig;

  /** On-premises AD configuration */
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

  /** Feature flag */
  featureFlag?: string;
}
```

### AzureADConfig

Azure AD specific configuration.

```tsx
interface AzureADConfig {
  /** Azure AD tenant ID */
  tenantId: string;

  /** Application (client) ID */
  clientId: string;

  /** Client secret (server-side only) */
  clientSecret?: string;

  /** Redirect URI */
  redirectUri: string;

  /** Post-logout redirect URI */
  postLogoutRedirectUri?: string;

  /** OAuth2 scopes */
  scopes: string[];

  /** Authority URL */
  authority?: string;

  /** Enable PKCE */
  usePkce?: boolean;

  /** Cache location */
  cacheLocation?: 'localStorage' | 'sessionStorage' | 'memory';

  /** Use popup for authentication */
  usePopup?: boolean;

  /** Navigate to login request URL after login */
  navigateToLoginRequestUrl?: boolean;
}
```

### ADUser

Extended user with AD attributes.

```tsx
interface ADUser extends User {
  /** AD-specific user attributes */
  adAttributes: ADUserAttributes;

  /** AD groups */
  adGroups: ADGroup[];

  /** Source AD provider */
  adProvider: ADProviderType;

  /** Tenant ID */
  tenantId?: string;

  /** Is guest/external user */
  isGuest?: boolean;

  /** Effective permissions from AD groups */
  effectivePermissions: Permission[];

  /** Raw token claims */
  tokenClaims?: Record<string, unknown>;
}
```

### ADUserAttributes

AD user attributes from token claims or Graph API.

```tsx
interface ADUserAttributes {
  /** User principal name */
  upn: string;

  /** Object ID (GUID) */
  objectId: string;

  /** Display name */
  displayName: string;

  /** Email address */
  email?: string;

  /** Given name */
  givenName?: string;

  /** Surname */
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

  /** Manager UPN */
  manager?: string;

  /** Direct reports */
  directReports?: string[];

  /** Employee ID */
  employeeId?: string;

  /** Company name */
  companyName?: string;

  /** User type */
  userType?: string;

  /** Account enabled */
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

  /** Raw claims */
  rawClaims?: Record<string, unknown>;
}
```

### ADGroup

AD group information.

```tsx
interface ADGroup {
  /** Group object ID */
  id: string;

  /** Display name */
  displayName: string;

  /** Description */
  description?: string;

  /** Group type */
  groupType: 'security' | 'microsoft365' | 'distribution' | 'mailEnabled';

  /** Mail address */
  mail?: string;

  /** Membership type */
  membershipType?: 'assigned' | 'dynamic';

  /** Role-assignable */
  isAssignableToRole?: boolean;

  /** Nested group IDs */
  memberOf?: string[];

  /** On-premises SID */
  onPremisesSecurityIdentifier?: string;
}
```

### ADTokens

AD authentication tokens.

```tsx
interface ADTokens {
  /** Access token */
  accessToken: string;

  /** ID token */
  idToken: string;

  /** Refresh token */
  refreshToken?: string;

  /** Expiration timestamp */
  expiresAt: number;

  /** Granted scopes */
  scopes: string[];

  /** Token type */
  tokenType: string;

  /** Account identifier */
  accountId?: string;

  /** Correlation ID */
  correlationId?: string;
}
```

### ADGroupRoleMapping

Mapping between AD groups and application roles.

```tsx
interface ADGroupRoleMapping {
  /** AD group identifier */
  groupIdentifier: string;

  /** Match type */
  matchType: 'exact' | 'pattern' | 'prefix' | 'suffix';

  /** Application role */
  role: Role;

  /** Additional permissions */
  additionalPermissions?: Permission[];

  /** Priority */
  priority?: number;

  /** Enabled */
  enabled?: boolean;

  /** Condition function */
  condition?: (user: ADUser, group: ADGroup) => boolean;
}
```

### ADAuthError

AD authentication error.

```tsx
interface ADAuthError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Description */
  description?: string;

  /** Correlation ID */
  correlationId?: string;

  /** Sub-error code */
  subError?: string;

  /** Timestamp */
  timestamp: number;

  /** Recoverable */
  recoverable: boolean;

  /** Recovery action */
  recoveryAction?: 'retry' | 'reauth' | 'contact-admin' | 'none';

  /** Original error */
  originalError?: unknown;
}
```

## Component Props Types

### RequireAuthProps

Props for RequireAuth guard.

```tsx
interface RequireAuthProps {
  /** Protected content */
  children: ReactNode;

  /** Redirect URL for unauthenticated users */
  redirectTo?: string;

  /** Loading component */
  loadingComponent?: ReactNode;

  /** Fallback instead of redirect */
  fallback?: ReactNode;
}
```

### RequireRoleProps

Props for RequireRole guard.

```tsx
interface RequireRoleProps {
  /** Protected content */
  children: ReactNode;

  /** Required role(s) */
  roles: Role | Role[];

  /** Require all roles */
  requireAll?: boolean;

  /** Redirect URL */
  redirectTo?: string;

  /** Fallback component */
  fallback?: ReactNode;

  /** Loading component */
  loadingComponent?: ReactNode;
}
```

### RequirePermissionProps

Props for RequirePermission guard.

```tsx
interface RequirePermissionProps {
  /** Protected content */
  children: ReactNode;

  /** Required permission(s) */
  permissions: Permission | Permission[];

  /** Require all permissions */
  requireAll?: boolean;

  /** Redirect URL */
  redirectTo?: string;

  /** Fallback component */
  fallback?: ReactNode;

  /** Loading component */
  loadingComponent?: ReactNode;
}
```

## Utility Types

### DeepPartial

Makes all properties optional recursively.

```tsx
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

### RequiredKeys

Makes specified keys required.

```tsx
type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
```

### PickByType

Pick properties by type.

```tsx
type PickByType<T, Value> = {
  [P in keyof T as T[P] extends Value ? P : never]: T[P];
};
```

## Type Guards

### isUser()

Type guard for User.

```tsx
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}
```

### isAuthError()

Type guard for AuthError.

```tsx
function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}
```

### isADUser()

Type guard for ADUser.

```tsx
function isADUser(user: User | ADUser): user is ADUser {
  return 'adAttributes' in user && 'adGroups' in user;
}
```

## Const Enums

### AuthErrorCode

Common authentication error codes.

```tsx
const enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  ACCOUNT_LOCKED = 'account_locked',
  MFA_REQUIRED = 'mfa_required',
  TOKEN_EXPIRED = 'token_expired',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
}
```

### PermissionLevel

Permission levels for hierarchical permissions.

```tsx
const enum PermissionLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3,
}
```

## Usage Examples

### Type-Safe User Object

```tsx
const user: User = {
  id: '1',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  displayName: 'John Doe',
  roles: ['user'],
  permissions: ['read:*'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

### Type-Safe RBAC Config

```tsx
const rbacConfig: RBACConfig = {
  roles: [
    {
      id: 'admin',
      name: 'Administrator',
      permissions: ['*'],
      priority: 100,
    },
  ],
  defaultDecision: 'deny',
};
```

### Type-Safe AD Config

```tsx
const adConfig: ADConfig = {
  providerType: 'azure-ad',
  azure: {
    tenantId: 'your-tenant-id',
    clientId: 'your-client-id',
    redirectUri: window.location.origin,
    scopes: ['openid', 'profile', 'email'],
  },
};
```

## Related Documentation

### Authentication Module
- [Authentication Module](./README.md) - Main authentication documentation
- [Auth Overview](./OVERVIEW.md) - Type usage in architecture
- [Auth Service](./AUTH_SERVICE.md) - Service method signatures
- [Auth Provider](./AUTH_PROVIDER.md) - Provider prop types
- [Auth Hooks](./HOOKS.md) - Hook return types
- [Route Guards](./GUARDS.md) - Guard component prop types
- [RBAC System](./RBAC.md) - RBAC type definitions
- [Active Directory](./ACTIVE_DIRECTORY.md) - AD-specific types
- [Common Patterns](./PATTERNS.md) - Type usage examples

### Related Type Systems
- [Security Module](../security/README.md) - Security-related types
- [API Module](../api/README.md) - API types and auth integration
- [State Management](../state/README.md) - State type definitions
