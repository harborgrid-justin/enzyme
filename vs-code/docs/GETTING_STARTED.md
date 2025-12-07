# Getting Started with Enzyme VS Code Extension

Welcome to the Enzyme Framework VS Code Extension! This guide will help you get up and running quickly.

## Prerequisites

- **VS Code**: Version 1.85.0 or higher
- **Node.js**: Version 18 or higher
- **TypeScript**: Basic knowledge recommended

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Click the Extensions icon (or press `Ctrl+Shift+X`)
3. Search for "Enzyme Framework"
4. Click **Install**

### From VSIX File

```bash
code --install-extension enzyme-vscode-*.vsix
```

## Quick Start

### 1. Verify Installation

After installation, you should see:
- Enzyme icon in the Activity Bar (left sidebar)
- "Enzyme Framework" in the Extensions panel

### 2. Open or Create an Enzyme Project

#### Option A: Open Existing Project

If you already have an Enzyme project:
```bash
cd your-enzyme-project
code .
```

The extension will automatically activate when it detects:
- `enzyme.config.ts` or `enzyme.config.js`
- `@missionfabric-js/enzyme` in package.json
- `.enzyme/` directory

#### Option B: Initialize New Project

If starting from scratch:

1. Open a folder in VS Code
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run: `Enzyme: Initialize Enzyme Project`
4. Follow the setup wizard

The wizard will:
- Create project structure
- Generate configuration files
- Set up TypeScript
- Install dependencies
- Configure testing framework

### 3. Verify Detection

Check if Enzyme detected your project:

1. Open Command Palette
2. Run: `Enzyme: Detect Enzyme Project`
3. You should see: "This is an Enzyme project! 🧪"

Look for the Enzyme status bar item: **🧪 Enzyme**

## First Steps

### Generate Your First Component

1. **Using Command Palette:**
   - Press `Ctrl+Shift+P`
   - Type `Enzyme: Generate Component`
   - Enter component name (e.g., `UserCard`)
   - Select location
   - Choose options (tests, styling, etc.)

2. **Using Keyboard Shortcut:**
   - Press `Ctrl+Alt+E C` (Windows/Linux)
   - Or `Cmd+Alt+E C` (macOS)

3. **Using Context Menu:**
   - Right-click in a TypeScript file
   - Select `Enzyme: Generate Component`

**What you get:**
```typescript
import React from 'react';

interface UserCardProps {
  name: string;
  email: string;
  role?: string;
}

export function UserCard({ name, email, role }: UserCardProps) {
  return (
    <div className="user-card">
      <h3>{name}</h3>
      <p>{email}</p>
      {role && <span className="role">{role}</span>}
    </div>
  );
}

export default UserCard;
```

### Create a Feature Module

Features are self-contained modules with components, routes, state, and API.

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `Enzyme: Generate Feature`
3. Enter feature details:
   - **ID**: `user-management`
   - **Name**: `User Management`
   - **Include routes**: Yes
   - **Include store**: Yes
   - **Include API**: Yes
   - **Include tests**: Yes

**Generated structure:**
```
src/features/user-management/
├── components/
│   ├── UserList.tsx
│   ├── UserDetails.tsx
│   └── UserForm.tsx
├── routes/
│   ├── users.tsx
│   └── users.$id.tsx
├── store/
│   └── userStore.ts
├── api/
│   └── userApi.ts
├── types/
│   └── user.types.ts
├── tests/
│   └── userManagement.test.ts
├── feature.config.ts
└── index.ts
```

### Add a Route

1. Press `Ctrl+Alt+E R` (or `Cmd+Alt+E R` on macOS)
2. Enter route path: `/users/:id`
3. Select options:
   - **Include loader**: Yes (for data fetching)
   - **Include action**: No
   - **Protected**: Yes (requires authentication)

**Generated route:**
```typescript
// routes/users.$id.tsx
import { useLoaderData } from 'react-router-dom';
import { userApi } from '../api/userApi';

export async function loader({ params }) {
  const user = await userApi.getUser(params.id);
  return { user };
}

export default function UserDetailsPage() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="user-details">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Create a Zustand Store

1. Open Command Palette
2. Run: `Enzyme: Generate Zustand Store`
3. Configure:
   - **Name**: `userStore`
   - **State shape**: Define your state
   - **Persistence**: Yes
   - **Devtools**: Yes

**Generated store:**
```typescript
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserStore {
  users: User[];
  selectedUser: User | null;
  fetchUsers: () => Promise<void>;
  selectUser: (id: string) => void;
}

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        users: [],
        selectedUser: null,

        fetchUsers: async () => {
          const users = await apiClient.get<User[]>('/api/users');
          set({ users });
        },

        selectUser: (id) => {
          const user = get().users.find(u => u.id === id);
          set({ selectedUser: user || null });
        }
      }),
      { name: 'user-store' }
    )
  )
);
```

## Exploring Your Project

### Enzyme Explorer

The Enzyme Explorer shows your complete project structure:

1. Click the Enzyme icon in the Activity Bar
2. Explore views:
   - **Features**: All feature modules
   - **Routes**: Route hierarchy
   - **Components**: All React components
   - **State Stores**: Zustand stores
   - **API Clients**: API integrations
   - **Performance**: Real-time metrics

### Tree View Actions

Right-click any item for:
- Open file
- Generate test
- Show references
- Analyze performance
- View documentation

## Using Code Snippets

Enzyme provides powerful code snippets to accelerate development.

### Available Snippets

In TypeScript/React files, type:

- `enzyme-component` → Functional React component
- `enzyme-hook` → Custom React hook
- `enzyme-store` → Zustand store
- `enzyme-api` → API client
- `enzyme-route` → Route configuration
- `enzyme-test` → Component test

### Example: Component Snippet

1. Create a new `.tsx` file
2. Type `enzyme-component`
3. Press `Tab`
4. Fill in the placeholders

## Validation & Diagnostics

Enzyme validates your code in real-time.

### Configuration Validation

Run: `Enzyme: Validate Enzyme Config`

Checks:
- Config structure
- Required fields
- Type safety
- Route definitions
- Feature configurations

### Route Validation

Run: `Enzyme: Validate Routes`

Checks:
- Path conflicts
- Missing components
- Invalid loaders/actions
- Permission issues

### View Problems

Open Problems panel: `Ctrl+Shift+M`

You'll see:
- Errors (red squiggles)
- Warnings (yellow squiggles)
- Info messages
- Quick fixes available

## Analysis & Optimization

### Performance Analysis

Run: `Enzyme: Analyze Performance` (or `Ctrl+Alt+E P`)

Analyzes:
- Component render times
- Bundle sizes
- API latency
- Memory usage
- Core Web Vitals

**Results:**
- Performance dashboard
- Optimization suggestions
- Detailed metrics
- Exportable reports

### Security Scanning

Run: `Enzyme: Analyze Security`

Scans for:
- Dependency vulnerabilities
- XSS risks
- CSRF issues
- Authentication problems
- Sensitive data exposure

### Dependency Analysis

Run: `Enzyme: Analyze Dependencies`

Checks:
- Outdated packages
- Unused dependencies
- Circular dependencies
- Duplicate packages
- License compatibility

## Keyboard Shortcuts

Master these shortcuts to boost productivity:

| Action | Windows/Linux | macOS |
|--------|--------------|--------|
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Generate Component | `Ctrl+Alt+E C` | `Cmd+Alt+E C` |
| Generate Feature | `Ctrl+Alt+E F` | `Cmd+Alt+E F` |
| Generate Route | `Ctrl+Alt+E R` | `Cmd+Alt+E R` |
| Analyze Performance | `Ctrl+Alt+E P` | `Cmd+Alt+E P` |
| Open Documentation | (via Command Palette) | (via Command Palette) |

## Configuration

### Recommended Settings

Add to `.vscode/settings.json`:

```json
{
  "enzyme.generator.componentStyle": "function",
  "enzyme.generator.testFramework": "vitest",
  "enzyme.generator.cssFramework": "tailwind",
  "enzyme.validation.onSave": true,
  "enzyme.performance.monitoring.enabled": true,
  "enzyme.imports.autoOptimize": true,
  "enzyme.explorer.autoRefresh": true,
  "enzyme.diagnostics.enabled": true,
  "enzyme.codeLens.enabled": true,
  "enzyme.completion.autoImport": true
}
```

### Customize Code Generation

Choose your preferences:

**Component Style:**
```json
{
  "enzyme.generator.componentStyle": "function" // or "arrow"
}
```

**Test Framework:**
```json
{
  "enzyme.generator.testFramework": "vitest" // or "jest"
}
```

**CSS Framework:**
```json
{
  "enzyme.generator.cssFramework": "tailwind"
  // Options: "css-modules", "styled-components", "emotion"
}
```

## Common Workflows

### Create a New Feature

1. Generate feature: `Enzyme: Generate Feature`
2. Add components: `Enzyme: Generate Component`
3. Create routes: `Enzyme: Generate Route`
4. Add state: `Enzyme: Generate Zustand Store`
5. Create API client: `Enzyme: Generate API Client`
6. Validate: `Enzyme: Validate Features`

### Refactor Existing Code

1. Select code to refactor
2. Right-click → `Enzyme: Convert to Enzyme Pattern`
3. Or extract to:
   - New component
   - Custom hook
   - Feature module

### Debug Performance Issues

1. Run: `Enzyme: Analyze Performance`
2. Review dashboard
3. Click on slow components
4. Apply suggested optimizations
5. Re-run analysis to verify

## Troubleshooting

### Extension Not Activating

**Check:**
1. Enzyme config file exists (`enzyme.config.ts`)
2. Enzyme in package.json dependencies
3. VS Code version 1.85+

**Fix:**
- Reload window: `Ctrl+Shift+P` → "Reload Window"
- Check Output panel → "Enzyme" channel

### Commands Not Appearing

**Check:**
- Enzyme project detected (run `Enzyme: Detect Enzyme Project`)
- TypeScript file is open (for editor commands)

**Fix:**
- Refresh Explorer: Click refresh icon
- Re-open workspace folder

### Slow Performance

**Solutions:**
1. Reduce cache size:
   ```json
   {
     "enzyme.performance.maxCacheSize": 50
   }
   ```

2. Increase debounce:
   ```json
   {
     "enzyme.analysis.debounceMs": 1000
   }
   ```

3. Disable auto-analysis:
   ```json
   {
     "enzyme.analysis.autoRun": false
   }
   ```

### Validation Errors

**Too strict?**
```json
{
  "enzyme.validation.strict": false
}
```

**Disable on save:**
```json
{
  "enzyme.validation.onSave": false
}
```

## Next Steps

Now that you're familiar with the basics:

1. **Explore Documentation**
   - [Configuration Guide](./CONFIGURATION.md)
   - [Commands Reference](./COMMANDS.md)
   - [API Documentation](./API.md)

2. **Try Advanced Features**
   - State Inspector panel
   - Route Visualizer
   - Performance Monitor
   - API Explorer

3. **Join the Community**
   - [GitHub Repository](https://github.com/harborgrid/enzyme)
   - [Documentation](https://enzyme-framework.dev)
   - [Discord Community](https://discord.gg/enzyme)

4. **Customize Your Workflow**
   - Set up keyboard shortcuts
   - Configure code generators
   - Enable experimental features

## Learning Resources

### Official Documentation
- [Enzyme Framework Docs](https://enzyme-framework.dev)
- [API Reference](https://enzyme-framework.dev/api)
- [Examples](https://enzyme-framework.dev/examples)

### Video Tutorials
- Getting Started (5 min)
- Building Features (15 min)
- Advanced Patterns (30 min)

### Sample Projects
- [Enzyme Starter](https://github.com/harborgrid/enzyme-starter)
- [E-commerce Demo](https://github.com/harborgrid/enzyme-ecommerce)
- [Dashboard Template](https://github.com/harborgrid/enzyme-dashboard)

## Get Help

- **Documentation**: [https://enzyme-framework.dev](https://enzyme-framework.dev)
- **GitHub Issues**: [Report bugs](https://github.com/harborgrid/enzyme/issues)
- **Discord**: [Join community](https://discord.gg/enzyme)
- **Extension Logs**: Run `Enzyme: Show Extension Logs`

Happy coding with Enzyme! 🧪
