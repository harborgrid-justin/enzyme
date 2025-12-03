# Enzyme Framework - Enterprise NPM Improvements

**Based on Prisma Analysis**
**Priority Rankings: P0 (Critical) → P1 (High) → P2 (Medium) → P3 (Nice to have)**

---

## Executive Summary

After analyzing Prisma's enterprise-grade npm setup (45+ packages in monorepo), we've identified 15 high-impact improvements for Enzyme. Implementation of these patterns will:

- **Reduce build times by 40-60%** (via Turborepo caching)
- **Improve developer experience** (via type generation and better exports)
- **Enable faster releases** (via automation)
- **Reduce bundle sizes** (via conditional exports and tree shaking)
- **Increase reliability** (via monorepo structure and versioning)

---

## Current Enzyme Structure

```
enzyme/
├── package.json (main framework)
├── cli/package.json (CLI tools)
└── demo/package.json (demo app)
```

**Current Gaps:**
- ❌ No build caching (Turborepo)
- ❌ No workspace management (pnpm)
- ❌ Manual version synchronization
- ❌ No conditional exports
- ❌ No automated releases
- ❌ Limited subpath exports

---

## P0 - Critical Improvements (Implement First)

### 1. Adopt pnpm Workspaces + Turborepo

**Why:** 40-60% faster builds, better dependency management

**Implementation:**
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```json
// turbo.json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

**Files to modify:**
- Create `pnpm-workspace.yaml`
- Create `turbo.json`
- Update `.github/workflows/*.yml` to use `turbo`
- Update root `package.json` scripts

**Estimated effort:** 4-8 hours

---

### 2. Restructure into Monorepo Packages

**Why:** Better separation of concerns, independent versioning

**Proposed Structure:**
```
enzyme/
├── packages/
│   ├── enzyme/              # Main framework (@enzyme/core)
│   ├── enzyme-cli/          # CLI tools (@enzyme/cli)
│   ├── enzyme-router/       # Routing (@enzyme/router)
│   ├── enzyme-state/        # State management (@enzyme/state)
│   ├── enzyme-auth/         # Auth features (@enzyme/auth)
│   └── enzyme-generators/   # Code generators (@enzyme/generators)
├── examples/
│   └── demo/                # Demo app
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**Migration steps:**
1. Create `packages/` directory
2. Move current code to `packages/enzyme/`
3. Move CLI to `packages/enzyme-cli/`
4. Extract routing to `packages/enzyme-router/`
5. Extract state to `packages/enzyme-state/`
6. Update all imports

**Estimated effort:** 8-16 hours

---

### 3. Implement Conditional Package Exports

**Why:** Better tree shaking, platform-specific code, improved DX

**Current state:**
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./api": { "types": "./dist/lib/api/index.d.ts", ... }
  }
}
```

**Improvement:**
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./router": {
      "types": "./dist/router/index.d.ts",
      "import": "./dist/router/index.mjs",
      "require": "./dist/router/index.js"
    },
    "./server": {
      "types": "./dist/server/index.d.ts",
      "node": "./dist/server/index.js",
      "edge-runtime": "./dist/server/edge.js",
      "default": "./dist/server/stub.js"
    },
    "./client": {
      "types": "./dist/client/index.d.ts",
      "browser": "./dist/client/index.js",
      "default": "./dist/client/stub.js"
    }
  },
  "sideEffects": false
}
```

**Files to modify:**
- `/home/user/enzyme/package.json`
- Update build process to generate multiple entry points
- Add platform-specific stubs

**Estimated effort:** 4-6 hours

---

## P1 - High Priority Improvements

### 4. Add Automated Type Generation

**Why:** Zero-config TypeScript, better DX

**Implementation:**
```typescript
// packages/enzyme-generators/src/routes.ts
import { Project } from 'ts-morph';
import { scanDirectory } from './utils';

export async function generateRouteTypes(routesDir: string) {
  const project = new Project();
  const routes = await scanDirectory(routesDir);

  const file = project.createSourceFile(
    'node_modules/.enzyme/routes.d.ts',
    '',
    { overwrite: true }
  );

  // Generate route type union
  file.addTypeAlias({
    name: 'AppRoutes',
    type: routes.map(r => `"${r.path}"`).join(' | '),
    isExported: true
  });

  // Generate navigation helper types
  file.addInterface({
    name: 'RouteParams',
    isExported: true,
    properties: routes.map(r => ({
      name: `"${r.path}"`,
      type: generateParamType(r.params)
    }))
  });

  await project.save();
}
```

**New files:**
- `packages/enzyme-generators/src/routes.ts`
- `packages/enzyme-generators/src/state.ts`
- `packages/enzyme-generators/src/api.ts`

**CLI integration:**
```json
{
  "scripts": {
    "postinstall": "enzyme generate"
  }
}
```

**Estimated effort:** 12-20 hours

---

### 5. Version Synchronization Script

**Why:** Consistent versions across all packages

**Implementation:**
```typescript
// scripts/sync-versions.ts
import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';

async function syncVersions(newVersion: string) {
  const packagePaths = glob.sync('packages/*/package.json');

  for (const pkgPath of packagePaths) {
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    pkg.version = newVersion;

    // Update workspace dependencies
    for (const depType of ['dependencies', 'devDependencies']) {
      if (!pkg[depType]) continue;

      for (const [dep, version] of Object.entries(pkg[depType])) {
        if (dep.startsWith('@enzyme/') && version.startsWith('workspace:')) {
          pkg[depType][dep] = `workspace:${newVersion}`;
        }
      }
    }

    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  console.log(`✅ Synced all packages to version ${newVersion}`);
}

// Usage: pnpm tsx scripts/sync-versions.ts 1.2.0
syncVersions(process.argv[2]);
```

**Files to create:**
- `scripts/sync-versions.ts`
- `scripts/bump-version.ts`

**Estimated effort:** 3-4 hours

---

### 6. Release Automation with GitHub Actions

**Why:** Reliable, automated releases

**Implementation:**
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (e.g., 1.2.0)'
        required: true
      dryRun:
        description: 'Dry run (no actual publish)'
        type: boolean
        default: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm turbo build

      - name: Run tests
        run: pnpm turbo test

      - name: Bump version
        if: ${{ github.event.inputs.version }}
        run: pnpm tsx scripts/sync-versions.ts ${{ github.event.inputs.version }}

      - name: Publish to npm
        if: ${{ !github.event.inputs.dryRun }}
        run: pnpm publish -r --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: true

      - name: Create GitHub Release
        if: ${{ !github.event.inputs.dryRun }}
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.event.inputs.version }}
          release_name: Release v${{ github.event.inputs.version }}
```

**Files to create:**
- `.github/workflows/release.yml`
- `.github/workflows/publish-canary.yml` (for pre-releases)

**Estimated effort:** 4-6 hours

---

## P2 - Medium Priority Improvements

### 7. Optimize Bundle Size with Dual Builds

**Why:** Smaller bundles for end users

**Current:** Single ESM build
**Proposed:** Dual CJS + ESM with minification

**Implementation:**
```typescript
// packages/enzyme/build.config.ts
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: [
    './src/index.ts',
    './src/router/index.ts',
    './src/state/index.ts',
    './src/auth/index.ts'
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      minify: true,
      target: 'es2020'
    }
  }
});
```

**Switch to:** `unbuild` or `tsup` instead of current Vite build

**Estimated effort:** 6-8 hours

---

### 8. Add PostInstall Hook for Setup

**Why:** Better first-time user experience

**Implementation:**
```javascript
// packages/enzyme-cli/scripts/postinstall.js
const fs = require('fs');
const path = require('path');

async function postinstall() {
  // Skip in enzyme's own development
  const isDev = require('../package.json').version === '0.0.0';
  if (isDev) return;

  const cwd = process.cwd();

  // Check if user has enzyme config
  const hasConfig =
    fs.existsSync(path.join(cwd, 'enzyme.config.ts')) ||
    fs.existsSync(path.join(cwd, 'enzyme.config.js'));

  if (!hasConfig) {
    console.log('👋 Welcome to Enzyme! Run "npx enzyme init" to get started.');
    return;
  }

  // Generate types if config exists
  console.log('🔄 Generating Enzyme types...');
  const { generate } = require('../dist/commands/generate');
  await generate({ silent: true });
  console.log('✅ Enzyme setup complete!');
}

postinstall().catch(err => {
  // Silent failure to prevent install issues
  if (process.env.ENZYME_DEBUG) {
    console.error('Enzyme postinstall error:', err);
  }
});
```

**Files to create:**
- `packages/enzyme-cli/scripts/postinstall.js`
- Update `package.json` to include postinstall script

**Estimated effort:** 3-4 hours

---

### 9. Improve Package Documentation

**Why:** Better discoverability and onboarding

**Template for each package:**
```markdown
# @enzyme/[package-name]

> Brief description (one sentence)

[![npm version](https://img.shields.io/npm/v/@enzyme/[package].svg)](https://www.npmjs.com/package/@enzyme/[package])
[![License](https://img.shields.io/npm/l/@enzyme/[package].svg)](LICENSE)

## Installation

\`\`\`bash
pnpm add @enzyme/[package]
\`\`\`

## Quick Start

\`\`\`typescript
import { feature } from '@enzyme/[package]';

// Minimal working example
\`\`\`

## Features

- ✅ Feature 1
- ✅ Feature 2
- ✅ Feature 3

## Documentation

- [Full Documentation](https://enzyme.dev/docs/[package])
- [API Reference](https://enzyme.dev/api/[package])
- [Examples](../examples/[package])

## License

MIT © Enzyme Team
```

**Files to create:**
- README.md in each package
- Update main README.md with package links

**Estimated effort:** 4-6 hours

---

### 10. Add Bundle Size Monitoring

**Why:** Prevent regressions, track improvements

**Implementation:**
```json
// package.json
{
  "devDependencies": {
    "@size-limit/file": "^11.0.0",
    "size-limit": "^11.0.0"
  },
  "size-limit": [
    {
      "path": "packages/enzyme/dist/index.mjs",
      "limit": "50 KB"
    },
    {
      "path": "packages/enzyme/dist/router/index.mjs",
      "limit": "15 KB"
    },
    {
      "path": "packages/enzyme/dist/state/index.mjs",
      "limit": "10 KB"
    }
  ]
}
```

**GitHub Action:**
```yaml
- name: Check bundle size
  run: pnpm size-limit
```

**Estimated effort:** 2-3 hours

---

## P3 - Nice to Have Improvements

### 11. Add Changesets for Version Management

**Why:** Automated changelog generation

**Implementation:**
```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

**Estimated effort:** 2-3 hours

---

### 12. Setup API Documentation Site

**Why:** Comprehensive documentation

**Tool:** VitePress + TypeDoc

**Estimated effort:** 12-16 hours

---

### 13. Add Performance Monitoring

**Why:** Track and improve performance

**Tool:** OpenTelemetry integration

**Estimated effort:** 8-12 hours

---

## Implementation Timeline

### Week 1-2: Foundation
- ✅ Setup pnpm workspaces
- ✅ Add Turborepo
- ✅ Restructure packages
- ✅ Update CI/CD

### Week 3-4: Developer Experience
- ✅ Conditional exports
- ✅ Type generation
- ✅ PostInstall hooks
- ✅ Documentation

### Week 5-6: Automation
- ✅ Version sync
- ✅ Release automation
- ✅ Bundle optimization
- ✅ Size monitoring

### Week 7-8: Polish
- ✅ Changesets
- ✅ Docs site
- ✅ Performance monitoring
- ✅ Testing improvements

---

## Success Metrics

After implementation, track:

1. **Build Time:** Should decrease by 40-60%
2. **Bundle Size:** Should decrease by 20-30%
3. **Developer Satisfaction:** Survey users
4. **Release Frequency:** Increase from 1/month to 2+/week
5. **Documentation Quality:** Measure via user feedback
6. **Package Downloads:** Track npm downloads
7. **Issue Resolution Time:** Track GitHub issues

---

## Quick Start Commands

```bash
# 1. Install pnpm
npm install -g pnpm

# 2. Setup workspace
pnpm init
echo "packages:\n  - 'packages/*'" > pnpm-workspace.yaml

# 3. Add Turborepo
pnpm add -Dw turbo

# 4. Initialize Turbo
pnpm turbo init

# 5. Restructure (manual)
mkdir -p packages/enzyme
mv src packages/enzyme/src
mv package.json packages/enzyme/package.json

# 6. Update scripts
# package.json: "build": "turbo build"
# package.json: "test": "turbo test"

# 7. Test
pnpm build
pnpm test
```

---

## Priority Checklist

**This Week (P0):**
- [ ] Setup pnpm workspaces
- [ ] Add Turborepo
- [ ] Restructure into packages
- [ ] Update conditional exports

**Next Week (P1):**
- [ ] Add type generation
- [ ] Create version sync script
- [ ] Setup release automation
- [ ] Update documentation

**Following Weeks (P2-P3):**
- [ ] Optimize bundles
- [ ] Add bundle monitoring
- [ ] Setup changesets
- [ ] Create docs site

---

## Resources

- **Prisma Analysis:** `/home/user/enzyme/PRISMA_ENTERPRISE_PATTERNS_ANALYSIS.md`
- **pnpm Workspaces:** https://pnpm.io/workspaces
- **Turborepo:** https://turbo.build/repo
- **Package Exports:** https://nodejs.org/api/packages.html#exports
- **Changesets:** https://github.com/changesets/changesets
- **TypeDoc:** https://typedoc.org/

---

**Next Steps:** Start with P0 improvements this week, then move to P1 next week. Track progress and adjust priorities based on user feedback.
