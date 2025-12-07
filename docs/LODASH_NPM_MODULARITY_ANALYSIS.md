# Lodash NPM Modularity & Distribution Analysis
## Enterprise Best Practices for Enzyme CLI Framework

**Date**: December 3, 2025
**Analyzed Repository**: https://github.com/lodash/lodash
**Target Framework**: Enzyme (@missionfabric-js/enzyme)

---

## Executive Summary

This report analyzes lodash's npm modularity and distribution patterns to extract best practices for the enzyme CLI framework. Lodash successfully publishes **639 files** across multiple package formats (CJS, ESM, FP) while maintaining excellent developer experience and bundle optimization. Enzyme already implements several advanced patterns but can benefit from additional lodash-inspired optimizations.

**Key Finding**: Enzyme is already ahead of lodash in some areas (modern exports field usage, TypeScript bundling) but can adopt lodash's multi-package strategy and documentation generation approaches.

---

## 1. Modular Package Structure

### Lodash Implementation

Lodash publishes **four distinct distribution strategies**:

1. **Main Package (`lodash`)** - 639 files, CommonJS format
   - Full build: `lodash.js` (544 kB) + `lodash.min.js` (73 kB)
   - Core build: `core.js` (116 kB) + `core.min.js` (12.7 kB)
   - 300+ individual method files (e.g., `map.js`, `filter.js`)
   - 200+ internal helper files (prefixed with `_`)
   - Category bundles (`array.js`, `object.js`, `string.js`)

2. **ES Modules Package (`lodash-es`)** - Published to separate npm package
   - 650 individual ES6 module files
   - Tree-shaking compatible
   - Uses `export default` pattern
   - Generated via: `lodash modularize exports=es -o ./`

3. **Functional Programming Package (`lodash/fp`)** - Subdirectory distribution
   - Auto-curried, data-last methods
   - Immutable API design
   - Uses conversion layer over standard methods
   - Configuration-driven via `_mapping.js`

4. **Per-Method Packages** - Separate npm packages (DEPRECATED in v5)
   - Examples: `lodash.map`, `lodash.chunk`, `lodash.throttle`
   - **Status**: Discouraged due to duplication issues
   - Each bundles its own dependencies, increasing total bundle size

### Benefits for End Users

✅ **Flexibility**: Choose between full, core, category, or individual method imports
✅ **Bundle Optimization**: Import only what you need
✅ **Tree-shaking**: ESM version enables dead code elimination
✅ **Progressive Adoption**: Start with full build, optimize later
✅ **Multiple Paradigms**: Standard vs functional programming styles

### Adaptation for Enzyme

**Current State**: Enzyme already uses category-based exports (24 modules)

**Recommended Enhancements**:

```javascript
// Pattern 1: Core Build (minimal functionality)
// Create enzyme/core with essential features only
export {
  EnzymeProvider,
  useEnzyme,
  createRoute,
  defineConfig
} from '@missionfabric-js/enzyme/core';

// Pattern 2: Method-Level Exports (for advanced users)
import { useAuth } from '@missionfabric-js/enzyme/auth/useAuth';
import { createStore } from '@missionfabric-js/enzyme/state/createStore';

// Pattern 3: Create enzyme-lite variant
// Separate package: @missionfabric-js/enzyme-lite
// Include only: routing, state, hooks (no UI components)
```

**Implementation Strategy**:
1. Add `enzyme/core` export with minimal API surface (~10 kB)
2. Consider `@missionfabric-js/enzyme-lite` for edge/serverless environments
3. Document bundle size for each import path
4. Add bundle size badges to README

---

## 2. Multi-Package Publishing Strategy

### Lodash Implementation

Lodash uses **Git branches as publishing sources**:

- **`npm` branch**: CommonJS distribution (published as `lodash`)
- **`es` branch**: ES modules distribution (published as `lodash-es`)
- **`master` branch**: Source code and build tools

**Branch Contents**:
```
npm branch (CommonJS)
├── lodash.js (full build)
├── core.js (core build)
├── map.js (individual method)
├── array.js (category bundle)
├── fp/map.js (FP variant)
└── package.json (main: lodash.js)

es branch (ESM)
├── lodash.js (barrel export file)
├── map.js (export default map)
├── array.js (category bundle)
└── package.json (type: module)

master branch (source)
├── lib/ (build scripts)
├── src/ (source files - if modular)
└── package.json (build scripts)
```

**Publishing Process**:
1. Build generates output to `npm` and `es` branches
2. Each branch has its own package.json
3. Published separately to npm registry
4. Version synchronized across all packages

### Benefits for End Users

✅ **Format Optimization**: Each package optimized for its module system
✅ **No Conditional Exports Complexity**: Simple, flat imports
✅ **Better Tree-shaking**: ES modules in separate package
✅ **Version Clarity**: Same version = same features across packages

### Adaptation for Enzyme

**Current State**: Single package with `exports` field for dual CJS/ESM

**Recommended Approach**:

**Option A: Keep Current Pattern (Recommended)**
- Modern approach using `package.json` `exports` field
- Better than lodash's multi-branch strategy
- Aligns with Node.js best practices
- **Rationale**: Enzyme is already more modern than lodash

**Option B: Create Variant Packages**
```json
{
  "@missionfabric-js/enzyme": "Full framework",
  "@missionfabric-js/enzyme-lite": "Core only (routing, state, hooks)",
  "@missionfabric-js/enzyme-server": "SSR utilities",
  "@missionfabric-js/enzyme-testing": "Testing utilities"
}
```

**Recommendation**: Stick with current single-package approach but create focused variant packages for specific use cases (lite, server, testing).

---

## 3. ESM and CJS Dual Distribution

### Lodash Implementation

**CommonJS Version (npm branch)**:
```javascript
// map.js
var arrayMap = require('./_arrayMap');
var baseMap = require('./_baseMap');
// ...
module.exports = map;
```

**ESM Version (es branch)**:
```javascript
// map.js
import arrayMap from './_arrayMap.js';
import baseMap from './_baseMap.js';
// ...
export default map;
```

**Main ESM Barrel File**:
```javascript
// lodash.js (es branch)
export { default as map } from './map.js';
export { default as filter } from './filter.js';
export { default as reduce } from './reduce.js';
// ... 300+ exports
```

**Build Command**:
```bash
# Generate ESM version
lodash modularize exports=es -o ./

# Generate CJS version
lodash modularize exports=node -o ./
```

### Benefits for End Users

✅ **Universal Compatibility**: Works in Node.js (CJS) and browsers (ESM)
✅ **Tree-shaking**: ESM enables bundler optimizations
✅ **Performance**: Native ESM in modern environments
✅ **Bundler Support**: Works with webpack, rollup, vite out of box

### Adaptation for Enzyme

**Current State**: ✅ Already implemented via vite build

```javascript
// vite.config.ts (current)
formats: ['es', 'cjs']
fileName: (format, entryName) => {
  const ext = format === 'es' ? 'mjs' : 'js';
  return `${entryName}.${ext}`;
}
```

**Package.json Exports** (current - excellent):
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```

**Status**: ✅ **Enzyme is already better than lodash here**

**Enhancement Opportunities**:
1. Add `node` condition for Node.js-specific optimizations
2. Add `development` vs `production` conditions for different builds
3. Document the dual-distribution approach in README

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "node": {
        "import": "./dist/index.mjs",
        "require": "./dist/index.js"
      },
      "development": "./dist/index.development.mjs",
      "default": "./dist/index.mjs"
    }
  }
}
```

---

## 4. Tree-shaking Optimization

### Lodash Implementation

**Structural Approach**:
1. **Individual Files**: Each method in its own file
2. **ES Modules**: Use of `export default` enables static analysis
3. **Pure Functions**: Most utilities are side-effect free
4. **Minimal Dependencies**: Methods import only what they need

**Example**:
```javascript
// User code
import { map, filter } from 'lodash-es';

// Bundler only includes:
// - map.js + its dependencies (_arrayMap, _baseMap, etc.)
// - filter.js + its dependencies
// Total: ~2-5 kB instead of 24 kB
```

**Cherry-picking Approach**:
```javascript
// Direct import (works with both lodash and lodash-es)
import map from 'lodash/map';
import filter from 'lodash/filter';
```

**Package.json Configuration**:
```json
{
  "sideEffects": false  // Enables aggressive tree-shaking
}
```

### Benefits for End Users

✅ **Smaller Bundles**: Only include used code
✅ **Faster Load Times**: Less JavaScript to parse/execute
✅ **Automatic**: No manual optimization needed
✅ **Scalable**: Add more imports without proportional size increase

### Adaptation for Enzyme

**Current State**: ✅ `"sideEffects": false` already set

**Current Build Configuration**:
```javascript
// vite.config.ts
preserveModules: true,
preserveModulesRoot: 'src'
```

**Enhancement Opportunities**:

1. **Document Tree-shaking in README**:
```markdown
## Bundle Size Optimization

Enzyme supports automatic tree-shaking. Import only what you need:

```javascript
// ❌ Imports everything (not recommended)
import * as Enzyme from '@missionfabric-js/enzyme';

// ✅ Named imports (tree-shakeable)
import { EnzymeProvider, useAuth } from '@missionfabric-js/enzyme';

// ✅ Direct module imports (most optimized)
import { useAuth } from '@missionfabric-js/enzyme/auth';
import { useStore } from '@missionfabric-js/enzyme/state';
```

Bundle sizes:
- Full: ~120 kB (gzipped: ~35 kB)
- Core: ~30 kB (gzipped: ~10 kB)
- Auth module only: ~8 kB (gzipped: ~3 kB)
```

2. **Create Bundle Analysis Script**:
```javascript
// scripts/analyze-bundles.js
import { analyzeMetafile } from 'esbuild';

// Analyze each export path
// Generate bundle size report
// Update README badges automatically
```

3. **Add Per-Module Exports** (optional):
```json
{
  "exports": {
    "./auth/useAuth": {
      "types": "./dist/lib/auth/useAuth.d.ts",
      "import": "./dist/lib/auth/useAuth.mjs",
      "require": "./dist/lib/auth/useAuth.js"
    }
  }
}
```

---

## 5. TypeScript Types Strategy

### Lodash Implementation

**Approach**: Uses **DefinitelyTyped** (`@types/lodash`)

**Structure**:
```
@types/lodash/
├── index.d.ts          # Main types
├── common/             # Shared type utilities (not for direct import)
│   ├── common.d.ts
│   ├── array.d.ts
│   └── ...
├── fp.d.ts             # Functional programming types
├── fp/                 # Individual FP method types (auto-generated)
│   ├── map.d.ts
│   └── ...
└── v3/                 # Legacy version 3 types
```

**Generation Process**:
1. Types are **manually maintained** in DefinitelyTyped
2. FP types are **auto-generated** via scripts
3. Published separately as `@types/lodash`
4. Versioning aligned with lodash releases

**Installation**:
```bash
npm install lodash
npm install --save-dev @types/lodash
```

### Benefits for End Users

✅ **Separation of Concerns**: Types don't bloat runtime package
✅ **Community Maintained**: Leverage DefinitelyTyped maintainers
✅ **Quick Fixes**: Type fixes can publish independently
✅ **Legacy Support**: Multiple versions available

**Drawbacks**:
❌ Version mismatches between package and types
❌ Slower type updates (separate release cycle)
❌ Extra dependency to install
❌ Less type safety (types might be inaccurate)

### Adaptation for Enzyme

**Current State**: ✅ **Bundled TypeScript** (better than lodash)

```javascript
// vite.config.ts
dts({
  insertTypesEntry: true,
  include: ['src/lib', 'src/types'],
})
```

```json
// package.json
{
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs"
    }
  }
}
```

**Status**: ✅ **Enzyme's approach is superior to lodash**

**Why Bundled Types are Better**:
1. **Perfect Sync**: Types always match runtime code
2. **Single Install**: No separate @types package needed
3. **Better DX**: Auto-complete works immediately
4. **Type Safety**: Guaranteed accuracy
5. **Modern Standard**: Recommended by Node.js/npm

**Recommendation**: **Keep current approach**. Do NOT switch to @types pattern.

**Enhancement**:
```json
{
  "exports": {
    "./auth": {
      "types": "./dist/lib/auth/index.d.ts",
      "import": "./dist/lib/auth/index.mjs"
    }
  }
}
```
Ensure every export path has corresponding `types` field (already implemented ✅).

---

## 6. Build Tooling and Compilation

### Lodash Implementation

**Build Tools**:
1. **lodash-cli**: Primary build tool for modular generation
2. **UglifyJS**: Minification
3. **webpack**: Module bundling
4. **docdown**: Documentation generation

**Build Process**:

```javascript
// package.json (master branch)
{
  "scripts": {
    "build": "npm run build:main && npm run build:fp",
    "build:main": "node lib/main/build-dist.js",
    "build:main-modules": "node lib/main/build-modules.js",
    "build:fp": "node lib/fp/build-dist.js",
    "build:fp-modules": "node lib/fp/build-modules.js"
  }
}
```

**lodash-cli Commands**:
```bash
# Generate modular ES build
lodash modularize exports=es -o ./

# Generate modular Node.js build
lodash modularize exports=node -o ./

# Generate strict mode build
lodash modularize strict -o ./

# Generate custom build with specific methods
lodash include=map,filter,reduce -o custom.js
```

**Build Workflow**:
1. **Source** (master branch) → Build scripts
2. **Generate** → Individual method files + bundles
3. **Transform** → Convert to target format (CJS/ESM/FP)
4. **Minify** → Create .min.js versions
5. **Commit** → Push to `npm` or `es` branches
6. **Publish** → npm publish from each branch

**FP Conversion**:
```javascript
// fp/_mapping.js (configuration-driven conversion)
{
  "aryMethod": {
    "1": ["map", "filter", "reduce"],  // Methods with 1 arg
    "2": ["forEach", "forOwn"],         // Methods with 2 args
  },
  "methodRearg": {
    "map": [2, 0, 1],  // Reorder arguments for currying
  }
}

// fp/map.js (generated wrapper)
var convert = require('./convert');
module.exports = convert('map', require('../map'));
```

### Benefits for End Users

✅ **Automated Generation**: Consistent output across 600+ files
✅ **Format Flexibility**: Single source → multiple outputs
✅ **Quality Control**: Automated testing for each variant
✅ **Custom Builds**: Users can create tailored builds

### Adaptation for Enzyme

**Current State**: Uses **Vite + vite-plugin-dts**

```javascript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/lib', 'src/types'],
    }),
  ],
  build: {
    lib: {
      entry: createEntryPoints(),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      preserveModules: true,
    }
  }
});
```

**Status**: ✅ **Modern and efficient**

**Enhancement Opportunities**:

1. **Add Build Variants Script**:
```javascript
// scripts/build-variants.js
import { build } from 'vite';

const variants = [
  { name: 'full', entry: './src/index.ts' },
  { name: 'core', entry: './src/core.ts' },
  { name: 'lite', entry: './src/lite.ts' },
];

for (const variant of variants) {
  await build({
    configFile: false,
    build: {
      lib: {
        entry: variant.entry,
        fileName: () => `enzyme.${variant.name}.js`,
      }
    }
  });
}
```

2. **Add Minification**:
```javascript
// vite.config.ts
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,  // Production only
    }
  }
}
```

3. **Create Build Size Report**:
```javascript
// scripts/build-report.js
import fs from 'fs';
import { gzipSync } from 'zlib';

const files = fs.readdirSync('./dist');
const report = files.map(file => {
  const content = fs.readFileSync(`./dist/${file}`);
  return {
    file,
    size: content.length,
    gzip: gzipSync(content).length
  };
});

console.table(report);
```

---

## 7. Version Synchronization Across Packages

### Lodash Implementation

**Strategy**: **Single version across all packages**

- `lodash@4.17.21`
- `lodash-es@4.17.21`
- `lodash.map@4.6.0` (per-method packages use different versions)

**Synchronization Method**:
1. All packages built from same source commit
2. Same version number in all package.json files
3. Published simultaneously
4. Git tags reference all packages

**Challenges with Per-Method Packages**:
- Per-method packages have independent versions
- Difficult to track which methods work together
- **Reason for deprecation in v5**

**Monorepo Approach** (lodash doesn't use this, but it's common):
```json
// lerna.json or pnpm-workspace.yaml
{
  "packages": ["packages/*"],
  "version": "independent"
}
```

### Benefits for End Users

✅ **Version Clarity**: Same version = same features everywhere
✅ **Predictable Behavior**: No version mismatches
✅ **Easier Upgrades**: Single version bump updates all
✅ **Documentation Alignment**: One version to document

### Adaptation for Enzyme

**Current State**: Single package (version management is simple)

**If Creating Variant Packages**:

**Recommended Approach**: **Fixed versioning** (like main lodash)

```json
// All packages share same version
{
  "@missionfabric-js/enzyme": "2.0.0",
  "@missionfabric-js/enzyme-lite": "2.0.0",
  "@missionfabric-js/enzyme-server": "2.0.0"
}
```

**Implementation with Monorepo**:

```bash
# Install workspace management
npm install -D npm-workspaces
# or
pnpm init
```

```json
// package.json (root)
{
  "name": "@missionfabric-js/enzyme-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "version": "npm version --workspaces",
    "publish": "npm publish --workspaces --access public"
  }
}
```

```
packages/
├── enzyme/           # @missionfabric-js/enzyme
├── enzyme-lite/      # @missionfabric-js/enzyme-lite
├── enzyme-server/    # @missionfabric-js/enzyme-server
└── enzyme-testing/   # @missionfabric-js/enzyme-testing
```

**Version Sync Script**:
```javascript
// scripts/sync-versions.js
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const rootPkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = rootPkg.version;

// Update all package.json files
const packages = glob.sync('./packages/*/package.json');
packages.forEach(pkgPath => {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
});
```

---

## 8. Bundle Size Optimization Techniques

### Lodash Implementation

**Technique 1: Core Build**
- **Full build**: 544 kB (73 kB minified, 24 kB gzipped)
- **Core build**: 116 kB (12.7 kB minified, 4 kB gzipped)
- **Core includes**: ~130 most commonly used methods
- **Savings**: 83% reduction

```javascript
// Use core build
var _ = require('lodash/core');
```

**Technique 2: Method Cherry-picking**
```javascript
// Individual import
var map = require('lodash/map');        // ~2-5 kB with deps
var filter = require('lodash/filter');  // ~2-5 kB with deps
```

**Technique 3: Category Bundles**
```javascript
// Category import
var array = require('lodash/array');    // ~20-30 kB
var object = require('lodash/object');  // ~15-25 kB
```

**Technique 4: Custom Builds** (via lodash-cli)
```bash
# Build with only specific methods
lodash include=map,filter,reduce -o custom.js

# Build without specific methods
lodash minus=template,flatten -o custom.js

# Build by category
lodash category=array,string -o custom.js
```

**Technique 5: Shared Dependencies**
- Internal methods (prefixed `_`) are shared
- Reduces duplication across methods
- Example: `_baseMap` used by `map`, `filter`, `forEach`, etc.

**Technique 6: Minification**
- UglifyJS for production builds
- Separate `.min.js` files
- Source maps for debugging

### Benefits for End Users

✅ **Flexible Optimization**: Choose granularity level
✅ **Progressive Enhancement**: Start large, optimize later
✅ **Automatic Deduplication**: Shared code only loaded once
✅ **Production-Ready**: Minified builds included

### Adaptation for Enzyme

**Current State**: Full build only

**Recommended Optimizations**:

**1. Create Core Build**:
```typescript
// src/core.ts (new file)
/**
 * Enzyme Core - Essential features only (~30 kB)
 * Includes: routing, state, hooks, context
 * Excludes: UI components, themes, advanced features
 */
export { EnzymeProvider } from './lib/core/EnzymeProvider';
export { useEnzyme } from './lib/hooks/useEnzyme';
export { createRoute } from './lib/routing/createRoute';
export { useRouter } from './lib/routing/useRouter';
export { createStore } from './lib/state/createStore';
export { useStore } from './lib/state/useStore';
// ... only core exports
```

```json
// package.json
{
  "exports": {
    "./core": {
      "types": "./dist/core.d.ts",
      "import": "./dist/core.mjs",
      "require": "./dist/core.js"
    }
  }
}
```

**2. Add Bundle Size Monitoring**:
```javascript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: './dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    })
  ]
});
```

**3. Document Bundle Sizes**:
```markdown
## Bundle Sizes

| Import Pattern | Size (min) | Size (gzip) | Use Case |
|----------------|-----------|-------------|----------|
| Full           | 150 kB    | 45 kB       | Complete features |
| Core           | 40 kB     | 12 kB       | Essential only |
| Auth module    | 12 kB     | 4 kB        | Authentication |
| Routing module | 8 kB      | 3 kB        | Routing only |
```

**4. Code Splitting Recommendations**:
```typescript
// Lazy load heavy modules
const MonitoringProvider = lazy(() =>
  import('@missionfabric-js/enzyme/monitoring')
);

const FeatureFlags = lazy(() =>
  import('@missionfabric-js/enzyme/flags')
);
```

**5. Peer Dependency Optimization**:
```json
{
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0",
    "react-router-dom": "^6.26.2 || ^7.0.0"
  },
  "peerDependenciesMeta": {
    "react-router-dom": {
      "optional": true  // Only needed if using routing
    }
  }
}
```

---

## 9. Documentation Generation

### Lodash Implementation

**Tool**: **docdown** (custom documentation generator)

**Process**:
1. **Extract JSDoc** from source files
2. **Parse comments** into structured data
3. **Generate Markdown** documentation
4. **Publish** to lodash.com

**JSDoc Format**:
```javascript
/**
 * Creates an array of values by running each element in `collection` thru
 * `iteratee`. The iteratee is invoked with three arguments:
 * (value, index|key, collection).
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 * @example
 *
 * _.map([4, 8], square);
 * // => [16, 64]
 */
function map(collection, iteratee) {
  // ...
}
```

**Build Script**:
```javascript
// package.json
{
  "scripts": {
    "doc:site": "node lib/main/build-doc site"
  }
}
```

**docdown Features**:
- Reads source files
- Extracts JSDoc comments
- Generates markdown
- Creates API reference
- Handles multiple files

**Output**:
- `README.md` with full API reference
- Per-method documentation
- Examples and use cases

**Planned Enhancements** (from lodash team):
- Support multiple input files (for modular lodash)
- Generate per-method pages (`/docs/chunk`, `/docs/map`)
- Export data for Gatsby static site

### Benefits for End Users

✅ **Always Up-to-date**: Docs generated from source
✅ **Consistent Format**: Standardized across all methods
✅ **Examples Included**: Practical usage demonstrations
✅ **Searchable**: Structured data enables search
✅ **Offline Access**: Markdown in repository

### Adaptation for Enzyme

**Current State**: Manual documentation in `/src/lib/docs/`

**Recommended Approach**:

**Option 1: TypeDoc** (TypeScript-native)
```bash
npm install -D typedoc

# typedoc.json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "README.md"
}
```

```json
// package.json
{
  "scripts": {
    "docs": "typedoc",
    "docs:watch": "typedoc --watch"
  }
}
```

**Option 2: API Extractor** (Microsoft tool)
```bash
npm install -D @microsoft/api-extractor

# api-extractor.json
{
  "mainEntryPointFilePath": "./dist/index.d.ts",
  "docModel": {
    "enabled": true,
    "apiJsonFilePath": "./docs/enzyme.api.json"
  }
}
```

**Option 3: Custom Documentation** (like docdown)
```typescript
// scripts/generate-docs.ts
import { Project } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: './tsconfig.json'
});

// Extract exports from each module
const modules = [
  'auth', 'routing', 'state', 'hooks',
  'ui', 'monitoring', 'performance'
];

modules.forEach(moduleName => {
  const sourceFile = project.getSourceFile(`./src/lib/${moduleName}/index.ts`);
  const exports = sourceFile.getExportedDeclarations();

  // Generate markdown documentation
  const docs = generateModuleDocs(moduleName, exports);
  fs.writeFileSync(`./docs/${moduleName}.md`, docs);
});
```

**Documentation Structure**:
```
docs/
├── README.md               # Overview
├── getting-started.md      # Quick start
├── api/
│   ├── auth.md            # Auth module API
│   ├── routing.md         # Routing module API
│   ├── state.md           # State module API
│   └── ...
├── guides/
│   ├── authentication.md
│   ├── routing.md
│   └── state-management.md
└── examples/
    ├── basic-setup.md
    └── advanced-patterns.md
```

**README Automation**:
```typescript
// scripts/update-readme.ts
import { generateBadges } from './badges';
import { generateApiLinks } from './api-links';
import { generateExamples } from './examples';

const readme = `
# Enzyme

${generateBadges()}

## Features

${generateFeatureList()}

## Installation

\`\`\`bash
npm install @missionfabric-js/enzyme
\`\`\`

## API Reference

${generateApiLinks()}

## Examples

${generateExamples()}
`;

fs.writeFileSync('README.md', readme);
```

**Recommendation**: Use **TypeDoc** for API reference + **manual guides** for tutorials.

---

## 10. Package.json Exports Field Configuration

### Lodash Implementation

**Status**: ❌ **Lodash does NOT use exports field**

Lodash's package.json (npm branch):
```json
{
  "name": "lodash",
  "version": "4.17.21",
  "main": "lodash.js",
  "// NO exports field": "Uses legacy resolution"
}
```

**Why Lodash Doesn't Use Exports**:
1. **Legacy Compatibility**: Supports very old Node.js versions
2. **Simplicity**: Flat file structure works without exports
3. **Multiple Branches**: Each package (lodash vs lodash-es) has different structure
4. **Pre-dates Exports**: Project started before exports field existed

**Lodash Import Patterns Work via Legacy Resolution**:
```javascript
// These work without exports field:
require('lodash');              // Resolves to main: lodash.js
require('lodash/map');          // Resolves to map.js in root
require('lodash/array');        // Resolves to array.js in root
require('lodash/fp/map');       // Resolves to fp/map.js
```

### Benefits for End Users

❌ **No benefits** - exports field would be superior
✅ **Wide Compatibility** - works in very old Node.js
❌ **Less Control** - can't prevent internal access
❌ **No Conditions** - can't provide optimized paths

### Adaptation for Enzyme

**Current State**: ✅ **Excellent exports field implementation**

```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./auth": {
      "types": "./dist/lib/auth/index.d.ts",
      "import": "./dist/lib/auth/index.mjs",
      "require": "./dist/lib/auth/index.js"
    },
    // ... 23 more module exports
    "./package.json": "./package.json"
  },
  "sideEffects": false
}
```

**Status**: ✅ **Enzyme is MORE ADVANCED than lodash**

**Enhancement Opportunities**:

**1. Add Conditional Exports**:
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
        "default": {
          "import": "./dist/index.mjs",
          "require": "./dist/index.js"
        }
      },
      "worker": "./dist/index.worker.mjs",
      "default": "./dist/index.mjs"
    }
  }
}
```

**2. Add Subpath Patterns** (Node 17+):
```json
{
  "exports": {
    ".": "./dist/index.mjs",
    "./*": {
      "types": "./dist/lib/*/index.d.ts",
      "import": "./dist/lib/*/index.mjs",
      "require": "./dist/lib/*/index.js"
    }
  }
}
```

**3. Add Browser-Specific Builds**:
```json
{
  "exports": {
    "./monitoring": {
      "types": "./dist/lib/monitoring/index.d.ts",
      "browser": "./dist/lib/monitoring/index.browser.mjs",
      "node": "./dist/lib/monitoring/index.node.mjs",
      "default": "./dist/lib/monitoring/index.mjs"
    }
  }
}
```

**4. Validate Exports**:
```bash
npm install -D @arethetypeswrong/cli

# Add to package.json
{
  "scripts": {
    "validate:exports": "attw --pack ."
  }
}
```

**Best Practice Checklist**:
- ✅ Types field first (for TypeScript)
- ✅ Conditional exports (import/require)
- ✅ Package.json export
- ✅ sideEffects: false
- ✅ Comprehensive module exports
- ⚠️ Consider browser/node conditions
- ⚠️ Consider development/production conditions

---

## Summary Comparison: Lodash vs Enzyme

| Pattern | Lodash | Enzyme | Winner | Recommendation |
|---------|--------|--------|---------|----------------|
| **Modular Structure** | ✅ 639 files | ✅ 24 modules | Lodash (more granular) | Add core build + method-level exports |
| **Multi-Package** | ✅ 2 packages | ⚠️ 1 package | Lodash | Consider lite/server variants |
| **ESM/CJS Distribution** | ✅ Separate branches | ✅ Dual build | Enzyme (modern) | Keep current approach |
| **Tree-shaking** | ✅ ESM + sideEffects | ✅ ESM + sideEffects | Tie | Document in README |
| **TypeScript Types** | ⚠️ @types/lodash | ✅ Bundled | **Enzyme** | Keep bundled types |
| **Build Tooling** | ⚠️ Custom CLI | ✅ Vite | **Enzyme** | Add bundle analysis |
| **Version Sync** | ✅ Fixed versions | ✅ Single package | Tie | Use fixed if multi-package |
| **Bundle Optimization** | ✅ Core + custom | ⚠️ Full only | Lodash | Add core build |
| **Documentation** | ✅ Auto-generated | ⚠️ Manual | Lodash | Add TypeDoc |
| **Exports Field** | ❌ Not used | ✅ Comprehensive | **Enzyme** | Add conditionals |

**Overall**: Enzyme has a **more modern foundation** but can learn from lodash's **granularity and optimization strategies**.

---

## Recommended Action Plan for Enzyme

### Phase 1: Quick Wins (1-2 weeks)

1. **Bundle Analysis**
   - Add rollup-plugin-visualizer
   - Document current bundle sizes
   - Add bundle size badges to README

2. **Documentation Automation**
   - Install TypeDoc
   - Generate API reference
   - Automate with npm script

3. **Tree-shaking Guide**
   - Document import patterns in README
   - Add examples of optimal imports
   - Create bundle size comparison table

### Phase 2: Core Build (2-3 weeks)

1. **Create Core Module**
   - `src/core.ts` with essential exports only
   - Target: <30 kB gzipped
   - Include: routing, state, hooks, core context

2. **Update Exports**
   - Add `./core` export path
   - Document core vs full

3. **Testing**
   - Ensure core build works standalone
   - Test tree-shaking effectiveness

### Phase 3: Variant Packages (4-6 weeks)

1. **Setup Monorepo** (optional)
   - Convert to npm workspaces
   - Create packages structure
   - Implement version sync

2. **Create Variants**
   - `enzyme-lite`: Core + routing + state
   - `enzyme-server`: SSR utilities
   - `enzyme-testing`: Testing utilities

3. **Publishing Strategy**
   - Automated publish workflow
   - Version synchronization
   - Changelog generation

### Phase 4: Advanced Optimizations (ongoing)

1. **Conditional Exports**
   - Browser vs Node.js builds
   - Development vs production
   - Worker-specific builds

2. **Method-Level Exports** (if needed)
   - Individual hook exports
   - Individual util exports
   - Update docs

3. **Performance Monitoring**
   - Bundle size CI checks
   - Size limit enforcement
   - Performance budgets

---

## Conclusion

Lodash demonstrates that **modularity and distribution flexibility** are key to enterprise npm package success. While Lodash uses some legacy patterns (no exports field, @types separation, branch-based publishing), its **core principles remain valuable**:

1. **Multiple consumption patterns** (full, core, categories, methods)
2. **Dual format distribution** (CJS and ESM)
3. **Aggressive tree-shaking** support
4. **Comprehensive documentation**
5. **Bundle size optimization** options

Enzyme already **surpasses lodash in modern practices** (exports field, bundled types, Vite build) but can adopt lodash's **granularity strategies** to provide users with more optimization options.

**Key Takeaway**: Focus on creating a **core build** (~30 kB) and **variant packages** (lite, server, testing) while maintaining the superior modern tooling Enzyme already uses.

---

## Sources

- [Lodash GitHub Repository](https://github.com/lodash/lodash)
- [Lodash Per-Method Packages](https://lodash.com/per-method-packages)
- [Lodash Custom Builds](https://lodash.com/custom-builds)
- [lodash-es npm](https://www.npmjs.com/package/lodash-es)
- [lodash.chunk npm](https://www.npmjs.com/package/lodash.chunk)
- [How to Import a Single Lodash Function - Stack Overflow](https://stackoverflow.com/questions/43479464/how-to-import-a-single-lodash-function)
- [Which documentation generator is used for lodash.com - Stack Overflow](https://stackoverflow.com/questions/29458532/which-documentation-generator-is-used-for-lodash-com)
- [Package.json Exports Field Guide](https://hirok.io/posts/package-json-exports)
- [Node.js Packages Documentation](https://nodejs.org/api/packages.html)
- [Webpack Package Exports](https://webpack.js.org/guides/package-exports/)

---

**Report Generated**: December 3, 2025
**Author**: Enterprise NPM Setup Analysis
**Target Framework**: Enzyme v1.1.0
