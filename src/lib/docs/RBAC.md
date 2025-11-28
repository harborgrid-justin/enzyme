# RBAC Guide

> Complete guide to Role-Based Access Control in the Harbor React Library.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Roles System](#roles-system)
- [Permissions System](#permissions-system)
- [Route Guards](#route-guards)
- [Component Guards](#component-guards)
- [Hook-Based Access Control](#hook-based-access-control)
- [Permission Hierarchies](#permission-hierarchies)
- [Dynamic Permissions](#dynamic-permissions)
- [Best Practices](#best-practices)

---

## Overview

The RBAC system provides:

- **Role-based access** with hierarchical roles
- **Permission-based access** with granular controls
- **Route-level guards** for page protection
- **Component-level guards** for UI element control
- **Hook-based checks** for programmatic access control
- **Dynamic permission evaluation** based on context

---

## Quick Start

```tsx
import {
  RequireAuth,
  RequireRole,
  RequirePermission,
  useAuth,
  useHasRole,
  useHasPermission,
} from '@/lib/auth';

// 1. Protect entire routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated routes */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Admin-only routes */}
        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
      </Route>
    </Routes>
  );
}

// 2. Protect components
function UserActions({ userId }) {
  return (
    <div>
      <RequirePermission permissions={['users:read']}>
        <ViewUserButton userId={userId} />
      </RequirePermission>

      <RequirePermission permissions={['users:update']}>
        <EditUserButton userId={userId} />
      </RequirePermission>

      <RequirePermission permissions={['users:delete']}>
        <DeleteUserButton userId={userId} />
      </RequirePermission>
    </div>
  );
}

// 3. Check in hooks
function ConditionalFeature() {
  const isAdmin = useHasRole('admin');
  const canEdit = useHasPermission('content:edit');

  return (
    <div>
      {isAdmin && <AdminBadge />}
      {canEdit && <EditButton />}
    </div>
  );
}
```

---

## Roles System

### Built-in Roles

```typescript
type Role = 'admin' | 'manager' | 'user' | 'guest';

// Role hierarchy (from highest to lowest)
const ROLE_HIERARCHY = {
  admin: 4,
  manager: 3,
  user: 2,
  guest: 1,
};
```

### Role Definitions

```typescript
interface RoleDefinition {
  name: string;
  level: number;
  permissions: Permission[];
  inherits?: Role[];
  description?: string;
}

const roles: Record<Role, RoleDefinition> = {
  admin: {
    name: 'Administrator',
    level: 4,
    permissions: ['*'], // Wildcard - all permissions
    description: 'Full system access',
  },
  manager: {
    name: 'Manager',
    level: 3,
    inherits: ['user'],
    permissions: [
      'users:read',
      'users:create',
      'users:update',
      'reports:read',
      'reports:create',
      'team:manage',
    ],
    description: 'Team and resource management',
  },
  user: {
    name: 'User',
    level: 2,
    inherits: ['guest'],
    permissions: [
      'profile:read',
      'profile:update',
      'content:read',
      'content:create',
    ],
    description: 'Standard user access',
  },
  guest: {
    name: 'Guest',
    level: 1,
    permissions: [
      'content:read',
    ],
    description: 'Read-only access',
  },
};
```

### Custom Roles

```tsx
import { AuthProvider, extendRoles } from '@/lib/auth';

// Define custom roles
const customRoles = extendRoles({
  super_admin: {
    name: 'Super Administrator',
    level: 5,
    permissions: ['*', 'system:*'],
  },
  moderator: {
    name: 'Moderator',
    level: 2.5, // Between user and manager
    inherits: ['user'],
    permissions: [
      'content:moderate',
      'users:warn',
      'users:ban',
    ],
  },
  analyst: {
    name: 'Analyst',
    level: 2.5,
    permissions: [
      'reports:read',
      'analytics:read',
      'data:export',
    ],
  },
});

<AuthProvider roles={customRoles}>
  <App />
</AuthProvider>
```

---

## Permissions System

### Permission Naming Convention

```
resource:action
resource:action:scope
```

Examples:
- `users:read` - Read any user
- `users:update:own` - Update own user only
- `posts:delete:any` - Delete any post
- `reports:export:csv` - Export reports as CSV

### Standard Permission Actions

| Action | Description |
|--------|-------------|
| `read` | View resources |
| `create` | Create new resources |
| `update` | Modify existing resources |
| `delete` | Remove resources |
| `manage` | Full CRUD + special operations |
| `*` | Wildcard - all actions |

### Permission Definitions

```typescript
interface PermissionDefinition {
  name: Permission;
  description: string;
  resource: string;
  action: string;
  scope?: 'own' | 'team' | 'any';
  dependencies?: Permission[];
}

const permissions: PermissionDefinition[] = [
  // Users
  { name: 'users:read', resource: 'users', action: 'read' },
  { name: 'users:create', resource: 'users', action: 'create' },
  { name: 'users:update', resource: 'users', action: 'update' },
  { name: 'users:delete', resource: 'users', action: 'delete' },
  { name: 'users:manage', resource: 'users', action: 'manage' },

  // Posts
  { name: 'posts:read', resource: 'posts', action: 'read' },
  { name: 'posts:create', resource: 'posts', action: 'create' },
  {
    name: 'posts:update:own',
    resource: 'posts',
    action: 'update',
    scope: 'own'
  },
  {
    name: 'posts:delete:own',
    resource: 'posts',
    action: 'delete',
    scope: 'own'
  },

  // Reports
  { name: 'reports:read', resource: 'reports', action: 'read' },
  { name: 'reports:create', resource: 'reports', action: 'create' },
  {
    name: 'reports:export',
    resource: 'reports',
    action: 'export',
    dependencies: ['reports:read']
  },
];
```

---

## Route Guards

### RequireAuth Component

```tsx
import { RequireAuth } from '@/lib/auth';

// Basic usage - redirect to login
<Route element={<RequireAuth />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>

// Custom redirect
<Route element={<RequireAuth redirectTo="/signin" />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>

// Custom loading state
<Route element={
  <RequireAuth
    loadingComponent={<FullPageSpinner />}
  />
}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>

// Inline wrapper
<RequireAuth fallback={<LoginPrompt />}>
  <ProtectedContent />
</RequireAuth>
```

### RequireRole Component

```tsx
import { RequireRole } from '@/lib/auth';

// Single role
<RequireRole roles={['admin']}>
  <AdminPanel />
</RequireRole>

// Any of multiple roles
<RequireRole roles={['admin', 'manager']}>
  <ManagementDashboard />
</RequireRole>

// Minimum role level
<RequireRole minRole="manager">
  <ManagerContent />
</RequireRole>

// With fallback
<RequireRole
  roles={['admin']}
  fallback={<AccessDenied message="Admin access required" />}
>
  <AdminPanel />
</RequireRole>

// Route-level
<Route element={<RequireRole roles={['admin']} />}>
  <Route path="/admin/*" element={<AdminLayout />} />
</Route>
```

### RequirePermission Component

```tsx
import { RequirePermission } from '@/lib/auth';

// Single permission
<RequirePermission permissions={['users:create']}>
  <CreateUserButton />
</RequirePermission>

// Any of multiple permissions
<RequirePermission permissions={['users:update', 'users:manage']}>
  <EditUserForm />
</RequirePermission>

// All permissions required
<RequirePermission
  permissions={['users:delete', 'users:manage']}
  requireAll={true}
>
  <DeleteUserButton />
</RequirePermission>

// With resource context
<RequirePermission
  permissions={['posts:update:own']}
  resourceOwnerId={post.authorId}
>
  <EditPostButton />
</RequirePermission>
```

### Combined Guards

```tsx
// Route requiring auth + role + permission
<Route
  element={
    <RequireAuth>
      <RequireRole roles={['admin', 'manager']}>
        <RequirePermission permissions={['reports:read']}>
          <Outlet />
        </RequirePermission>
      </RequireRole>
    </RequireAuth>
  }
>
  <Route path="/reports" element={<Reports />} />
</Route>

// Or use route metadata
const routes = [
  {
    path: '/reports',
    element: <Reports />,
    meta: {
      requireAuth: true,
      roles: ['admin', 'manager'],
      permissions: ['reports:read'],
    },
  },
];
```

---

## Component Guards

### Conditional Rendering

```tsx
import { RequirePermission } from '@/lib/auth';

function UserTable({ users }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <RequirePermission permissions={['users:update']}>
            <th>Actions</th>
          </RequirePermission>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <RequirePermission permissions={['users:update']}>
              <td>
                <EditButton userId={user.id} />
                <RequirePermission permissions={['users:delete']}>
                  <DeleteButton userId={user.id} />
                </RequirePermission>
              </td>
            </RequirePermission>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Button Permissions

```tsx
import { PermissionButton } from '@/lib/auth';

function ActionBar() {
  return (
    <div className="action-bar">
      <PermissionButton
        permissions={['items:create']}
        onClick={handleCreate}
      >
        Create Item
      </PermissionButton>

      <PermissionButton
        permissions={['items:export']}
        onClick={handleExport}
        disabledTooltip="You don't have permission to export"
      >
        Export
      </PermissionButton>

      <PermissionButton
        permissions={['items:delete']}
        requireAll={true}
        variant="danger"
        onClick={handleBulkDelete}
      >
        Delete Selected
      </PermissionButton>
    </div>
  );
}
```

### Form Field Permissions

```tsx
import { PermissionField } from '@/lib/auth';

function UserForm({ user }) {
  return (
    <form>
      <Input name="name" defaultValue={user.name} />
      <Input name="email" defaultValue={user.email} />

      {/* Only visible/editable with permission */}
      <PermissionField
        permissions={['users:manage']}
        name="role"
        label="Role"
      >
        <Select
          options={roleOptions}
          defaultValue={user.role}
        />
      </PermissionField>

      {/* Read-only without permission */}
      <PermissionField
        permissions={['users:update:salary']}
        name="salary"
        label="Salary"
        readOnlyFallback={true}
      >
        <Input type="number" defaultValue={user.salary} />
      </PermissionField>
    </form>
  );
}
```

---

## Hook-Based Access Control

### useHasRole

```tsx
import { useHasRole } from '@/lib/auth';

function Component() {
  // Single role
  const isAdmin = useHasRole('admin');

  // Any of multiple roles
  const isManager = useHasRole(['admin', 'manager']);

  // With options
  const hasAccess = useHasRole('manager', {
    checkHierarchy: true, // Admin also passes
  });

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isManager) {
    return <ManagerDashboard />;
  }

  return <UserDashboard />;
}
```

### useHasPermission

```tsx
import { useHasPermission } from '@/lib/auth';

function Component() {
  // Single permission
  const canRead = useHasPermission('users:read');

  // Multiple permissions (any)
  const canModify = useHasPermission(['users:update', 'users:manage']);

  // Multiple permissions (all required)
  const canDelete = useHasPermission(
    ['users:delete', 'users:manage'],
    { requireAll: true }
  );

  return (
    <div>
      {canRead && <UserList />}
      {canModify && <EditButton />}
      {canDelete && <DeleteButton />}
    </div>
  );
}
```

### usePermissions

```tsx
import { usePermissions } from '@/lib/auth';

function PermissionDashboard() {
  const {
    permissions,       // All user permissions
    hasPermission,     // Check function
    hasAnyPermission,  // Check any
    hasAllPermissions, // Check all
    getPermissionsForResource, // Get permissions for resource
  } = usePermissions();

  // Get all user-related permissions
  const userPermissions = getPermissionsForResource('users');
  // ['users:read', 'users:create', 'users:update']

  return (
    <div>
      <h3>Your Permissions</h3>
      <ul>
        {permissions.map(perm => (
          <li key={perm}>{perm}</li>
        ))}
      </ul>
    </div>
  );
}
```

### useAccessControl

```tsx
import { useAccessControl } from '@/lib/auth';

function ResourcePage({ resourceId, resourceOwnerId }) {
  const { can, cannot, authorize } = useAccessControl();

  // Simple checks
  const canView = can('view', 'resource');
  const canEdit = can('edit', 'resource');
  const canDelete = can('delete', 'resource');

  // With ownership context
  const canEditOwn = can('edit', 'resource', {
    ownerId: resourceOwnerId,
  });

  // Throws if unauthorized
  const handleDelete = async () => {
    authorize('delete', 'resource');
    await deleteResource(resourceId);
  };

  return (
    <div>
      {canView && <ResourceViewer id={resourceId} />}
      {canEdit && <EditButton onClick={handleEdit} />}
      {canDelete && <DeleteButton onClick={handleDelete} />}
    </div>
  );
}
```

---

## Permission Hierarchies

### Role Inheritance

```typescript
// Role hierarchy definition
const roleHierarchy = {
  admin: {
    inherits: ['manager'],
    permissions: ['system:*', 'users:*'],
  },
  manager: {
    inherits: ['user'],
    permissions: ['team:*', 'reports:*'],
  },
  user: {
    inherits: ['guest'],
    permissions: ['profile:*', 'content:create'],
  },
  guest: {
    inherits: [],
    permissions: ['content:read'],
  },
};

// Effective permissions for 'manager':
// - team:* (own)
// - reports:* (own)
// - profile:* (from user)
// - content:create (from user)
// - content:read (from guest)
```

### Wildcard Permissions

```typescript
// Wildcard matching
'users:*'     // Matches users:read, users:create, etc.
'*:read'      // Matches users:read, posts:read, etc.
'*'           // Matches everything

// Check implementation
function matchesPermission(
  userPermission: string,
  requiredPermission: string
): boolean {
  if (userPermission === '*') return true;

  const [userResource, userAction] = userPermission.split(':');
  const [reqResource, reqAction] = requiredPermission.split(':');

  const resourceMatch = userResource === '*' || userResource === reqResource;
  const actionMatch = userAction === '*' || userAction === reqAction;

  return resourceMatch && actionMatch;
}
```

### Scoped Permissions

```tsx
import { useHasPermission } from '@/lib/auth';

function PostActions({ post, currentUserId }) {
  // Check ownership-scoped permission
  const canEdit = useHasPermission('posts:update', {
    scope: 'own',
    resourceOwnerId: post.authorId,
    currentUserId,
  });

  // Team-scoped permission
  const canModerate = useHasPermission('posts:moderate', {
    scope: 'team',
    resourceTeamId: post.teamId,
    currentUserTeams: currentUser.teams,
  });

  return (
    <div>
      {canEdit && <EditButton />}
      {canModerate && <ModerateButton />}
    </div>
  );
}
```

---

## Dynamic Permissions

### Context-Based Permissions

```tsx
import { useContextualPermission } from '@/lib/auth';

function DocumentActions({ document }) {
  // Permission depends on document state
  const canEdit = useContextualPermission('documents:update', {
    context: {
      documentStatus: document.status,
      documentOwner: document.ownerId,
    },
    evaluate: (permission, context, user) => {
      // Can't edit published documents unless admin
      if (context.documentStatus === 'published') {
        return user.roles.includes('admin');
      }

      // Can edit own drafts
      if (context.documentStatus === 'draft') {
        return context.documentOwner === user.id ||
               user.permissions.includes('documents:update:any');
      }

      return false;
    },
  });

  return canEdit ? <EditButton /> : null;
}
```

### Time-Based Permissions

```tsx
import { useTemporalPermission } from '@/lib/auth';

function TimeSensitiveFeature() {
  const hasAccess = useTemporalPermission('feature:beta', {
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-12-31'),
    timezone: 'America/New_York',
  });

  if (!hasAccess) {
    return <ComingSoon />;
  }

  return <BetaFeature />;
}
```

### Attribute-Based Access Control (ABAC)

```tsx
import { useABAC } from '@/lib/auth';

function ResourceAccess({ resource }) {
  const { evaluate } = useABAC();

  const canAccess = evaluate({
    subject: {
      type: 'user',
      attributes: currentUser,
    },
    resource: {
      type: 'document',
      attributes: resource,
    },
    action: 'read',
    environment: {
      time: new Date(),
      ip: clientIP,
    },
    policies: [
      // Policy 1: Admins can access everything
      {
        effect: 'allow',
        condition: (s) => s.roles.includes('admin'),
      },
      // Policy 2: Users can access own documents
      {
        effect: 'allow',
        condition: (s, r) => r.ownerId === s.id,
      },
      // Policy 3: Users can access public documents
      {
        effect: 'allow',
        condition: (_, r) => r.visibility === 'public',
      },
      // Policy 4: Deny outside business hours
      {
        effect: 'deny',
        condition: (_, __, env) => {
          const hour = env.time.getHours();
          return hour < 9 || hour > 17;
        },
      },
    ],
  });

  return canAccess ? <Resource data={resource} /> : <AccessDenied />;
}
```

---

## Best Practices

### 1. Principle of Least Privilege

```tsx
// BAD: Overly permissive
<RequireRole roles={['admin']}>
  <CreateUserButton />
</RequireRole>

// GOOD: Specific permission
<RequirePermission permissions={['users:create']}>
  <CreateUserButton />
</RequirePermission>
```

### 2. Defense in Depth

```tsx
// Layer 1: Route guard
<Route element={<RequireAuth />}>
  <Route element={<RequireRole roles={['admin']} />}>
    <Route path="/admin/users" element={<UserManagement />} />
  </Route>
</Route>

// Layer 2: Component guard
function UserManagement() {
  return (
    <RequirePermission permissions={['users:manage']}>
      <UserList />
    </RequirePermission>
  );
}

// Layer 3: Action guard
function DeleteUserButton({ userId }) {
  const canDelete = useHasPermission('users:delete');

  const handleDelete = () => {
    if (!canDelete) {
      throw new UnauthorizedError('Missing permission: users:delete');
    }
    // Proceed with deletion
  };

  return canDelete ? <Button onClick={handleDelete}>Delete</Button> : null;
}

// Layer 4: API guard (server-side)
// Always validate permissions on the backend!
```

### 3. Fail Secure

```tsx
// BAD: Shows content during loading
function ProtectedContent() {
  const { isLoading, hasPermission } = useAuth();

  if (isLoading) return <Loading />;
  if (!hasPermission) return <AccessDenied />;

  return <SensitiveContent />; // Might flash before loading completes
}

// GOOD: Hide until confirmed
function ProtectedContent() {
  const { isLoading, hasPermission } = useAuth();

  // Don't render anything until we know for sure
  if (isLoading || !hasPermission) {
    return isLoading ? <Loading /> : <AccessDenied />;
  }

  return <SensitiveContent />;
}
```

### 4. Audit Trail

```tsx
import { usePermissionAudit } from '@/lib/auth';

function SensitiveAction() {
  const { logAccess } = usePermissionAudit();

  const handleAction = async () => {
    // Log the access attempt
    await logAccess({
      action: 'sensitive:action',
      resource: 'sensitive-data',
      outcome: 'success',
      metadata: { reason: 'user requested export' },
    });

    // Proceed with action
  };

  return <button onClick={handleAction}>Perform Action</button>;
}
```

### 5. Clear Error Messages

```tsx
<RequirePermission
  permissions={['reports:export']}
  fallback={
    <AccessDenied
      title="Export Access Required"
      message="You need the 'Export Reports' permission to use this feature."
      action={
        <Button onClick={requestAccess}>
          Request Access
        </Button>
      }
    />
  }
>
  <ExportButton />
</RequirePermission>
```

---

## Type Definitions

```typescript
type Role = 'admin' | 'manager' | 'user' | 'guest' | string;
type Permission = string;

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

interface RequireRoleProps {
  roles?: Role[];
  minRole?: Role;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface RequirePermissionProps {
  permissions: Permission[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  resourceOwnerId?: string;
}

interface RouteAuthConfig {
  requireAuth: boolean;
  minRole?: Role;
  allowedRoles?: Role[];
  requiredPermissions?: Permission[];
  redirectTo?: string;
}
```

---

## See Also

- [RBAC Examples](./examples/rbac-examples.md) - 25+ RBAC examples
- [Authentication Guide](./AUTHENTICATION.md) - Auth setup
- [Routing Guide](./ROUTING.md) - Route guards
- [Documentation Index](./INDEX.md) - All documentation resources
