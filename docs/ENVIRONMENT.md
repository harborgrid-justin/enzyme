# Environment Setup Guide

> **Scope**: This document covers environment configuration for the Harbor React Template.
> It includes development setup, environment variables, and multi-environment management.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Variables](#environment-variables)
- [Multi-Environment Configuration](#multi-environment-configuration)
- [Development Environment](#development-environment)
- [IDE Configuration](#ide-configuration)
- [Common Issues](#common-issues)

---

## Overview

The Harbor React Template uses Vite's environment variable system for configuration management. All client-exposed variables must be prefixed with `VITE_` to be accessible in the application.

### Environment Files Hierarchy

```
.env                # Base configuration (all environments)
.env.local          # Local overrides (gitignored)
.env.development    # Development-specific
.env.staging        # Staging-specific
.env.production     # Production-specific
.env.test           # Test-specific
```

**Loading Priority** (highest to lowest):
1. `.env.[mode].local` (gitignored)
2. `.env.[mode]`
3. `.env.local` (gitignored)
4. `.env`

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or 20.x | JavaScript runtime |
| npm | 9.x+ | Package manager |
| Git | 2.x+ | Version control |

### Optional Tools

| Tool | Purpose |
|------|---------|
| Docker | Containerized development |
| VS Code | Recommended IDE |
| nvm | Node version management |

### Verify Installation

```bash
# Check Node.js version
node --version  # Should be v18.x or v20.x

# Check npm version
npm --version   # Should be 9.x+

# Check Git version
git --version   # Should be 2.x+
```

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd harbor-react
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit with your local configuration
nano .env.local
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Environment Variables

### Required Variables

| Variable | Type | Description |
|----------|------|-------------|
| `VITE_API_BASE_URL` | string | Backend API base URL |
| `VITE_APP_ENV` | string | Environment identifier (`development`, `staging`, `production`) |

### Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_API_TIMEOUT` | number | `30000` | API request timeout in milliseconds |
| `VITE_ENABLE_MOCK_API` | boolean | `false` | Enable mock API for development |
| `VITE_LOG_LEVEL` | string | `info` | Logging level (`debug`, `info`, `warn`, `error`) |
| `VITE_ENABLE_ANALYTICS` | boolean | `false` | Enable analytics tracking |
| `VITE_SENTRY_DSN` | string | - | Sentry error tracking DSN |
| `VITE_APP_VERSION` | string | - | Application version for tracking |

### Feature Flags

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_FEATURE_DARK_MODE` | boolean | `true` | Enable dark mode toggle |
| `VITE_FEATURE_NOTIFICATIONS` | boolean | `true` | Enable push notifications |
| `VITE_FEATURE_EXPERIMENTAL` | boolean | `false` | Enable experimental features |

### Example Configuration

```bash
# .env.local (Development)
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_ENV=development
VITE_ENABLE_MOCK_API=true
VITE_LOG_LEVEL=debug

# Feature flags
VITE_FEATURE_DARK_MODE=true
VITE_FEATURE_EXPERIMENTAL=true
```

---

## Multi-Environment Configuration

### Development

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_ENV=development
VITE_ENABLE_MOCK_API=true
VITE_LOG_LEVEL=debug
```

### Staging

```bash
# .env.staging
VITE_API_BASE_URL=https://api.staging.example.com
VITE_APP_ENV=staging
VITE_ENABLE_MOCK_API=false
VITE_LOG_LEVEL=info
VITE_ENABLE_ANALYTICS=true
```

### Production

```bash
# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_APP_ENV=production
VITE_ENABLE_MOCK_API=false
VITE_LOG_LEVEL=error
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Running with Specific Environment

```bash
# Development (default)
npm run dev

# Staging
npm run dev -- --mode staging

# Production preview
npm run build -- --mode production
npm run preview
```

---

## Development Environment

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Fix linting issues |
| `npm run typecheck` | TypeScript type checking |
| `npm run format` | Format code with Prettier |

### Development Server Options

```bash
# Custom port
npm run dev -- --port 3000

# Expose to network
npm run dev -- --host

# Open browser automatically
npm run dev -- --open
```

### Mock API

Enable mock API for offline development:

```bash
# .env.local
VITE_ENABLE_MOCK_API=true
```

Mock handlers are defined in `src/test/mocks/handlers.ts`.

---

## IDE Configuration

### VS Code (Recommended)

#### Extensions

Install recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Error Lens

#### Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.suggest.autoImports": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

#### Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### WebStorm / IntelliJ

1. Enable ESLint: **Preferences > Languages & Frameworks > JavaScript > Code Quality Tools > ESLint**
2. Enable Prettier: **Preferences > Languages & Frameworks > JavaScript > Prettier**
3. Configure path aliases in **tsconfig.json** (already configured)

---

## Accessing Environment Variables

### In Application Code

```typescript
// Access environment variables
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
const mode = import.meta.env.MODE;

// Type-safe access through config
import { env } from '@/config';

const apiUrl = env.apiBaseUrl;
const appEnv = env.appEnv;
```

### Type Definitions

Environment variables are typed in `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  readonly VITE_ENABLE_MOCK_API?: string;
  readonly VITE_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  // Add more variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## Common Issues

### Environment Variables Not Loading

**Symptom**: Variables are `undefined` in the application.

**Causes & Solutions**:

1. **Missing VITE_ prefix**:
   ```bash
   # Wrong
   API_URL=https://api.example.com

   # Correct
   VITE_API_URL=https://api.example.com
   ```

2. **Server not restarted**: Restart dev server after changing `.env` files.

3. **Wrong file location**: Ensure `.env` files are in the project root.

### TypeScript Errors for Environment Variables

**Solution**: Update `src/vite-env.d.ts` with the new variable type.

### Variables Exposed in Production Build

**Warning**: All `VITE_` prefixed variables are bundled into the client code.

**Solution**: Never put secrets in `VITE_` variables. Use server-side APIs for sensitive data.

### Different Values in Build vs Dev

**Cause**: Different `.env` files loaded for different modes.

**Solution**: Verify the correct `.env.[mode]` file exists and has the expected values.

```bash
# Check which mode is being used
npm run build -- --mode staging
```

---

## Security Considerations

### DO NOT include in client environment:

- API keys with write permissions
- Database credentials
- JWT secrets
- Private keys
- Internal service URLs

### Safe to include:

- Public API endpoints
- Feature flags
- Analytics IDs (public)
- Application version
- Environment identifier

---

## Related Documentation

- [Configuration Guide](./CONFIGURATION.md) - Application configuration system
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [Getting Started](./GETTING_STARTED.md) - Quick start guide

---

<p align="center">
  <strong>Harbor React Template</strong><br>
  Environment configuration made simple
</p>
