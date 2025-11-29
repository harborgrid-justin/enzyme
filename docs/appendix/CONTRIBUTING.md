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

### TypeScript

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

### React Components

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
- Maintain or improve code coverage
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
import { renderHook } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
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

### JSDoc Format

```typescript
/**
 * Creates an authenticated API client
 *
 * @param config - Client configuration
 * @returns Configured API client instance
 *
 * @example
 * ```typescript
 * const client = createApiClient({
 *   baseURL: 'https://api.example.com',
 *   timeout: 10000,
 * });
 * ```
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  // Implementation
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
- In CHANGELOG.md
- In GitHub releases
- In project documentation

Thank you for contributing to enzyme! 🎉

---

**Last Updated:** 2025-11-29
**Version:** 1.0.5
