import { Link, Routes, Route, useParams, useNavigate, Outlet } from 'react-router-dom';

// Simple route guard that always allows access for demo purposes
function useRouteGuard() {
  return true; // Always allow access in demo
}

// Nested route components
function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        User Profile: {userId}
      </h2>
      <div className="space-y-4">
        <div className="flex space-x-4">
          <Link
            to={`/examples/08-advanced-routing/users/${userId}/details`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            View Details
          </Link>
          <Link
            to={`/examples/08-advanced-routing/users/${userId}/settings`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Settings
          </Link>
          <Link
            to={`/examples/08-advanced-routing/users/${userId}/activity`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Activity Log
          </Link>
        </div>
        <div className="border-t pt-4">
          <Outlet />
        </div>
        <button
          onClick={() => navigate('/examples/08-advanced-routing')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Back to Users
        </button>
      </div>
    </div>
  );
}

function UserDetails() {
  const { userId } = useParams<{ userId: string }>();
  return (
    <div className="p-4 bg-blue-50 rounded">
      <h3 className="font-semibold mb-2">User Details for {userId}</h3>
      <p>Name: John Doe</p>
      <p>Email: john.doe@example.com</p>
      <p>Role: Developer</p>
      <p>Status: Active</p>
    </div>
  );
}

function UserSettings() {
  const { userId } = useParams<{ userId: string }>();
  return (
    <div className="p-4 bg-green-50 rounded">
      <h3 className="font-semibold mb-2">Settings for {userId}</h3>
      <div className="space-y-2">
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" defaultChecked />
          Email notifications
        </label>
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" />
          SMS notifications
        </label>
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" defaultChecked />
          Dark mode
        </label>
      </div>
    </div>
  );
}

function UserActivity() {
  const { userId } = useParams<{ userId: string }>();
  return (
    <div className="p-4 bg-yellow-50 rounded">
      <h3 className="font-semibold mb-2">Activity Log for {userId}</h3>
      <ul className="space-y-1 text-sm">
        <li>• Logged in at 9:00 AM</li>
        <li>• Updated profile at 9:15 AM</li>
        <li>• Created new project at 10:30 AM</li>
        <li>• Shared document at 2:45 PM</li>
      </ul>
    </div>
  );
}

function UsersList() {
  const users = ['alice', 'bob', 'charlie', 'diana'];
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Users List</h2>
      <div className="grid grid-cols-2 gap-4">
        {users.map((user) => (
          <Link
            key={user}
            to={`/examples/08-advanced-routing/users/${user}`}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium capitalize">{user}</h3>
            <p className="text-sm text-gray-600">View profile →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdvancedRoutingExample() {
  const canViewUsers = useRouteGuard(); // Simple guard for demo

  if (!canViewUsers) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Advanced Routing Example
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Nested routes, parameters, and route guards with Enzyme
            </p>
          </div>

          <div className="mb-6">
            <nav className="flex space-x-4">
              <Link
                to="/examples/08-advanced-routing"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Users List
              </Link>
              <Link
                to="/"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Back to Examples
              </Link>
            </nav>
          </div>

          <Routes>
            <Route index element={<UsersList />} />
            <Route path="users/:userId" element={<UserProfile />}>
              <Route index element={
                <div className="p-4 bg-gray-100 rounded text-center">
                  <p>Select a tab above to view user information</p>
                </div>
              } />
              <Route path="details" element={<UserDetails />} />
              <Route path="settings" element={<UserSettings />} />
              <Route path="activity" element={<UserActivity />} />
            </Route>
          </Routes>
        </div>
      </div>
    </div>
  );
}