# Navigation Components

> Smart navigation components with auth, feature flag, and routing integration

## Overview

Navigation components provide intelligent, accessible navigation that integrates with the application's authentication, feature flags, and routing systems. All components are optimized for performance and accessibility.

---

## MainNav

The main navigation component with built-in authentication and feature flag support.

### Location

```
/home/user/enzyme/src/lib/ui/navigation/MainNav.tsx
```

### Features

- Automatic route filtering based on user roles
- Feature flag integration
- Auth-aware visibility
- External link support with indicators
- Badge support for notifications
- Horizontal and vertical layouts
- Active route highlighting
- Theme token styling

### Props

```typescript
interface MainNavProps {
  routes: NavRoute[];          // Navigation routes
  currentPath?: string;        // Current path for active state
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

interface NavRoute {
  id: string;
  label: string;
  path: string;
  icon?: ReactNode;
  requiredRoles?: Role[];      // Required user roles
  featureFlag?: string;        // Feature flag key
  children?: NavRoute[];       // Nested routes
  badge?: string | number;     // Notification badge
  external?: boolean;          // External link
}
```

### Basic Usage

```typescript
import { MainNav } from '@missionfabric-js/enzyme';
import { HomeIcon, UsersIcon, SettingsIcon } from '@heroicons/react/24/outline';

function Navigation() {
  const routes: NavRoute[] = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      icon: <HomeIcon width={20} />,
    },
    {
      id: 'users',
      label: 'Users',
      path: '/users',
      icon: <UsersIcon width={20} />,
      requiredRoles: ['admin'],
      badge: 3,
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: <SettingsIcon width={20} />,
    },
  ];

  return (
    <MainNav
      routes={routes}
      currentPath={window.location.pathname}
      direction="horizontal"
    />
  );
}
```

### With Role-Based Access

```typescript
const routes: NavRoute[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    // Visible to all users
  },
  {
    id: 'admin',
    label: 'Admin Panel',
    path: '/admin',
    requiredRoles: ['admin', 'super_admin'],
    // Only visible to admin and super_admin
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    requiredRoles: ['manager', 'admin'],
    // Only visible to managers and admins
  },
];
```

The component automatically filters routes based on:
1. User authentication status
2. User roles (if `requiredRoles` is specified)
3. Public routes (no `requiredRoles`) are always visible

### With Feature Flags

```typescript
const routes: NavRoute[] = [
  {
    id: 'new-feature',
    label: 'New Feature',
    path: '/new-feature',
    featureFlag: 'enable-new-feature',
    // Only visible when feature flag is enabled
  },
  {
    id: 'beta',
    label: 'Beta Features',
    path: '/beta',
    featureFlag: 'beta-features',
    requiredRoles: ['beta-tester'],
    // Must have role AND feature flag enabled
  },
];
```

Feature flags are checked using the `useFeatureFlag` hook. Routes with disabled flags are automatically hidden.

### External Links

```typescript
const routes: NavRoute[] = [
  {
    id: 'docs',
    label: 'Documentation',
    path: 'https://docs.example.com',
    external: true,
    icon: <DocumentIcon width={20} />,
  },
];
```

External links:
- Render as `<a>` tags instead of router links
- Include `target="_blank"` and `rel="noopener noreferrer"`
- Show external link icon indicator
- Include screen reader text "(opens in new tab)"

### With Badges

```typescript
const routes: NavRoute[] = [
  {
    id: 'messages',
    label: 'Messages',
    path: '/messages',
    icon: <EnvelopeIcon width={20} />,
    badge: unreadCount, // Number or string
  },
];
```

Badges appear as rounded pills next to the label.

### Vertical Layout

```typescript
<MainNav
  routes={routes}
  currentPath={location.pathname}
  direction="vertical"
/>
```

Vertical layout:
- Displays items in a column
- Suitable for sidebars
- Tighter spacing between items

### Active State

The component automatically highlights active routes by:
- Exact path match
- Parent path match (for nested routes)
- Visual styling with primary color and bold font

### Visual Appearance

Links render with:
- **Flex Layout**: Icon, label, and badge aligned
- **Spacing**: Theme-based gap between elements
- **Active State**: Primary color background, primary text color
- **Inactive State**: Secondary text color, transparent background
- **Hover State**: Subtle background on hover
- **Border Radius**: Rounded corners using theme tokens
- **Badge**: Light gray rounded pill, positioned at end

### Integration with Routing

```typescript
import { useLocation } from 'react-router-dom';
import { MainNav } from '@missionfabric-js/enzyme';

function AppNav() {
  const location = useLocation();

  return (
    <MainNav
      routes={routes}
      currentPath={location.pathname}
    />
  );
}
```

The component uses `AppLink` component from the routing module, which integrates with your router (React Router, etc.).

### Accessibility

- Uses semantic `<nav>` element
- `aria-label` differentiates horizontal vs vertical navigation
- External links include screen reader text
- Active links marked with appropriate styling
- Icons are decorative (`aria-hidden` when label present)

---

## Breadcrumbs

Auto-generated breadcrumb navigation based on current route.

### Location

```
/home/user/enzyme/src/lib/ui/navigation/Breadcrumbs.tsx
```

### Features

- Auto-generation from URL path
- Custom label mapping
- Custom breadcrumb items
- Configurable home link
- Custom separator
- Max items with collapse
- Responsive design
- Accessibility compliant

### Props

```typescript
interface BreadcrumbsProps {
  items?: BreadcrumbItem[];    // Custom items (overrides auto-generation)
  pathLabels?: Record<string, string>; // Path to label mapping
  homePath?: string;           // Home path (default: '/')
  homeLabel?: string;          // Home label (default: 'Home')
  homeIcon?: ReactNode;        // Home icon
  separator?: ReactNode;       // Custom separator
  maxItems?: number;           // Max items to show (collapses middle)
  className?: string;
}

interface BreadcrumbItem {
  label: string;
  path?: string;               // No path = current page (not clickable)
  icon?: ReactNode;
}
```

### Auto-Generated Breadcrumbs

```typescript
import { Breadcrumbs } from '@missionfabric-js/enzyme';

function PageHeader() {
  return <Breadcrumbs />;
}
```

Given URL `/users/123/edit`, auto-generates:
```
Home > Users > 123 > Edit
```

The component:
- Splits URL path by `/`
- Converts segments to Title Case
- Makes all items except last clickable
- Marks last item as current page

### With Custom Labels

```typescript
const pathLabels = {
  '/users': 'User Management',
  '/users/123': 'John Doe',
  '/users/123/edit': 'Edit Profile',
  'settings': 'Account Settings',
};

<Breadcrumbs pathLabels={pathLabels} />
```

Path labels support:
- Full paths: `/users/123`
- Path segments: `settings`
- Dynamic segments: Will use custom label if found, otherwise show segment

### Custom Items

```typescript
const items: BreadcrumbItem[] = [
  { label: 'Home', path: '/', icon: <HomeIcon /> },
  { label: 'Projects', path: '/projects' },
  { label: 'Website Redesign', path: '/projects/123' },
  { label: 'Settings' }, // No path = current page
];

<Breadcrumbs items={items} />
```

### Custom Home

```typescript
import { HomeIcon } from '@heroicons/react/24/outline';

<Breadcrumbs
  homeLabel="Dashboard"
  homePath="/dashboard"
  homeIcon={<HomeIcon width={16} />}
/>
```

### Custom Separator

```typescript
// Dash separator
<Breadcrumbs separator={<span>-</span>} />

// Custom icon
<Breadcrumbs separator={<ChevronRightIcon width={12} />} />
```

Default separator is a right-pointing chevron (›).

### Collapsed Breadcrumbs

```typescript
<Breadcrumbs maxItems={3} />
```

With path `/a/b/c/d/e` and `maxItems={3}`, displays:
```
Home > ... > D > E
```

Collapses middle items to ellipsis (...) when exceeding max.

### Visual Appearance

- **Layout**: Horizontal list with separators
- **Font Size**: 0.875rem (14px)
- **Spacing**: 0.5rem gap between items
- **Links**: Gray color, no underline
- **Current Page**: Dark color, medium font weight
- **Separator**: Gray chevron icon
- **Icons**: 16x16px, aligned with text

### Hide on Home

```typescript
function SmartBreadcrumbs() {
  const location = useLocation();

  // Don't show breadcrumbs on home page
  if (location.pathname === '/') {
    return null;
  }

  return <Breadcrumbs />;
}
```

The component automatically hides when only home breadcrumb exists.

### Accessibility

- Uses semantic `<nav>` with `aria-label="Breadcrumb"`
- Ordered list (`<ol>`) structure
- Last item marked with `aria-current="page"`
- Links are descriptive and keyboard accessible
- Icons are decorative with proper ARIA handling

### Integration with Routing

```typescript
import { useLocation } from 'react-router-dom';
import { Breadcrumbs } from '@missionfabric-js/enzyme';

function PageBreadcrumbs() {
  const location = useLocation();

  // Component automatically uses useLocation internally
  // No need to pass current path

  return <Breadcrumbs pathLabels={customLabels} />;
}
```

---

## Navigation Patterns

### Sidebar Navigation

```typescript
import { MainNav } from '@missionfabric-js/enzyme';

function SidebarNav() {
  return (
    <aside>
      <MainNav
        routes={routes}
        direction="vertical"
      />
    </aside>
  );
}
```

### Top Navigation Bar

```typescript
function TopNavBar() {
  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Logo />
        <MainNav
          routes={routes}
          direction="horizontal"
        />
      </div>
    </header>
  );
}
```

### With Breadcrumbs

```typescript
function PageHeader() {
  return (
    <div>
      <Breadcrumbs />
      <h1>Page Title</h1>
    </div>
  );
}
```

### Mobile Navigation

```typescript
function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>
        Menu
      </button>
      {isOpen && (
        <div className="mobile-menu">
          <MainNav routes={routes} direction="vertical" />
        </div>
      )}
    </>
  );
}
```

---

## Performance

Navigation components are optimized:
- Route filtering memoized with `useMemo`
- Active state calculation memoized
- Callbacks stabilized with `useCallback`
- Components memoized with `React.memo`
- Minimal re-renders on route changes

---

## Theming

Navigation components use theme tokens:

```typescript
import { tokens, colorTokens } from '@missionfabric-js/enzyme';

// Spacing
gap: tokens.spacing.sm
padding: tokens.spacing.md

// Colors
active: colorTokens.primary.default
inactive: colorTokens.text.secondary
background: colorTokens.interactive.selected

// Typography
fontSize: tokens.fontSize.sm
fontWeight: tokens.fontWeight.medium
```

---

## Best Practices

1. **Role-Based Routes**: Always specify `requiredRoles` for protected routes
2. **Feature Flags**: Use feature flags for experimental or gradual rollouts
3. **Consistent Icons**: Use the same icon set throughout navigation
4. **Badge Updates**: Keep badge counts updated in real-time
5. **Path Labels**: Define custom labels for dynamic routes
6. **Breadcrumb Limits**: Use `maxItems` for deeply nested navigation

---

## Examples

### Admin Navigation

```typescript
const adminRoutes: NavRoute[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: <HomeIcon />,
  },
  {
    id: 'users',
    label: 'Users',
    path: '/admin/users',
    icon: <UsersIcon />,
    badge: pendingUsers,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/admin/settings',
    icon: <CogIcon />,
  },
];
```

### Multi-Level Breadcrumbs

```typescript
const pathLabels = {
  '/projects': 'All Projects',
  '/projects/123': 'Website Redesign',
  '/projects/123/tasks': 'Tasks',
  '/projects/123/tasks/456': 'Update Homepage',
};

<Breadcrumbs pathLabels={pathLabels} maxItems={4} />
```

### Notification Badge

```typescript
const [unreadCount, setUnreadCount] = useState(0);

const routes: NavRoute[] = [
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: <BellIcon />,
    badge: unreadCount > 0 ? unreadCount : undefined,
  },
];
```

---

## See Also

- [Layout Components](./LAYOUT_COMPONENTS.md) - For navigation containers
- [Auth Module](../auth/README.md) - For role-based access
- [Feature Flags](../flags/README.md) - For feature toggles

---

## Related Documentation

### UI Components
- [UI Components Overview](./README.md) - Complete UI component library guide
- [Data Components](./DATA_COMPONENTS.md) - Tables and data display
- [Layout Components](./LAYOUT_COMPONENTS.md) - Page structure and navigation containers
- [Input Components](./INPUT_COMPONENTS.md) - Forms and user input
- [Feedback Components](./FEEDBACK_COMPONENTS.md) - Loading, errors, and notifications

### Theme & Styling
- [Theme System](../theme/README.md) - Theme provider and color palettes
- [Design Tokens](../theme/DESIGN_TOKENS.md) - Colors, spacing, navigation styling
- [Dark Mode](../theme/DARK_MODE.md) - Dark mode navigation styling

### Security & Access
- [Auth Module](../auth/README.md) - Authentication and authorization
- [Feature Flags](../flags/README.md) - Feature toggles for navigation

### Integration
- [Components Reference](../COMPONENTS_REFERENCE.md) - Complete navigation API
- [Layouts](../LAYOUTS.md) - Navigation in adaptive layouts
