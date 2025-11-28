# RBAC Examples

> 25+ practical role-based access control examples for the Harbor React Library.

## Table of Contents

- [Role Checks](#role-checks)
- [Permission Checks](#permission-checks)
- [Route Guards](#route-guards)
- [Component Guards](#component-guards)
- [Conditional UI](#conditional-ui)
- [Dynamic Permissions](#dynamic-permissions)
- [Advanced Patterns](#advanced-patterns)

---

## Role Checks

### Example 1: Simple Role Check

```tsx
import { useHasRole } from '@/lib/auth';

function AdminBadge() {
  const isAdmin = useHasRole('admin');

  if (!isAdmin) return null;

  return <span className="badge admin">Admin</span>;
}
```

### Example 2: Multiple Roles (Any)

```tsx
import { useHasRole } from '@/lib/auth';

function ManagerContent() {
  const canManage = useHasRole(['admin', 'manager']);

  if (!canManage) {
    return <p>You need manager access to view this content.</p>;
  }

  return <ManagementDashboard />;
}
```

### Example 3: Role-Based Navigation

```tsx
import { useAuth } from '@/lib/auth';

function SidebarNavigation() {
  const { hasRole } = useAuth();

  return (
    <nav>
      <NavItem to="/dashboard">Dashboard</NavItem>
      <NavItem to="/profile">Profile</NavItem>

      {hasRole('manager') && (
        <NavItem to="/team">Team Management</NavItem>
      )}

      {hasRole('admin') && (
        <>
          <NavItem to="/admin/users">User Management</NavItem>
          <NavItem to="/admin/settings">System Settings</NavItem>
        </>
      )}
    </nav>
  );
}
```

### Example 4: Role-Based Redirect

```tsx
import { useAuth } from '@/lib/auth';
import { Navigate } from 'react-router-dom';

function RoleBasedHome() {
  const { user, hasRole } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (hasRole('admin')) {
    return <Navigate to="/admin/dashboard" />;
  }

  if (hasRole('manager')) {
    return <Navigate to="/manager/dashboard" />;
  }

  return <Navigate to="/user/dashboard" />;
}
```

---

## Permission Checks

### Example 5: Simple Permission Check

```tsx
import { useHasPermission } from '@/lib/auth';

function CreateButton() {
  const canCreate = useHasPermission('users:create');

  if (!canCreate) return null;

  return <button>Create User</button>;
}
```

### Example 6: Multiple Permissions (Any)

```tsx
import { useHasPermission } from '@/lib/auth';

function EditSection() {
  const canEdit = useHasPermission(['content:update', 'content:manage']);

  if (!canEdit) {
    return <p>Read-only view</p>;
  }

  return <EditForm />;
}
```

### Example 7: Multiple Permissions (All Required)

```tsx
import { useAuth } from '@/lib/auth';

function BulkDeleteButton() {
  const { hasAllPermissions } = useAuth();

  const canBulkDelete = hasAllPermissions([
    'users:delete',
    'users:manage',
    'admin:bulk-operations',
  ]);

  if (!canBulkDelete) return null;

  return (
    <button className="danger">
      Delete Selected Users
    </button>
  );
}
```

### Example 8: Permission-Based Actions

```tsx
import { useAuth } from '@/lib/auth';

function DocumentActions({ document }) {
  const { hasPermission } = useAuth();

  return (
    <div className="actions">
      {hasPermission('documents:read') && (
        <button onClick={() => view(document)}>View</button>
      )}

      {hasPermission('documents:update') && (
        <button onClick={() => edit(document)}>Edit</button>
      )}

      {hasPermission('documents:share') && (
        <button onClick={() => share(document)}>Share</button>
      )}

      {hasPermission('documents:delete') && (
        <button onClick={() => remove(document)} className="danger">
          Delete
        </button>
      )}
    </div>
  );
}
```

---

## Route Guards

### Example 9: RequireAuth Guard

```tsx
import { RequireAuth } from '@/lib/auth';

const routes = [
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/profile', element: <Profile /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
];
```

### Example 10: RequireRole Guard

```tsx
import { RequireAuth, RequireRole } from '@/lib/auth';

const routes = [
  {
    element: <RequireAuth />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      {
        element: <RequireRole roles={['admin']} />,
        children: [
          { path: '/admin', element: <AdminDashboard /> },
          { path: '/admin/users', element: <UserManagement /> },
        ],
      },
      {
        element: <RequireRole roles={['admin', 'manager']} />,
        children: [
          { path: '/reports', element: <Reports /> },
        ],
      },
    ],
  },
];
```

### Example 11: RequirePermission Guard

```tsx
import { RequirePermission } from '@/lib/auth';

const routes = [
  {
    path: '/users',
    element: (
      <RequirePermission permissions={['users:read']}>
        <UsersLayout />
      </RequirePermission>
    ),
    children: [
      { index: true, element: <UserList /> },
      {
        path: 'create',
        element: (
          <RequirePermission permissions={['users:create']}>
            <CreateUser />
          </RequirePermission>
        ),
      },
      {
        path: ':id/edit',
        element: (
          <RequirePermission permissions={['users:update']}>
            <EditUser />
          </RequirePermission>
        ),
      },
    ],
  },
];
```

### Example 12: Custom Fallback

```tsx
import { RequireRole } from '@/lib/auth';

function AdminRoute({ children }) {
  return (
    <RequireRole
      roles={['admin']}
      fallback={
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You need admin privileges to view this page.</p>
          <Link to="/dashboard">Return to Dashboard</Link>
        </div>
      }
    >
      {children}
    </RequireRole>
  );
}
```

---

## Component Guards

### Example 13: RequirePermission Component

```tsx
import { RequirePermission } from '@/lib/auth';

function UserCard({ user }) {
  return (
    <Card>
      <CardHeader>
        <h3>{user.name}</h3>
        <span>{user.email}</span>
      </CardHeader>

      <CardActions>
        <RequirePermission permissions={['users:update']}>
          <Button onClick={() => editUser(user.id)}>Edit</Button>
        </RequirePermission>

        <RequirePermission permissions={['users:delete']}>
          <Button variant="danger" onClick={() => deleteUser(user.id)}>
            Delete
          </Button>
        </RequirePermission>
      </CardActions>
    </Card>
  );
}
```

### Example 14: PermissionButton Component

```tsx
import { useHasPermission } from '@/lib/auth';

function PermissionButton({ permission, children, ...props }) {
  const hasPermission = useHasPermission(permission);

  if (!hasPermission) {
    return null; // Or return disabled button with tooltip
  }

  return <Button {...props}>{children}</Button>;
}

// Usage
function Actions() {
  return (
    <div>
      <PermissionButton permission="items:create" onClick={create}>
        Create
      </PermissionButton>
      <PermissionButton permission="items:export" onClick={exportData}>
        Export
      </PermissionButton>
    </div>
  );
}
```

### Example 15: Show Disabled with Tooltip

```tsx
import { useHasPermission } from '@/lib/auth';
import { Tooltip } from '@/components/ui';

function PermissionButton({ permission, children, ...props }) {
  const hasPermission = useHasPermission(permission);

  if (!hasPermission) {
    return (
      <Tooltip content="You don't have permission for this action">
        <Button {...props} disabled>
          {children}
        </Button>
      </Tooltip>
    );
  }

  return <Button {...props}>{children}</Button>;
}
```

---

## Conditional UI

### Example 16: Table with Permission-Based Columns

```tsx
import { useAuth } from '@/lib/auth';

function UsersTable({ users }) {
  const { hasPermission } = useAuth();

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          {hasPermission('users:read:role') && <th>Role</th>}
          {hasPermission('users:read:status') && <th>Status</th>}
          {hasPermission('users:update') && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            {hasPermission('users:read:role') && <td>{user.role}</td>}
            {hasPermission('users:read:status') && <td>{user.status}</td>}
            {hasPermission('users:update') && (
              <td>
                <EditButton userId={user.id} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Example 17: Form Fields with Permissions

```tsx
import { useAuth } from '@/lib/auth';

function UserForm({ user, onSubmit }) {
  const { hasPermission } = useAuth();

  return (
    <form onSubmit={onSubmit}>
      <Input name="name" label="Name" defaultValue={user.name} />
      <Input name="email" label="Email" defaultValue={user.email} />

      {hasPermission('users:update:role') && (
        <Select name="role" label="Role" defaultValue={user.role}>
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </Select>
      )}

      {hasPermission('users:update:status') && (
        <Select name="status" label="Status" defaultValue={user.status}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </Select>
      )}

      <Button type="submit">Save</Button>
    </form>
  );
}
```

### Example 18: Read-Only Fallback

```tsx
import { useHasPermission } from '@/lib/auth';

function ProfileSection({ user }) {
  const canEdit = useHasPermission('profile:update');

  if (!canEdit) {
    return (
      <div className="profile-view">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Bio:</strong> {user.bio}</p>
      </div>
    );
  }

  return <ProfileEditForm user={user} />;
}
```

---

## Dynamic Permissions

### Example 19: Ownership-Based Permission

```tsx
import { useAuth } from '@/lib/auth';

function PostActions({ post }) {
  const { user, hasPermission } = useAuth();

  const isOwner = post.authorId === user?.id;
  const canEditAny = hasPermission('posts:update:any');
  const canDeleteAny = hasPermission('posts:delete:any');

  const canEdit = isOwner || canEditAny;
  const canDelete = isOwner || canDeleteAny;

  return (
    <div className="actions">
      {canEdit && <EditButton postId={post.id} />}
      {canDelete && <DeleteButton postId={post.id} />}
    </div>
  );
}
```

### Example 20: Team-Based Permission

```tsx
import { useAuth } from '@/lib/auth';

function TeamResource({ resource }) {
  const { user, hasPermission } = useAuth();

  const isTeamMember = user?.teams?.includes(resource.teamId);
  const canManageAnyTeam = hasPermission('teams:manage:any');

  const canEdit = isTeamMember || canManageAnyTeam;

  return (
    <div>
      <h3>{resource.name}</h3>
      {canEdit && <EditButton />}
    </div>
  );
}
```

### Example 21: Context-Aware Permission

```tsx
import { useAuth } from '@/lib/auth';

function DocumentEditor({ document }) {
  const { user, hasPermission } = useAuth();

  // Check multiple conditions
  const canEdit = useMemo(() => {
    // Admins can always edit
    if (hasPermission('documents:update:any')) return true;

    // Owners can edit their documents
    if (document.ownerId === user?.id) return true;

    // Collaborators can edit
    if (document.collaborators?.includes(user?.id)) return true;

    // Public documents with edit permission
    if (document.isPublic && hasPermission('documents:update:public')) {
      return true;
    }

    return false;
  }, [document, user, hasPermission]);

  if (!canEdit) {
    return <DocumentViewer document={document} />;
  }

  return <DocumentEditorComponent document={document} />;
}
```

### Example 22: Time-Based Permission

```tsx
import { useAuth } from '@/lib/auth';

function TimeRestrictedFeature() {
  const { hasPermission } = useAuth();

  const now = new Date();
  const hour = now.getHours();
  const isBusinessHours = hour >= 9 && hour < 17;

  const canAccess = hasPermission('reports:generate') && isBusinessHours;

  if (!canAccess) {
    return (
      <div>
        <p>Report generation is only available during business hours (9 AM - 5 PM).</p>
      </div>
    );
  }

  return <ReportGenerator />;
}
```

---

## Advanced Patterns

### Example 23: Permission Hierarchy

```tsx
const permissionHierarchy = {
  'users:manage': ['users:read', 'users:create', 'users:update', 'users:delete'],
  'content:manage': ['content:read', 'content:create', 'content:update', 'content:delete'],
};

function useExpandedPermission(permission: string): boolean {
  const { hasPermission } = useAuth();

  // Check direct permission
  if (hasPermission(permission)) return true;

  // Check if user has a parent permission
  for (const [parent, children] of Object.entries(permissionHierarchy)) {
    if (children.includes(permission) && hasPermission(parent)) {
      return true;
    }
  }

  return false;
}

// Usage
function Component() {
  const canReadUsers = useExpandedPermission('users:read');
  // Returns true if user has 'users:read' OR 'users:manage'
}
```

### Example 24: Permission Request Flow

```tsx
import { useAuth } from '@/lib/auth';

function RequestPermissionButton({ permission, children }) {
  const { hasPermission, user } = useAuth();
  const [requested, setRequested] = useState(false);

  if (hasPermission(permission)) {
    return children;
  }

  const handleRequest = async () => {
    await fetch('/api/permission-requests', {
      method: 'POST',
      body: JSON.stringify({
        userId: user.id,
        permission,
        reason: 'Need access for project work',
      }),
    });
    setRequested(true);
  };

  if (requested) {
    return <span>Permission requested. Pending approval.</span>;
  }

  return (
    <Tooltip content={`You need "${permission}" permission`}>
      <Button onClick={handleRequest} variant="outline">
        Request Access
      </Button>
    </Tooltip>
  );
}
```

### Example 25: Audit Logging for Permissions

```tsx
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';

function usePermissionAudit() {
  const { user } = useAuth();

  const logAccess = async (action: string, resource: string, allowed: boolean) => {
    await fetch('/api/audit-log', {
      method: 'POST',
      body: JSON.stringify({
        userId: user?.id,
        action,
        resource,
        allowed,
        timestamp: new Date().toISOString(),
      }),
    });
  };

  return { logAccess };
}

// Usage
function SensitiveAction() {
  const { hasPermission } = useAuth();
  const { logAccess } = usePermissionAudit();

  const handleAction = async () => {
    const allowed = hasPermission('sensitive:action');

    await logAccess('sensitive:action', 'sensitive-data', allowed);

    if (!allowed) {
      toast.error('Access denied');
      return;
    }

    // Perform action
  };

  return <Button onClick={handleAction}>Perform Action</Button>;
}
```

### Example 26: Permission Debugging Tool

```tsx
import { useAuth } from '@/lib/auth';

function PermissionDebugger() {
  const { user, hasRole, hasPermission } = useAuth();

  if (!import.meta.env.DEV) return null;

  return (
    <div className="permission-debugger">
      <h4>Current User Permissions</h4>
      <p><strong>Roles:</strong> {user?.roles?.join(', ') || 'None'}</p>
      <p><strong>Permissions:</strong></p>
      <ul>
        {user?.permissions?.map(p => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <h4>Permission Tester</h4>
      <PermissionTester />
    </div>
  );
}

function PermissionTester() {
  const [test, setTest] = useState('');
  const { hasPermission } = useAuth();

  return (
    <div>
      <input
        value={test}
        onChange={(e) => setTest(e.target.value)}
        placeholder="Test permission (e.g., users:read)"
      />
      <span>
        {test && (hasPermission(test) ? ' Allowed' : ' Denied')}
      </span>
    </div>
  );
}
```

---

## See Also

- [RBAC Guide](../RBAC.md) - Complete RBAC documentation
- [Auth Examples](./auth-examples.md) - Authentication examples
- [Routing Examples](./routing-examples.md) - Protected routes
- [Documentation Index](../INDEX.md) - All documentation resources
