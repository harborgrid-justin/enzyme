# Routing Examples

> 25+ practical routing examples for the Harbor React Library.

## Table of Contents

- [Basic Routing](#basic-routing)
- [Dynamic Routes](#dynamic-routes)
- [Nested Routes](#nested-routes)
- [Protected Routes](#protected-routes)
- [Navigation](#navigation)
- [Query Parameters](#query-parameters)
- [Route Prefetching](#route-prefetching)
- [Advanced Patterns](#advanced-patterns)

---

## Basic Routing

### Example 1: Simple Route Configuration

```tsx
import { createRouter } from '@/lib/routing';
import { RouterProvider } from 'react-router-dom';

const routes = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '/contact', element: <Contact /> },
];

const router = createRouter({ routes });

function App() {
  return <RouterProvider router={router} />;
}
```

### Example 2: Route with Layout

```tsx
const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
];
```

### Example 3: Not Found Route

```tsx
const routes = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '*', element: <NotFound /> }, // Catch-all
];
```

---

## Dynamic Routes

### Example 4: Single Dynamic Parameter

```tsx
import { createRouteBuilder } from '@/lib/routing';

const userRoute = createRouteBuilder('/users/:id');

// Build path
const path = userRoute.build({ id: '123' }); // "/users/123"

// Route definition
const routes = [
  {
    path: '/users/:id',
    element: <UserDetail />,
  },
];

// Access in component
function UserDetail() {
  const { id } = useParams();
  return <div>User: {id}</div>;
}
```

### Example 5: Multiple Dynamic Parameters

```tsx
const postRoute = createRouteBuilder('/users/:userId/posts/:postId');

const path = postRoute.build({
  userId: '1',
  postId: '42',
}); // "/users/1/posts/42"

function PostDetail() {
  const { userId, postId } = useParams();
  return <div>Post {postId} by User {userId}</div>;
}
```

### Example 6: Optional Parameters

```tsx
const searchRoute = createRouteBuilder('/search/:category?');

searchRoute.build({});                    // "/search"
searchRoute.build({ category: 'books' }); // "/search/books"

const routes = [
  { path: '/search/:category?', element: <Search /> },
];
```

### Example 7: Catch-All Parameter

```tsx
const docsRoute = createRouteBuilder('/docs/*');

// Matches: /docs, /docs/api, /docs/api/routing, etc.

function Docs() {
  const { '*': splat } = useParams();
  // splat = "api/routing" for /docs/api/routing
  return <DocPage path={splat} />;
}
```

---

## Nested Routes

### Example 8: Basic Nesting

```tsx
const routes = [
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <DashboardSettings /> },
    ],
  },
];

function DashboardLayout() {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  );
}
```

### Example 9: Deep Nesting

```tsx
const routes = [
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminHome /> },
      {
        path: 'users',
        element: <UsersLayout />,
        children: [
          { index: true, element: <UserList /> },
          { path: ':id', element: <UserDetail /> },
          { path: ':id/edit', element: <UserEdit /> },
        ],
      },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <GeneralSettings /> },
          { path: 'security', element: <SecuritySettings /> },
        ],
      },
    ],
  },
];
```

### Example 10: Pathless Layout Route

```tsx
const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      {
        // No path - groups routes under shared layout
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <Login /> },
          { path: 'register', element: <Register /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
        ],
      },
    ],
  },
];
```

---

## Protected Routes

### Example 11: Authentication Guard

```tsx
import { RequireAuth } from '@/lib/auth';

const routes = [
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/profile', element: <Profile /> },
    ],
  },
];
```

### Example 12: Role-Based Guard

```tsx
import { RequireAuth, RequireRole } from '@/lib/auth';

const routes = [
  {
    element: <RequireAuth />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      {
        element: <RequireRole roles={['admin', 'manager']} />,
        children: [
          { path: '/admin', element: <AdminPanel /> },
          { path: '/reports', element: <Reports /> },
        ],
      },
    ],
  },
];
```

### Example 13: Permission-Based Guard

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
    ],
  },
];
```

### Example 14: Route Metadata Authentication

```tsx
const routes = [
  {
    path: '/dashboard',
    element: <Dashboard />,
    meta: {
      requireAuth: true,
      title: 'Dashboard',
    },
  },
  {
    path: '/admin',
    element: <Admin />,
    meta: {
      requireAuth: true,
      roles: ['admin'],
      permissions: ['admin:access'],
    },
  },
];

const router = createRouter({
  routes,
  defaultMeta: { requireAuth: false },
});
```

---

## Navigation

### Example 15: Programmatic Navigation

```tsx
import { useTypedNavigate } from '@/lib/routing';

function UserCard({ userId }) {
  const navigate = useTypedNavigate();

  const handleClick = () => {
    navigate('/users/:id', { params: { id: userId } });
  };

  const handleEdit = () => {
    navigate('/users/:id/edit', {
      params: { id: userId },
      state: { from: 'card' },
    });
  };

  return (
    <div onClick={handleClick}>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
}
```

### Example 16: Navigation with Query Params

```tsx
import { useRouteNavigate } from '@/lib/routing';

function SearchForm() {
  const navigate = useRouteNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    navigate('/search', {}, { q: query, page: '1' });
    // Navigates to: /search?q=...&page=1
  };

  return (
    <form onSubmit={handleSearch}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button type="submit">Search</button>
    </form>
  );
}
```

### Example 17: AppLink Component

```tsx
import { AppLink, AppNavLink } from '@/lib/routing';

function Navigation() {
  return (
    <nav>
      <AppLink to="/dashboard">Dashboard</AppLink>

      <AppLink to="/users/:id" params={{ id: '123' }}>
        User Profile
      </AppLink>

      <AppNavLink
        to="/settings"
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        Settings
      </AppNavLink>
    </nav>
  );
}
```

### Example 18: Navigation with Replace

```tsx
function LoginSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Replace history entry so back button doesn't return to login
    navigate('/dashboard', { replace: true });
  }, []);

  return <Redirecting />;
}
```

---

## Query Parameters

### Example 19: Reading Query Params

```tsx
import { useQueryParams, useQueryParam } from '@/lib/routing';

function SearchResults() {
  // Get all query params
  const params = useQueryParams();
  // { q: 'react', page: '1', sort: 'date' }

  // Get single param with default
  const page = useQueryParam('page', '1');
  const sort = useQueryParam('sort', 'relevance');

  return (
    <div>
      <p>Searching for: {params.q}</p>
      <p>Page: {page}, Sort: {sort}</p>
    </div>
  );
}
```

### Example 20: Updating Query Params

```tsx
import { useSearchParams } from 'react-router-dom';

function Pagination({ totalPages }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');

  const goToPage = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', page.toString());
      return prev;
    });
  };

  return (
    <div>
      <button onClick={() => goToPage(currentPage - 1)}>Previous</button>
      <span>Page {currentPage} of {totalPages}</span>
      <button onClick={() => goToPage(currentPage + 1)}>Next</button>
    </div>
  );
}
```

### Example 21: Tab Routing

```tsx
import { useTabParam } from '@/lib/routing';

function UserProfile() {
  const [activeTab, setActiveTab] = useTabParam('overview');
  // URL: /users/123?tab=posts

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><Overview /></TabsContent>
      <TabsContent value="posts"><Posts /></TabsContent>
      <TabsContent value="settings"><Settings /></TabsContent>
    </Tabs>
  );
}
```

---

## Route Prefetching

### Example 22: Hover Prefetch

```tsx
import { usePrefetchHandlers } from '@/lib/routing';

function NavItem({ to, children }) {
  const prefetchHandlers = usePrefetchHandlers(to);

  return (
    <Link to={to} {...prefetchHandlers}>
      {children}
    </Link>
  );
}
```

### Example 23: Manual Prefetch

```tsx
import { usePrefetchRoute } from '@/lib/routing';

function UserList({ users }) {
  const prefetch = usePrefetchRoute();

  return (
    <ul>
      {users.map(user => (
        <li
          key={user.id}
          onMouseEnter={() => prefetch(`/users/${user.id}`)}
        >
          <Link to={`/users/${user.id}`}>{user.name}</Link>
        </li>
      ))}
    </ul>
  );
}
```

### Example 24: Predictive Prefetch

```tsx
import { PredictiveLink } from '@/lib/performance';

function SmartNavigation() {
  return (
    <nav>
      {/* Predicts and prefetches based on user behavior */}
      <PredictiveLink to="/dashboard">Dashboard</PredictiveLink>
      <PredictiveLink to="/reports">Reports</PredictiveLink>
      <PredictiveLink to="/settings">Settings</PredictiveLink>
    </nav>
  );
}
```

---

## Advanced Patterns

### Example 25: Lazy Loading Routes

```tsx
import { createLazyRoute, withSuspense } from '@/lib/routing';

const routes = [
  {
    path: '/dashboard',
    ...createLazyRoute(() => import('./pages/Dashboard')),
  },
  {
    path: '/reports',
    ...createLazyRoute(
      () => import('./pages/Reports'),
      { loading: <ReportsSkeleton /> }
    ),
  },
  {
    path: '/admin',
    lazy: async () => {
      const { AdminPanel } = await import('./pages/Admin');
      return { Component: AdminPanel };
    },
  },
];
```

### Example 26: Modal Routes

```tsx
function Gallery() {
  const location = useLocation();
  const background = location.state?.background;

  return (
    <>
      <Routes location={background || location}>
        <Route index element={<ImageGrid />} />
        <Route path=":imageId" element={<ImagePage />} />
      </Routes>

      {background && (
        <Routes>
          <Route path=":imageId" element={<ImageModal />} />
        </Routes>
      )}
    </>
  );
}

// Link that opens modal
<Link
  to={`/gallery/${image.id}`}
  state={{ background: location }}
>
  <img src={image.thumbnail} />
</Link>
```

### Example 27: Breadcrumbs from Routes

```tsx
function Breadcrumbs() {
  const matches = useMatches();

  const crumbs = matches
    .filter(match => match.handle?.crumb)
    .map(match => ({
      path: match.pathname,
      label: match.handle.crumb(match.data),
    }));

  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumbs">
        {crumbs.map((crumb, i) => (
          <li key={crumb.path}>
            {i < crumbs.length - 1 ? (
              <Link to={crumb.path}>{crumb.label}</Link>
            ) : (
              <span>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Route with breadcrumb handle
const routes = [
  {
    path: '/products',
    handle: { crumb: () => 'Products' },
    children: [
      {
        path: ':id',
        handle: { crumb: (data) => data.product.name },
        loader: productLoader,
      },
    ],
  },
];
```

### Example 28: Route Transitions

```tsx
import { AnimatePresence, motion } from 'framer-motion';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Routes location={location}>
          {/* routes */}
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
```

### Example 29: Route Data Loader

```tsx
const routes = [
  {
    path: '/users/:id',
    element: <UserDetail />,
    loader: async ({ params }) => {
      const user = await fetchUser(params.id);
      return { user };
    },
    errorElement: <UserNotFound />,
  },
];

function UserDetail() {
  const { user } = useLoaderData();
  return <UserProfile user={user} />;
}
```

### Example 30: Route Action (Form Submission)

```tsx
const routes = [
  {
    path: '/users/:id/edit',
    element: <EditUser />,
    action: async ({ request, params }) => {
      const formData = await request.formData();
      await updateUser(params.id, Object.fromEntries(formData));
      return redirect(`/users/${params.id}`);
    },
  },
];

function EditUser() {
  const { user } = useLoaderData();

  return (
    <Form method="post">
      <input name="name" defaultValue={user.name} />
      <button type="submit">Save</button>
    </Form>
  );
}
```

---

## See Also

- [Routing Guide](../ROUTING.md) - Complete routing documentation
- [Authentication Guide](../AUTHENTICATION.md) - Auth integration
- [Performance Examples](./performance-examples.md) - Prefetching optimization
- [Documentation Index](../INDEX.md) - All documentation resources
