# Contributing Guide

Thank you for contributing to @missionfabric-js/enzyme! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

---

## Code of Conduct

We expect all contributors to follow our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers
- Focus on what's best for the community
- Show empathy towards others
- Accept constructive criticism gracefully

---

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git
- Code editor (VS Code recommended)

### First Time Setup

1. **Fork the repository**
   - Visit https://github.com/harborgrid-justin/enzyme
   - Click "Fork" in the top right

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/enzyme.git
   cd enzyme
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/harborgrid-justin/enzyme.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Run tests**
   ```bash
   npm test
   ```

6. **Build the project**
   ```bash
   npm run build
   ```

---

## Development Setup

### VS Code Extensions (Recommended)

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- GitLens
- Error Lens

### VS Code Settings

Add to `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Environment Setup

Create `.env.local` for development:
```bash
VITE_API_URL=http://localhost:3000
VITE_ENABLE_MOCKS=true
```

---

## Project Structure

```
enzyme/
├── src/
│   ├── lib/              # Source code
│   │   ├── api/          # API client module
│   │   ├── auth/         # Authentication module
│   │   ├── config/       # Configuration module
│   │   ├── data/         # Data validation & sync
│   │   ├── feature/      # Feature module system
│   │   ├── flags/        # Feature flags
│   │   ├── hooks/        # Custom React hooks
│   │   ├── monitoring/   # Error tracking
│   │   ├── performance/  # Performance monitoring
│   │   ├── routing/      # Type-safe routing
│   │   ├── state/        # State management
│   │   └── ...
│   └── index.ts          # Main entry point
├── docs/                 # Documentation
├── tests/                # Test files
├── scripts/              # Build scripts
└── package.json
```

### Module Structure

Each module follows this structure:
```
module/
├── index.ts              # Public exports
├── types.ts              # TypeScript types
├── Component.tsx         # React components
├── useHook.ts            # Custom hooks
├── utils.ts              # Utility functions
└── __tests__/            # Tests
```

---

## Development Workflow

### 1. Create a Branch

```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-feature

# Or bug fix branch
git checkout -b fix/bug-description
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clear, focused commits
- Follow code style guidelines
- Add tests for new features
- Update documentation

### 3. Commit Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add user authentication hook"
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test improvements
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

**Examples:**
```bash
feat(auth): add RBAC permission system
fix(api): handle network timeout errors
docs(readme): update installation instructions
refactor(state): simplify store creation
test(hooks): add tests for useAuth hook
```

### 4. Keep Branch Updated

```bash
# Fetch upstream changes
git fetch upstream

# Rebase on main
git rebase upstream/main

# Resolve conflicts if any
# Then continue
git rebase --continue
```

### 5. Push Changes

```bash
git push origin feature/my-feature
```

---

## Code Style

### TypeScript Guidelines

```typescript
// Use explicit types for public APIs
export function useAuth(): AuthContextValue {
  // ...
}

// Use interfaces for object shapes
export interface User {
  id: string;
  email: string;
  roles: Role[];
}

// Use type for unions and primitives
export type Role = 'admin' | 'manager' | 'user' | 'guest';

// Export types alongside implementations
export { useAuth, type AuthContextValue };
```

**Best Practices:**
- Use TypeScript for all code
- Enable strict mode
- Provide explicit types for public APIs
- Use type inference for internal code

**Example:**
```typescript
// Good - Explicit return type for public API
export function createStore<T>(initialState: T): Store<T> {
  // Implementation
}

// Good - Type inference for internal
function helper(value: string) {
  const uppercased = value.toUpperCase(); // Type inferred
  return uppercased;
}

// Bad - Missing types
export function createStore(initialState) {
  // No types
}
```

### Component Guidelines

```tsx
// Use function components with explicit return types
export function MyComponent({ prop1, prop2 }: MyComponentProps): JSX.Element {
  return <div>{/* ... */}</div>;
}

// Define props interfaces
export interface MyComponentProps {
  /** Description of prop1 */
  prop1: string;
  /** Description of prop2 */
  prop2?: number;
}

// Use forwardRef when needed
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ children, ...props }, ref) {
    return <button ref={ref} {...props}>{children}</button>;
  }
);
```

**Best Practices:**
- Use function components
- Use TypeScript for props
- Use hooks instead of classes
- Keep components focused and small

**Example:**
```typescript
interface ButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ onClick, children, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={variant}>
      {children}
    </button>
  );
}
```

### Hook Guidelines

```tsx
// Name hooks with 'use' prefix
export function useMyHook(options: MyHookOptions): MyHookResult {
  // Implementation
}

// Define options and result types
export interface MyHookOptions {
  enabled?: boolean;
  onSuccess?: (data: unknown) => void;
}

export interface MyHookResult {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
}
```

### File Organization

```typescript
// Order of exports in index.ts files:

// 1. Types
export type { MyType, MyInterface };

// 2. Constants
export { MY_CONSTANT, DEFAULT_CONFIG };

// 3. Utilities
export { helperFunction, utilityFunction };

// 4. Hooks
export { useMyHook, useAnotherHook };

// 5. Components
export { MyComponent, AnotherComponent };
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile` |
| Hooks | camelCase with `use` | `useAuth` |
| Functions | camelCase | `formatDate` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| Types/Interfaces | PascalCase | `UserConfig` |
| Files (components) | PascalCase | `UserProfile.tsx` |
| Files (utilities) | camelCase | `formatDate.ts` |

### File Naming

- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Hooks: `camelCase.ts` (e.g., `useAuth.ts`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `types.ts` or `ComponentName.types.ts`
- Tests: `*.test.ts` or `*.test.tsx`

### Import Order

1. React and third-party imports
2. Internal module imports
3. Relative imports
4. Type imports

**Example:**
```typescript
// 1. React and third-party
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal modules
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// 3. Relative imports
import { formatDate } from './utils';
import { Button } from './Button';

// 4. Type imports
import type { User } from './types';
```

### ESLint and Prettier

- Run before committing:
  ```bash
  npm run lint
  npm run format
  ```

- Auto-fix issues:
  ```bash
  npm run lint:fix
  ```

---

## Testing

### Test Requirements

- All new features must have tests
- Bug fixes should include regression tests
- Minimum 80% code coverage for new code
- Critical paths require 100% coverage
- Integration tests for complex features
- Tests should be fast and isolated

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```typescript
// test file: MyComponent.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  describe('rendering', () => {
    it('renders correctly with default props', () => {
      render(<MyComponent />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders children', () => {
      render(<MyComponent>Child content</MyComponent>);
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      const onClick = jest.fn();
      render(<MyComponent onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty data gracefully', () => {
      render(<MyComponent data={[]} />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    });
  });
});
```

### Writing Tests

**Component Tests:**
```typescript
import { render, screen } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('displays user name', () => {
    const user = { id: '1', name: 'John Doe' };
    render(<UserProfile user={user} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

**Hook Tests:**
```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('updates state on action', async () => {
    const { result } = renderHook(() => useMyHook());

    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.data).toBeDefined();
  });
});
```

**Utility Tests:**
```typescript
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2025-01-15');
    expect(formatDate(date)).toBe('January 15, 2025');
  });
});
```

---

## Documentation

### Documentation Requirements

- All public APIs must be documented
- Use JSDoc comments
- Include examples
- Update relevant docs

Each module should have documentation covering:

1. **Overview** - What the module does
2. **Quick Start** - Basic usage example
3. **API Reference** - All exports with types
4. **Examples** - Common use cases
5. **Best Practices** - Do's and don'ts

### JSDoc Format

```typescript
/**
 * Authenticates a user with the provided credentials.
 *
 * @param credentials - User login credentials
 * @param credentials.email - User's email address
 * @param credentials.password - User's password
 * @returns Promise resolving to the authenticated user
 * @throws {AuthError} When authentication fails
 *
 * @example
 * ```typescript
 * const user = await login({
 *   email: 'user@example.com',
 *   password: 'password123',
 * });
 * ```
 */
export async function login(credentials: LoginCredentials): Promise<User> {
  // Implementation
}
```

### Inline Comments

```typescript
// Good: Explains why, not what
// Skip validation for system users to allow automated processes
if (user.type === 'system') {
  return true;
}

// Bad: States the obvious
// Check if user is admin
if (user.role === 'admin') {
  // ...
}
```

### README Updates

Update README.md if you:
- Add new features
- Change installation process
- Modify usage examples
- Add new dependencies

---

## Pull Request Process

### Before Submitting

1. **Run all checks:**
   ```bash
   npm run verify
   ```

2. **Update documentation:**
   - JSDoc comments
   - README if needed
   - CHANGELOG.md

3. **Ensure tests pass:**
   ```bash
   npm test
   ```

### Creating Pull Request

1. **Push your branch:**
   ```bash
   git push origin feature/my-feature
   ```

2. **Create PR on GitHub:**
   - Use descriptive title
   - Fill out PR template
   - Link related issues
   - Add screenshots if UI changes

3. **PR Title Format:**
   ```
   feat(module): brief description
   ```

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. **Automated Checks:**
   - TypeScript compilation
   - ESLint
   - Tests
   - Build

2. **Code Review:**
   - At least one approval required
   - Address feedback
   - Request re-review

3. **Merge:**
   - Squash and merge (default)
   - Delete branch after merge

---

## Release Process

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### Release Checklist

1. **Update version:**
   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG.md:**
   - List all changes
   - Include migration guide if breaking changes

3. **Create git tag:**
   ```bash
   git tag -a v1.0.5 -m "Release 1.0.5"
   ```

4. **Push to GitHub:**
   ```bash
   git push origin main --tags
   ```

5. **Publish to npm:**
   ```bash
   npm publish
   ```

6. **Create GitHub release:**
   - Copy from CHANGELOG
   - Attach binaries if needed

---

## Issue Guidelines

### Bug Reports

```markdown
## Bug Description
Clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- Library version:
- React version:
- Browser:
- OS:

## Screenshots
If applicable.

## Additional Context
Any other relevant information.
```

### Feature Requests

```markdown
## Feature Description
Clear description of the feature.

## Use Case
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches considered.

## Additional Context
Any other relevant information.
```

---

## Getting Help

### Questions?

- Check existing [documentation](../README.md)
- Search [GitHub Issues](https://github.com/harborgrid-justin/enzyme/issues)
- Ask in [GitHub Discussions](https://github.com/harborgrid-justin/enzyme/discussions)

### Need Support?

- Open an [issue](https://github.com/harborgrid-justin/enzyme/issues/new)
- Join our community discussions
- Contact maintainers

---

## Recognition

Contributors are recognized:
- In [CHANGELOG.md](./CHANGELOG.md) for significant contributions
- In GitHub releases
- In project documentation
- GitHub's contributor list

Thank you for contributing to enzyme!

---

**Last Updated:** 2025-11-29
**Version:** 4.0.0
