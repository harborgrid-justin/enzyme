# Active Directory Integration

Enterprise-grade Active Directory authentication with support for Azure AD, Azure AD B2C, AD FS, and on-premises AD.

## Overview

The Active Directory module provides:

- **Multiple AD Providers**: Azure AD, Azure AD B2C, AD FS, on-premises AD
- **Microsoft Graph API Integration**: User profiles, group memberships, attributes
- **Single Sign-On (SSO)**: Cross-tab session synchronization and SSO support
- **Group Mapping**: Map AD groups to application roles and permissions
- **Attribute Mapping**: Transform AD user attributes to application user properties
- **Token Management**: Automatic token acquisition, refresh, and caching with encryption
- **React Integration**: Hooks and components for seamless AD authentication

## Quick Start

### Azure AD Setup

```tsx
import { ADProvider, useActiveDirectory, createADConfig } from '@/lib/auth/active-directory';

// 1. Create AD configuration
const adConfig = createADConfig('azure-ad', {
  tenantId: process.env.AZURE_AD_TENANT_ID,
  clientId: process.env.AZURE_AD_CLIENT_ID,
  redirectUri: window.location.origin,
});

// 2. Wrap your app
function App() {
  return (
    <ADProvider config={adConfig} enableSSO>
      <YourApplication />
    </ADProvider>
  );
}

// 3. Use in components
function LoginPage() {
  const { login, isAuthenticated, user } = useActiveDirectory();

  if (!isAuthenticated) {
    return <button onClick={() => login()}>Sign in with Azure AD</button>;
  }

  return <h1>Welcome, {user?.displayName}</h1>;
}
```

## AD Provider Types

### Azure AD

```tsx
const azureADConfig = createADConfig('azure-ad', {
  tenantId: 'your-tenant-id',
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com',
  scopes: ['openid', 'profile', 'email', 'User.Read'],
});
```

### Azure AD B2C

```tsx
const azureB2CConfig = createADConfig('azure-ad-b2c', {
  tenantId: 'your-tenant-id',
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com',
  b2cTenantName: 'yourtenant',
  policies: {
    signUpSignIn: 'B2C_1_SignUpSignIn',
    resetPassword: 'B2C_1_PasswordReset',
    editProfile: 'B2C_1_ProfileEdit',
  },
  knownAuthorities: ['yourtenant.b2clogin.com'],
});
```

### AD FS

```tsx
const adfsConfig = createADConfig('adfs', {
  serverUrl: 'https://adfs.yourcompany.com',
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com',
  scopes: ['openid', 'profile', 'email'],
});
```

### On-Premises AD

```tsx
const onPremConfig = createADConfig('on-premises', {
  ldapUrl: 'ldaps://ldap.yourcompany.com',
  baseDn: 'dc=yourcompany,dc=com',
  bindDn: 'cn=service-account,dc=yourcompany,dc=com',
  bindPassword: process.env.LDAP_PASSWORD,
});
```

## ADProvider Component

### Import

```tsx
import { ADProvider } from '@/lib/auth/active-directory';
```

### Props

```tsx
interface ADProviderProps {
  config: ADConfig;
  children: ReactNode;
  groupMappings?: GroupMappingPreset | ADGroupRoleMapping[];
  attributeMapperConfig?: AttributeMapperOptions;
  enableSSO?: boolean;
  ssoConfig?: SSOConfig;
  onAuthStateChange?: (state: ADAuthState) => void;
  onAuthEvent?: (event: ADAuthEvent) => void;
  loadingComponent?: ReactNode;
  errorComponent?: (error: string) => ReactNode;
}
```

### Complete Example

```tsx
import { ADProvider, GROUP_MAPPING_PRESETS } from '@/lib/auth/active-directory';

function App() {
  return (
    <ADProvider
      config={adConfig}
      groupMappings={GROUP_MAPPING_PRESETS.azureSecurityGroups}
      enableSSO
      ssoConfig={{
        sessionTimeout: 28800000, // 8 hours
        crossTabSync: true,
      }}
      onAuthStateChange={(state) => {
        if (state.isAuthenticated) {
          console.log('User logged in:', state.user?.email);
        }
      }}
      loadingComponent={<SplashScreen />}
    >
      <YourApplication />
    </ADProvider>
  );
}
```

## useActiveDirectory Hook

Main hook for AD authentication.

### Import

```tsx
import { useActiveDirectory } from '@/lib/auth/active-directory';
```

### Return Value

```tsx
interface UseActiveDirectoryReturn {
  // State
  user: ADUser | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isRefreshing: boolean;
  error: ADAuthError | null;
  provider: ADProviderType | null;
  tokens: ADTokens | null;
  hasSsoSession: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (options?: TokenAcquisitionRequest) => Promise<void>;
  loginSilent: (options?: TokenAcquisitionRequest) => Promise<void>;
  logout: () => Promise<void>;
  acquireToken: (request: TokenAcquisitionRequest) => Promise<ADTokens>;
  refreshTokens: () => Promise<void>;
  clearError: () => void;
  forceReauth: () => Promise<void>;

  // Group & Permission Helpers
  groups: ADGroup[];
  isInGroup: (groupId: string) => boolean;
  isInAnyGroup: (groupIds: string[]) => boolean;
  isInAllGroups: (groupIds: string[]) => boolean;
  roles: Role[];
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasAllRoles: (roles: Role[]) => boolean;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;

  // User Attribute Helpers
  getAttribute: <K extends keyof ADUserAttributes>(key: K) => ADUserAttributes[K] | undefined;
  hasAttribute: (key: keyof ADUserAttributes, value: unknown) => boolean;
  upn: string | null;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  isGuest: boolean;
}
```

### Examples

#### Basic Login

```tsx
function LoginButton() {
  const { login, isAuthenticating, error } = useActiveDirectory();

  return (
    <div>
      <button onClick={() => login()} disabled={isAuthenticating}>
        {isAuthenticating ? 'Signing in...' : 'Sign in with Azure AD'}
      </button>
      {error && <p>{error.message}</p>}
    </div>
  );
}
```

#### Group-Based Access

```tsx
function AdminPanel() {
  const { isInGroup, isInAnyGroup } = useActiveDirectory();

  if (!isInAnyGroup(['sg-app-admins', 'sg-app-superusers'])) {
    return <AccessDenied />;
  }

  return (
    <div>
      {isInGroup('sg-app-admins') && <SuperAdminFeatures />}
      <AdminContent />
    </div>
  );
}
```

#### Attribute Access

```tsx
function UserProfile() {
  const { user, getAttribute, department, jobTitle } = useActiveDirectory();

  return (
    <div>
      <h1>{user?.displayName}</h1>
      <p>Email: {user?.email}</p>
      <p>Department: {department}</p>
      <p>Job Title: {jobTitle}</p>
      <p>Employee ID: {getAttribute('employeeId')}</p>
    </div>
  );
}
```

## Specialized Hooks

### useADGroups()

Hook for AD group membership checking.

```tsx
import { useADGroups } from '@/lib/auth/active-directory';

function Component() {
  const { groups, isInGroup, isInAnyGroup } = useADGroups();

  return (
    <div>
      {isInAnyGroup(['sg-app-admins', 'sg-app-managers']) && <AdminFeatures />}
    </div>
  );
}
```

### useADRoles()

Hook for AD-mapped roles.

```tsx
import { useADRoles } from '@/lib/auth/active-directory';

function Component() {
  const { roles, hasRole, hasAnyRole } = useADRoles();

  return (
    <div>
      {hasAnyRole(['admin', 'manager']) && <ManagementPanel />}
    </div>
  );
}
```

### useADPermissions()

Hook for AD-mapped permissions.

```tsx
import { useADPermissions } from '@/lib/auth/active-directory';

function Component() {
  const { permissions, hasPermission } = useADPermissions();

  return (
    <div>
      {hasPermission('reports:view') && <ReportsSection />}
    </div>
  );
}
```

### useADAttributes()

Hook for accessing AD user attributes.

```tsx
import { useADAttributes } from '@/lib/auth/active-directory';

function Component() {
  const { getAttribute, upn, department, jobTitle, isGuest } = useADAttributes();

  return (
    <div>
      <p>UPN: {upn}</p>
      <p>Department: {department}</p>
      <p>Job Title: {jobTitle}</p>
      {isGuest && <GuestBadge />}
    </div>
  );
}
```

### useADAuth()

Hook for authentication actions only.

```tsx
import { useADAuth } from '@/lib/auth/active-directory';

function Component() {
  const { login, logout, isAuthenticating } = useADAuth();

  return (
    <button onClick={login} disabled={isAuthenticating}>
      Sign in
    </button>
  );
}
```

### useADTokens()

Hook for accessing raw AD tokens (use with caution).

```tsx
import { useADTokens } from '@/lib/auth/active-directory';

function Component() {
  const { accessToken, getIsExpired, refreshTokens } = useADTokens();

  const makeApiCall = async () => {
    if (getIsExpired()) {
      await refreshTokens();
    }

    // Use token
  };

  return <button onClick={makeApiCall}>Call API</button>;
}
```

## Group Mapping

Map AD groups to application roles and permissions.

### Preset Mappings

```tsx
import { ADProvider, GROUP_MAPPING_PRESETS } from '@/lib/auth/active-directory';

<ADProvider
  config={adConfig}
  groupMappings={GROUP_MAPPING_PRESETS.azureSecurityGroups}
>
  <App />
</ADProvider>
```

Available presets:
- `azureSecurityGroups` - Maps Azure AD security groups
- `microsoft365Groups` - Maps Microsoft 365 groups
- `customGroups` - Template for custom mappings

### Custom Mappings

```tsx
const customMappings: ADGroupRoleMapping[] = [
  {
    groupIdentifier: 'sg-app-admins',
    matchType: 'exact',
    role: 'admin',
    additionalPermissions: ['*'],
    priority: 100,
  },
  {
    groupIdentifier: 'sg-app-managers',
    matchType: 'exact',
    role: 'manager',
    additionalPermissions: ['manage:*'],
    priority: 50,
  },
  {
    groupIdentifier: 'sg-app-',
    matchType: 'prefix',
    role: 'user',
    additionalPermissions: ['read:*'],
    priority: 10,
  },
];

<ADProvider config={adConfig} groupMappings={customMappings}>
  <App />
</ADProvider>
```

### Dynamic Group Mapping

```tsx
const dynamicMapping: ADGroupRoleMapping = {
  groupIdentifier: 'sg-department-*',
  matchType: 'pattern',
  role: 'user',
  condition: (user, group) => {
    // Only map if user is in same department as group
    return user.adAttributes.department === group.displayName.split('-')[1];
  },
  priority: 20,
};
```

## Attribute Mapping

Transform AD user attributes to application user properties.

### Default Mappings

```tsx
import { ADProvider, createAttributeMapper } from '@/lib/auth/active-directory';

const mapper = createAttributeMapper({
  includeExtended: true, // Include department, jobTitle, etc.
});

<ADProvider config={adConfig} attributeMapperConfig={{ includeExtended: true }}>
  <App />
</ADProvider>
```

### Custom Attribute Mappings

```tsx
import { createExtensionMapping } from '@/lib/auth/active-directory';

const customMappings = [
  createExtensionMapping('employeeId', 'badgeNumber', {
    required: true,
  }),
  createExtensionMapping('extension_npi', 'npi', {
    validate: (value) => ({
      valid: /^\d{10}$/.test(value),
      error: 'NPI must be 10 digits',
    }),
  }),
];

<ADProvider
  config={adConfig}
  attributeMapperConfig={{
    includeExtended: true,
    customMappings,
  }}
>
  <App />
</ADProvider>
```

### Healthcare-Specific Mappings

```tsx
import { HEALTHCARE_ATTRIBUTE_MAPPINGS } from '@/lib/auth/active-directory';

const mapper = createAttributeMapper({
  includeHealthcare: true,
});

// Maps NPI, DEA number, provider ID, etc.
```

## Single Sign-On (SSO)

### Enable SSO

```tsx
<ADProvider
  config={adConfig}
  enableSSO
  ssoConfig={{
    crossTabSync: true,
    sessionTimeout: 28800000, // 8 hours
    autoExtendSession: true,
    trackActivity: true,
  }}
>
  <App />
</ADProvider>
```

### Cross-Domain SSO

```tsx
import { createCrossDomainSSO } from '@/lib/auth/active-directory';

const crossDomainSSO = createCrossDomainSSO([
  'https://app1.yourcompany.com',
  'https://app2.yourcompany.com',
]);

// Share session with another domain
crossDomainSSO.shareSession(
  'https://app2.yourcompany.com',
  window.open('https://app2.yourcompany.com'),
  session,
  tokens
);

// Listen for shared sessions
crossDomainSSO.listen((session, tokens) => {
  // Use shared session
});
```

## Token Management

Tokens are automatically managed by the AD provider:

- **Automatic Refresh**: Tokens are refreshed before expiration
- **Secure Storage**: Tokens are encrypted using AES-GCM before storage
- **Silent Renewal**: Background token refresh without user interaction
- **Session Persistence**: Sessions restored on page reload

### Manual Token Operations

```tsx
const { acquireToken, refreshTokens } = useActiveDirectory();

// Acquire token for specific scopes
const tokens = await acquireToken({
  scopes: ['User.Read', 'GroupMember.Read.All'],
});

// Manually refresh tokens
await refreshTokens();
```

### Token Security

Tokens are encrypted before being stored:

```tsx
// Tokens are automatically encrypted
const adConfig = {
  // ...
  azure: {
    cacheLocation: 'sessionStorage', // Tokens are encrypted in storage
  },
};
```

## Microsoft Graph API

### Using the AD Client

```tsx
import { createADClient } from '@/lib/auth/active-directory';

const client = createADClient(adConfig);

// Initialize with tokens
client.initialize(tokens);

// Get current user
const user = await client.getCurrentUser();

// Get user groups
const groups = await client.getUserGroups(true); // true for transitive

// Check group membership
const isMember = await client.checkGroupMembership(groupId);

// Get user photo
const photoUrl = await client.getUserPhoto();
```

### Custom Graph API Requests

```tsx
const response = await client.graphRequest({
  endpoint: '/me/memberOf',
  method: 'GET',
  query: {
    $top: 100,
    $select: 'id,displayName',
  },
});

console.log(response.data);
```

## Configuration Options

### Complete Configuration

```tsx
const adConfig: ADConfig = {
  providerType: 'azure-ad',
  azure: {
    tenantId: 'your-tenant-id',
    clientId: 'your-client-id',
    redirectUri: window.location.origin,
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    authority: 'https://login.microsoftonline.com/your-tenant-id',
    usePkce: true,
    cacheLocation: 'sessionStorage',
    usePopup: false,
    navigateToLoginRequestUrl: true,
  },
  debug: false,
  multiTenant: false,
  sessionTimeout: 28800000, // 8 hours
  silentRefresh: true,
  featureFlag: 'ad-authentication',
};
```

### Environment Variables

```env
# Azure AD
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret

# Azure AD B2C
AZURE_B2C_TENANT_NAME=yourtenant
AZURE_B2C_POLICY_SIGNIN=B2C_1_SignUpSignIn

# AD FS
ADFS_SERVER_URL=https://adfs.yourcompany.com
ADFS_CLIENT_ID=your-client-id

# On-Premises AD
LDAP_URL=ldaps://ldap.yourcompany.com
LDAP_BASE_DN=dc=yourcompany,dc=com
LDAP_BIND_DN=cn=service-account,dc=yourcompany,dc=com
LDAP_BIND_PASSWORD=your-password
```

## Error Handling

```tsx
const { error, clearError } = useActiveDirectory();

useEffect(() => {
  if (error) {
    switch (error.code) {
      case 'interaction_required':
        // Trigger interactive login
        login();
        break;
      case 'consent_required':
        // Request consent
        login({ prompt: 'consent' });
        break;
      case 'invalid_grant':
        // Token expired, re-authenticate
        forceReauth();
        break;
      default:
        console.error('AD Error:', error);
    }
  }
}, [error]);
```

## Testing

### Mocking AD Provider

```tsx
import { renderWithAD } from '@/lib/auth/active-directory/test-utils';

describe('Component', () => {
  it('renders for authenticated AD users', () => {
    const { getByText } = renderWithAD(<Component />, {
      user: {
        id: '1',
        email: 'test@company.com',
        displayName: 'Test User',
        adAttributes: {
          upn: 'test@company.com',
          objectId: '1',
          department: 'Engineering',
        },
        adGroups: [
          { id: '1', displayName: 'sg-app-users' },
        ],
      },
      isAuthenticated: true,
    });

    expect(getByText('Test User')).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Use appropriate scopes**: Request only the scopes you need.

   ```tsx
   const adConfig = {
     azure: {
       scopes: ['openid', 'profile', 'email', 'User.Read'],
     },
   };
   ```

2. **Enable SSO**: Provide seamless authentication experience.

   ```tsx
   <ADProvider config={adConfig} enableSSO>
     <App />
   </ADProvider>
   ```

3. **Map groups to roles**: Use group mappings for role-based access.

   ```tsx
   <ADProvider config={adConfig} groupMappings={customMappings}>
     <App />
   </ADProvider>
   ```

4. **Handle errors**: Implement proper error handling.

   ```tsx
   if (error?.code === 'interaction_required') {
     await login();
   }
   ```

5. **Secure token storage**: Tokens are automatically encrypted.

   ```tsx
   // Tokens are encrypted by default in storage
   const adConfig = {
     azure: {
       cacheLocation: 'sessionStorage',
     },
   };
   ```

## See Also

- [AUTH_PROVIDER.md](./AUTH_PROVIDER.md) - Auth Provider
- [HOOKS.md](./HOOKS.md) - Auth hooks
- [RBAC.md](./RBAC.md) - RBAC system
- [TYPES.md](./TYPES.md) - Type definitions
