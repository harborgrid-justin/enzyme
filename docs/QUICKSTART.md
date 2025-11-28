# Quick Start Guide

> **Scope**: This document provides a 10-minute quick start guide for the Harbor React Template.
> For a more comprehensive guide, see [Getting Started](./GETTING_STARTED.md).
> For environment configuration details, see [Environment Setup](./ENVIRONMENT.md).

---

## Table of Contents

1. [What's New in v2.0](#whats-new-in-v20)
2. [Prerequisites](#prerequisites)
3. [Installation](#step-1-clone--install-2-minutes)
4. [Development Setup](#step-2-vscode-setup-1-minute)
5. [Key Commands](#key-commands)
6. [Adding Features](#adding-a-new-feature)
7. [Testing](#step-6-run-tests)
8. [Next Steps](#next-steps)

---

## What's New in v2.0

| Feature | Description | Documentation |
|---------|-------------|---------------|
| **Smart Route Discovery** | Zero-config file-system routing with conflict detection | [Auto-Routes](./AUTO_ROUTES.md) |
| **Enterprise Config Hub** | Single source of truth for all configuration | [Configuration](./CONFIGURATION.md) |
| **Predictive Prefetching** | AI-driven route prefetching using Markov chains | [Performance](./PERFORMANCE.md) |
| **Multi-Tab Sync** | Real-time state synchronization across browser tabs | [State Management](./STATE.md) |
| **Performance Observatory** | Built-in Core Web Vitals monitoring dashboard | [Performance](./PERFORMANCE.md) |
| **Dynamic HTML Streaming** | Progressive HTML delivery with React 18 | [Streaming](./STREAMING.md) |
| **Auto-Prioritized Hydration** | Intelligent component hydration scheduling | [Hydration](./HYDRATION.md) |

---

## Prerequisites

- Node.js 20+
- npm 10+
- VSCode (recommended)

## Step 1: Clone & Install (2 minutes)

```bash
git clone <repository-url> my-app
cd my-app
npm install
```

## Step 2: VSCode Setup (1 minute)

When you open the project in VSCode, you'll be prompted to install recommended extensions. Click "Install All".

The workspace is pre-configured with:
- TypeScript with strict checking
- ESLint with auto-fix on save
- Prettier for formatting
- Tailwind CSS IntelliSense

## Step 3: Environment Setup (1 minute)

```bash
cp .env.example .env.local
```

Edit `.env.local` if you need to change any defaults.

## Step 4: Start Development (30 seconds)

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Step 5: Explore the Template (5 minutes)

### Project Structure

```
src/
├── app/          # App shell, providers, error boundaries
├── config/       # Centralized configuration
├── features/     # Feature modules (vertical slices)
├── lib/          # Shared library code
├── routes/       # Route components
├── test/         # Test utilities and mocks
└── types/        # Global TypeScript types
```

### Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Run tests (watch mode) |
| `npm run test:run` | Run tests once |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Check for linting errors |
| `npm run lint:fix` | Fix linting errors |
| `npm run format` | Format code with Prettier |
| `npm run validate` | Run typecheck + lint + tests |
| `npm run test:e2e` | Run Playwright E2E tests |

### Adding a New Feature

1. Create feature directory: `mkdir -p src/features/my-feature/{components,hooks,wiring}`
2. Copy structure from an existing feature (e.g., `reports`)
3. Export from `src/features/index.ts`

### Key Imports

```typescript
// Configuration
import { env } from '@/config/env';
import { ROUTES, API_CONFIG } from '@/config';

// State management
import { useQuery, useMutation } from '@tanstack/react-query';

// Authentication
import { useAuth, RequireAuth, RequireRole } from '@/lib/auth';

// Feature flags
import { useFeatureFlag, FlagGate } from '@/lib/flags';

// Theme
import { useThemeContext } from '@/lib/theme';
```

### Testing

```typescript
// Import test utilities
import { renderWithProviders, screen, userEvent } from '@/test';

// Write a test
describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Step 6: Run Tests

```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Step 7: Commit Your Changes

Commits are validated to follow Conventional Commits format:

```bash
git add .
git commit -m "feat(auth): add password reset functionality"
```

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

---

## Next Steps

After completing the quick start, explore these guides to deepen your understanding:

### Core Concepts
- [Getting Started Guide](./GETTING_STARTED.md) - Comprehensive introduction
- [Architecture Overview](./ARCHITECTURE.md) - System design and patterns
- [Feature Architecture](./FEATURES.md) - Building feature modules

### Advanced Topics
- [State Management](./STATE.md) - Zustand + TanStack Query patterns
- [Performance Guide](./PERFORMANCE.md) - Optimization strategies
- [Security Guide](./SECURITY.md) - Authentication and authorization

### Reference Documentation
- [Hooks Reference](./HOOKS_REFERENCE.md) - All custom hooks
- [Components Reference](./COMPONENTS_REFERENCE.md) - UI component library
- [Config Reference](./CONFIG_REFERENCE.md) - Configuration options
- [API Documentation](./API.md) - Data fetching patterns

### Migration
- [Migration Guide](./MIGRATION.md) - From Next.js, CRA, or Vite

---

## Related Documentation

- [Documentation Index](./INDEX.md) - Complete documentation map
- [Design System](./DESIGN_SYSTEM.md) - Design tokens and styling
- [Auto-Routing](./AUTO_ROUTES.md) - File-system based routing
- [Testing Guide](./TESTING.md) - Unit, integration, and E2E testing

---

<p align="center">
  <strong>Quick Start Guide</strong><br>
  Get productive in minutes
</p>
