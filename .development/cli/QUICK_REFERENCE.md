# Enzyme CLI Generators - Quick Reference

## Quick Start

```bash
# Install CLI globally (when published)
npm install -g @missionfabric-js/enzyme-cli

# Or use npx
npx @missionfabric-js/enzyme-cli generate <type> <name>
```

## Command Syntax

```bash
enzyme generate <type> <name> [options]
enzyme g <type> <name> [options]  # Short form
```

## Generators Cheat Sheet

| Generator | Command | Common Options |
|-----------|---------|----------------|
| Component | `enzyme g component <name>` | `--type ui --with-test --with-story --memo --forward-ref` |
| Hook | `enzyme g hook <name>` | `--type query --with-test` |
| Page | `enzyme g page <name>` | `--with-query --with-state --with-form` |
| Route | `enzyme g route <path>` | `--layout --loader --action --lazy --guard` |
| Module | `enzyme g module <name>` | `--full` or `--with-routes --with-state --with-api` |
| Slice | `enzyme g slice <name>` | `--with-crud --with-selectors` |
| Service | `enzyme g service <name>` | `--with-crud --with-cache --with-optimistic` |

## Common Examples

### 1. Create a UI Component
```bash
# Full-featured button component
enzyme g component Button --type ui --with-test --with-story --memo --forward-ref

# Simple card component
enzyme g component Card --type feature --memo
```

### 2. Create a Custom Hook
```bash
# React Query data fetching hook
enzyme g hook useUsers --type query --with-test

# State management hook
enzyme g hook useCounter --type state

# Custom hook
enzyme g hook useDebounce --type custom
```

### 3. Create a Page
```bash
# Dashboard with data fetching
enzyme g page Dashboard --with-query --with-state

# Settings page with form
enzyme g page Settings --with-form

# About page (simple)
enzyme g page About
```

### 4. Create a Route
```bash
# User detail route with loader
enzyme g route /users/:id --layout MainLayout --loader --action

# Admin route with guard
enzyme g route /admin/settings --lazy --guard RequireAdmin

# Simple route
enzyme g route /contact
```

### 5. Create a Full Module
```bash
# Complete feature module
enzyme g module Users --full

# Module with specific features
enzyme g module Products --with-routes --with-api --with-state

# Minimal module
enzyme g module Notifications --with-components
```

### 6. Create a State Slice
```bash
# CRUD slice with selectors
enzyme g slice users --with-crud --with-selectors

# Simple counter slice
enzyme g slice counter

# Slice with persistence
enzyme g slice preferences --with-persistence
```

### 7. Create an API Service
```bash
# Full CRUD API service
enzyme g service users --with-crud --with-cache --with-optimistic

# Simple API service
enzyme g service notifications --with-cache

# Custom endpoints
enzyme g service analytics
```

## Component Types

### Component Generator
- **ui** - UI components (buttons, inputs, cards)
- **feature** - Feature-specific components
- **shared** - Shared/common components
- **layout** - Layout components (headers, footers, sidebars)

### Hook Generator
- **query** - React Query data fetching
- **mutation** - React Query mutations
- **state** - State management
- **effect** - Effects with cleanup
- **callback** - Memoized callbacks
- **custom** - General-purpose hooks

## Global Options

| Option | Description |
|--------|-------------|
| `--force` | Overwrite existing files |
| `--dry-run` | Preview without writing files |
| `--verbose` | Detailed logging |
| `--skip-prompts` | Use default values |
| `--target-dir <path>` | Custom target directory |

## File Locations

Generated files are placed in standard locations:

```
src/
├── components/
│   ├── ui/              # UI components
│   ├── features/        # Feature components
│   ├── shared/          # Shared components
│   └── layouts/         # Layout components
├── hooks/               # Custom hooks
├── pages/               # Page components
├── routes/              # Route files
├── lib/                 # Feature modules
├── state/
│   └── slices/          # Zustand slices
└── services/            # API services
```

## Generated File Structure

### Component
```
components/ui/Button/
├── Button.tsx           # Component
├── index.ts             # Exports
├── Button.test.tsx      # Tests (optional)
├── Button.stories.tsx   # Stories (optional)
└── Button.styles.ts     # Styles (optional)
```

### Hook
```
hooks/useUsers/
├── useUsers.ts          # Hook implementation
├── index.ts             # Exports
└── useUsers.test.ts     # Tests (optional)
```

### Module
```
lib/users/
├── index.ts             # Module exports
├── README.md            # Documentation
├── types.ts             # TypeScript types
├── components/          # Feature components
├── hooks/               # Custom hooks
├── api/                 # API service
├── state/               # State slice
└── routes/              # Route definitions
```

## Tips & Tricks

### 1. Batch Generation
```bash
# Generate multiple components
for comp in Button Input Select; do
  enzyme g component $comp --type ui --with-test
done
```

### 2. Custom Paths
```bash
# Generate in custom location
enzyme g component SpecialButton --path src/features/admin/components
```

### 3. Dry Run First
```bash
# Preview what will be generated
enzyme g module Users --full --dry-run

# Then actually generate
enzyme g module Users --full
```

### 4. Verbose Logging
```bash
# See detailed information
enzyme g component Button --verbose
```

### 5. Force Overwrite
```bash
# Overwrite existing files
enzyme g component Button --force
```

## Code Examples

### Using Generated Component
```tsx
import { Button } from '@/components/ui/Button';

function App() {
  return <Button variant="primary">Click me</Button>;
}
```

### Using Generated Hook
```tsx
import { useUsers } from '@/hooks/useUsers';

function UserList() {
  const { data, isLoading } = useUsers();

  if (isLoading) return <div>Loading...</div>;

  return <ul>{data?.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

### Using Generated Service
```tsx
import { useUsersQuery, useCreateUserMutation } from '@/services/usersService';

function Users() {
  const { data: users } = useUsersQuery();
  const createUser = useCreateUserMutation();

  const handleCreate = () => {
    createUser.mutate({ name: 'New User' });
  };

  return (
    <div>
      {users?.map(user => <div key={user.id}>{user.name}</div>)}
      <button onClick={handleCreate}>Add User</button>
    </div>
  );
}
```

### Using Generated Slice
```tsx
import { create } from 'zustand';
import { usersSlice } from '@/state/slices/usersSlice';

const useStore = create(usersSlice);

function UserCounter() {
  const count = useStore(state => state.items.length);
  return <div>Users: {count}</div>;
}
```

## Troubleshooting

### Common Issues

**Issue**: "Generator failed - name already exists"
```bash
# Solution: Use --force to overwrite
enzyme g component Button --force
```

**Issue**: "Invalid component name"
```bash
# Solution: Use PascalCase for components
enzyme g component MyButton  # ✓ Good
enzyme g component my-button # ✗ Bad
```

**Issue**: "Hook name must start with 'use'"
```bash
# Solution: Prefix with 'use'
enzyme g hook useCustomHook  # ✓ Good
enzyme g hook customHook     # ✗ Bad
```

## Configuration

Create `enzyme.config.js` in your project root:

```javascript
export default {
  generators: {
    component: {
      defaultType: 'ui',
      withTest: true,
      withStory: false,
      memo: true,
      forwardRef: false,
    },
    hook: {
      defaultType: 'custom',
      withTest: true,
    },
    // ... other generator configs
  },
};
```

## Help Commands

```bash
# General help
enzyme --help
enzyme generate --help

# Generator-specific help
enzyme g component --help
enzyme g hook --help
enzyme g module --help
```

## More Information

- **Full Documentation**: See `README.md` in `cli/src/generators/`
- **Implementation Details**: See `GENERATORS_IMPLEMENTATION.md`
- **Summary**: See `GENERATOR_SUMMARY.md`

---

**Quick Reference Version**: 1.0.0
**Last Updated**: November 30, 2025
