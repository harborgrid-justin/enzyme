# Contributing Guide

Thank you for your interest in contributing to the Harbor React Library! This document provides guidelines and
instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Commit Message Guidelines](#commit-message-guidelines)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept responsibility for mistakes and learn from them

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+ or pnpm 8+
- Git
- TypeScript knowledge
- React 18+ experience

### Setup

```bash
# Clone the repository
git clone https://github.com/harborgrid-justin/white-cross.git
cd white-cross/reuse/templates/react

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run type checking
npm run typecheck
```

### Project Structure

```
lib/
+-- auth/           # Authentication & authorization
+-- api/            # HTTP client & React Query
+-- routing/        # Type-safe routing
+-- flags/          # Feature flags
+-- security/       # Security infrastructure
+-- performance/    # Performance monitoring
+-- hydration/      # Progressive hydration
+-- state/          # State management
+-- hooks/          # Shared hooks
+-- ui/             # UI components
+-- utils/          # Utilities
+-- docs/           # Documentation
+-- index.ts        # Main exports
```

---

## Development Workflow

### 1. Create a Branch

```bash
# For features
git checkout -b feature/my-feature

# For bug fixes
git checkout -b fix/bug-description

# For documentation
git checkout -b docs/update-section
```

### 2. Make Changes

- Follow the [Code Style Guide](#code-style-guide)
- Write tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific tests
npm test -- --grep "useAuth"

# Check types
npm run typecheck

# Run linter
npm run lint
```

### 4. Submit Pull Request

- Follow the [PR Process](#pull-request-process)
- Fill out the PR template completely
- Request reviews from appropriate team members

---

## Code Style Guide

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

| Type               | Convention           | Example           |
|--------------------|----------------------|-------------------|
| Components         | PascalCase           | `UserProfile`     |
| Hooks              | camelCase with `use` | `useAuth`         |
| Functions          | camelCase            | `formatDate`      |
| Constants          | UPPER_SNAKE_CASE     | `DEFAULT_TIMEOUT` |
| Types/Interfaces   | PascalCase           | `UserConfig`      |
| Files (components) | PascalCase           | `UserProfile.tsx` |
| Files (utilities)  | camelCase            | `formatDate.ts`   |

---

## Pull Request Process

### Before Submitting

- [ ] Code follows the style guide
- [ ] Tests pass locally
- [ ] TypeScript compiles without errors
- [ ] Linter passes without warnings
- [ ] Documentation is updated
- [ ] Changelog entry added (if applicable)

### PR Template

```markdown
## Description
Brief description of the changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe tests added/modified.

## Checklist
- [ ] Tests pass
- [ ] Types are correct
- [ ] Documentation updated
- [ ] Changelog updated

## Screenshots (if applicable)
Add screenshots for UI changes.
```

### Review Process

1. Submit PR with completed template
2. Automated checks must pass
3. At least one approval required
4. Address review feedback
5. Squash and merge when approved

---

## Testing Requirements

### Test Coverage

- Minimum 80% code coverage for new code
- Critical paths require 100% coverage
- Integration tests for complex features

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

### Hook Testing

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

---

## Documentation Standards

### JSDoc Comments

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

### README Requirements

Each module should have documentation covering:

1. **Overview** - What the module does
2. **Quick Start** - Basic usage example
3. **API Reference** - All exports with types
4. **Examples** - Common use cases
5. **Best Practices** - Do's and don'ts

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

---

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type       | Description                        |
|------------|------------------------------------|
| `feat`     | New feature                        |
| `fix`      | Bug fix                            |
| `docs`     | Documentation only                 |
| `style`    | Formatting, no code change         |
| `refactor` | Code change, no new feature or fix |
| `perf`     | Performance improvement            |
| `test`     | Adding/updating tests              |
| `chore`    | Maintenance tasks                  |

### Examples

```bash
# Feature
feat(auth): add MFA support with TOTP

# Bug fix
fix(routing): resolve race condition in prefetch

# Documentation
docs(readme): update installation instructions

# Refactor
refactor(api): simplify error handling logic

# Breaking change
feat(auth)!: replace ProtectedRoute with RequireAuth

BREAKING CHANGE: ProtectedRoute has been removed.
Use RequireAuth and RequireRole instead.
```

### Rules

1. Subject line max 72 characters
2. Use imperative mood ("add" not "added")
3. No period at end of subject
4. Separate subject from body with blank line
5. Body should explain what and why, not how

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

- **Documentation**: Check the [docs](./docs/) first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Chat**: Join our Discord/Slack channel

---

## Recognition

Contributors are recognized in:

- The [CHANGELOG](./CHANGELOG.md) for significant contributions
- GitHub's contributor list
- Our documentation

Thank you for contributing!
