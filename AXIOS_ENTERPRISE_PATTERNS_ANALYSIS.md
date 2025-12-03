# Axios Enterprise NPM Setup Patterns - Analysis Report

## Executive Summary

This report documents enterprise-grade npm/package.json setup patterns from the axios GitHub repository (https://github.com/axios/axios) and provides actionable recommendations for the enzyme CLI framework.

**Report Date:** December 3, 2025
**Axios Version Analyzed:** v1.6.0 (main branch)
**Target Project:** @missionfabric-js/enzyme v1.1.0

---

## Table of Contents

1. [Package.json Structure & Organization](#1-packagejson-structure--organization)
2. [Entry Points Configuration](#2-entry-points-configuration)
3. [Build Scripts & Tooling](#3-build-scripts--tooling)
4. [TypeScript Configuration & Type Exports](#4-typescript-configuration--type-exports)
5. [Bundle Optimization](#5-bundle-optimization)
6. [Dependencies Strategy](#6-dependencies-strategy)
7. [Version Management & Semver](#7-version-management--semver)
8. [CI/CD Configuration](#8-cicd-configuration)
9. [Publishing Configuration](#9-publishing-configuration)
10. [Documentation Structure](#10-documentation-structure)
11. [Enzyme Current State Assessment](#11-enzyme-current-state-assessment)
12. [Recommendations for Enzyme](#12-recommendations-for-enzyme)

---

## 1. Package.json Structure & Organization

### Axios Pattern

```json
{
  "name": "axios",
  "version": "0.27.2",
  "description": "Promise based HTTP client for the browser and node.js",
  "type": "module",
  "main": "index.js",
  "module": "./dist/esm/axios.js",
  "browser": {
    "./lib/adapters/http.js": "./lib/helpers/null.js",
    "./lib/platform/node/index.js": "./lib/platform/browser/index.js",
    "./lib/platform/node/classes/FormData.js": "./lib/platform/browser/classes/FormData.js"
  },
  "jsdelivr": "dist/axios.min.js",
  "unpkg": "dist/axios.min.js",
  "typings": "./index.d.ts",
  "exports": {
    ".": {
      "types": {
        "require": "./index.d.cts",
        "default": "./index.d.ts"
      },
      "browser": {
        "require": "./dist/browser/axios.cjs",
        "default": "./index.js"
      },
      "default": {
        "require": "./dist/node/axios.cjs",
        "default": "./index.js"
      }
    },
    "./unsafe/*": "./lib/*",
    "./lib/adapters/http.js": {
      "types": "./index.d.ts",
      "default": "./lib/adapters/http.js"
    },
    "./lib/adapters/xhr.js": {
      "types": "./index.d.ts",
      "default": "./lib/adapters/xhr.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist/",
    "lib/",
    "index.js",
    "index.d.ts",
    "index.d.cts"
  ],
  "sideEffects": false,
  "engines": {
    "node": ">=12"
  }
}
```

### Why This Is Effective

**1. Multiple Entry Point Strategies**
- `main`: CommonJS fallback for legacy systems
- `module`: ESM entry for modern bundlers
- `browser`: Platform-specific overrides
- `exports`: Granular conditional exports for different environments
- `jsdelivr`/`unpkg`: CDN optimization

**2. Conditional Exports**
- Separates Node.js and browser builds
- Provides unsafe internal access for advanced users
- Type definitions match module system (`.d.ts` for ESM, `.d.cts` for CJS)

**3. Package Metadata**
- `sideEffects: false` enables tree-shaking
- `engines` specifies minimum Node.js version
- `files` whitelist ensures only necessary files are published

### Enzyme Current State

✅ **Strengths:**
- Modern `exports` field with types-first approach
- Proper peer dependencies
- `sideEffects: false` for tree-shaking
- Comprehensive subpath exports for all modules

❌ **Gaps:**
- No `browser` field for platform-specific overrides
- No CDN fields (`jsdelivr`, `unpkg`)
- Missing `typings` field (uses only `types`)
- No adapter/unsafe exports for advanced usage

### Enzyme Adaptation Recommendations

```json
{
  "name": "@missionfabric-js/enzyme",
  "version": "1.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "typings": "./dist/index.d.ts",
  "jsdelivr": "./dist/enzyme.min.js",
  "unpkg": "./dist/enzyme.min.js",
  "browser": {
    "./dist/lib/performance/node.js": "./dist/lib/performance/browser.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "default": "./dist/index.mjs"
    },
    "./unsafe/*": "./dist/lib/*",
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "funding": [
    {
      "type": "github",
      "url": "https://github.com/sponsors/harborgrid-justin"
    },
    {
      "type": "opencollective",
      "url": "https://opencollective.com/enzyme"
    }
  ]
}
```

---

## 2. Entry Points Configuration

### Axios Pattern

**Three-Tier Entry System:**

1. **Root Entry (`index.js`)**: Simple passthrough
```javascript
// index.js
module.exports = require('./lib/axios');
```

2. **Library Entry (`lib/axios.js`)**: Factory pattern
```javascript
// lib/axios.js
function createInstance(defaultConfig) {
  const context = new Axios(defaultConfig);
  const instance = bind(Axios.prototype.request, context);
  utils.extend(instance, Axios.prototype, context, {allOwnKeys: true});
  utils.extend(instance, context, null, {allOwnKeys: true});
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };
  return instance;
}

const axios = createInstance(defaults);
axios.Axios = Axios;
axios.CanceledError = CanceledError;
// ... more exports

export default axios;
```

3. **Type Definitions**: Dual format support
- `index.d.ts`: ESM type definitions
- `index.d.cts`: CommonJS type definitions with `export =` syntax

### Why This Is Effective

**Separation of Concerns:**
- Root index acts as a clean public API surface
- Library code stays organized in `/lib`
- Easy to maintain and test

**Factory Pattern Benefits:**
- Allows instance customization
- Maintains singleton default instance
- Enables testing with custom configurations

**Dual Type Support:**
- Handles both `import axios` and `const axios = require('axios')`
- TypeScript users get proper types regardless of module system

### Enzyme Current State

✅ **Strengths:**
- Clean entry point structure
- Modular exports through Vite
- Comprehensive subpath exports

⚠️ **Considerations:**
- Missing CommonJS type definitions (`.d.cts`)
- No factory pattern for customizable instances
- Entry point is compiled, not source

### Enzyme Adaptation Recommendations

**1. Add CommonJS Type Definitions**
```typescript
// dist/index.d.cts
import type { EnzymeConfig, EnzymeInstance } from './types';

declare const enzyme: EnzymeInstance;
export = enzyme;

export as namespace Enzyme;
```

**2. Create Factory Pattern (Optional for CLI Framework)**
```typescript
// src/factory.ts
export function createEnzyme(config?: Partial<EnzymeConfig>): EnzymeInstance {
  const mergedConfig = mergeConfig(defaultConfig, config);
  return new EnzymeCore(mergedConfig);
}

// Export default instance
export const enzyme = createEnzyme();

// Allow custom instances
enzyme.create = createEnzyme;
```

**3. Update Vite Config for CJS Types**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/lib', 'src/types'],
      rollupTypes: true, // Bundle all types into single file
      // Generate both ESM and CJS types
      outputDir: 'dist',
      afterBuild: async () => {
        // Copy .d.ts to .d.cts for CommonJS support
        const fs = await import('fs/promises');
        await fs.copyFile('dist/index.d.ts', 'dist/index.d.cts');
      }
    }),
  ],
});
```

---

## 3. Build Scripts & Tooling

### Axios Pattern

**Build Tool Stack:**
- **Webpack**: UMD browser bundles
- **Rollup**: ESM/CJS module builds
- **Babel**: ES5 transpilation for legacy support
- **Grunt**: Task automation and orchestration

**Key Scripts:**
```json
{
  "scripts": {
    "test": "grunt test",
    "build": "gulp clear && node ./bin/build.js",
    "preversion": "npm test",
    "version": "npm run build && git add -A dist",
    "postversion": "git push && git push --tags",
    "examples": "node ./examples/server.js",
    "coveralls": "cat coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js"
  }
}
```

**Build Outputs:**
```
dist/
├── axios.js          # UMD development build
├── axios.min.js      # UMD production build (minified)
├── axios.map         # Source map for development
├── axios.min.map     # Source map for production
├── esm/
│   ├── axios.js      # ESM build
│   └── axios.min.js  # ESM build (minified)
├── browser/
│   └── axios.cjs     # Browser-specific CJS
└── node/
    └── axios.cjs     # Node-specific CJS
```

**Rollup Configuration Highlights:**
```javascript
export default [
  // UMD Format
  {
    input: './lib/axios.js',
    output: {
      file: 'dist/axios.js',
      format: 'umd',
      name: 'axios',
      exports: 'default',
      banner: license
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      json(),
      terser({ /* minification config */ })
    ]
  },
  // ESM Format
  {
    input: './index.js',
    output: {
      file: 'dist/esm/axios.js',
      format: 'es',
      exports: 'named',
      preferConst: true
    },
    plugins: [/* ... */]
  }
];
```

### Why This Is Effective

**1. Multi-Format Support**
- UMD for browser `<script>` tags and legacy systems
- ESM for modern bundlers with tree-shaking
- Separate browser/Node builds for platform optimization

**2. Source Maps**
- Development and production source maps
- Enables debugging in production with original source

**3. Minification Strategy**
- Separate minified builds (`.min.js`)
- Allows users to choose between size and debuggability

**4. Version Hooks**
- `preversion`: Runs tests before version bump
- `version`: Builds dist files and stages them
- `postversion`: Pushes to git with tags

### Enzyme Current State

✅ **Strengths:**
- Modern Vite build system (faster than Webpack/Rollup)
- ESM/CJS dual output
- Source maps enabled
- TypeScript declaration generation
- Preserve modules for better tree-shaking

❌ **Gaps:**
- No UMD build for direct browser usage
- No minified builds
- No version hooks in scripts
- No separate browser/Node builds
- Build verification only manual (`build:check`)

### Enzyme Adaptation Recommendations

**1. Add UMD Build Configuration**
```typescript
// vite.config.umd.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'Enzyme',
      fileName: 'enzyme',
      formats: ['umd']
    },
    outDir: 'dist/umd',
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    minify: 'terser',
    sourcemap: true
  }
});
```

**2. Update Build Scripts**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "npm run clean && npm run build:lib && npm run build:umd && npm run build:types",
    "build:lib": "vite build",
    "build:umd": "vite build --config vite.config.umd.ts",
    "build:types": "tsc --project tsconfig.build.json --emitDeclarationOnly",
    "build:check": "npm run typecheck && npm run lint && npm run test",
    "prebuild": "npm run build:check",
    "clean": "rimraf dist .tsbuildinfo coverage .eslintcache",

    "preversion": "npm run verify",
    "version": "npm run build && git add -A dist",
    "postversion": "git push && git push --tags && npm run release:notes",
    "release:notes": "node scripts/generate-release-notes.js",

    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0 --cache",
    "lint:fix": "eslint . --ext ts,tsx --fix --cache",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,json}\"",

    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=json --reporter=html",

    "verify": "npm run typecheck && npm run lint && npm run test",
    "prepublishOnly": "npm run build",

    "size": "size-limit",
    "analyze": "vite-bundle-visualizer"
  }
}
```

**3. Add Bundle Size Monitoring**
```json
{
  "devDependencies": {
    "@size-limit/preset-small-lib": "^11.0.0",
    "size-limit": "^11.0.0"
  },
  "size-limit": [
    {
      "path": "dist/index.mjs",
      "limit": "50 KB",
      "gzip": true
    },
    {
      "path": "dist/umd/enzyme.umd.js",
      "limit": "60 KB",
      "gzip": true
    }
  ]
}
```

---

## 4. TypeScript Configuration & Type Exports

### Axios Pattern

**TypeScript Configuration:**
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "lib": ["dom", "es2015"],
    "types": [],
    "moduleResolution": "node",
    "strict": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "axios": ["."]
    }
  }
}
```

**Type Definition Structure:**

**1. ESM Types (`index.d.ts`)**
```typescript
export interface AxiosRequestConfig<D = any> {
  url?: string;
  method?: Method;
  baseURL?: string;
  // ... extensive configuration
}

export interface AxiosResponse<T = any, D = any> {
  data: T;
  status: number;
  statusText: string;
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
  config: InternalAxiosRequestConfig<D>;
  request?: any;
}

export class Axios {
  constructor(config?: AxiosRequestConfig);
  defaults: Omit<AxiosDefaults, 'headers'> & {
    headers: HeadersDefaults & {
      [key: string]: AxiosHeaderValue
    }
  };
  interceptors: {
    request: AxiosInterceptorManager<InternalAxiosRequestConfig>;
    response: AxiosInterceptorManager<AxiosResponse>;
  };

  getUri(config?: AxiosRequestConfig): string;
  request<T = any, R = AxiosResponse<T>, D = any>(config: AxiosRequestConfig<D>): Promise<R>;
  get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  // ... other methods
}

export interface AxiosStatic extends AxiosInstance {
  create(config?: CreateAxiosDefaults): AxiosInstance;
  Cancel: CancelStatic;
  CancelToken: CancelTokenStatic;
  Axios: typeof Axios;
  AxiosError: typeof AxiosError;
  readonly VERSION: string;
  isCancel(value: any): value is Cancel;
  all<T>(values: Array<T | Promise<T>>): Promise<T[]>;
  spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;
  isAxiosError<T = any, D = any>(payload: any): payload is AxiosError<T, D>;
}

declare const axios: AxiosStatic;
export default axios;
```

**2. CommonJS Types (`index.d.cts`)**
```typescript
declare const axios: axios.AxiosStatic;
export = axios;
export as namespace axios;

namespace axios {
  // Mirror all types from .d.ts
  export interface AxiosRequestConfig<D = any> { /* ... */ }
  export interface AxiosResponse<T = any, D = any> { /* ... */ }
  // ...
}
```

### Why This Is Effective

**1. Dual Module System Support**
- `.d.ts` for ESM: `import axios from 'axios'`
- `.d.cts` for CJS: `const axios = require('axios')`
- Ensures TypeScript understands both import styles

**2. Comprehensive Generic Types**
- Request data type (`D`)
- Response data type (`T`)
- Return type (`R`)
- Allows full type safety: `axios.get<User>('/user')`

**3. Namespace Pattern**
- Groups related types under `axios` namespace
- Prevents global scope pollution
- Clear organization of complex type system

**4. Strict Type Safety**
- Uses TypeScript strict mode
- No implicit any
- Proper method signatures with overloads

### Enzyme Current State

✅ **Strengths:**
- Excellent TypeScript configuration with maximum strictness
- `strict: true` + additional strict checks
- Proper path mapping (`@/*`)
- Modern module resolution (`bundler`)

❌ **Gaps:**
- No CommonJS type definitions (`.d.cts`)
- Type definitions generated by vite-plugin-dts
- No namespace pattern for type organization
- Generic types could be more comprehensive

### Enzyme Adaptation Recommendations

**1. Create Comprehensive Type System**
```typescript
// src/types/core.ts
export namespace Enzyme {
  /**
   * Core configuration for Enzyme instance
   */
  export interface Config {
    routing?: RoutingConfig;
    state?: StateConfig;
    api?: ApiConfig;
    performance?: PerformanceConfig;
  }

  /**
   * Enzyme instance with all methods
   */
  export interface Instance {
    config: Readonly<Config>;
    router: Router;
    state: StateManager;

    // Factory method
    create(config?: Partial<Config>): Instance;

    // Lifecycle
    initialize(): Promise<void>;
    destroy(): void;
  }

  /**
   * Route configuration with generic params
   */
  export interface RouteConfig<P = Record<string, string>> {
    path: string;
    params?: P;
    component: React.ComponentType;
  }

  /**
   * Type-safe hook result
   */
  export interface UseEnzymeResult<T = unknown> {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
  }
}
```

**2. Export with Namespace**
```typescript
// src/index.ts
import type { Enzyme } from './types';

export type {
  Enzyme,
  // Re-export specific types
  EnzymeConfig,
  EnzymeInstance,
  // ...
};

// Default export
export { enzyme as default } from './core';

// Named exports
export * from './lib/routing';
export * from './lib/state';
// ...
```

**3. Generate CommonJS Types**
```typescript
// scripts/generate-cjs-types.ts
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const dtsContent = readFileSync(resolve(__dirname, '../dist/index.d.ts'), 'utf-8');

// Convert to CommonJS format
const dctsContent = `
declare const enzyme: typeof import('./index');
export = enzyme;
export as namespace Enzyme;

// Re-export all types
${dtsContent.replace(/export /g, 'declare ')}
`;

writeFileSync(resolve(__dirname, '../dist/index.d.cts'), dctsContent);
console.log('✓ Generated CommonJS type definitions');
```

**4. Update package.json Exports**
```json
{
  "exports": {
    ".": {
      "types": {
        "require": "./dist/index.d.cts",
        "import": "./dist/index.d.ts"
      },
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```

---

## 5. Bundle Optimization

### Axios Pattern

**Tree-Shaking Configuration:**
```json
{
  "sideEffects": false
}
```

**Rollup Optimization:**
```javascript
{
  output: {
    exports: 'named',  // Named exports for tree-shaking
    preferConst: true, // Use const instead of var
    preserveModules: false, // Bundle into single file
  },
  plugins: [
    resolve({ browser: true }), // Resolve browser-specific modules
    commonjs(), // Convert CJS to ESM
    terser({
      compress: {
        passes: 2,
        pure_getters: true,
        unsafe: true
      },
      mangle: {
        properties: {
          regex: /^_/
        }
      }
    })
  ]
}
```

**Bundle Size Monitoring:**
- Axios maintains a 5KB limit for `dist/axios.min.js`
- Uses size checks in CI

**Platform-Specific Bundles:**
```javascript
// Browser build excludes Node.js adapters
{
  browser: {
    "./lib/adapters/http.js": "./lib/helpers/null.js"
  }
}
```

### Why This Is Effective

**1. Tree-Shaking**
- `sideEffects: false` tells bundlers all modules are pure
- Named exports enable dead code elimination
- Users only bundle what they import

**2. Platform Optimization**
- Browser builds exclude Node.js HTTP adapter
- Reduces bundle size by ~30%
- No unnecessary polyfills

**3. Minification Strategy**
- Multiple compression passes
- Property mangling for private properties
- Unsafe optimizations for maximum size reduction

**4. Module Preservation**
- ESM output preserves module boundaries
- Enables better tree-shaking in consuming projects

### Enzyme Current State

✅ **Strengths:**
- `sideEffects: false` enabled
- `preserveModules: true` for better tree-shaking
- Source maps enabled
- ESM-first approach

❌ **Gaps:**
- No bundle size monitoring/limits
- No separate minified builds
- Missing compression plugins
- No bundle analysis tooling
- No platform-specific optimizations

### Enzyme Adaptation Recommendations

**1. Add Bundle Size Limits**
```javascript
// package.json
{
  "size-limit": [
    {
      "name": "Main bundle",
      "path": "dist/index.mjs",
      "limit": "50 KB",
      "gzip": true,
      "brotli": true
    },
    {
      "name": "Routing module",
      "path": "dist/lib/routing/index.mjs",
      "limit": "10 KB",
      "import": "{ createRouter }"
    },
    {
      "name": "State module",
      "path": "dist/lib/state/index.mjs",
      "limit": "8 KB",
      "import": "{ createStore }"
    }
  ]
}
```

**2. Add Compression to Vite Config**
```typescript
// vite.config.ts
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    dts(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    visualizer({
      filename: './dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split large dependencies
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('zustand')) {
              return 'vendor-state';
            }
            return 'vendor';
          }
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
        pure_getters: true,
        unsafe_arrows: true,
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      },
      mangle: {
        properties: {
          regex: /^_private/
        }
      },
      format: {
        comments: false
      }
    }
  }
});
```

**3. Add Bundle Analysis Scripts**
```json
{
  "scripts": {
    "analyze": "vite-bundle-visualizer",
    "size": "size-limit",
    "size:why": "size-limit --why"
  }
}
```

**4. Create Platform-Specific Exports (If Needed)**
```json
{
  "browser": {
    "./dist/lib/performance/node.js": "./dist/lib/performance/browser.js",
    "./dist/lib/monitoring/node.js": "./dist/lib/monitoring/browser.js"
  }
}
```

---

## 6. Dependencies Strategy

### Axios Pattern

**Dependency Classification:**

```json
{
  "dependencies": {
    "follow-redirects": "^1.15.0",
    "form-data": "^4.0.0",
    "proxy-from-env": "^1.1.0"
  },
  "peerDependencies": {},
  "devDependencies": {
    // 50+ dev dependencies for build/test
  }
}
```

**Key Principles:**

1. **Minimal Runtime Dependencies** (only 3)
   - `follow-redirects`: HTTP redirect handling
   - `form-data`: Multipart form data
   - `proxy-from-env`: Environment-based proxy configuration

2. **No Peer Dependencies**
   - Axios is framework-agnostic
   - Works in any JavaScript environment

3. **Extensive Dev Dependencies**
   - Build tools (Webpack, Rollup, Babel, Gulp)
   - Testing (Karma, Mocha, Jasmine, Chai)
   - Quality (ESLint, TypeScript)

**Version Pinning Strategy:**
- Runtime deps: `^` (caret) for minor updates
- Dev deps: `^` for flexibility
- No version locking except for critical packages

### Why This Is Effective

**1. Lean Production Bundle**
- Only 3 dependencies means:
  - Smaller installation size
  - Fewer security vulnerabilities
  - Less breaking changes
  - Faster installs

**2. Framework Independence**
- No peer dependencies = works anywhere
- No React/Vue/Angular coupling
- Universal library appeal

**3. Separation of Concerns**
- Dev dependencies don't affect end users
- Build tools isolated from runtime
- Testing infrastructure separate

**4. Semver Flexibility**
- Caret ranges allow non-breaking updates
- Balance between security patches and stability

### Enzyme Current State

✅ **Strengths:**
- Proper peer dependencies for React framework
- Reasonable runtime dependencies (8 deps)
- Clear separation of dev dependencies
- Version ranges allow updates

⚠️ **Considerations:**
- More runtime deps than necessary?
- `tsc` as runtime dependency (should be dev)
- Could move some deps to peer dependencies

### Enzyme Current Dependencies Analysis

**Runtime Dependencies (8):**
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.90.11",  // Could be peer
    "clsx": "^2.1.1",                      // ✓ Utility
    "immer": "^11.0.1",                    // ✓ State management utility
    "lucide-react": "^0.555.0",            // Could be peer/optional
    "react-window": "^2.2.3",              // ✓ Virtualization
    "tsc": "^2.0.4",                       // ❌ Should be devDependency
    "web-vitals": "^5.1.0",                // ✓ Performance monitoring
    "zod": "^4.1.13",                      // ✓ Validation
    "zustand": "^5.0.8"                    // ✓ State management
  }
}
```

### Enzyme Adaptation Recommendations

**1. Optimize Dependency Classification**
```json
{
  "dependencies": {
    "clsx": "^2.1.1",
    "immer": "^11.0.1",
    "react-window": "^2.2.3",
    "web-vitals": "^5.1.0",
    "zod": "^4.1.13",
    "zustand": "^5.0.8"
  },
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0",
    "react-router-dom": "^6.26.2 || ^7.0.0",
    "@tanstack/react-query": "^5.0.0",
    "lucide-react": "^0.400.0"
  },
  "peerDependenciesMeta": {
    "@tanstack/react-query": {
      "optional": true
    },
    "lucide-react": {
      "optional": true
    }
  },
  "devDependencies": {
    "tsc": "^2.0.4",
    // ... rest
  }
}
```

**2. Document Optional Peer Dependencies**
```markdown
## Installation

### Core Installation
```bash
npm install @missionfabric-js/enzyme react react-dom react-router-dom
```

### Optional Features

**Data Fetching (React Query):**
```bash
npm install @tanstack/react-query
```

**Icon Library:**
```bash
npm install lucide-react
```

**Note:** These are peer dependencies and only needed if you use specific features.
```

**3. Add Dependency Validation**
```typescript
// src/lib/utils/validate-deps.ts
export function validatePeerDependencies(): void {
  const missing: string[] = [];

  try {
    require.resolve('react');
  } catch {
    missing.push('react ^18.3.1 || ^19.0.0');
  }

  try {
    require.resolve('react-dom');
  } catch {
    missing.push('react-dom ^18.3.1 || ^19.0.0');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required peer dependencies:\n${missing.map(d => `  - ${d}`).join('\n')}\n\n` +
      'Install with: npm install ' + missing.join(' ')
    );
  }
}
```

**4. Create Dependency Health Check Script**
```json
{
  "scripts": {
    "deps:check": "npm outdated",
    "deps:update": "npm update",
    "deps:audit": "npm audit --production",
    "deps:graph": "depcruise src --output-type dot | dot -T svg > dependency-graph.svg"
  },
  "devDependencies": {
    "dependency-cruiser": "^15.0.0"
  }
}
```

---

## 7. Version Management & Semver

### Axios Pattern

**CHANGELOG.md Structure:**

```markdown
# Changelog

## [0.27.2] (April 27, 2022)

### Fixes and Functionality
- fix(formdata): do not override FormData method (*) (#4754) (5ef80f0)
- fix(protocol): handle RFC3986 compliant URLs (#4774) (50c2aae)

### Contributors to this release
- Kevin Kirsche [@kkirsche](https://github.com/kkirsche)
- Philipp Loose [@philipp-loose](https://github.com/philipp-loose)

## [0.27.0] (April 25, 2022)

### ⚠️ Breaking Changes
- Refactored error handling implementing AxiosError as a constructor (**)
  (#4654) (c8c2c6e)

### Fixes and Functionality
- fix(adapter): ignore Content-Type header for FormData requests (#4452)
- feat(http): Added support for LookupAddress functions family (#4673)

### QOL and DevX Improvements
- docs: update and extend README (#4733) (03fc26c)

### Internal and Tests
- chore(ci): GitHub Actions migration (#4661) (743d8a6)

(*) Please read this PR before updating
(**) Breaking change - see migration guide
```

**Semver Practices:**

1. **Breaking Changes (MAJOR)**
   - Error handling refactor (0.26 → 0.27)
   - API surface changes
   - Marked with "⚠️ Breaking Changes" header

2. **Features (MINOR)**
   - New methods/options
   - Non-breaking enhancements
   - Version bump: 0.26.0 → 0.27.0

3. **Fixes (PATCH)**
   - Bug fixes
   - Documentation updates
   - Version bump: 0.27.0 → 0.27.2

**Version Script Hooks:**
```json
{
  "scripts": {
    "preversion": "npm test",
    "version": "npm run build && git add -A dist",
    "postversion": "git push && git push --tags"
  }
}
```

### Why This Is Effective

**1. Clear Communication**
- Breaking changes prominently marked
- Attribution to contributors
- Links to detailed PRs
- Migration guides for major changes

**2. Conventional Commits**
- `fix:` prefix for patches
- `feat:` prefix for features
- `BREAKING CHANGE:` for major
- Easy to generate changelog

**3. Automated Safety**
- `preversion`: Tests must pass
- `version`: Builds and commits dist
- `postversion`: Publishes to registry

**4. User Trust**
- Predictable releases
- Clear upgrade paths
- Community recognition

### Enzyme Current State

❌ **Major Gaps:**
- **No CHANGELOG.md**
- No version management scripts
- No release documentation
- No breaking change tracking
- No contributor attribution
- No migration guides

### Enzyme Adaptation Recommendations

**1. Create CHANGELOG.md**
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features being developed

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in future releases

### Removed
- Features removed in this release

### Fixed
- Bug fixes

### Security
- Security fixes

## [1.1.0] - 2025-12-03

### Added
- Advanced routing with file-system discovery
- Enterprise configuration hub
- Predictive prefetching with Markov chains
- Real-time collaboration state sync
- Performance observatory dashboard
- 25+ modular subpath exports

### Fixed
- TypeScript strict mode compliance
- Lint errors across codebase

## [1.0.0] - 2025-11-15

### Added
- Initial release
- Core routing system
- State management with Zustand
- React Query integration
- Performance monitoring
- Theme system
```

**2. Add Conventional Commits**
```bash
# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Create commitlint.config.js
echo "module.exports = { extends: ['@commitlint/config-conventional'] };" > commitlint.config.js

# Add to .husky/commit-msg
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
```

**3. Automate Changelog Generation**
```json
{
  "scripts": {
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
    "changelog:all": "conventional-changelog -p angular -i CHANGELOG.md -s -r 0"
  },
  "devDependencies": {
    "conventional-changelog-cli": "^4.1.0"
  }
}
```

**4. Add Version Management Scripts**
```json
{
  "scripts": {
    "preversion": "npm run verify && npm run changelog",
    "version": "npm run build && git add -A dist CHANGELOG.md",
    "postversion": "git push && git push --tags",

    "release:patch": "npm version patch -m 'chore(release): %s'",
    "release:minor": "npm version minor -m 'chore(release): %s'",
    "release:major": "npm version major -m 'chore(release): %s'",

    "release:dry-run": "npm publish --dry-run"
  }
}
```

**5. Create Release Script**
```javascript
// scripts/release.js
#!/usr/bin/env node
const { execSync } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');

const [type] = process.argv.slice(2);
if (!['major', 'minor', 'patch'].includes(type)) {
  console.error('Usage: npm run release -- [major|minor|patch]');
  process.exit(1);
}

// 1. Verify clean working directory
const status = execSync('git status --porcelain').toString();
if (status) {
  console.error('Working directory not clean. Commit or stash changes.');
  process.exit(1);
}

// 2. Run tests
console.log('Running tests...');
execSync('npm run verify', { stdio: 'inherit' });

// 3. Generate changelog
console.log('Generating changelog...');
execSync('npm run changelog', { stdio: 'inherit' });

// 4. Bump version
console.log(`Bumping ${type} version...`);
execSync(`npm version ${type} -m 'chore(release): v%s'`, { stdio: 'inherit' });

// 5. Build
console.log('Building...');
execSync('npm run build', { stdio: 'inherit' });

// 6. Create GitHub release
const version = JSON.parse(readFileSync('package.json')).version;
console.log(`Creating GitHub release v${version}...`);
execSync(
  `gh release create v${version} --generate-notes --verify-tag`,
  { stdio: 'inherit' }
);

// 7. Publish to npm
console.log('Publishing to npm...');
execSync('npm publish', { stdio: 'inherit' });

console.log(`✓ Successfully released v${version}`);
```

**6. Add Release Guidelines**
```markdown
## RELEASE_PROCESS.md

# Release Process

## Semver Guidelines

### Major Version (x.0.0)
- Breaking changes to public API
- Removal of deprecated features
- Major architectural changes

### Minor Version (0.x.0)
- New features (backwards compatible)
- Deprecations (with warnings)
- Large internal improvements

### Patch Version (0.0.x)
- Bug fixes
- Documentation updates
- Small performance improvements

## Release Checklist

1. **Pre-release**
   - [ ] All tests passing
   - [ ] No TypeScript errors
   - [ ] No linting errors
   - [ ] Documentation updated
   - [ ] CHANGELOG.md has unreleased changes

2. **Release**
   ```bash
   npm run release -- [major|minor|patch]
   ```

3. **Post-release**
   - [ ] GitHub release created
   - [ ] npm package published
   - [ ] Documentation site updated
   - [ ] Announce on Twitter/Discord
   - [ ] Update examples repository

## Breaking Changes

When introducing breaking changes:

1. Deprecate in minor version first
2. Document migration path
3. Provide codemod if possible
4. Wait at least one minor version
5. Remove in next major version

Example:
```typescript
// v1.5.0 - Deprecate
/** @deprecated Use newMethod() instead. Will be removed in v2.0.0 */
export function oldMethod() {
  console.warn('oldMethod is deprecated');
  return newMethod();
}

// v2.0.0 - Remove
// oldMethod completely removed
```
```

---

## 8. CI/CD Configuration

### Axios Pattern

**GitHub Actions Workflow (`.github/workflows/ci.yml`):**

```yaml
name: ci

on:
  push:
    branches:
      - master
      - 'v*'
  pull_request:
    branches:
      - master
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [12.x, 14.x, 16.x, 18.x]

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test
```

**Stale Issues Workflow (`.github/workflows/stale.yml`):**

```yaml
name: 'Close stale issues and PRs'

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly on Monday

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v8
        with:
          stale-issue-message: 'This issue is being automatically marked as stale because it has not been updated in a while.'
          stale-pr-message: 'This PR is being automatically marked as stale because it has not been updated in a while.'
          stale-issue-label: 'status:stale'
          stale-pr-label: 'status:stale'
          only-labels: 'status:more info needed'
          days-before-stale: 30
          days-before-close: 14
```

**Additional CI Features:**
- Travis CI integration (legacy)
- Coveralls for code coverage
- Automated npm publishing (via GitHub Actions)

### Why This Is Effective

**1. Multi-Version Testing**
- Tests across Node 12, 14, 16, 18
- Catches compatibility issues early
- Ensures broad platform support

**2. Automated Quality Checks**
- Every PR runs full test suite
- Blocks merge on test failures
- Maintains code quality standards

**3. Issue Management**
- Automatic stale issue labeling
- Reduces maintenance burden
- Keeps issue tracker clean

**4. Branch Protection**
- Required CI checks before merge
- Prevents broken code in main branch

### Enzyme Current State

❌ **Critical Gap:**
- **No `.github` directory**
- No CI/CD workflows
- No automated testing
- No PR checks
- No release automation
- No issue templates

### Enzyme Adaptation Recommendations

**1. Create GitHub Actions CI Workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.node-version == '20.x'
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: enzyme-coverage

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Check bundle size
        run: npm run size

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7
```

**2. Create Release Workflow**

`.github/workflows/release.yml`:
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test
        run: npm run verify

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            See [CHANGELOG.md](https://github.com/harborgrid-justin/enzyme/blob/main/CHANGELOG.md) for details.
          draft: false
          prerelease: false
```

**3. Create PR Template**

`.github/PULL_REQUEST_TEMPLATE.md`:
```markdown
## Description
<!-- Describe your changes in detail -->

## Type of Change
<!-- Mark with an `x` all the options that apply -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 Style/UI update (no functional changes)
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test update

## Related Issues
<!-- Link to related issues: Fixes #123, Closes #456 -->

## How Has This Been Tested?
<!-- Describe the tests you ran to verify your changes -->

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist
<!-- Mark with an `x` all the options that you have completed -->

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
<!-- Add screenshots to help explain your changes -->

## Additional Context
<!-- Add any other context about the PR here -->
```

**4. Create Issue Templates**

`.github/ISSUE_TEMPLATE/bug_report.yml`:
```yaml
name: 🐛 Bug Report
description: Report a bug in Enzyme
title: "[Bug]: "
labels: ["bug", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to report a bug! Please fill out the form below.

  - type: input
    id: version
    attributes:
      label: Enzyme Version
      description: What version of Enzyme are you using?
      placeholder: "1.1.0"
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear and concise description of what the bug is.
      placeholder: Tell us what you see!
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior
      placeholder: |
        1. Install enzyme '...'
        2. Import '...'
        3. Call method '...'
        4. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What did you expect to happen?
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened?
    validations:
      required: true

  - type: textarea
    id: code
    attributes:
      label: Minimal Reproduction
      description: Provide a minimal code example that reproduces the issue
      render: typescript

  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: |
        Please provide your environment details
      value: |
        - OS: [e.g. macOS 13.0, Windows 11, Ubuntu 22.04]
        - Node.js: [e.g. 20.10.0]
        - npm: [e.g. 10.2.0]
        - Browser: [e.g. Chrome 120, Firefox 121]
        - React: [e.g. 18.3.1]
    validations:
      required: true

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Add any other context about the problem here
```

`.github/ISSUE_TEMPLATE/feature_request.yml`:
```yaml
name: ✨ Feature Request
description: Suggest a new feature for Enzyme
title: "[Feature]: "
labels: ["enhancement", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a feature! Please describe it below.

  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: Is your feature request related to a problem? Please describe.
      placeholder: I'm always frustrated when...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe the solution you'd like
      placeholder: I would like Enzyme to...
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Describe alternatives you've considered

  - type: textarea
    id: examples
    attributes:
      label: Code Examples
      description: Show how this feature would be used
      render: typescript

  - type: checkboxes
    id: willing
    attributes:
      label: Contribution
      description: Would you be willing to contribute this feature?
      options:
        - label: I'm willing to submit a PR implementing this feature
```

**5. Add Dependabot**

`.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    reviewers:
      - "harborgrid-justin"
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "chore"
      include: "scope"
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
```

**6. Add Code Quality Checks**

`.github/workflows/code-quality.yml`:
```yaml
name: Code Quality

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check formatting
        run: npm run format:check

      - name: Lint
        run: npm run lint -- --format=json --output-file=eslint-report.json
        continue-on-error: true

      - name: Upload ESLint report
        uses: actions/upload-artifact@v4
        with:
          name: eslint-report
          path: eslint-report.json

      - name: Check for TODO/FIXME
        run: |
          if git grep -E "TODO|FIXME" src/; then
            echo "⚠️ Found TODO/FIXME comments"
            exit 0
          fi
```

---

## 9. Publishing Configuration

### Axios Pattern

**publishConfig in package.json:**
```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**Files Whitelist:**
```json
{
  "files": [
    "dist/",
    "lib/",
    "index.js",
    "index.d.ts",
    "index.d.cts"
  ]
}
```

**.npmignore Strategy:**
```
# Development files
coverage/
examples/
node_modules/
sandbox/
test/

# Configuration
*.iml
bower.json
Gruntfile.js
karma.conf.js
webpack.*.js

# Documentation (except README)
CODE_OF_CONDUCT.md
COLLABORATOR_GUIDE.md
CONTRIBUTING.md
```

**Publishing Workflow:**
1. Manual release by maintainers
2. Run `npm version [major|minor|patch]`
3. Automated build in version hook
4. Manual `npm publish`
5. GitHub Actions can automate for tags

### Why This Is Effective

**1. Minimal Package Size**
- Only ships necessary files
- No dev dependencies or tests
- Reduces install time and disk usage

**2. Public Access**
- `access: "public"` for scoped packages
- Ensures package is discoverable
- No accidental private publishes

**3. Safety Mechanisms**
- `.npmignore` prevents accidental includes
- `files` whitelist is explicit
- Version hooks ensure builds are up-to-date

**4. Predictable Publishing**
- Automated through CI/CD
- Version tags trigger releases
- No manual errors

### Enzyme Current State

✅ **Strengths:**
- Good `publishConfig` with public access
- Files whitelist (dist, README, LICENSE)
- Comprehensive `.npmignore`

⚠️ **Considerations:**
- Could add `prepublishOnly` hook
- Missing publish smoke tests
- No dry-run validation

### Enzyme Adaptation Recommendations

**1. Add Publish Safety Hooks**
```json
{
  "scripts": {
    "prepublishOnly": "npm run build && npm run test:ci",
    "prepack": "node scripts/prepack-check.js",
    "postpack": "node scripts/postpack-check.js"
  }
}
```

**2. Create Pre-Pack Validation Script**
```javascript
// scripts/prepack-check.js
#!/usr/bin/env node
const { readFileSync, existsSync } = require('fs');
const { resolve } = require('path');

console.log('🔍 Running pre-pack validation...');

// 1. Verify dist exists
if (!existsSync(resolve(__dirname, '../dist'))) {
  console.error('❌ dist/ directory not found. Run npm run build first.');
  process.exit(1);
}

// 2. Verify essential files
const essentialFiles = [
  'dist/index.js',
  'dist/index.mjs',
  'dist/index.d.ts',
  'README.md',
  'LICENSE'
];

for (const file of essentialFiles) {
  if (!existsSync(resolve(__dirname, '..', file))) {
    console.error(`❌ Missing essential file: ${file}`);
    process.exit(1);
  }
}

// 3. Verify package.json
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

// Check version is not 0.0.0
if (pkg.version === '0.0.0') {
  console.error('❌ Package version is 0.0.0');
  process.exit(1);
}

// Check main/module/types point to valid files
const entryPoints = {
  main: pkg.main,
  module: pkg.module,
  types: pkg.types
};

for (const [key, value] of Object.entries(entryPoints)) {
  if (!value) {
    console.error(`❌ Missing ${key} field in package.json`);
    process.exit(1);
  }
  if (!existsSync(resolve(__dirname, '..', value))) {
    console.error(`❌ ${key} points to non-existent file: ${value}`);
    process.exit(1);
  }
}

// 4. Check for common mistakes
const content = readFileSync(resolve(__dirname, '../dist/index.js'), 'utf-8');
if (content.includes('process.env.NODE_ENV')) {
  console.warn('⚠️  Found process.env.NODE_ENV in bundle');
}

if (content.includes('console.log')) {
  console.warn('⚠️  Found console.log in bundle');
}

console.log('✅ Pre-pack validation passed');
```

**3. Add Publish Checklist**
```markdown
## PUBLISHING.md

# Publishing Checklist

## Pre-Publish

1. **Verify Clean State**
   ```bash
   git status  # Should be clean
   git pull    # Should be up to date
   ```

2. **Run Full Verification**
   ```bash
   npm run verify  # Tests, lint, typecheck
   npm run build   # Build fresh
   ```

3. **Test Package Locally**
   ```bash
   npm pack
   tar -xzf missionfabric-js-enzyme-*.tgz
   cd package && ls -la  # Verify contents
   cd .. && rm -rf package *.tgz
   ```

4. **Dry Run Publish**
   ```bash
   npm publish --dry-run
   # Review what will be published
   ```

## Publishing

### Automated (Recommended)
```bash
# Create release branch
git checkout -b release/v1.2.0

# Bump version and push
npm run release:minor  # or major/patch

# Creates tag and triggers CI
# CI will run tests and publish
```

### Manual
```bash
# Bump version
npm version minor -m "chore(release): v%s"

# Push with tags
git push && git push --tags

# Publish
npm publish

# Create GitHub release
gh release create v1.2.0 --generate-notes
```

## Post-Publish

1. **Verify Published**
   ```bash
   npm view @missionfabric-js/enzyme
   npm view @missionfabric-js/enzyme dist-tags
   ```

2. **Test Installation**
   ```bash
   mkdir test-install && cd test-install
   npm init -y
   npm install @missionfabric-js/enzyme
   node -e "console.log(require('@missionfabric-js/enzyme'))"
   ```

3. **Update Documentation**
   - [ ] Update docs site
   - [ ] Update examples repo
   - [ ] Add release notes to GitHub
   - [ ] Announce on social media

4. **Monitor**
   - [ ] Check npm download stats
   - [ ] Monitor GitHub issues
   - [ ] Watch for bug reports
```

**4. Add Package Size Check**
```json
{
  "scripts": {
    "pack:check": "npm pack --dry-run && npm-pack-size"
  },
  "devDependencies": {
    "npm-pack-size": "^1.0.0"
  }
}
```

**5. Add Provenance (npm 9+)**
```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/",
    "provenance": true
  }
}
```

---

## 10. Documentation Structure

### Axios Pattern

**Root Documentation:**
```
/
├── README.md              # Main documentation (13KB!)
├── CHANGELOG.md           # Version history
├── CONTRIBUTING.md        # Contribution guide
├── MIGRATION_GUIDE.md     # Upgrade instructions
├── SECURITY.md           # Security policies
├── CODE_OF_CONDUCT.md    # Community standards
├── COLLABORATOR_GUIDE.md # Maintainer docs
└── ECOSYSTEM.md          # Integration info
```

**README.md Structure:**
1. **Header**
   - Logo/badges
   - One-line description
   - Key features

2. **Table of Contents**
   - Installation
   - Features
   - Examples
   - API
   - Advanced

3. **Installation**
   - npm/yarn/pnpm
   - CDN options
   - TypeScript notes

4. **Usage Examples**
   - GET request
   - POST request
   - Concurrent requests
   - async/await

5. **API Reference**
   - axios() method
   - Request config
   - Response schema
   - Interceptors
   - Error handling

6. **Advanced Topics**
   - Cancellation
   - TypeScript
   - Custom instances
   - Semver policy

7. **Resources**
   - Changelog
   - Upgrade guide
   - Security
   - Credits

**CONTRIBUTING.md Highlights:**
- Code style guide
- Testing requirements
- Grunt commands
- Git workflow
- Release process
- PR guidelines

**SECURITY.md:**
- Vulnerability reporting (huntr.dev)
- Response timeline
- Disclosure policy

### Why This Is Effective

**1. Comprehensive Coverage**
- Users find answers without issues
- Clear upgrade paths
- Security transparency

**2. Progressive Disclosure**
- README for quick start
- Deep docs for advanced usage
- Migration guides for breaking changes

**3. Community Health**
- Code of conduct
- Contribution guidelines
- Collaborator guide

**4. Maintenance**
- Changelog shows progress
- Security policy builds trust
- Ecosystem shows integrations

### Enzyme Current State

✅ **Strengths:**
- Excellent documentation structure in `/docs`
- Comprehensive README with badges
- API documentation
- Multiple focused guides

⚠️ **Missing:**
- CHANGELOG.md
- CONTRIBUTING.md
- SECURITY.md
- MIGRATION.md
- CODE_OF_CONDUCT.md

### Enzyme Adaptation Recommendations

**1. Create CONTRIBUTING.md**
```markdown
# Contributing to Enzyme

Thank you for your interest in contributing to Enzyme! This guide will help you get started.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git

### Development Setup

1. **Fork and clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/enzyme.git
   cd enzyme
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Branch Naming

- `feat/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring
- `test/description` - Test updates

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Build/tooling

**Examples:**
```
feat(routing): add support for nested layouts
fix(state): resolve memory leak in broadcast sync
docs(api): update hook documentation
```

### Code Style

- **Formatting**: Prettier (runs on commit)
- **Linting**: ESLint (runs on commit)
- **TypeScript**: Strict mode required

Run checks manually:
```bash
npm run lint
npm run format:check
npm run typecheck
```

### Testing

- Write tests for all new features
- Maintain or improve coverage
- Run full test suite:
  ```bash
  npm run test:coverage
  ```

### Documentation

- Update relevant docs in `/docs`
- Add JSDoc comments for public APIs
- Include code examples

## Pull Request Process

1. **Create a branch** from `develop`

2. **Make your changes**
   - Write code
   - Add tests
   - Update docs

3. **Verify everything passes**
   ```bash
   npm run verify  # typecheck + lint + test
   npm run build   # ensure build succeeds
   ```

4. **Push and create PR**
   - Use our [PR template](.github/PULL_REQUEST_TEMPLATE.md)
   - Link related issues
   - Add screenshots if UI changes

5. **Address review feedback**
   - Be responsive to comments
   - Push additional commits
   - Request re-review

6. **Merge**
   - Squash commits if many small ones
   - Use descriptive merge commit message
   - Delete branch after merge

## Release Process

*Maintainers only*

See [RELEASE_PROCESS.md](RELEASE_PROCESS.md) for details.

## Need Help?

- 📚 [Documentation](https://github.com/harborgrid-justin/enzyme/docs)
- 💬 [Discussions](https://github.com/harborgrid-justin/enzyme/discussions)
- 🐛 [Issues](https://github.com/harborgrid-justin/enzyme/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
```

**2. Create SECURITY.md**
```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### Preferred Method: GitHub Security Advisories

1. Go to https://github.com/harborgrid-justin/enzyme/security/advisories
2. Click "Report a vulnerability"
3. Fill out the form with details
4. Submit

### Alternative: Email

Send an email to security@missionfabric.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 30 days
  - Medium: Within 90 days
  - Low: Next minor release

### Disclosure Policy

- We'll acknowledge receipt within 48 hours
- We'll provide a fix timeline within 7 days
- We'll keep you updated on progress
- We'll credit you in release notes (unless you prefer anonymity)
- We'll coordinate public disclosure timing

### Security Update Process

1. Fix is developed in private
2. Fix is tested thoroughly
3. Security advisory is published
4. Patch version is released
5. Users are notified

### Security Best Practices

When using Enzyme:

1. **Keep Dependencies Updated**
   ```bash
   npm update @missionfabric-js/enzyme
   ```

2. **Use Lock Files**
   - Commit `package-lock.json`
   - Prevents unexpected updates

3. **Monitor for Advisories**
   ```bash
   npm audit
   ```

4. **Follow Security Advisories**
   - Watch this repository
   - Enable GitHub security alerts

### Known Security Considerations

- **Client-Side Only**: Enzyme is a client-side framework. Never expose sensitive data or API keys in client code.
- **XSS Protection**: Always sanitize user input before rendering.
- **CSRF**: Implement CSRF tokens for state-changing operations.
- **Content Security Policy**: Configure CSP headers in your server.

### Hall of Fame

We thank the following researchers for responsibly disclosing security issues:

*None yet - be the first!*

## Questions?

For questions about this policy, email security@missionfabric.com
```

**3. Create CODE_OF_CONDUCT.md**
```markdown
# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, caste, color, religion, or sexual
identity and orientation.

## Our Standards

Examples of behavior that contributes to a positive environment:

* Demonstrating empathy and kindness toward other people
* Being respectful of differing opinions, viewpoints, and experiences
* Giving and gracefully accepting constructive feedback
* Accepting responsibility and apologizing to those affected by our mistakes
* Focusing on what is best for the overall community

Examples of unacceptable behavior:

* The use of sexualized language or imagery, and sexual attention or advances
* Trolling, insulting or derogatory comments, and personal or political attacks
* Public or private harassment
* Publishing others' private information without explicit permission
* Other conduct which could reasonably be considered inappropriate

## Enforcement Responsibilities

Project maintainers are responsible for clarifying and enforcing standards of
acceptable behavior and will take appropriate action in response to any behavior
that they deem inappropriate, threatening, offensive, or harmful.

## Scope

This Code of Conduct applies within all community spaces, and also applies when
an individual is officially representing the community in public spaces.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the project maintainers at conduct@missionfabric.com.

All complaints will be reviewed and investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org),
version 2.1.
```

**4. Reorganize Documentation**
```
/
├── README.md
├── CHANGELOG.md          # ← NEW
├── CONTRIBUTING.md       # ← NEW
├── SECURITY.md          # ← NEW
├── CODE_OF_CONDUCT.md   # ← NEW
├── MIGRATION.md         # ← From docs/
├── LICENSE
│
├── docs/
│   ├── README.md        # Documentation index
│   ├── getting-started/
│   │   ├── installation.md
│   │   ├── quickstart.md
│   │   └── first-app.md
│   ├── api/
│   │   ├── routing.md
│   │   ├── state.md
│   │   └── hooks.md
│   ├── guides/
│   │   ├── routing.md
│   │   ├── state-management.md
│   │   ├── performance.md
│   │   └── testing.md
│   ├── advanced/
│   │   ├── architecture.md
│   │   ├── customization.md
│   │   └── plugins.md
│   └── reference/
│       ├── configuration.md
│       ├── typescript.md
│       └── cli.md
```

**5. Update README.md**
```markdown
# @missionfabric-js/enzyme

> **A powerful React framework for building enterprise applications**

[Current excellent content...]

## 📚 Documentation

- [Getting Started](docs/GETTING_STARTED.md)
- [API Reference](docs/API_DOCUMENTATION.md)
- [Migration Guide](MIGRATION.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 🔒 Security

Security is important to us. Please see our [Security Policy](SECURITY.md) for reporting vulnerabilities.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed version history.

## 📄 License

MIT © [Defendr Team](LICENSE)

---

**Questions?** Open an [issue](https://github.com/harborgrid-justin/enzyme/issues) or [discussion](https://github.com/harborgrid-justin/enzyme/discussions)
```

---

## 11. Enzyme Current State Assessment

### Strengths ✅

1. **Modern Package Configuration**
   - Excellent `exports` field with 25+ subpath exports
   - `type: "module"` for ESM-first approach
   - Proper `sideEffects: false` for tree-shaking
   - Well-structured peer dependencies

2. **Build System**
   - Modern Vite build (faster than Webpack/Rollup)
   - TypeScript declaration generation
   - Source maps enabled
   - Module preservation for tree-shaking

3. **Code Quality**
   - Strict TypeScript configuration
   - Comprehensive ESLint setup
   - Prettier formatting
   - Husky + lint-staged pre-commit hooks

4. **Testing**
   - Vitest test runner
   - Coverage reporting
   - Testing Library integration
   - Playwright for E2E

5. **Documentation**
   - Extensive docs folder
   - Multiple guides and references
   - API documentation
   - Good README

### Critical Gaps ❌

1. **CI/CD Infrastructure**
   - ❌ No GitHub Actions workflows
   - ❌ No automated testing on PR
   - ❌ No release automation
   - ❌ No deployment pipeline

2. **Version Management**
   - ❌ No CHANGELOG.md
   - ❌ No version bump scripts
   - ❌ No release documentation
   - ❌ No migration guides

3. **Community Health**
   - ❌ No CONTRIBUTING.md
   - ❌ No CODE_OF_CONDUCT.md
   - ❌ No SECURITY.md
   - ❌ No issue templates
   - ❌ No PR template

4. **Build Artifacts**
   - ❌ No UMD build for direct browser use
   - ❌ No minified builds
   - ❌ No CommonJS type definitions (.d.cts)
   - ❌ No CDN configuration

5. **Publishing**
   - ❌ No prepublishOnly hooks
   - ❌ No pack validation
   - ❌ No publish smoke tests
   - ❌ No bundle size monitoring

### Opportunities for Improvement ⚠️

1. **Dependencies**
   - Move `@tanstack/react-query` to peer dependencies
   - Move `lucide-react` to peer dependencies (optional)
   - Move `tsc` to dev dependencies

2. **Entry Points**
   - Add factory pattern for customizable instances
   - Add `unsafe/*` exports for advanced users
   - Add browser field for platform-specific code

3. **Build Optimization**
   - Add bundle size limits
   - Add compression (gzip/brotli)
   - Add bundle analysis
   - Add minified builds

4. **Type Safety**
   - Add CommonJS type definitions
   - Create namespace pattern for types
   - Enhance generic types

5. **Automation**
   - Conventional commits
   - Automated changelog generation
   - Release automation
   - Dependency updates (Dependabot)

---

## 12. Recommendations for Enzyme

### Priority 1: Critical (Implement Immediately) 🔴

1. **Set Up GitHub Actions CI/CD**
   - Create `.github/workflows/ci.yml`
   - Add test automation on PR
   - Add build verification
   - Add code quality checks
   - **Impact**: Prevents broken code from merging
   - **Effort**: 2-3 hours
   - **See**: [Section 8](#8-cicd-configuration)

2. **Create CHANGELOG.md**
   - Document version history
   - Add conventional commit setup
   - Add changelog generation script
   - **Impact**: Transparent release process
   - **Effort**: 1-2 hours
   - **See**: [Section 7](#7-version-management--semver)

3. **Add Version Management Scripts**
   - Add preversion/version/postversion hooks
   - Create release scripts
   - Add validation checks
   - **Impact**: Safe, automated releases
   - **Effort**: 2-3 hours
   - **See**: [Section 7](#7-version-management--semver)

4. **Create Community Health Files**
   - CONTRIBUTING.md
   - CODE_OF_CONDUCT.md
   - SECURITY.md
   - **Impact**: Attracts contributors, builds trust
   - **Effort**: 2-3 hours
   - **See**: [Section 10](#10-documentation-structure)

### Priority 2: Important (Implement Soon) 🟡

5. **Add Bundle Size Monitoring**
   - Install size-limit
   - Configure size thresholds
   - Add to CI pipeline
   - **Impact**: Prevents bundle bloat
   - **Effort**: 1-2 hours
   - **See**: [Section 5](#5-bundle-optimization)

6. **Optimize Dependencies**
   - Move React Query to peer deps
   - Move lucide-react to optional peer deps
   - Fix tsc in runtime deps
   - **Impact**: Smaller bundle, better flexibility
   - **Effort**: 1 hour
   - **See**: [Section 6](#6-dependencies-strategy)

7. **Add Publishing Safety**
   - prepublishOnly hook
   - prepack validation script
   - pack size check
   - **Impact**: Prevents bad publishes
   - **Effort**: 2 hours
   - **See**: [Section 9](#9-publishing-configuration)

8. **Create Issue/PR Templates**
   - Bug report template
   - Feature request template
   - PR template
   - **Impact**: Better issue quality
   - **Effort**: 1-2 hours
   - **See**: [Section 8](#8-cicd-configuration)

### Priority 3: Nice to Have (Future Enhancements) 🟢

9. **Add CommonJS Type Definitions**
   - Generate .d.cts files
   - Update exports field
   - Test with CJS consumers
   - **Impact**: Better CJS support
   - **Effort**: 2-3 hours
   - **See**: [Section 4](#4-typescript-configuration--type-exports)

10. **Add UMD Build**
    - Create vite.config.umd.ts
    - Generate minified UMD bundle
    - Add CDN fields to package.json
    - **Impact**: Direct browser usage
    - **Effort**: 2-3 hours
    - **See**: [Section 3](#3-build-scripts--tooling)

11. **Add Release Automation**
    - GitHub Actions release workflow
    - Automated npm publishing
    - GitHub release creation
    - **Impact**: Faster, safer releases
    - **Effort**: 3-4 hours
    - **See**: [Section 8](#8-cicd-configuration)

12. **Enhance Build Optimization**
    - Add compression plugins
    - Add bundle analyzer
    - Add minification options
    - Platform-specific builds
    - **Impact**: Smaller bundles
    - **Effort**: 3-4 hours
    - **See**: [Section 5](#5-bundle-optimization)

### Implementation Roadmap

#### Week 1: Foundation
- [ ] Set up GitHub Actions CI/CD
- [ ] Create CHANGELOG.md
- [ ] Add version management scripts
- [ ] Create community health files

#### Week 2: Quality
- [ ] Add bundle size monitoring
- [ ] Optimize dependencies
- [ ] Add publishing safety
- [ ] Create issue/PR templates

#### Week 3: Enhancement
- [ ] Add CommonJS type definitions
- [ ] Add UMD build
- [ ] Add release automation
- [ ] Enhance build optimization

### Quick Wins (Can Do Today) ⚡

1. **Fix `tsc` dependency** (5 minutes)
   ```bash
   npm uninstall tsc
   npm install --save-dev typescript
   ```

2. **Add `typings` field** (2 minutes)
   ```json
   {
     "typings": "./dist/index.d.ts"
   }
   ```

3. **Add `funding` field** (5 minutes)
   ```json
   {
     "funding": {
       "type": "github",
       "url": "https://github.com/sponsors/harborgrid-justin"
     }
   }
   ```

4. **Add `keywords`** (already good, but can add more)
   ```json
   {
     "keywords": [
       "react", "framework", "enterprise", "routing",
       "state-management", "performance", "typescript",
       "vite", "zustand", "react-query", "cli",
       "modular", "tree-shaking", "esm", "cjs"
     ]
   }
   ```

5. **Create .github directory** (2 minutes)
   ```bash
   mkdir -p .github/{workflows,ISSUE_TEMPLATE}
   ```

---

## Summary

### Key Takeaways from Axios

1. **Simplicity**: Despite being a complex library, axios keeps things simple:
   - 3 runtime dependencies
   - Clear entry points
   - Straightforward API

2. **Compatibility**: Support for multiple environments:
   - Node.js and browsers
   - ESM and CommonJS
   - TypeScript and JavaScript

3. **Quality**: No compromises on quality:
   - Multi-version testing
   - Comprehensive documentation
   - Clear versioning

4. **Community**: Strong community support:
   - Contributor recognition
   - Clear guidelines
   - Transparent processes

### Enzyme's Path Forward

Enzyme already has a **solid foundation** with:
- Modern build system (Vite)
- Excellent TypeScript setup
- Comprehensive exports
- Good documentation

To become **enterprise-ready**, focus on:

1. **Automation** (CI/CD, releases)
2. **Documentation** (changelog, contributing, security)
3. **Quality** (bundle size, dependencies)
4. **Community** (templates, guidelines)

The recommendations in this report provide a clear path to enterprise-grade npm package status while maintaining Enzyme's existing strengths.

---

## Appendix: Useful Resources

### Package Configuration
- [npm package.json docs](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Node.js Package Entry Points](https://nodejs.org/api/packages.html#package-entry-points)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)

### Build Tools
- [Vite Library Mode](https://vitejs.dev/guide/build.html#library-mode)
- [Rollup Configuration](https://rollupjs.org/configuration-options/)
- [Terser Options](https://terser.org/docs/api-reference)

### CI/CD
- [GitHub Actions](https://docs.github.com/en/actions)
- [npm publish provenance](https://docs.npmjs.com/generating-provenance-statements)

### Quality
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)

### Community
- [Contributor Covenant](https://www.contributor-covenant.org/)
- [Open Source Guides](https://opensource.guide/)

---

**Report End**
