# Enzyme VS Code Extension - Commands Reference

Complete reference for all commands available in the Enzyme VS Code extension.

## Table of Contents

- [Initialization Commands](#initialization-commands)
- [Generation Commands](#generation-commands)
- [Analysis Commands](#analysis-commands)
- [Refactoring Commands](#refactoring-commands)
- [Validation Commands](#validation-commands)
- [Explorer Commands](#explorer-commands)
- [Panel Commands](#panel-commands)
- [Configuration Commands](#configuration-commands)
- [Debug & Utility Commands](#debug--utility-commands)
- [CLI Commands](#cli-commands)
- [Migration Commands](#migration-commands)

---

## Initialization Commands

### `enzyme.init`
**Title**: Initialize Enzyme Project
**Category**: Enzyme
**Enablement**: Requires workspace folder

Initialize a new Enzyme project with configuration files and project structure.

**What it does:**
- Creates `enzyme.config.ts`
- Sets up project directory structure
- Installs required dependencies
- Configures TypeScript
- Sets up testing framework

**Usage:**
- Command Palette: `Enzyme: Initialize Enzyme Project`
- Walkthrough: Getting Started step 1

---

## Generation Commands

### `enzyme.generate.component`
**Title**: Generate Component
**Category**: Enzyme
**Enablement**: Enzyme project required

Generate a new React component with TypeScript, props interface, and optional tests.

**Features:**
- TypeScript type safety
- Component style (function/arrow)
- Props interface generation
- CSS framework integration
- Optional test file
- Optional Storybook story

**Options:**
- Component name (PascalCase)
- Output directory
- Component style
- Include tests
- Include stories

**Usage:**
- Command Palette: `Enzyme: Generate Component`
- Context Menu: Right-click in TypeScript file
- Keyboard: `Ctrl+Alt+E C` (Windows/Linux) or `Cmd+Alt+E C` (macOS)

**Example Output:**
```typescript
interface UserCardProps {
  name: string;
  email: string;
}

export function UserCard({ name, email }: UserCardProps) {
  return (
    <div className="user-card">
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  );
}
```

---

### `enzyme.generate.feature`
**Title**: Generate Feature
**Category**: Enzyme
**Enablement**: Enzyme project required

Generate a complete feature module with components, routes, state, and API clients.

**What it creates:**
- Feature directory structure
- `feature.config.ts`
- Components folder
- Routes folder
- Store (Zustand)
- API client
- Tests
- Index file with exports

**Options:**
- Feature ID
- Feature name
- Include routes
- Include components
- Include store
- Include API client
- Include tests

**Usage:**
- Command Palette: `Enzyme: Generate Feature`
- Context Menu: Right-click on folder
- Keyboard: `Ctrl+Alt+E F` (Windows/Linux) or `Cmd+Alt+E F` (macOS)

---

### `enzyme.generate.route`
**Title**: Generate Route
**Category**: Enzyme
**Enablement**: Enzyme project required

Generate a new route with optional loader and action functions.

**What it creates:**
- Route component file
- Loader function (optional)
- Action function (optional)
- Route configuration
- TypeScript types

**Options:**
- Route path (e.g., `/users/:id`)
- Route component name
- Include loader
- Include action
- Protected route
- Layout template

**Usage:**
- Command Palette: `Enzyme: Generate Route`
- Keyboard: `Ctrl+Alt+E R` (Windows/Linux) or `Cmd+Alt+E R` (macOS)

**Example:**
```typescript
// routes/users.$id.tsx
export async function loader({ params }: LoaderArgs) {
  const user = await fetchUser(params.id);
  return { user };
}

export default function UserPage() {
  const { user } = useLoaderData<typeof loader>();
  return <UserDetails user={user} />;
}
```

---

### `enzyme.generate.store`
**Title**: Generate Zustand Store
**Category**: Enzyme
**Enablement**: Enzyme project required

Generate a Zustand state store with TypeScript support.

**Features:**
- Type-safe state management
- Actions and selectors
- Persistence (optional)
- Devtools integration (optional)
- Middleware support

**Options:**
- Store name
- State shape
- Include persistence
- Include devtools
- Middleware

**Usage:**
- Command Palette: `Enzyme: Generate Zustand Store`

**Example:**
```typescript
interface UserStore {
  users: User[];
  fetchUsers: () => Promise<void>;
  addUser: (user: User) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  users: [],
  fetchUsers: async () => {
    const users = await apiClient.get('/users');
    set({ users });
  },
  addUser: (user) => set((state) => ({
    users: [...state.users, user]
  }))
}));
```

---

### `enzyme.generate.hook`
**Title**: Generate Custom Hook
**Category**: Enzyme
**Enablement**: Enzyme project required

Generate a custom React hook with TypeScript.

**Features:**
- TypeScript generics support
- Parameter type definitions
- Return type inference
- Optional test file
- JSDoc comments

**Options:**
- Hook name (must start with `use`)
- Parameters
- Return type
- Include tests

**Usage:**
- Command Palette: `Enzyme: Generate Custom Hook`

**Example:**
```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

---

### `enzyme.generate.apiClient`
**Title**: Generate API Client
**Category**: Enzyme
**Enablement**: Enzyme project required

Generate a type-safe API client for backend communication.

**Features:**
- TypeScript request/response types
- Automatic error handling
- Request/response interceptors
- Built on Enzyme's apiClient
- Type-safe endpoints

**Options:**
- Client name
- Base URL
- Endpoints
- Include interceptors
- Include types

**Usage:**
- Command Palette: `Enzyme: Generate API Client`

**Example:**
```typescript
export const userApi = {
  getUsers: () => apiClient.get<User[]>('/api/users'),
  getUser: (id: string) => apiClient.get<User>(`/api/users/${id}`),
  createUser: (data: CreateUserDto) => apiClient.post<User>('/api/users', data),
  updateUser: (id: string, data: UpdateUserDto) =>
    apiClient.put<User>(`/api/users/${id}`, data),
  deleteUser: (id: string) => apiClient.del(`/api/users/${id}`)
};
```

---

### `enzyme.generate.test`
**Title**: Generate Test File
**Category**: Enzyme
**Enablement**: Enzyme project required

Generate a test file for an existing component, hook, or module.

**Features:**
- Vitest or Jest
- Component testing
- Hook testing
- Integration tests
- Coverage configuration

**Usage:**
- Command Palette: `Enzyme: Generate Test File`
- Context Menu: Right-click on file

---

## Analysis Commands

### `enzyme.analyze.performance`
**Title**: Analyze Performance
**Category**: Enzyme
**Enablement**: Enzyme project required

Analyze application performance and identify optimization opportunities.

**What it analyzes:**
- Component render times
- Bundle sizes
- API latency
- Memory usage
- Core Web Vitals (FCP, LCP, FID, CLS)

**Output:**
- Performance dashboard
- Optimization suggestions
- Detailed metrics
- Flame graphs

**Usage:**
- Command Palette: `Enzyme: Analyze Performance`
- Keyboard: `Ctrl+Alt+E P` (Windows/Linux) or `Cmd+Alt+E P` (macOS)

---

### `enzyme.analyze.security`
**Title**: Analyze Security
**Category**: Enzyme
**Enablement**: Enzyme project required

Scan for security vulnerabilities and best practices violations.

**What it checks:**
- Dependency vulnerabilities
- XSS risks
- CSRF protections
- Authentication issues
- API security
- Sensitive data exposure

**Usage:**
- Command Palette: `Enzyme: Analyze Security`

---

### `enzyme.analyze.dependencies`
**Title**: Analyze Dependencies
**Category**: Enzyme
**Enablement**: Enzyme project required

Analyze project dependencies for issues and updates.

**What it analyzes:**
- Outdated packages
- Unused dependencies
- Circular dependencies
- Duplicate packages
- License compatibility
- Bundle impact

**Usage:**
- Command Palette: `Enzyme: Analyze Dependencies`

---

## Refactoring Commands

### `enzyme.refactor.convertToEnzyme`
**Title**: Convert to Enzyme Pattern
**Category**: Enzyme
**Enablement**: Text selection required in TypeScript file

Convert existing code to Enzyme patterns and best practices.

**Conversions:**
- Convert to Enzyme hooks
- Convert to feature structure
- Convert to Enzyme routing
- Convert state management to Zustand
- Convert API calls to apiClient

**Usage:**
- Select code
- Command Palette: `Enzyme: Convert to Enzyme Pattern`
- Context Menu: Right-click on selection

---

### `enzyme.refactor.optimizeImports`
**Title**: Optimize Enzyme Imports
**Category**: Enzyme
**Enablement**: Enzyme project, TypeScript file

Optimize and organize Enzyme imports.

**What it does:**
- Removes unused imports
- Organizes imports by category
- Uses barrel exports
- Removes duplicate imports
- Sorts alphabetically

**Usage:**
- Command Palette: `Enzyme: Optimize Enzyme Imports`

---

### `enzyme.extractFeature`
**Title**: Extract to Feature Module
**Category**: Enzyme Refactor
**Enablement**: Text selection, Enzyme project

Extract selected code into a new feature module.

**Usage:**
- Select code
- Command Palette: `Enzyme: Extract to Feature Module`

---

### `enzyme.extractHook`
**Title**: Extract to Custom Hook
**Category**: Enzyme Refactor
**Enablement**: Text selection, Enzyme project

Extract selected logic into a custom hook.

**Usage:**
- Select code
- Command Palette: `Enzyme: Extract to Custom Hook`

---

### `enzyme.extractComponent`
**Title**: Extract to Component
**Category**: Enzyme Refactor
**Enablement**: Text selection, Enzyme project

Extract selected JSX into a new component.

**Usage:**
- Select JSX
- Command Palette: `Enzyme: Extract to Component`

---

## Validation Commands

### `enzyme.validate.config`
**Title**: Validate Enzyme Config
**Category**: Enzyme
**Enablement**: Enzyme project required

Validate `enzyme.config.ts` for errors and best practices.

**What it validates:**
- Configuration structure
- Required fields
- Type correctness
- Route configurations
- Feature definitions
- API configuration
- Auth configuration

**Usage:**
- Command Palette: `Enzyme: Validate Enzyme Config`

---

### `enzyme.validate.routes`
**Title**: Validate Routes
**Category**: Enzyme
**Enablement**: Enzyme project with routes

Validate route configurations for conflicts and errors.

**What it validates:**
- Path conflicts
- Duplicate routes
- Missing components
- Invalid loaders/actions
- Permission definitions
- Route hierarchy

**Usage:**
- Command Palette: `Enzyme: Validate Routes`

---

### `enzyme.validate.features`
**Title**: Validate Features
**Category**: Enzyme
**Enablement**: Enzyme project with features

Validate feature module structure and configuration.

**What it validates:**
- Feature configuration files
- Directory structure
- Required exports
- Feature dependencies
- Version compatibility

**Usage:**
- Command Palette: `Enzyme: Validate Features`

---

## Explorer Commands

### `enzyme.explorer.refresh`
**Title**: Refresh Explorer
**Category**: Enzyme
**Enablement**: Enzyme project required

Refresh all Enzyme explorer views to show latest project structure.

**Usage:**
- Command Palette: `Enzyme: Refresh Explorer`
- Explorer view toolbar: Click refresh icon

---

### `enzyme.explorer.openFile`
**Title**: Open File
**Category**: Enzyme
**Enablement**: Internal use only

Open a file from the Enzyme explorer. This command is used internally by tree view items.

---

## Panel Commands

### `enzyme.panel.showStateInspector`
**Title**: Open State Inspector
**Category**: Enzyme
**Enablement**: Enzyme project required

Open the State Inspector panel to view and debug application state.

**Features:**
- Real-time state visualization
- State diff tracking
- Time-travel debugging
- State export/import
- Multiple store support

**Usage:**
- Command Palette: `Enzyme: Open State Inspector`

---

### `enzyme.panel.showPerformance`
**Title**: Open Performance Monitor
**Category**: Enzyme
**Enablement**: Enzyme project required

Open the Performance Monitor dashboard.

**Features:**
- Real-time metrics
- Component render times
- Bundle size analysis
- API latency tracking
- Memory profiling

**Usage:**
- Command Palette: `Enzyme: Open Performance Monitor`

---

### `enzyme.panel.showRouteVisualizer`
**Title**: Open Route Visualizer
**Category**: Enzyme
**Enablement**: Enzyme project required

Open the Route Visualizer to see route hierarchy and navigation.

**Features:**
- Interactive route tree
- Route metadata
- Navigation testing
- Protected routes indicator
- Loader/Action indicators

**Usage:**
- Command Palette: `Enzyme: Open Route Visualizer`

---

### `enzyme.panel.showAPIExplorer`
**Title**: Open API Explorer
**Category**: Enzyme
**Enablement**: Enzyme project required

Open the API Explorer to test and document API endpoints.

**Features:**
- Endpoint testing
- Request/response inspection
- API documentation
- Type definitions
- Request history

**Usage:**
- Command Palette: `Enzyme: Open API Explorer`

---

### `enzyme.panel.showSetupWizard`
**Title**: Open Setup Wizard
**Category**: Enzyme

Open the interactive setup wizard for new projects.

**Usage:**
- Command Palette: `Enzyme: Open Setup Wizard`

---

### `enzyme.panel.showFeatureDashboard`
**Title**: Open Feature Dashboard
**Category**: Enzyme
**Enablement**: Enzyme project required

Open the Feature Dashboard to manage feature flags and modules.

**Usage:**
- Command Palette: `Enzyme: Open Feature Dashboard`

---

### `enzyme.panel.showGeneratorWizard`
**Title**: Open Generator Wizard
**Category**: Enzyme
**Enablement**: Enzyme project required

Open the interactive code generator wizard.

**Usage:**
- Command Palette: `Enzyme: Open Generator Wizard`

---

### `enzyme.panel.showWelcome`
**Title**: Show Welcome Page
**Category**: Enzyme

Show the Enzyme welcome page with quick start guide.

**Usage:**
- Command Palette: `Enzyme: Show Welcome Page`

---

## Configuration Commands

### `enzyme.openSettings`
**Title**: Open Extension Settings
**Category**: Enzyme

Open Enzyme extension settings in VS Code settings UI.

**Usage:**
- Command Palette: `Enzyme: Open Extension Settings`

---

### `enzyme.createConfig`
**Title**: Create Configuration File
**Category**: Enzyme
**Enablement**: Workspace folder required

Create a new `enzyme.config.ts` file.

**Usage:**
- Command Palette: `Enzyme: Create Configuration File`

---

### `enzyme.createConfigFromTemplate`
**Title**: Create Config from Template
**Category**: Enzyme
**Enablement**: Workspace folder required

Create configuration from a template (basic, advanced, enterprise).

**Usage:**
- Command Palette: `Enzyme: Create Config from Template`

---

### `enzyme.validateSettings`
**Title**: Validate Extension Settings
**Category**: Enzyme

Validate current extension settings for errors.

**Usage:**
- Command Palette: `Enzyme: Validate Extension Settings`

---

## Debug & Utility Commands

### `enzyme.docs.open`
**Title**: Open Documentation
**Category**: Enzyme

Open Enzyme Framework documentation in browser.

**Usage:**
- Command Palette: `Enzyme: Open Documentation`
- Explorer toolbar: Click documentation icon
- Status bar: Click Enzyme status item

---

### `enzyme.snippets.show`
**Title**: Show Code Snippets
**Category**: Enzyme
**Enablement**: Enzyme project required

Show available Enzyme code snippets.

**Usage:**
- Command Palette: `Enzyme: Show Code Snippets`

---

### `enzyme.telemetry.toggle`
**Title**: Toggle Telemetry
**Category**: Enzyme

Enable or disable anonymous telemetry.

**Usage:**
- Command Palette: `Enzyme: Toggle Telemetry`

---

### `enzyme.debug.showLogs`
**Title**: Show Extension Logs
**Category**: Enzyme

Show the Enzyme output channel with extension logs.

**Usage:**
- Command Palette: `Enzyme: Show Extension Logs`

---

### `enzyme.workspace.detect`
**Title**: Detect Enzyme Project
**Category**: Enzyme
**Enablement**: Workspace folder required

Check if the current workspace contains an Enzyme project.

**Usage:**
- Command Palette: `Enzyme: Detect Enzyme Project`

---

## CLI Commands

### `enzyme.cli.detect`
**Title**: Detect Enzyme CLI
**Category**: Enzyme CLI
**Enablement**: Workspace folder required

Detect if Enzyme CLI is installed and available.

**Usage:**
- Command Palette: `Enzyme CLI: Detect Enzyme CLI`

---

### `enzyme.cli.install`
**Title**: Install Enzyme CLI
**Category**: Enzyme CLI

Install or update Enzyme CLI globally.

**Usage:**
- Command Palette: `Enzyme CLI: Install Enzyme CLI`

---

### `enzyme.cli.version`
**Title**: Show CLI Version
**Category**: Enzyme CLI

Show the currently installed Enzyme CLI version.

**Usage:**
- Command Palette: `Enzyme CLI: Show CLI Version`

---

## Migration Commands

### `enzyme.migration.analyze`
**Title**: Analyze Migration from CRA/Next.js
**Category**: Enzyme
**Enablement**: Workspace folder required

Analyze current project for migration to Enzyme from CRA or Next.js.

**What it analyzes:**
- Source framework detection
- Migration complexity
- Estimated effort
- Breaking changes
- Compatibility issues
- Migration steps

**Usage:**
- Command Palette: `Enzyme: Analyze Migration from CRA/Next.js`

---

## Keyboard Shortcuts

Default keyboard shortcuts for frequently used commands:

| Command | Windows/Linux | macOS |
|---------|--------------|--------|
| Generate Component | `Ctrl+Alt+E C` | `Cmd+Alt+E C` |
| Generate Feature | `Ctrl+Alt+E F` | `Cmd+Alt+E F` |
| Generate Route | `Ctrl+Alt+E R` | `Cmd+Alt+E R` |
| Analyze Performance | `Ctrl+Alt+E P` | `Cmd+Alt+E P` |

To customize keyboard shortcuts:
1. Open Keyboard Shortcuts: `File > Preferences > Keyboard Shortcuts`
2. Search for "Enzyme"
3. Click the pencil icon to edit
4. Press desired key combination

---

## Command Palette Tips

- Type `>enzyme` to see all Enzyme commands
- Commands are organized by category
- Use `@enzyme` to filter Enzyme-related items
- Recent commands appear first

---

## Context Menus

Enzyme commands are available in context menus:

### Editor Context Menu
- Generate Component
- Generate Test
- Convert to Enzyme Pattern

### Explorer Context Menu
- Generate Feature (on folders)
- Generate Component (on folders)

### Explorer View Title
- Refresh Explorer
- Open Documentation

---

## Command Enablement

Commands are enabled based on context:

- **Workspace folder required**: Some commands need an open workspace
- **Enzyme project required**: Many commands only work in Enzyme projects
- **Selection required**: Refactoring commands need text selection
- **Language specific**: Some commands only work in TypeScript/React files

Check command palette for enablement status (grayed out if disabled).

---

## Related Documentation

- [Configuration Guide](./CONFIGURATION.md)
- [API Documentation](./API.md)
- [Getting Started](../walkthroughs/getting-started.md)
- [Main README](../README.md)
