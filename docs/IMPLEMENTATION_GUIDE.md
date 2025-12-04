# Enzyme Modularity Implementation Guide
## Practical Examples Based on Lodash Best Practices

This guide provides **copy-paste ready code** to implement lodash-inspired modularity patterns in Enzyme.

---

## 1. Create Core Build

### Step 1: Create `src/core.ts`

```typescript
/**
 * Enzyme Core - Essential features only
 * Bundle size: ~30 kB (gzipped: ~10 kB)
 *
 * Includes:
 * - Core provider and configuration
 * - Essential hooks
 * - Basic routing
 * - State management
 *
 * Excludes:
 * - UI components
 * - Theme system
 * - Monitoring
 * - Advanced features
 */

// Core provider
export { EnzymeProvider } from './lib/core/EnzymeProvider';
export type { EnzymeConfig } from './lib/core/types';

// Essential hooks
export { useEnzyme } from './lib/hooks/useEnzyme';
export { useConfig } from './lib/hooks/useConfig';

// Routing essentials
export { createRoute } from './lib/routing/createRoute';
export { useRouter } from './lib/routing/useRouter';
export { useParams } from './lib/routing/useParams';
export { useNavigate } from './lib/routing/useNavigate';
export type { Route, RouteConfig } from './lib/routing/types';

// State management
export { createStore } from './lib/state/createStore';
export { useStore } from './lib/state/useStore';
export type { Store, StoreConfig } from './lib/state/types';

// Context
export { useAppContext } from './lib/contexts/AppContext';

// Shared utilities (minimal)
export { cn } from './lib/shared/cn';
export { createId } from './lib/shared/createId';
```

### Step 2: Update `package.json`

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./core": {
      "types": "./dist/core.d.ts",
      "import": "./dist/core.mjs",
      "require": "./dist/core.js"
    }
  }
}
```

### Step 3: Update `vite.config.ts`

```typescript
const createEntryPoints = () => {
  const entries: Record<string, string> = {
    index: resolve(__dirname, 'src/index.ts'),
    core: resolve(__dirname, 'src/core.ts'),  // Add core entry
  };

  // Add lib subdirectories
  const libDirs = getLibSubdirectories();
  libDirs.forEach(dir => {
    entries[`lib/${dir}/index`] = resolve(__dirname, `src/lib/${dir}/index.ts`);
  });

  return entries;
};
```

### Step 4: Document Usage

```typescript
// Full build (all features)
import { EnzymeProvider, FeatureFlags, Monitoring } from '@missionfabric-js/enzyme';

// Core build (essential features only)
import { EnzymeProvider, createRoute, createStore } from '@missionfabric-js/enzyme/core';
```

---

## 2. Add Bundle Size Analysis

### Install Dependencies

```bash
npm install -D rollup-plugin-visualizer @size-limit/preset-small-lib size-limit
```

### Update `vite.config.ts`

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/lib', 'src/types'],
    }),
    visualizer({
      filename: './dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // sunburst, treemap, network
    }),
  ],
});
```

### Create `.size-limit.json`

```json
[
  {
    "name": "Full build",
    "path": "dist/index.mjs",
    "limit": "50 kB"
  },
  {
    "name": "Core build",
    "path": "dist/core.mjs",
    "limit": "15 kB"
  },
  {
    "name": "Auth module",
    "path": "dist/lib/auth/index.mjs",
    "limit": "5 kB"
  },
  {
    "name": "Routing module",
    "path": "dist/lib/routing/index.mjs",
    "limit": "8 kB"
  }
]
```

### Add Scripts to `package.json`

```json
{
  "scripts": {
    "build": "npm run clean && vite build",
    "analyze": "vite build && open dist/stats.html",
    "size": "npm run build && size-limit",
    "size:why": "npm run build && size-limit --why"
  }
}
```

### Add GitHub Action for Size Tracking

```yaml
# .github/workflows/size.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 3. Setup TypeDoc Documentation

### Install TypeDoc

```bash
npm install -D typedoc typedoc-plugin-markdown
```

### Create `typedoc.json`

```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "README.md",
  "categorizeByGroup": true,
  "categoryOrder": [
    "Core",
    "Routing",
    "State",
    "Hooks",
    "Components",
    "Utilities",
    "*"
  ],
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/node_modules/**"
  ],
  "excludePrivate": true,
  "excludeProtected": true,
  "includeVersion": true,
  "gitRevision": "main",
  "githubPages": false
}
```

### Add Scripts

```json
{
  "scripts": {
    "docs": "typedoc",
    "docs:watch": "typedoc --watch",
    "docs:json": "typedoc --json docs/api.json"
  }
}
```

### Create Documentation Structure

```typescript
// Example: Add JSDoc comments for TypeDoc

/**
 * Creates a new store with the given configuration
 *
 * @category State
 * @example
 * ```typescript
 * const userStore = createStore({
 *   initialState: { name: '', email: '' },
 *   actions: {
 *     setName: (state, name) => ({ ...state, name })
 *   }
 * });
 * ```
 *
 * @param config - Store configuration
 * @returns Store instance
 */
export function createStore<T>(config: StoreConfig<T>): Store<T> {
  // implementation
}
```

---

## 4. Enhanced Conditional Exports

### Add Browser/Node.js Optimizations

Update `package.json`:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "node": {
        "development": {
          "import": "./dist/index.development.mjs",
          "require": "./dist/index.development.js"
        },
        "production": {
          "import": "./dist/index.production.mjs",
          "require": "./dist/index.production.js"
        },
        "default": {
          "import": "./dist/index.mjs",
          "require": "./dist/index.js"
        }
      },
      "browser": {
        "development": "./dist/index.browser.development.mjs",
        "production": "./dist/index.browser.production.mjs",
        "default": "./dist/index.browser.mjs"
      },
      "default": "./dist/index.mjs"
    },
    "./monitoring": {
      "types": "./dist/lib/monitoring/index.d.ts",
      "browser": "./dist/lib/monitoring/index.browser.mjs",
      "node": "./dist/lib/monitoring/index.node.mjs",
      "default": "./dist/lib/monitoring/index.mjs"
    }
  }
}
```

### Update Vite Config for Multiple Builds

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

const createConfig = (env: 'development' | 'production', platform: 'node' | 'browser') => {
  return defineConfig({
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
      '__PLATFORM__': JSON.stringify(platform),
    },
    build: {
      minify: env === 'production' ? 'terser' : false,
      sourcemap: env === 'development',
      lib: {
        entry: createEntryPoints(),
        fileName: (format, entryName) => {
          const ext = format === 'es' ? 'mjs' : 'js';
          return `${entryName}.${platform}.${env}.${ext}`;
        },
      },
    },
  });
};

// Build script to generate all variants
export async function buildAll() {
  await build(createConfig('development', 'node'));
  await build(createConfig('production', 'node'));
  await build(createConfig('development', 'browser'));
  await build(createConfig('production', 'browser'));
}
```

---

## 5. Method-Level Exports (Advanced)

### Enable Fine-Grained Imports

Update `package.json` for hook-level imports:

```json
{
  "exports": {
    "./hooks/useAuth": {
      "types": "./dist/lib/hooks/useAuth.d.ts",
      "import": "./dist/lib/hooks/useAuth.mjs",
      "require": "./dist/lib/hooks/useAuth.js"
    },
    "./hooks/useRouter": {
      "types": "./dist/lib/hooks/useRouter.d.ts",
      "import": "./dist/lib/hooks/useRouter.mjs",
      "require": "./dist/lib/hooks/useRouter.js"
    }
  }
}
```

Or use subpath patterns (Node.js 17+):

```json
{
  "exports": {
    "./hooks/*": {
      "types": "./dist/lib/hooks/*.d.ts",
      "import": "./dist/lib/hooks/*.mjs",
      "require": "./dist/lib/hooks/*.js"
    }
  }
}
```

### Usage

```typescript
// Ultra-optimized imports
import { useAuth } from '@missionfabric-js/enzyme/hooks/useAuth';
import { useRouter } from '@missionfabric-js/enzyme/hooks/useRouter';

// Instead of
import { useAuth, useRouter } from '@missionfabric-js/enzyme/hooks';
```

---

## 6. Create Lite Package (Multi-Package Strategy)

### Setup Monorepo Structure

```bash
# Convert to monorepo
mkdir -p packages/enzyme packages/enzyme-lite packages/enzyme-server

# Move current code to packages/enzyme
mv src packages/enzyme/
mv package.json packages/enzyme/
```

### Create Workspace `package.json`

```json
{
  "name": "@missionfabric-js/enzyme-monorepo",
  "private": true,
  "version": "1.1.0",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "publish": "npm run publish --workspaces --access public",
    "version": "node scripts/sync-versions.js"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1"
  }
}
```

### Create `packages/enzyme-lite/package.json`

```json
{
  "name": "@missionfabric-js/enzyme-lite",
  "version": "1.1.0",
  "description": "Enzyme core features without UI components",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0"
  },
  "dependencies": {
    "zustand": "^5.0.8",
    "zod": "^4.1.13"
  }
}
```

### Create `packages/enzyme-lite/src/index.ts`

```typescript
// Re-export only core features from main enzyme package
export {
  // Core
  EnzymeProvider,
  useEnzyme,

  // Routing
  createRoute,
  useRouter,
  useParams,
  useNavigate,

  // State
  createStore,
  useStore,

  // Hooks
  useAuth,
  useConfig,

  // Utils (minimal)
  cn,
} from '@missionfabric-js/enzyme';

// Or bundle separately with own build
```

### Version Synchronization Script

```typescript
// scripts/sync-versions.js
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const rootPkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = rootPkg.version;

console.log(`Syncing version to ${version}...`);

const packages = glob.sync('./packages/*/package.json');
packages.forEach(pkgPath => {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;

  // Update internal dependencies
  if (pkg.dependencies) {
    Object.keys(pkg.dependencies).forEach(dep => {
      if (dep.startsWith('@missionfabric-js/enzyme')) {
        pkg.dependencies[dep] = version;
      }
    });
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated ${pkgPath}`);
});

console.log('Version sync complete!');
```

### Setup Changesets (Recommended)

```bash
npx changeset init

# .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [
    ["@missionfabric-js/enzyme", "@missionfabric-js/enzyme-lite"]
  ],
  "access": "public",
  "baseBranch": "main"
}
```

---

## 7. Automated README Generation

### Create `scripts/update-readme.ts`

```typescript
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Get bundle sizes
function getBundleSizes() {
  const stats = JSON.parse(readFileSync('./dist/stats.json', 'utf-8'));
  return {
    full: formatSize(stats.full),
    core: formatSize(stats.core),
    auth: formatSize(stats.auth),
  };
}

// Get package version
function getVersion() {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  return pkg.version;
}

// Generate badges
function generateBadges(version: string) {
  return `
[![npm version](https://img.shields.io/npm/v/@missionfabric-js/enzyme.svg)](https://www.npmjs.com/package/@missionfabric-js/enzyme)
[![npm downloads](https://img.shields.io/npm/dm/@missionfabric-js/enzyme.svg)](https://www.npmjs.com/package/@missionfabric-js/enzyme)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@missionfabric-js/enzyme)](https://bundlephobia.com/package/@missionfabric-js/enzyme)
[![License](https://img.shields.io/npm/l/@missionfabric-js/enzyme.svg)](https://github.com/harborgrid-justin/enzyme/blob/main/LICENSE)
  `.trim();
}

// Generate bundle size table
function generateBundleTable(sizes: any) {
  return `
## Bundle Sizes

| Import Pattern | Size (min) | Size (gzip) | Use Case |
|----------------|-----------|-------------|----------|
| Full build | ${sizes.full.min} | ${sizes.full.gzip} | All features |
| Core build | ${sizes.core.min} | ${sizes.core.gzip} | Essential only |
| Auth module | ${sizes.auth.min} | ${sizes.auth.gzip} | Authentication |
  `.trim();
}

// Generate API links
function generateApiLinks() {
  const modules = [
    'auth', 'routing', 'state', 'hooks',
    'ui', 'monitoring', 'performance'
  ];

  return modules.map(mod =>
    `- [${capitalize(mod)}](./docs/api/${mod}.md)`
  ).join('\n');
}

// Main function
async function updateReadme() {
  const version = getVersion();
  const badges = generateBadges(version);
  const sizes = getBundleSizes();
  const bundleTable = generateBundleTable(sizes);
  const apiLinks = generateApiLinks();

  const readme = `
# Enzyme

${badges}

Enterprise React framework with advanced routing, state management, and performance optimizations.

## Features

- 🚀 Advanced routing with code splitting
- 🔐 Built-in authentication and RBAC
- 📊 State management with Zustand
- ⚡ Performance optimizations
- 🎨 Theme system with dark mode
- 📱 Responsive UI components
- 🔍 Feature flags
- 📈 Monitoring and analytics

${bundleTable}

## Installation

\`\`\`bash
npm install @missionfabric-js/enzyme
\`\`\`

## Quick Start

\`\`\`typescript
import { EnzymeProvider, createRoute } from '@missionfabric-js/enzyme';

// Configure your app
const config = {
  router: {
    routes: [
      createRoute({
        path: '/',
        component: () => import('./pages/Home'),
      }),
    ],
  },
};

// Wrap your app
function App() {
  return (
    <EnzymeProvider config={config}>
      <YourApp />
    </EnzymeProvider>
  );
}
\`\`\`

## API Reference

${apiLinks}

## License

MIT © Defendr Team
  `.trim();

  writeFileSync('README.md', readme + '\n');
  console.log('README.md updated!');
}

updateReadme();
```

### Add to Build Process

```json
{
  "scripts": {
    "build": "npm run clean && vite build && npm run docs && npm run readme",
    "readme": "tsx scripts/update-readme.ts"
  }
}
```

---

## 8. Validate Exports Configuration

### Install Validation Tool

```bash
npm install -D @arethetypeswrong/cli publint
```

### Add Validation Scripts

```json
{
  "scripts": {
    "validate:exports": "attw --pack .",
    "validate:package": "publint",
    "validate": "npm run validate:exports && npm run validate:package"
  }
}
```

### Add to CI

```yaml
# .github/workflows/validate.yml
name: Package Validation

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run validate
```

---

## 9. Complete Usage Examples

### Optimal Import Patterns

```typescript
// ❌ BAD - Imports everything
import * as Enzyme from '@missionfabric-js/enzyme';

// ⚠️ OK - Named imports (tree-shakeable if properly configured)
import { EnzymeProvider, useAuth, Button } from '@missionfabric-js/enzyme';

// ✅ BETTER - Category imports
import { EnzymeProvider } from '@missionfabric-js/enzyme';
import { useAuth } from '@missionfabric-js/enzyme/auth';
import { Button } from '@missionfabric-js/enzyme/ui';

// ✅ BEST - Core build for minimal bundle
import { EnzymeProvider, createRoute, createStore } from '@missionfabric-js/enzyme/core';
```

### Progressive Enhancement

```typescript
// Start with full build during development
import { EnzymeProvider } from '@missionfabric-js/enzyme';

// Optimize for production
import { EnzymeProvider } from '@missionfabric-js/enzyme/core';
import { FeatureFlags } from '@missionfabric-js/enzyme/flags';
import { Monitoring } from '@missionfabric-js/enzyme/monitoring';
```

### Code Splitting with Lazy Loading

```typescript
import { lazy } from 'react';

// Lazy load heavy modules
const Monitoring = lazy(() =>
  import('@missionfabric-js/enzyme/monitoring').then(m => ({
    default: m.MonitoringProvider
  }))
);

const FeatureFlags = lazy(() =>
  import('@missionfabric-js/enzyme/flags').then(m => ({
    default: m.FeatureFlagsProvider
  }))
);

function App() {
  return (
    <EnzymeProvider>
      <Suspense fallback={<Loading />}>
        <Monitoring>
          <FeatureFlags>
            <YourApp />
          </FeatureFlags>
        </Monitoring>
      </Suspense>
    </EnzymeProvider>
  );
}
```

---

## 10. Performance Budget

### Create `.bundlewatch.config.json`

```json
{
  "files": [
    {
      "path": "./dist/index.mjs",
      "maxSize": "50kb"
    },
    {
      "path": "./dist/core.mjs",
      "maxSize": "15kb"
    },
    {
      "path": "./dist/lib/auth/index.mjs",
      "maxSize": "5kb"
    }
  ],
  "ci": {
    "trackBranches": ["main"],
    "repoBranchBase": "main"
  }
}
```

### Install and Configure

```bash
npm install -D bundlewatch
```

```json
{
  "scripts": {
    "bundlewatch": "bundlewatch"
  }
}
```

---

## Summary Checklist

Implementation priority:

- [ ] **Phase 1: Quick Wins**
  - [ ] Add bundle size analysis (rollup-plugin-visualizer)
  - [ ] Setup TypeDoc for API docs
  - [ ] Document tree-shaking patterns in README
  - [ ] Add size-limit configuration
  - [ ] Create GitHub action for size tracking

- [ ] **Phase 2: Core Build**
  - [ ] Create `src/core.ts` with minimal exports
  - [ ] Add `./core` to package.json exports
  - [ ] Update vite.config.ts entry points
  - [ ] Test and measure bundle size
  - [ ] Document core vs full usage

- [ ] **Phase 3: Enhanced Exports**
  - [ ] Add conditional exports (node/browser)
  - [ ] Add development/production builds
  - [ ] Validate with @arethetypeswrong/cli
  - [ ] Document export paths

- [ ] **Phase 4: Advanced (Optional)**
  - [ ] Setup monorepo with workspaces
  - [ ] Create enzyme-lite package
  - [ ] Create enzyme-server package
  - [ ] Implement version synchronization
  - [ ] Setup changesets for releases

---

**Next Steps**: Start with Phase 1 to get immediate value, then progress to Phase 2 based on user feedback and bundle size metrics.
