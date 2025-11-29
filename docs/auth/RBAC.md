# Role-Based Access Control (RBAC)

Comprehensive RBAC system with role hierarchies, permission matrices, policy evaluation, and resource-level permissions.

## Overview

The RBAC module provides:

- **Role Definitions**: Define roles with associated permissions
- **Role Hierarchy**: Parent-child role relationships with permission inheritance
- **Permission Matrix**: Efficient permission lookup and management
- **Policy Evaluation**: Complex access control policies with conditions
- **Resource Permissions**: Fine-grained resource-level access control
- **React Integration**: Hooks and components for permission checking

## Quick Start

```tsx
import { RBACProvider, useRBAC } from '@/lib/auth/rbac';

// 1. Define RBAC configuration
const rbacConfig = {
  roles: [
    {
      id: 'admin',
      name: 'Administrator',
      permissions: ['*'], // All permissions
      priority: 100
    },
    {
      id: 'user',
      name: 'User',
      permissions: ['read:*'],
      priority: 10
    }
  ],
  defaultDecision: 'deny'
};

// 2. Wrap your app
function App() {
  const { user } = useAuth();

  return (
    <RBACProvider
      config={rbacConfig}
      user={user}
      userRoles={user?.roles}
    >
      <YourApp />
    </RBACProvider>
  );
}

// 3. Use in components
function FeatureComponent() {
  const { canCreate, canDelete, hasPermission } = useRBAC();

  return (
    <div>
      {canCreate('documents') && <CreateButton />}
      {canDelete('documents') && <DeleteButton />}
      {hasPermission('reports:export') && <ExportButton />}
    </div>
  );
}
```

## RBAC Provider

### Import

```tsx
import { RBACProvider } from '@/lib/auth/rbac';
```

### Props

```tsx
interface RBACProviderProps {
  config: RBACConfig;
  children: ReactNode;
  user?: User | null;
  userRoles?: string[];
  userPermissions?: Permission[];
  fetchPermissions?: () => Promise<{
    roles: string[];
    permissions: Permission[];
  }>;
  loadingComponent?: ReactNode;
  onPermissionCheck?: (permission: Permission, granted: boolean) => void;
  onAccessCheck?: (resource: string, action: PermissionAction, granted: boolean) => void;
}
```

### Configuration

```tsx
const rbacConfig: RBACConfig = {
  // Role definitions
  roles: [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access',
      permissions: ['*'],
      priority: 100,
      inherits: [], // Parent roles
    },
    {
      id: 'manager',
      name: 'Manager',
      permissions: [
        'read:*',
        'create:documents',
        'update:documents',
        'delete:own_documents',
      ],
      priority: 50,
      inherits: ['user'],
    },
    {
      id: 'user',
      name: 'User',
      permissions: ['read:*'],
      priority: 10,
    }
  ],

  // Default decision when no rule matches
  defaultDecision: 'deny', // or 'allow'

  // Enable caching for performance
  enableCaching: true,
  cacheTTL: 300000, // 5 minutes

  // Feature flag
  featureFlag: 'rbac',
};
```

## useRBAC Hook

Main hook for RBAC functionality.

### Import

```tsx
import { useRBAC } from '@/lib/auth/rbac';
```

### Return Value

```tsx
interface UseRBACReturn {
  // State
  initialized: boolean;
  loading: boolean;
  userRoles: string[];
  userPermissions: Permission[];
  error: string | null;

  // Permission Checking
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;

  // Role Checking
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;

  // Resource Access
  canAccess: (resource: string, action: PermissionAction, resourceId?: string) => boolean;
  checkResourcePermission: (resourceType: string, resourceId: string, action: PermissionAction) => boolean;
  evaluate: (request: AccessRequest) => EvaluationResult;

  // Utilities
  getEffectivePermissions: () => Permission[];
  getRoleDefinitions: () => RoleDefinition[];
  refreshPermissions: () => Promise<void>;
  clearCache: () => void;

  // Shorthand Helpers
  canCreate: (resource: string) => boolean;
  canRead: (resource: string) => boolean;
  canUpdate: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  canManage: (resource: string) => boolean;
  isAdmin: boolean;
  isManager: boolean;
}
```

### Examples

#### Basic Permission Checking

```tsx
function DocumentActions() {
  const { hasPermission, canCreate, canDelete } = useRBAC();

  return (
    <div>
      {canCreate('documents') && <button>Create</button>}
      {hasPermission('documents:export') && <button>Export</button>}
      {canDelete('documents') && <button>Delete</button>}
    </div>
  );
}
```

#### Role-Based Access

```tsx
function AdminPanel() {
  const { isAdmin, hasRole, hasAnyRole } = useRBAC();

  if (!hasAnyRole(['admin', 'manager'])) {
    return <AccessDenied />;
  }

  return (
    <div>
      {isAdmin && <SuperAdminFeatures />}
      {hasRole('manager') && <ManagerFeatures />}
    </div>
  );
}
```

#### Resource-Level Permissions

```tsx
function DocumentEditor({ documentId }) {
  const { checkResourcePermission } = useRBAC();

  const canEdit = checkResourcePermission('documents', documentId, 'update');
  const canDelete = checkResourcePermission('documents', documentId, 'delete');

  return (
    <div>
      <DocumentContent />
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
    </div>
  );
}
```

## Specialized Hooks

### usePermissions()

Hook for permission checking only.

```tsx
import { usePermissions } from '@/lib/auth/rbac';

function Component() {
  const { hasPermission, effectivePermissions } = usePermissions();

  return (
    <div>
      {hasPermission('reports:view') && <Reports />}
    </div>
  );
}
```

### useRoles()

Hook for role checking only.

```tsx
import { useRoles } from '@/lib/auth/rbac';

function Component() {
  const { hasRole, isAdmin, isManager, roleDefinitions } = useRoles();

  return (
    <div>
      {isAdmin && <AdminDashboard />}
      {isManager && <ManagerDashboard />}
    </div>
  );
}
```

### useResourceAccess()

Hook for resource-level access control.

```tsx
import { useResourceAccess } from '@/lib/auth/rbac';

function DocumentViewer({ documentId }) {
  const {
    canRead,
    canUpdate,
    canDelete,
    checkResource,
  } = useResourceAccess('documents');

  const canViewThis = checkResource(documentId, 'read');
  const canEditThis = checkResource(documentId, 'update');

  if (!canViewThis) {
    return <AccessDenied />;
  }

  return (
    <div>
      <DocumentContent />
      {canEditThis && <EditButton />}
    </div>
  );
}
```

### usePermissionGate()

Hook for conditional rendering based on permissions.

```tsx
import { usePermissionGate } from '@/lib/auth/rbac';

function AdminPanel() {
  const { allowed, loading } = usePermissionGate('admin:access');

  if (loading) return <Spinner />;
  if (!allowed) return <AccessDenied />;

  return <AdminContent />;
}
```

### useRoleGate()

Hook for conditional rendering based on roles.

```tsx
import { useRoleGate } from '@/lib/auth/rbac';

function ManagerFeature() {
  const { allowed, loading } = useRoleGate(['manager', 'admin']);

  if (loading) return <Spinner />;
  if (!allowed) return null;

  return <ManagerContent />;
}
```

### useAccessChecks()

Hook for checking multiple permissions/roles at once.

```tsx
import { useAccessChecks } from '@/lib/auth/rbac';

function FeatureComponent() {
  const checks = useAccessChecks({
    canViewReports: { permission: 'reports:view' },
    canExport: { permission: 'reports:export' },
    isAdmin: { role: 'admin' },
    canManageUsers: { resource: 'users', action: 'manage' },
  });

  return (
    <div>
      {checks.canViewReports && <ReportViewer />}
      {checks.canExport && <ExportButton />}
      {checks.isAdmin && <AdminSection />}
      {checks.canManageUsers && <UserManager />}
    </div>
  );
}
```

## Permission Formats

### Wildcard Permissions

```tsx
// All permissions
'*'

// All actions on a resource
'documents:*'

// All resources for an action
'*:read'

// Specific permission
'documents:create'
```

### Hierarchical Permissions

```tsx
// Parent permission includes child permissions
'admin' // Includes 'admin:users', 'admin:settings', etc.
'admin:users' // Includes 'admin:users:create', 'admin:users:delete', etc.
```

### Negation

```tsx
// Deny specific permission
'!documents:delete'

// Deny with wildcard
'!admin:*'
```

## Role Hierarchy

Roles can inherit permissions from parent roles.

```tsx
const rbacConfig = {
  roles: [
    {
      id: 'super_admin',
      permissions: ['*'],
      priority: 100,
    },
    {
      id: 'admin',
      permissions: ['manage:*'],
      inherits: ['manager'],
      priority: 90,
    },
    {
      id: 'manager',
      permissions: ['create:*', 'update:*', 'read:*'],
      inherits: ['user'],
      priority: 50,
    },
    {
      id: 'user',
      permissions: ['read:*'],
      priority: 10,
    },
  ],
};
```

Effective permissions are resolved with inheritance:
- `super_admin`: `['*']`
- `admin`: `['*']` (inherits from manager, but * overrides)
- `manager`: `['create:*', 'update:*', 'read:*']` (includes user permissions)
- `user`: `['read:*']`

## Resource-Level Permissions

Control access to specific resource instances.

### Setup

```tsx
import { createResourcePermissions } from '@/lib/auth/rbac';

const resourcePermissions = createResourcePermissions({
  // Owner always has full access
  ownerPermissions: ['read', 'update', 'delete'],

  // Team members have limited access
  teamPermissions: ['read', 'update'],

  // Public resources
  publicPermissions: ['read'],
});
```

### Usage

```tsx
function DocumentActions({ document }) {
  const { checkResourcePermission } = useRBAC();
  const { user } = useAuth();

  // Check if user can update this specific document
  const canEdit = checkResourcePermission(
    'documents',
    document.id,
    'update'
  );

  // With resource context
  const canDelete = checkResourcePermission(
    'documents',
    document.id,
    'delete'
  );

  return (
    <div>
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
    </div>
  );
}
```

## Policy Evaluation

Complex access control with conditional policies.

### Policy Structure

```tsx
interface Policy {
  id: string;
  effect: 'allow' | 'deny';
  actions: string[];
  resources: string[];
  conditions?: PolicyCondition[];
}

interface PolicyCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
  value: unknown;
}
```

### Example Policies

```tsx
const policies = [
  {
    id: 'allow-own-documents',
    effect: 'allow',
    actions: ['update', 'delete'],
    resources: ['documents:*'],
    conditions: [
      {
        field: 'resource.ownerId',
        operator: 'equals',
        value: '{{user.id}}',
      },
    ],
  },
  {
    id: 'allow-business-hours',
    effect: 'allow',
    actions: ['*'],
    resources: ['*'],
    conditions: [
      {
        field: 'time.hour',
        operator: 'greaterThan',
        value: 9,
      },
      {
        field: 'time.hour',
        operator: 'lessThan',
        value: 17,
      },
    ],
  },
];
```

### Evaluating Policies

```tsx
const { evaluate } = useRBAC();

const result = evaluate({
  subject: {
    id: user.id,
    type: 'user',
    roles: user.roles,
  },
  resource: {
    type: 'documents',
    id: documentId,
    attributes: {
      ownerId: document.ownerId,
      department: document.department,
    },
  },
  action: 'update',
  context: {
    time: {
      hour: new Date().getHours(),
    },
  },
});

if (result.allowed) {
  // Perform action
} else {
  console.log('Access denied:', result.reason);
}
```

## Permission Matrix

Efficient permission lookup and management.

```tsx
import { createPermissionMatrix } from '@/lib/auth/rbac';

const matrix = createPermissionMatrix({
  admin: {
    documents: ['create', 'read', 'update', 'delete', 'manage'],
    users: ['create', 'read', 'update', 'delete', 'manage'],
    reports: ['create', 'read', 'update', 'delete', 'export'],
  },
  manager: {
    documents: ['create', 'read', 'update'],
    reports: ['read', 'export'],
  },
  user: {
    documents: ['read'],
    reports: ['read'],
  },
});

// Check permission
const canEdit = matrix.hasPermission('manager', 'documents', 'update');
```

## Testing

### Mocking RBAC Context

```tsx
import { renderWithRBAC } from '@/lib/auth/rbac/test-utils';

describe('ProtectedComponent', () => {
  it('renders for users with permission', () => {
    const { getByText } = renderWithRBAC(<ProtectedComponent />, {
      user: { id: '1', email: 'test@example.com' },
      userRoles: ['admin'],
      config: {
        roles: [
          { id: 'admin', name: 'Admin', permissions: ['*'], priority: 100 },
        ],
        defaultDecision: 'deny',
      },
    });

    expect(getByText('Admin Content')).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Use specific permissions**: Prefer specific permissions over wildcards.

   ```tsx
   // Good
   hasPermission('documents:delete')

   // Less specific
   hasPermission('documents:*')
   ```

2. **Check permissions server-side**: Always validate permissions on the server.

   ```tsx
   // Client-side: UI control
   {canDelete('documents') && <DeleteButton />}

   // Server-side: Enforce permission
   app.delete('/api/documents/:id', requirePermission('documents:delete'), handler);
   ```

3. **Use role hierarchy**: Leverage role inheritance to reduce duplication.

   ```tsx
   // Good
   { id: 'admin', inherits: ['manager'], permissions: ['admin:*'] }

   // Avoid duplicating permissions
   { id: 'admin', permissions: ['admin:*', 'manage:*', 'create:*', 'read:*'] }
   ```

4. **Cache permission checks**: Enable caching for better performance.

   ```tsx
   const rbacConfig = {
     enableCaching: true,
     cacheTTL: 300000, // 5 minutes
   };
   ```

## See Also

- [AUTH_PROVIDER.md](./AUTH_PROVIDER.md) - Auth Provider
- [HOOKS.md](./HOOKS.md) - Auth hooks
- [GUARDS.md](./GUARDS.md) - Route guards
- [TYPES.md](./TYPES.md) - Type definitions
