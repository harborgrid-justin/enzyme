/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-console */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, AuthProvider, RequireRole, RequirePermission } from '@missionfabric-js/enzyme/auth';

// Mock user data that matches Enzyme's User type
const users = {
  admin: { 
    id: '1', 
    email: 'admin@example.com', 
    firstName: 'Admin', 
    lastName: 'User',
    displayName: 'Admin User',
    roles: ['admin'] as const,
    permissions: ['read', 'write', 'delete'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  editor: { 
    id: '2', 
    email: 'editor@example.com', 
    firstName: 'Editor', 
    lastName: 'User',
    displayName: 'Editor User',
    roles: ['user'] as const,
    permissions: ['read', 'write'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  viewer: { 
    id: '3', 
    email: 'viewer@example.com', 
    firstName: 'Viewer', 
    lastName: 'User',
    displayName: 'Viewer User',
    roles: ['guest'] as const,
    permissions: ['read'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
};

function AuthContent() {
  const { isAuthenticated, user, logout } = useAuth();
  const [selectedUser, setSelectedUser] = useState<keyof typeof users>('viewer');

  const handleLogin = () => {
    const userData = users[selectedUser];
    // In a real app, you'd call login with email/password
    // For demo, we'll simulate successful authentication
    // login({ email: userData.email, password: 'demo' });
    console.log('Demo login for:', userData.email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-blue-600 hover:text-blue-800 mb-6 inline-block">
          ← Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">03. Auth & RBAC</h1>
          <p className="text-gray-600 mb-6">
            Authentication and Role-Based Access Control with permission management.
          </p>

          {!isAuthenticated ? (
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Login</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User Role:
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value as keyof typeof users)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Viewer (read only)</option>
                    <option value="editor">Editor (read, write)</option>
                    <option value="admin">Admin (full access)</option>
                  </select>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 transition"
                >
                  Login as {selectedUser}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">
                      Logged in as: {user?.displayName}
                    </p>
                    <p className="text-sm text-blue-700">Roles: {user?.roles?.join(', ')}</p>
                    <p className="text-xs text-blue-600">
                      Permissions: {user?.permissions?.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Everyone can see this */}
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">Public Content</h3>
                  <p className="text-sm text-green-700">
                    ✓ All authenticated users can view this
                  </p>
                </div>

                {/* Only users with 'write' permission */}
                <RequirePermission
                  permission="write"
                  fallback={
                    <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-500 mb-2">Editor Content</h3>
                      <p className="text-sm text-gray-400">
                        ✗ Requires 'write' permission
                      </p>
                    </div>
                  }
                >
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Editor Content</h3>
                    <p className="text-sm text-blue-700">
                      ✓ You have write permission
                    </p>
                  </div>
                </RequirePermission>

                {/* Only admin role */}
                <RequireRole
                  role="admin"
                  fallback={
                    <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-500 mb-2">Admin Content</h3>
                      <p className="text-sm text-gray-400">
                        ✗ Requires admin role
                      </p>
                    </div>
                  }
                >
                  <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-900 mb-2">Admin Content</h3>
                    <p className="text-sm text-purple-700">
                      ✓ Admin access granted
                    </p>
                  </div>
                </RequireRole>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Permission Matrix</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Action</th>
                        <th className="text-center py-2 px-3">Read</th>
                        <th className="text-center py-2 px-3">Write</th>
                        <th className="text-center py-2 px-3">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-3 font-medium">Your Access</td>
                        <td className="text-center">
                          {user?.permissions?.includes('read') ? '✓' : '✗'}
                        </td>
                        <td className="text-center">
                          {user?.permissions?.includes('write') ? '✓' : '✗'}
                        </td>
                        <td className="text-center">
                          {user?.permissions?.includes('delete') ? '✓' : '✗'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Code Example */}
        <div className="bg-gray-900 rounded-lg shadow-xl p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">Code Example</h2>
          <pre className="text-sm overflow-x-auto">
            <code>{`import { auth } from '@missionfabric-js/enzyme';

const { RequireRole, RequirePermission } = auth;

<RequireRole role="admin" fallback={<Denied />}>
  <AdminPanel />
</RequireRole>

<RequirePermission permission="write" fallback={<ReadOnly />}>
  <EditButton />
</RequirePermission>`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function AuthRBACExample(): React.ReactElement {
  return (
    <AuthProvider>
      <AuthContent />
    </AuthProvider>
  );
}
