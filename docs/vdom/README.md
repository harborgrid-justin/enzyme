# Virtual DOM Module System

Modular component composition system for building plugin-based and micro-frontend architectures.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Components](#components)
- [Module Patterns](#module-patterns)
- [Component Composition](#component-composition)
- [Examples](#examples)

## Overview

The VDOM Module System provides a flexible architecture for composing applications from independent modules. It enables plugin-based architectures, micro-frontends, and dynamic component composition.

### Key Features

- **Module Isolation**: Independent module lifecycles
- **Dynamic Loading**: Load modules on demand
- **Slot-based Composition**: Flexible content placement
- **Type-safe APIs**: Full TypeScript support
- **Hierarchical Modules**: Nested module support
- **Context Integration**: Seamless React context usage

## Core Concepts

### Module Architecture

```
┌─────────────────────────────────────────────────┐
│              Application Shell                   │
│  ┌───────────────────────────────────────────┐  │
│  │         ModuleProvider                    │  │
│  │  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │  Module A   │  │  Module B   │        │  │
│  │  │ ┌─────────┐ │  │ ┌─────────┐ │        │  │
│  │  │ │ Slot 1  │ │  │ │ Slot 2  │ │        │  │
│  │  │ └─────────┘ │  │ └─────────┘ │        │  │
│  │  └─────────────┘  └─────────────┘        │  │
│  │                                           │  │
│  │  ┌─────────────────────────┐             │  │
│  │  │    Module Slot          │             │  │
│  │  │  (Dynamic Content)      │             │  │
│  │  └─────────────────────────┘             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Module Lifecycle

```
1. Registration
   │
   ├─> Module registered with provider
   │
2. Initialization
   │
   ├─> Module.init() called
   │
3. Mounting
   │
   ├─> Module component rendered
   │
4. Active
   │
   ├─> Module responds to events
   │
5. Unmounting
   │
   ├─> Module.cleanup() called
   │
6. Unregistration
   │
   └─> Module removed from provider
```

## Components

### ModuleProvider

Root provider for module management.

```tsx
import { ModuleProvider } from '@missionfabric-js/enzyme/vdom';

const dashboardModule = {
  id: 'dashboard',
  name: 'Dashboard Module',
  component: DashboardWidget,
  slots: ['main', 'sidebar']
};

const analyticsModule = {
  id: 'analytics',
  name: 'Analytics Module',
  component: AnalyticsPanel,
  slots: ['main']
};

function App() {
  return (
    <ModuleProvider modules={[dashboardModule, analyticsModule]}>
      <YourApp />
    </ModuleProvider>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modules` | `ModuleDefinition[]` | `[]` | Array of module definitions |
| `onModuleLoad` | `(id: string) => void` | - | Called when module loads |
| `onModuleError` | `(id: string, error: Error) => void` | - | Called on module error |
| `children` | `ReactNode` | - | Child components |

#### ModuleDefinition

```typescript
interface ModuleDefinition {
  // Unique module identifier
  id: string;

  // Display name
  name: string;

  // Module component
  component: ComponentType<any>;

  // Available slots
  slots?: string[];

  // Module initialization
  init?: () => void | Promise<void>;

  // Module cleanup
  cleanup?: () => void;

  // Module configuration
  config?: Record<string, unknown>;

  // Dependencies on other modules
  dependencies?: string[];

  // Load priority
  priority?: number;
}
```

### ModuleBoundary

Error boundary for module isolation.

```tsx
import { ModuleBoundary } from '@missionfabric-js/enzyme/vdom';

function App() {
  return (
    <ModuleBoundary
      fallback={(error) => <ErrorDisplay error={error} />}
      onError={(error, errorInfo) => {
        console.error('Module error:', error, errorInfo);
      }}
    >
      <Module />
    </ModuleBoundary>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fallback` | `ReactNode \| (error: Error) => ReactNode` | - | Error fallback UI |
| `onError` | `(error: Error, errorInfo: ErrorInfo) => void` | - | Error callback |
| `children` | `ReactNode` | - | Module content |

### ModuleSlot

Placeholder for dynamic module content.

```tsx
import { ModuleSlot } from '@missionfabric-js/enzyme/vdom';

function Layout() {
  return (
    <div>
      <header>
        <ModuleSlot name="header" />
      </header>

      <main>
        <ModuleSlot
          name="main"
          fallback={<div>No content</div>}
          maxItems={5}
        />
      </main>

      <aside>
        <ModuleSlot name="sidebar" />
      </aside>
    </div>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Slot identifier |
| `fallback` | `ReactNode` | `null` | Shown when no modules |
| `maxItems` | `number` | - | Maximum modules to show |
| `priority` | `'high' \| 'normal' \| 'low'` | `'normal'` | Rendering priority |
| `className` | `string` | - | Container class name |

## Module Patterns

### Plugin Architecture

```tsx
// Define plugin interface
interface DashboardPlugin {
  id: string;
  title: string;
  icon: ReactNode;
  component: ComponentType;
}

// Create plugins
const revenuePlugin: DashboardPlugin = {
  id: 'revenue',
  title: 'Revenue',
  icon: <DollarIcon />,
  component: RevenueWidget
};

const usersPlugin: DashboardPlugin = {
  id: 'users',
  title: 'Users',
  icon: <UsersIcon />,
  component: UsersWidget
};

// Use with ModuleProvider
function Dashboard() {
  const plugins = [revenuePlugin, usersPlugin];

  const modules = plugins.map(plugin => ({
    id: plugin.id,
    name: plugin.title,
    component: plugin.component,
    slots: ['widgets']
  }));

  return (
    <ModuleProvider modules={modules}>
      <div className="dashboard">
        <h1>Dashboard</h1>
        <ModuleSlot name="widgets" />
      </div>
    </ModuleProvider>
  );
}
```

### Micro-Frontend Pattern

```tsx
// Each team owns a module
const teamAModule = {
  id: 'checkout',
  name: 'Checkout Flow',
  component: lazy(() => import('@team-a/checkout')),
  slots: ['main'],
  dependencies: ['cart']
};

const teamBModule = {
  id: 'product-catalog',
  name: 'Product Catalog',
  component: lazy(() => import('@team-b/catalog')),
  slots: ['main']
};

// Compose in main app
function App() {
  return (
    <ModuleProvider modules={[teamAModule, teamBModule]}>
      <Router>
        <Routes>
          <Route path="/products" element={<ModuleSlot name="catalog" />} />
          <Route path="/checkout" element={<ModuleSlot name="checkout" />} />
        </Routes>
      </Router>
    </ModuleProvider>
  );
}
```

### Dynamic Module Loading

```tsx
import { useModules } from '@missionfabric-js/enzyme/vdom';

function DynamicDashboard() {
  const { registerModule, unregisterModule } = useModules();

  const loadModule = async (moduleId: string) => {
    const module = await import(`./modules/${moduleId}`);

    registerModule({
      id: moduleId,
      name: module.name,
      component: module.default,
      slots: ['widgets']
    });
  };

  const removeModule = (moduleId: string) => {
    unregisterModule(moduleId);
  };

  return (
    <div>
      <button onClick={() => loadModule('analytics')}>
        Load Analytics
      </button>
      <button onClick={() => loadModule('reports')}>
        Load Reports
      </button>
      <button onClick={() => removeModule('analytics')}>
        Remove Analytics
      </button>

      <ModuleSlot name="widgets" />
    </div>
  );
}
```

### Hierarchical Modules

```tsx
// Parent module
const parentModule = {
  id: 'settings',
  name: 'Settings',
  component: SettingsPage,
  slots: ['content']
};

// Child modules
const accountModule = {
  id: 'settings.account',
  name: 'Account Settings',
  component: AccountSettings,
  slots: ['settings.content'],
  dependencies: ['settings']
};

const securityModule = {
  id: 'settings.security',
  name: 'Security Settings',
  component: SecuritySettings,
  slots: ['settings.content'],
  dependencies: ['settings']
};

function App() {
  return (
    <ModuleProvider modules={[parentModule, accountModule, securityModule]}>
      <ModuleSlot name="content">
        {/* Settings page with nested slots */}
        <ModuleSlot name="settings.content" />
      </ModuleSlot>
    </ModuleProvider>
  );
}
```

## Component Composition

### Composable Widgets

```tsx
interface WidgetProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

function Widget({ title, icon, children }: WidgetProps) {
  return (
    <div className="widget">
      <div className="widget-header">
        {icon}
        <h3>{title}</h3>
      </div>
      <div className="widget-content">
        {children}
      </div>
    </div>
  );
}

// Define widget modules
const modules = [
  {
    id: 'revenue',
    name: 'Revenue Widget',
    component: () => (
      <Widget title="Revenue" icon={<DollarIcon />}>
        <RevenueChart />
      </Widget>
    ),
    slots: ['dashboard']
  },
  {
    id: 'users',
    name: 'Users Widget',
    component: () => (
      <Widget title="Active Users" icon={<UsersIcon />}>
        <UsersChart />
      </Widget>
    ),
    slots: ['dashboard']
  }
];
```

### Cross-Module Communication

```tsx
// Use React Context for cross-module communication
const ModuleEventContext = createContext<{
  emit: (event: string, data: unknown) => void;
  on: (event: string, handler: (data: unknown) => void) => () => void;
}>(null);

// Module A (emits event)
function ModuleA() {
  const { emit } = useContext(ModuleEventContext);

  const handleClick = () => {
    emit('item-selected', { id: 123 });
  };

  return <button onClick={handleClick}>Select Item</button>;
}

// Module B (listens for event)
function ModuleB() {
  const { on } = useContext(ModuleEventContext);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    return on('item-selected', (data) => {
      setSelectedId(data.id);
    });
  }, [on]);

  return <div>Selected: {selectedId}</div>;
}
```

### Module Permissions

```tsx
interface ModuleWithPermissions extends ModuleDefinition {
  requiredPermissions: string[];
}

function SecureModuleProvider({ modules, userPermissions }) {
  const allowedModules = modules.filter(module =>
    module.requiredPermissions?.every(perm =>
      userPermissions.includes(perm)
    ) ?? true
  );

  return <ModuleProvider modules={allowedModules} />;
}

// Usage
const modules = [
  {
    id: 'admin',
    name: 'Admin Panel',
    component: AdminPanel,
    requiredPermissions: ['admin']
  },
  {
    id: 'reports',
    name: 'Reports',
    component: Reports,
    requiredPermissions: ['reports.view']
  }
];

<SecureModuleProvider
  modules={modules}
  userPermissions={['reports.view']}
/>
```

## Examples

### Extensible Dashboard

```tsx
import { ModuleProvider, ModuleSlot, ModuleBoundary } from '@missionfabric-js/enzyme/vdom';

// Define dashboard modules
const modules = [
  {
    id: 'overview',
    name: 'Overview',
    component: OverviewWidget,
    slots: ['dashboard-main'],
    priority: 1
  },
  {
    id: 'analytics',
    name: 'Analytics',
    component: AnalyticsWidget,
    slots: ['dashboard-main'],
    priority: 2
  },
  {
    id: 'notifications',
    name: 'Notifications',
    component: NotificationsWidget,
    slots: ['dashboard-sidebar'],
    priority: 1
  }
];

function Dashboard() {
  return (
    <ModuleProvider modules={modules}>
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <ModuleBoundary fallback={<ErrorWidget />}>
            <ModuleSlot name="dashboard-main" />
          </ModuleBoundary>
        </div>

        <aside className="dashboard-sidebar">
          <ModuleBoundary fallback={<div>Sidebar error</div>}>
            <ModuleSlot name="dashboard-sidebar" />
          </ModuleBoundary>
        </aside>
      </div>
    </ModuleProvider>
  );
}
```

### CMS with Plugins

```tsx
// Content editor with plugin system
const editorPlugins = [
  {
    id: 'text-editor',
    name: 'Text Editor',
    component: RichTextEditor,
    slots: ['editor-tools']
  },
  {
    id: 'image-upload',
    name: 'Image Upload',
    component: ImageUploader,
    slots: ['editor-tools']
  },
  {
    id: 'seo-tools',
    name: 'SEO Tools',
    component: SEOTools,
    slots: ['editor-sidebar']
  }
];

function CMSEditor() {
  return (
    <ModuleProvider modules={editorPlugins}>
      <div className="editor-layout">
        <div className="editor-toolbar">
          <ModuleSlot name="editor-tools" />
        </div>

        <div className="editor-content">
          <ContentEditor />
        </div>

        <aside className="editor-sidebar">
          <ModuleSlot name="editor-sidebar" />
        </aside>
      </div>
    </ModuleProvider>
  );
}
```

### Multi-Tenant Application

```tsx
// Each tenant can have different modules
function getTenantModules(tenantId: string) {
  const baseModules = [
    { id: 'dashboard', name: 'Dashboard', component: Dashboard }
  ];

  const premiumModules = [
    { id: 'analytics', name: 'Analytics', component: Analytics },
    { id: 'reports', name: 'Reports', component: Reports }
  ];

  const tenant = getTenant(tenantId);

  return tenant.isPremium
    ? [...baseModules, ...premiumModules]
    : baseModules;
}

function TenantApp({ tenantId }) {
  const modules = getTenantModules(tenantId);

  return (
    <ModuleProvider modules={modules}>
      <Navigation />
      <ModuleSlot name="main-content" />
    </ModuleProvider>
  );
}
```

## Best Practices

1. **Keep Modules Independent**: Minimize dependencies between modules
2. **Use Error Boundaries**: Wrap modules to prevent cascade failures
3. **Define Clear APIs**: Use TypeScript interfaces for module contracts
4. **Lazy Load Modules**: Use React.lazy() for code splitting
5. **Handle Module Lifecycle**: Implement init() and cleanup() methods
6. **Version Your Modules**: Track module versions for compatibility

## API Reference

See the [Advanced Features Overview](../advanced/README.md) for complete API documentation.
