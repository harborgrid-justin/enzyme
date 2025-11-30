# Layout Components

> Structural layout components for organizing page content and navigation

## Overview

Layout components provide the structural foundation for your application's UI. They handle page layouts, navigation containers, and responsive layouts while maintaining accessibility and performance.

---

## Page

A standard page wrapper component that provides consistent padding, metadata management, and optional header with actions.

### Location

```
/home/user/enzyme/src/lib/ui/layout/Page.tsx
```

### Features

- Automatic document title and meta description management
- Configurable max-width constraints
- Flexible padding sizes
- Optional page header with title and actions
- Back button support
- Loading state
- Responsive design

### Props

```typescript
interface PageProps {
  title?: string;              // Page title (shown in browser tab and header)
  description?: string;        // Page description for metadata
  children: ReactNode;         // Page content
  className?: string;          // Additional CSS class
  style?: CSSProperties;       // Custom styles
  showTitle?: boolean;         // Show title in page (default: true)
  actions?: ReactNode;         // Header actions (buttons, etc.)
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;         // Loading state (reduces opacity)
  onBack?: () => void;         // Back button handler
}
```

### Max Width Options

| Size | Max Width | Use Case |
|------|-----------|----------|
| sm   | 640px     | Narrow forms, simple content |
| md   | 768px     | Standard forms, articles |
| lg   | 1024px    | Content pages |
| xl   | 1280px    | Dashboard layouts (default) |
| 2xl  | 1536px    | Wide dashboards |
| full | 100%      | Full-width layouts |

### Padding Options

| Size | Padding | Use Case |
|------|---------|----------|
| none | 0       | Full-bleed layouts |
| sm   | 1rem    | Compact layouts |
| md   | 1.5rem  | Standard spacing (default) |
| lg   | 2rem    | Spacious layouts |

### Basic Usage

```typescript
import { Page } from '@missionfabric-js/enzyme';

function DashboardPage() {
  return (
    <Page title="Dashboard" description="Main application dashboard">
      <div>
        {/* Page content */}
      </div>
    </Page>
  );
}
```

### With Actions

```typescript
import { Page, Button } from '@missionfabric-js/enzyme';

function UsersPage() {
  return (
    <Page
      title="Users"
      actions={
        <>
          <Button variant="outline">Export</Button>
          <Button variant="primary">Add User</Button>
        </>
      }
    >
      {/* Content */}
    </Page>
  );
}
```

### With Back Button

```typescript
import { Page } from '@missionfabric-js/enzyme';
import { useNavigate } from 'react-router-dom';

function UserDetailPage() {
  const navigate = useNavigate();

  return (
    <Page
      title="User Details"
      onBack={() => navigate('/users')}
    >
      {/* Content */}
    </Page>
  );
}
```

### Custom Width and Padding

```typescript
<Page
  title="Wide Dashboard"
  maxWidth="2xl"
  padding="lg"
>
  {/* Content */}
</Page>
```

### Loading State

```typescript
function DataPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Page title="Data" isLoading={isLoading}>
      {/* Content appears with reduced opacity while loading */}
    </Page>
  );
}
```

### Without Title Display

```typescript
<Page title="Settings" showTitle={false}>
  {/* Title set in browser tab but not shown in page */}
  <CustomHeader />
  {/* Content */}
</Page>
```

### Visual Appearance

The Page component renders:
- **Document Title**: Updates browser tab title as "Title | App"
- **Meta Description**: Updates page meta description tag
- **Header**: Optional header with back button, title, and actions
- **Main Content**: Wrapped in `<main>` tag with padding
- **Centered Container**: Content centered with max-width constraint

### Accessibility

- Uses semantic `<header>` and `<main>` elements
- Back button has proper `aria-label`
- Page title uses `<h1>` for proper heading hierarchy
- Loading state with opacity transition (no layout shift)

---

## Sidebar

A collapsible sidebar navigation component with nested items and keyboard navigation.

### Location

```
/home/user/enzyme/src/lib/ui/layout/Sidebar.tsx
```

### Features

- Collapsible with smooth animation
- Nested navigation items
- Active item highlighting
- Badges for item counts
- Icon support
- Keyboard navigation (Arrow keys, Home, End)
- Custom header and footer
- Disabled state support
- ARIA compliant

### Props

```typescript
interface SidebarProps {
  items: SidebarItem[];        // Navigation items
  activeId?: string;           // Currently active item ID
  onItemClick?: (item: SidebarItem) => void;
  header?: ReactNode;          // Header content
  footer?: ReactNode;          // Footer content
  collapsed?: boolean;         // Collapsed state
  onCollapsedChange?: (collapsed: boolean) => void;
  width?: number;              // Width when expanded (default: 256)
  collapsedWidth?: number;     // Width when collapsed (default: 64)
}

interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  items?: SidebarItem[];       // Nested items
  badge?: string | number;     // Badge content
  disabled?: boolean;
}
```

### Visual Appearance

The Sidebar renders as:
- **Background**: Dark gray (#1f2937)
- **Text**: Light gray to white
- **Active Item**: Highlighted with darker background (#374151)
- **Hover**: Subtle background change
- **Icons**: Flexbox aligned with labels
- **Badges**: Rounded pills with gray background
- **Collapse Button**: Chevron icon that rotates

### Basic Usage

```typescript
import { Sidebar } from '@missionfabric-js/enzyme';
import { HomeIcon, UsersIcon, SettingsIcon } from '@heroicons/react/24/outline';

function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState('dashboard');

  const items: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <HomeIcon width={20} />,
    },
    {
      id: 'users',
      label: 'Users',
      icon: <UsersIcon width={20} />,
      badge: 5,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon width={20} />,
    },
  ];

  return (
    <Sidebar
      items={items}
      activeId={activeId}
      onItemClick={(item) => setActiveId(item.id)}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
    />
  );
}
```

### With Nested Items

```typescript
const items: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <HomeIcon width={20} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon width={20} />,
    items: [
      { id: 'profile', label: 'Profile' },
      { id: 'security', label: 'Security' },
      { id: 'notifications', label: 'Notifications' },
    ],
  },
];
```

Nested items:
- Expand/collapse with click or Arrow Right/Left keys
- Indented to show hierarchy
- Hidden when sidebar is collapsed
- Marked with chevron icon

### With Header and Footer

```typescript
<Sidebar
  items={items}
  header={
    <div>
      <img src="/logo.svg" alt="Logo" />
      <h2>My App</h2>
    </div>
  }
  footer={
    <div>
      <UserProfile />
    </div>
  }
/>
```

### Keyboard Navigation

The Sidebar supports full keyboard navigation:
- **Arrow Down**: Move to next item
- **Arrow Up**: Move to previous item (wraps to end)
- **Home**: Jump to first item
- **End**: Jump to last item
- **Arrow Right**: Expand item with children
- **Arrow Left**: Collapse item with children
- **Enter**: Activate item

### Collapsed State

When collapsed:
- Shows only icons (no labels)
- Reduces width to 64px (default)
- Tooltips show on icon hover (via `title` attribute)
- Nested items hidden
- Collapse button chevron rotates 180deg

### Accessibility

- `<nav>` element with `aria-label="Main navigation"`
- `role="group"` for nested items with descriptive labels
- `aria-expanded` for expandable items
- `aria-current="page"` for active item
- Focus management with keyboard navigation
- Disabled items properly marked

---

## TopNav

A global top navigation bar with dropdowns, user menu, and search support.

### Location

```
/home/user/enzyme/src/lib/ui/layout/TopNav.tsx
```

### Features

- Logo/brand placement
- Navigation items with dropdowns
- User menu with avatar
- Search integration
- Action buttons
- Fixed or relative positioning
- Custom background color
- Keyboard accessible dropdowns
- Click-outside to close

### Props

```typescript
interface TopNavProps {
  logo?: ReactNode;            // Logo or brand element
  items?: NavItem[];           // Navigation items
  activeId?: string;           // Currently active item ID
  actions?: ReactNode;         // Right-side actions
  user?: {                     // User info for menu
    name: string;
    email?: string;
    avatar?: string;
  };
  userMenuItems?: UserMenuItem[];
  search?: ReactNode;          // Search component
  fixed?: boolean;             // Fixed position at top (default: true)
  backgroundColor?: string;    // Background color (default: white)
  height?: number;             // Height in pixels (default: 64)
}

interface NavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  items?: NavItem[];           // Dropdown items
  disabled?: boolean;
}

interface UserMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  divider?: boolean;           // Show divider before item
}
```

### Visual Appearance

The TopNav renders as:
- **Height**: 64px (default)
- **Background**: White with bottom border
- **Layout**: Flexbox with space-between
- **Logo**: Left side
- **Nav Items**: Center-left
- **Search**: Center (if provided)
- **Actions & User**: Right side
- **Dropdowns**: White cards with shadow, positioned below trigger

### Basic Usage

```typescript
import { TopNav } from '@missionfabric-js/enzyme';

function AppTopNav() {
  const items: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    { id: 'projects', label: 'Projects', href: '/projects' },
    { id: 'team', label: 'Team', href: '/team' },
  ];

  return (
    <TopNav
      logo={<img src="/logo.svg" alt="Company" />}
      items={items}
      activeId="dashboard"
    />
  );
}
```

### With User Menu

```typescript
const userMenuItems: UserMenuItem[] = [
  {
    id: 'profile',
    label: 'Your Profile',
    icon: <UserIcon width={16} />,
    onClick: () => navigate('/profile'),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <CogIcon width={16} />,
    onClick: () => navigate('/settings'),
  },
  { id: 'divider1', label: '', divider: true },
  {
    id: 'signout',
    label: 'Sign Out',
    icon: <ArrowRightOnRectangleIcon width={16} />,
    onClick: handleSignOut,
  },
];

<TopNav
  logo={<Logo />}
  user={{
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatars/john.jpg',
  }}
  userMenuItems={userMenuItems}
/>
```

### With Dropdown Navigation

```typescript
const items: NavItem[] = [
  {
    id: 'products',
    label: 'Products',
    items: [
      { id: 'web', label: 'Web Platform', onClick: () => {} },
      { id: 'mobile', label: 'Mobile Apps', onClick: () => {} },
      { id: 'api', label: 'API', onClick: () => {} },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    items: [
      { id: 'docs', label: 'Documentation', onClick: () => {} },
      { id: 'guides', label: 'Guides', onClick: () => {} },
    ],
  },
];
```

### With Search

```typescript
<TopNav
  logo={<Logo />}
  items={items}
  search={<SearchInput placeholder="Search..." />}
  actions={
    <>
      <IconButton icon={<BellIcon />} aria-label="Notifications" />
      <IconButton icon={<ChatIcon />} aria-label="Messages" />
    </>
  }
/>
```

### Keyboard Navigation

Dropdowns support keyboard navigation:
- **Arrow Down**: Move to next dropdown item
- **Arrow Up**: Move to previous dropdown item
- **Home**: Jump to first dropdown item
- **End**: Jump to last dropdown item
- **Escape**: Close dropdown
- **Enter**: Activate dropdown item

### Fixed vs Relative

```typescript
// Fixed (default) - stays at top on scroll
<TopNav fixed />

// Relative - scrolls with content
<TopNav fixed={false} />
```

When fixed, a spacer div is rendered to prevent content from hiding under the nav.

### Accessibility

- Semantic navigation structure
- `aria-haspopup` and `aria-expanded` for dropdowns
- `role="menu"` and `role="menuitem"` for dropdown items
- User menu labeled with `aria-label="User menu for {name}"`
- Keyboard navigation for all interactive elements
- Click-outside detection for closing menus

---

## Layout Patterns

### App Shell

Combine layout components for a full app shell:

```typescript
import { TopNav, Sidebar, Page } from '@missionfabric-js/enzyme';

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar items={sidebarItems} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopNav logo={<Logo />} user={user} />
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

// Usage
<AppShell>
  <Page title="Dashboard">
    {/* Page content */}
  </Page>
</AppShell>
```

### Responsive Layout

```typescript
function ResponsiveLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        items={items}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      {/* Content */}
    </div>
  );
}
```

---

## Performance

All layout components are optimized:
- Memoized with `React.memo`
- Static styles extracted
- Dynamic styles memoized with `useMemo`
- Stable callbacks with `useCallback`
- Efficient re-render prevention

---

## See Also

- [Navigation Components](./NAVIGATION_COMPONENTS.md) - For navigation links
- [Input Components](./INPUT_COMPONENTS.md) - For action buttons
- [Theme Tokens](../theme/DESIGN_TOKENS.md) - For styling

---

## Related Documentation

### UI Components
- [UI Components Overview](./README.md) - Complete UI component library guide
- [Data Components](./DATA_COMPONENTS.md) - Tables and data display
- [Input Components](./INPUT_COMPONENTS.md) - Forms and user input
- [Feedback Components](./FEEDBACK_COMPONENTS.md) - Loading, errors, and notifications
- [Navigation Components](./NAVIGATION_COMPONENTS.md) - Menus and navigation

### Layouts & Design
- [Layouts Guide](../LAYOUTS.md) - Adaptive and context-aware layouts
- [Advanced Layouts](../layouts/README.md) - Container queries and responsive patterns
- [Design System](../DESIGN_SYSTEM.md) - Design tokens and patterns

### Theme & Styling
- [Theme System](../theme/README.md) - Theme provider and color palettes
- [Design Tokens](../theme/DESIGN_TOKENS.md) - Colors, spacing, typography tokens
- [Dark Mode](../theme/DARK_MODE.md) - Dark mode implementation

### Integration
- [Components Reference](../COMPONENTS_REFERENCE.md) - Complete component API
- [Hooks Reference](../hooks/README.md) - Layout hooks and utilities
