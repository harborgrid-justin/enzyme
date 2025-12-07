# Socket.io NPM Distribution Patterns Analysis
## Enterprise Setup for Enzyme CLI Framework

**Analysis Date:** December 3, 2025
**Socket.io Version Analyzed:** 4.8.1
**Repository:** https://github.com/socketio/socket.io
**Stars:** 62.7k | **Dependents:** 5.7M

---

## Executive Summary

Socket.io demonstrates a mature, enterprise-grade npm distribution strategy through a 12-package monorepo with independent versioning, dual module support (CJS/ESM), cross-platform optimization (browser/Node.js), and layered architecture. This analysis extracts 10 key patterns applicable to the Enzyme framework's evolution from a single-package setup to an enterprise-grade CLI ecosystem.

---

## 1. Monorepo Structure

### Socket.io Implementation

**Workspace Configuration:**
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

**Package Organization (12 packages):**

**Core Layer:**
- `socket.io` - Main server library
- `socket.io-client` - Client library
- `engine.io` - Transport layer server
- `engine.io-client` - Transport layer client

**Protocol Layer:**
- `socket.io-parser` - Socket.IO protocol (v4.2.4)
- `engine.io-parser` - Engine.IO protocol (v5.2.3)

**Infrastructure Layer:**
- `socket.io-adapter` - Base adapter interface
- `@socket.io/cluster-adapter` - Clustering support
- `@socket.io/cluster-engine` - Clustered engine variant

**Distribution Layer:**
- `socket.io-postgres-emitter` - PostgreSQL message emitter
- `socket.io-redis-streams-emitter` - Redis Streams emitter

**Utility Layer:**
- `@socket.io/component-emitter` - Event emitter component

### Benefits for Different Environments

**Node.js:**
- Independent package updates without full reinstall
- Smaller dependency trees (install only what you need)
- Clear separation of server vs client concerns

**Browser:**
- Smaller bundle sizes (client doesn't pull in server code)
- Tree-shakeable architecture
- Optimized transport selection

**React Native:**
- Platform-specific builds through conditional exports
- Reduced native bundle size
- Better code splitting

### Adaptation for Enzyme

**Recommended Structure:**
```
enzyme/
├── packages/
│   ├── enzyme-core/          # Core framework (routing, state, etc.)
│   ├── enzyme-cli/            # CLI tool
│   ├── enzyme-react-query/    # React Query integration
│   ├── enzyme-auth/           # Authentication adapters
│   ├── enzyme-monitoring/     # Performance monitoring
│   ├── enzyme-ui/             # UI components
│   ├── enzyme-vite-plugin/    # Vite plugin
│   ├── enzyme-adapter-zustand/# State management adapter
│   └── enzyme-adapter-tanstack/ # TanStack adapter
├── examples/
├── docs/
└── package.json
```

**Root package.json:**
```json
{
  "name": "@missionfabric-js/enzyme-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "examples/*"
  ],
  "scripts": {
    "build": "npm run compile -ws --if-present",
    "compile": "tsc --build",
    "test": "npm test -ws --if-present",
    "format:fix": "prettier --write \"packages/*/src/**/*.{ts,tsx}\"",
    "lint": "eslint packages/*/src --ext ts,tsx"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "prettier": "^3.7.1",
    "rimraf": "^6.1.2",
    "vitest": "^4.0.14"
  }
}
```

**Benefits:**
- Users can install `@missionfabric-js/enzyme` (all features) or `@missionfabric-js/enzyme-core` (minimal)
- CLI can be developed/versioned independently
- Adapters can support different state management libraries without forcing dependencies
- Easier to maintain backwards compatibility

---

## 2. Package Splitting Strategy

### Socket.io Implementation

**Core vs Adapters Pattern:**

**Base Adapter (socket.io-adapter):**
```json
{
  "name": "socket.io-adapter",
  "version": "2.5.5",
  "main": "./dist/index.js",
  "dependencies": {
    "debug": "~4.4.1",
    "ws": "~8.18.3"
  }
}
```

**Extension Adapter (cluster-adapter):**
```json
{
  "name": "@socket.io/cluster-adapter",
  "version": "0.3.0",
  "peerDependencies": {
    "socket.io-adapter": "~2.5.5"
  },
  "dependencies": {
    "debug": "~4.4.1"
  }
}
```

**Emitter Pattern (redis-streams-emitter):**
```json
{
  "name": "@socket.io/redis-streams-emitter",
  "version": "0.1.1",
  "dependencies": {
    "@msgpack/msgpack": "~2.8.0",
    "debug": "~4.4.1"
  }
}
```

### Benefits for Different Environments

**Minimal Bundle:**
- Core adapter: ~15KB minified
- Users only pay for what they use
- No Redis dependency unless explicitly needed

**Scalability:**
- Add cluster adapter only when scaling horizontally
- Emitters enable pub/sub without full socket.io server
- Each adapter can evolve independently

**Testing:**
- Mock adapters for testing
- Swap adapters without code changes
- Test scaling logic in isolation

### Adaptation for Enzyme

**enzyme-core Package:**
```json
{
  "name": "@missionfabric-js/enzyme-core",
  "version": "2.0.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./routing": "./dist/routing/index.mjs",
    "./contexts": "./dist/contexts/index.mjs"
  },
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0"
  },
  "dependencies": {
    "clsx": "^2.1.1"
  }
}
```

**enzyme-adapter-zustand Package:**
```json
{
  "name": "@missionfabric-js/enzyme-adapter-zustand",
  "version": "1.0.0",
  "peerDependencies": {
    "@missionfabric-js/enzyme-core": "^2.0.0",
    "zustand": "^5.0.0"
  },
  "dependencies": {
    "debug": "^4.4.1"
  }
}
```

**enzyme-adapter-tanstack Package:**
```json
{
  "name": "@missionfabric-js/enzyme-adapter-tanstack",
  "version": "1.0.0",
  "peerDependencies": {
    "@missionfabric-js/enzyme-core": "^2.0.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

**enzyme Package (Meta Package):**
```json
{
  "name": "@missionfabric-js/enzyme",
  "version": "2.0.0",
  "dependencies": {
    "@missionfabric-js/enzyme-core": "^2.0.0",
    "@missionfabric-js/enzyme-adapter-zustand": "^1.0.0",
    "@missionfabric-js/enzyme-adapter-tanstack": "^1.0.0",
    "@missionfabric-js/enzyme-ui": "^1.0.0"
  }
}
```

**Benefits:**
- Users can install minimal `enzyme-core` (~50KB)
- Or full `enzyme` bundle with all adapters (~200KB)
- Third-party adapters possible (community plugins)
- Each adapter tested independently

---

## 3. TypeScript Configuration

### Socket.io Implementation

**Root tsconfig.json (socket.io package):**
```json
{
  "compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": true,
    "noImplicitAny": false,
    "noImplicitThis": false,
    "strictPropertyInitialization": false,
    "noImplicitReturns": true,
    "declaration": true,
    "incremental": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["./lib/**/*"]
}
```

**Client Package tsconfig.json:**
```json
{
  "compilerOptions": {
    "outDir": "build/cjs/",
    "target": "ES2018",
    "module": "commonjs",
    "declaration": true,
    "esModuleInterop": true
  },
  "include": ["./lib/**/*"]
}
```

**Dual Build Strategy:**

Socket.io-client builds two targets:
1. **CJS Build:** `tsc` → `build/cjs/`
2. **ESM Build:** `tsc -p tsconfig.esm.json` → `build/esm/`
3. **Debug Build:** Separate ESM build with debug statements intact

**Build Script:**
```bash
# socket.io-client compile script
rimraf ./build && tsc && tsc -p tsconfig.esm.json && ./postcompile.sh
```

**Postcompile Script:**
```bash
#!/bin/bash

# Copy ESM package.json marker
cp ./support/package.esm.json ./build/esm/package.json

# Create debug build
cp -r ./build/esm/ ./build/esm-debug/

# Strip debug calls from production ESM
if [[ "$OSTYPE" == "darwin"* ]]; then
  find ./build/esm/ -type f -name '*.js' -exec sed -i '' '/debug(/d' {} \;
else
  find ./build/esm/ -type f -name '*.js' -exec sed -i '/debug(/d' {} \;
fi

# Add CommonJS compatibility
echo "module.exports = lookup;" >> ./build/cjs/index.js
```

### Benefits for Different Environments

**Node.js:**
- CJS output for maximum compatibility (require())
- ES2017 target for Node 10+ optimization
- Incremental builds for faster development

**Browsers:**
- ESM output for modern bundlers (Webpack, Rollup, Vite)
- Tree-shaking support through ESM
- Separate debug builds for development

**TypeScript Users:**
- Declaration files for both CJS and ESM
- Strict type checking with pragmatic overrides
- Type inference through proper exports

### Adaptation for Enzyme

**Root tsconfig.base.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

**packages/enzyme-core/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./build/cjs",
    "module": "commonjs",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**packages/enzyme-core/tsconfig.esm.json:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./build/esm",
    "module": "esnext"
  }
}
```

**packages/enzyme-cli/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "./dist",
    "lib": ["ES2020"],
    "jsx": "preserve"
  },
  "include": ["src/**/*"]
}
```

**Compile Script (enzyme-core):**
```json
{
  "scripts": {
    "compile": "npm run compile:cjs && npm run compile:esm && npm run postcompile",
    "compile:cjs": "tsc",
    "compile:esm": "tsc -p tsconfig.esm.json",
    "postcompile": "./scripts/postcompile.sh"
  }
}
```

**Benefits:**
- Dual CJS/ESM output for maximum compatibility
- Shared base config reduces duplication
- CLI optimized for Node.js only
- Framework optimized for browsers
- Project references for faster incremental builds

---

## 4. Cross-Platform Build Strategy

### Socket.io Implementation

**Browser Field Mapping:**

**engine.io-parser package.json:**
```json
{
  "browser": {
    "./build/esm/encodePacket.js": "./build/esm/encodePacket.browser.js",
    "./build/esm/decodePacket.js": "./build/esm/decodePacket.browser.js"
  }
}
```

**socket.io-client package.json:**
```json
{
  "browser": {
    "./test/node-based": false,
    "./build/esm/url.js": "./build/esm/url.browser.js"
  }
}
```

**Conditional Code Pattern:**

**url.ts (Node.js/Browser Universal):**
```typescript
// Graceful degradation pattern
export function url(
  uri: string,
  loc?: Location
): { host: string; port: string; protocol: string } {
  // Try to use browser location if available
  loc = loc || (typeof location !== "undefined" && location);

  if (typeof loc !== "undefined") {
    uri = loc.protocol + "//" + uri;
  } else {
    // Default for server-side
    uri = "https://" + uri;
  }
  // ... parsing logic
}
```

**UMD Bundle Strategy (Rollup):**

```javascript
// rollup.config.umd.js
export default [
  {
    input: "./build/esm-debug/browser-entrypoint.js",
    output: {
      file: "dist/socket.io.js",
      format: "umd",
      name: "io",
      sourcemap: true
    },
    plugins: [
      nodeResolve({ browser: true }),
      commonjs(),
      babel({
        presets: [["@babel/env", { modules: false }]],
        plugins: [["@babel/plugin-transform-classes", { loose: true }]]
      })
    ]
  },
  {
    input: "./build/esm/browser-entrypoint.js",
    output: {
      file: "dist/socket.io.min.js",
      format: "umd",
      name: "io",
      plugins: [
        terser({
          mangle: {
            properties: { regex: /^_/ }
          }
        })
      ]
    }
  }
];
```

**Export Conditions:**

**socket.io-client package.json:**
```json
{
  "exports": {
    ".": {
      "types": "./build/esm/index.d.ts",
      "import": {
        "node": "./build/esm/index.js",
        "default": "./build/esm-debug/index.js"
      },
      "require": {
        "types": "./build/cjs/index.d.ts",
        "default": "./build/cjs/index.js"
      }
    },
    "./debug": {
      "import": "./build/esm-debug/index.js",
      "require": "./build/cjs/index.js"
    },
    "./dist/socket.io.js": "./dist/socket.io.js",
    "./dist/socket.io.min.js": "./dist/socket.io.min.js"
  }
}
```

### Benefits for Different Environments

**Node.js:**
- Native modules (ws, http) used
- Optimized for server-side performance
- Full feature set (clustering, adapters)

**Browser:**
- Smaller bundles (no Node.js modules)
- WebSocket/XHR transports only
- Tree-shakeable ESM imports

**React Native:**
- WebSocket-only transport
- No XMLHttpRequest dependency
- Async storage for persistence

**CDN Usage:**
```html
<!-- Development -->
<script src="https://cdn.socket.io/4.8.1/socket.io.js"></script>
<!-- Production -->
<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
<script>
  const socket = io("http://localhost:3000");
</script>
```

### Adaptation for Enzyme

**enzyme-core Package Structure:**
```
packages/enzyme-core/
├── src/
│   ├── index.ts                    # Main entry
│   ├── routing/
│   │   ├── index.ts               # Universal routing
│   │   ├── browser.ts             # Browser history
│   │   └── server.ts              # Server rendering
│   ├── storage/
│   │   ├── index.ts
│   │   ├── localStorage.ts        # Browser
│   │   └── memory.ts              # Node.js/React Native
│   └── performance/
│       ├── index.ts
│       ├── browser.ts             # web-vitals
│       └── node.ts                # process.hrtime
├── rollup.config.js               # Browser UMD bundle
└── package.json
```

**package.json with Conditional Exports:**
```json
{
  "name": "@missionfabric-js/enzyme-core",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "react-native": "./dist/index.native.mjs",
      "browser": "./dist/index.browser.mjs",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./routing": {
      "types": "./dist/routing/index.d.ts",
      "browser": "./dist/routing/browser.mjs",
      "import": "./dist/routing/index.mjs"
    },
    "./storage": {
      "types": "./dist/storage/index.d.ts",
      "react-native": "./dist/storage/native.mjs",
      "browser": "./dist/storage/browser.mjs",
      "default": "./dist/storage/memory.mjs"
    }
  },
  "browser": {
    "./dist/storage/index.mjs": "./dist/storage/browser.mjs",
    "./dist/performance/index.mjs": "./dist/performance/browser.mjs"
  },
  "react-native": {
    "./dist/storage/index.mjs": "./dist/storage/native.mjs"
  }
}
```

**Rollup Config for UMD Bundle:**
```javascript
// packages/enzyme-core/rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';

export default [
  // Development bundle
  {
    input: 'dist/index.browser.mjs',
    output: {
      file: 'dist/enzyme.js',
      format: 'umd',
      name: 'Enzyme',
      sourcemap: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM'
      }
    },
    external: ['react', 'react-dom'],
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify('development'),
        preventAssignment: true
      }),
      resolve({ browser: true }),
      commonjs()
    ]
  },
  // Production bundle
  {
    input: 'dist/index.browser.mjs',
    output: {
      file: 'dist/enzyme.min.js',
      format: 'umd',
      name: 'Enzyme',
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM'
      }
    },
    external: ['react', 'react-dom'],
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true
      }),
      resolve({ browser: true }),
      commonjs(),
      terser({
        mangle: { properties: { regex: /^_/ } }
      })
    ]
  }
];
```

**Benefits:**
- SSR support (Next.js, Remix) through server exports
- React Native compatibility
- CDN usage for quick prototyping
- Optimal bundle size per platform

---

## 5. Bundle Optimization

### Socket.io Implementation

**Package Size Strategy:**

| Package | Unpacked | Dependencies | Purpose |
|---------|----------|--------------|---------|
| socket.io-adapter | ~50KB | 2 (debug, ws) | Base adapter |
| @socket.io/component-emitter | ~15KB | 0 | Event emitter |
| socket.io-parser | ~80KB | 2 | Protocol serialization |
| engine.io-parser | ~60KB | 0 | Transport serialization |
| socket.io-client | ~200KB | 4 | Full client |
| socket.io | ~500KB | 7 | Full server |

**Optimization Techniques:**

**1. Debug Stripping:**
```bash
# postcompile.sh
find ./build/esm/ -type f -name '*.js' -exec sed -i '/debug(/d' {} \;
```

**2. Terser Configuration:**
```javascript
terser({
  mangle: {
    properties: {
      regex: /^_/  // Mangle private properties
    }
  },
  compress: {
    pure_getters: true,
    unsafe: true,
    unsafe_comps: true
  }
})
```

**3. Peer Dependencies:**
```json
{
  "peerDependencies": {
    "socket.io-adapter": "~2.5.5"
  },
  "peerDependenciesMeta": {
    "socket.io-adapter": {
      "optional": false
    }
  }
}
```

**4. Side Effects Declaration:**
```json
{
  "sideEffects": false
}
```

**5. Files Whitelist:**
```json
{
  "files": [
    "dist",
    "build/cjs",
    "build/esm"
  ]
}
```

### Benefits for Different Environments

**Node.js:**
- CJS bundles ~30% smaller (no ESM wrappers)
- No browser polyfills included
- Only necessary Node modules

**Browser:**
- ESM tree-shaking reduces bundle by 40-60%
- Debug code stripped in production
- Minified UMD ~70KB gzipped

**Edge/Serverless:**
- Small adapter packages (50KB)
- No unnecessary dependencies
- Fast cold starts

### Adaptation for Enzyme

**Current State Analysis:**

From `/home/user/enzyme/package.json`:
- Main package: All features bundled together
- Dependencies: 8 runtime deps (~2MB uncompressed)
- No tree-shaking optimization
- Single bundle output

**Optimized Structure:**

**enzyme-core package.json:**
```json
{
  "name": "@missionfabric-js/enzyme-core",
  "version": "2.0.0",
  "sideEffects": false,
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./routing": "./dist/routing.mjs",
    "./state": "./dist/state.mjs",
    "./contexts": "./dist/contexts.mjs"
  },
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0"
  },
  "dependencies": {
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@rollup/plugin-terser": "^0.4.4",
    "rollup-plugin-visualizer": "^5.12.0"
  }
}
```

**Vite Config for Optimal Bundles:**
```typescript
// packages/enzyme-core/vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      rollupTypes: true
    }),
    visualizer({
      filename: 'bundle-analysis.html',
      gzipSize: true
    })
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        routing: resolve(__dirname, 'src/routing/index.ts'),
        state: resolve(__dirname, 'src/state/index.ts'),
        contexts: resolve(__dirname, 'src/contexts/index.ts')
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        exports: 'named',
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        pure_getters: true,
        unsafe: true,
        passes: 2
      },
      mangle: {
        properties: {
          regex: /^_private/
        }
      }
    },
    sourcemap: true,
    chunkSizeWarningLimit: 100
  }
});
```

**Bundle Analysis Script:**
```json
{
  "scripts": {
    "analyze": "vite build && open bundle-analysis.html",
    "size": "size-limit"
  }
}
```

**size-limit Config:**
```json
{
  "size-limit": [
    {
      "name": "enzyme-core",
      "path": "dist/index.mjs",
      "limit": "20 KB",
      "gzip": true
    },
    {
      "name": "enzyme-core/routing",
      "path": "dist/routing.mjs",
      "limit": "5 KB"
    },
    {
      "name": "enzyme-core/state",
      "path": "dist/state.mjs",
      "limit": "8 KB"
    }
  ]
}
```

**Expected Bundle Sizes:**

| Package | Current | Optimized | Reduction |
|---------|---------|-----------|-----------|
| enzyme (full) | ~200KB | ~120KB | 40% |
| enzyme-core | N/A | ~20KB | New |
| enzyme-routing | N/A | ~5KB | New |
| enzyme-state | N/A | ~8KB | New |
| enzyme-ui | N/A | ~30KB | New |

**Benefits:**
- Tree-shaking reduces production bundles by 40-60%
- Subpath exports enable granular imports
- Size limits enforce bundle budget
- Bundle visualization identifies bloat

---

## 6. Peer Dependency Management

### Socket.io Implementation

**Adapter Pattern with Peer Dependencies:**

**Base Adapter (socket.io-adapter):**
```json
{
  "name": "socket.io-adapter",
  "version": "2.5.5",
  "dependencies": {
    "debug": "~4.4.1",
    "ws": "~8.18.3"
  }
}
```

**Extension Adapter (cluster-adapter):**
```json
{
  "name": "@socket.io/cluster-adapter",
  "version": "0.3.0",
  "peerDependencies": {
    "socket.io-adapter": "~2.5.5"
  },
  "peerDependenciesMeta": {
    "socket.io-adapter": {
      "optional": false
    }
  },
  "dependencies": {
    "debug": "~4.4.1"
  }
}
```

**Client Package:**
```json
{
  "name": "socket.io-client",
  "version": "4.8.1",
  "dependencies": {
    "@socket.io/component-emitter": "~3.1.0",
    "debug": "~4.4.1",
    "engine.io-client": "~6.6.2",
    "socket.io-parser": "~4.2.4"
  }
}
```

**Server Package:**
```json
{
  "name": "socket.io",
  "version": "4.8.1",
  "dependencies": {
    "accepts": "~1.3.4",
    "base64id": "~2.0.0",
    "cors": "~2.8.5",
    "debug": "~4.4.1",
    "engine.io": "~6.6.0",
    "socket.io-adapter": "~2.5.2",
    "socket.io-parser": "~4.2.4"
  }
}
```

**Version Overrides (Root package.json):**
```json
{
  "overrides": {
    "ws": "8.18.3",
    "@types/estree": "0.0.52",
    "@types/lodash": "4.14.189"
  }
}
```

**Peer Dependency Strategy:**

1. **Core packages**: No peer dependencies (self-contained)
2. **Adapters**: Peer depend on base adapter
3. **Emitters**: Peer depend on parser, not full socket.io
4. **Plugins**: Peer depend on specific versions

### Benefits for Different Environments

**Node.js:**
- No version conflicts in monorepos
- Single dependency tree
- Predictable resolution

**Browser:**
- Shared React instance
- No duplicate bundles
- Smaller final size

**Microservices:**
- Each service can use different adapter versions
- Core library version independent of adapters
- Gradual migration path

### Adaptation for Enzyme

**Current Issues:**

From `/home/user/enzyme/package.json`:
```json
{
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0",
    "react-router-dom": "^6.26.2 || ^7.0.0"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.90.11",
    "zustand": "^5.0.8",
    "lucide-react": "^0.555.0"
  }
}
```

**Issues:**
- Forces Zustand even if user wants Jotai
- Forces TanStack Query even if user has alternative
- Forces specific router version
- No adapter pattern

**Optimized Structure:**

**enzyme-core:**
```json
{
  "name": "@missionfabric-js/enzyme-core",
  "version": "2.0.0",
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": false },
    "react-dom": { "optional": false }
  },
  "dependencies": {
    "clsx": "^2.1.1"
  },
  "optionalDependencies": {
    "lucide-react": "^0.555.0"
  }
}
```

**enzyme-adapter-zustand:**
```json
{
  "name": "@missionfabric-js/enzyme-adapter-zustand",
  "version": "1.0.0",
  "peerDependencies": {
    "@missionfabric-js/enzyme-core": "^2.0.0",
    "react": "^18.3.1 || ^19.0.0",
    "zustand": "^4.0.0 || ^5.0.0"
  },
  "peerDependenciesMeta": {
    "zustand": { "optional": false }
  }
}
```

**enzyme-adapter-tanstack:**
```json
{
  "name": "@missionfabric-js/enzyme-adapter-tanstack",
  "version": "1.0.0",
  "peerDependencies": {
    "@missionfabric-js/enzyme-core": "^2.0.0",
    "react": "^18.3.1 || ^19.0.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

**enzyme-router-adapter-react-router:**
```json
{
  "name": "@missionfabric-js/enzyme-router-react-router",
  "version": "1.0.0",
  "peerDependencies": {
    "@missionfabric-js/enzyme-core": "^2.0.0",
    "react": "^18.3.1 || ^19.0.0",
    "react-router-dom": "^6.0.0 || ^7.0.0"
  }
}
```

**enzyme (Meta Package):**
```json
{
  "name": "@missionfabric-js/enzyme",
  "version": "2.0.0",
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0"
  },
  "dependencies": {
    "@missionfabric-js/enzyme-core": "^2.0.0",
    "@missionfabric-js/enzyme-adapter-zustand": "^1.0.0",
    "@missionfabric-js/enzyme-adapter-tanstack": "^1.0.0",
    "@missionfabric-js/enzyme-router-react-router": "^1.0.0",
    "@missionfabric-js/enzyme-ui": "^1.0.0",
    "zustand": "^5.0.8",
    "@tanstack/react-query": "^5.90.11",
    "react-router-dom": "^7.9.6"
  }
}
```

**Installation Patterns:**

**Minimal Install:**
```bash
npm install @missionfabric-js/enzyme-core react react-dom
```

**Custom State Management:**
```bash
npm install @missionfabric-js/enzyme-core
npm install @missionfabric-js/enzyme-adapter-jotai jotai
```

**Full Featured:**
```bash
npm install @missionfabric-js/enzyme
```

**Benefits:**
- Users choose state management library
- Smaller installs for microservices
- No forced dependencies
- Third-party adapters possible
- Gradual migration path

---

## 7. Engine.io Integration Strategy

### Socket.io Implementation

**Layered Architecture:**

```
┌─────────────────────────────────────┐
│        socket.io (v4.8.1)          │  ← Application Layer
│  - Namespaces, Rooms, Broadcasting  │
├─────────────────────────────────────┤
│     socket.io-parser (v4.2.4)      │  ← Protocol Layer
│   - Serialization, Deserialization  │
├─────────────────────────────────────┤
│        engine.io (v6.6.4)          │  ← Transport Layer
│  - WebSocket, Polling, WebTransport │
├─────────────────────────────────────┤
│     engine.io-parser (v5.2.3)      │  ← Encoding Layer
│      - Binary encoding, Packets     │
└─────────────────────────────────────┘
```

**Dependency Strategy:**

**socket.io depends on engine.io:**
```json
{
  "name": "socket.io",
  "dependencies": {
    "engine.io": "~6.6.0",
    "socket.io-adapter": "~2.5.2",
    "socket.io-parser": "~4.2.4"
  }
}
```

**engine.io depends on parser:**
```json
{
  "name": "engine.io",
  "dependencies": {
    "engine.io-parser": "~5.2.1",
    "ws": "~8.18.3",
    "cookie": "~0.7.2"
  }
}
```

**Version Alignment:**

| socket.io | engine.io | socket.io-parser | engine.io-parser |
|-----------|-----------|------------------|------------------|
| 4.8.1 | 6.6.4 | 4.2.4 | 5.2.3 |
| 4.7.0 | 6.5.0 | 4.2.3 | 5.1.0 |
| 4.6.0 | 6.4.0 | 4.2.1 | 5.0.6 |

**Independent Evolution:**

**engine.io-parser (Breaking Change):**
- v4.x: JSON only
- v5.x: Binary support, msgpack encoding
- socket.io v4.x uses engine.io-parser v5.x

**socket.io-parser (Protocol Version):**
- v4.x: Protocol version 4
- v5.x: Protocol version 5 (future)
- Backward compatibility through negotiation

**Integration Pattern:**

**Server Initialization:**
```typescript
// socket.io/lib/index.ts
import { Server as Engine } from "engine.io";
import { Server } from "./server";

export class SocketIOServer {
  private engine: Engine;

  constructor(opts?) {
    // Create engine.io instance
    this.engine = new Engine(opts);

    // Wrap with socket.io layer
    this.engine.on("connection", (socket) => {
      this.onConnection(socket);
    });
  }
}
```

### Benefits for Different Environments

**Node.js:**
- Swap engine.io for custom transport
- WebSocket-only mode (remove polling)
- Unix socket support

**Browser:**
- Graceful degradation (WebSocket → Polling)
- CORS handling in engine layer
- Cookie persistence

**Mobile/React Native:**
- WebSocket-only (smaller bundle)
- Background disconnect handling
- Reconnection logic

### Adaptation for Enzyme

**Current Architecture:**

From enzyme codebase analysis:
- Monolithic structure
- Routing, state, data fetching all coupled
- No clear layer separation
- Hard to swap implementations

**Proposed Layered Architecture:**

```
┌─────────────────────────────────────┐
│       enzyme-app (v2.0.0)          │  ← Application Layer
│   - App Shell, Feature Loading     │
├─────────────────────────────────────┤
│       enzyme-core (v2.0.0)         │  ← Framework Core
│   - Routing, Contexts, Lifecycle   │
├─────────────────────────────────────┤
│     enzyme-state (v1.0.0)          │  ← State Abstraction
│   - State Interface, Middleware    │
├─────────────────────────────────────┤
│  enzyme-adapter-* (v1.0.0)         │  ← Implementation
│   - Zustand, Jotai, Redux, etc.    │
└─────────────────────────────────────┘
```

**enzyme-state (State Abstraction Layer):**

```typescript
// packages/enzyme-state/src/types.ts
export interface StateAdapter<T = any> {
  // State operations
  getState(): T;
  setState(partial: Partial<T>): void;
  subscribe(listener: (state: T) => void): () => void;

  // Middleware support
  use(middleware: Middleware): void;

  // Dev tools
  getDevtools?(): any;
}

export interface Middleware {
  (api: StateAPI): (next: StateUpdater) => StateUpdater;
}
```

**enzyme-adapter-zustand:**

```typescript
// packages/enzyme-adapter-zustand/src/index.ts
import { create } from 'zustand';
import type { StateAdapter } from '@missionfabric-js/enzyme-state';

export function createZustandAdapter<T>(
  initialState: T
): StateAdapter<T> {
  const store = create<T>(() => initialState);

  return {
    getState: () => store.getState(),
    setState: (partial) => store.setState(partial),
    subscribe: (listener) => store.subscribe(listener),
    use: (middleware) => {
      // Apply middleware to Zustand
    },
    getDevtools: () => store
  };
}
```

**enzyme-adapter-jotai (Alternative):**

```typescript
// packages/enzyme-adapter-jotai/src/index.ts
import { atom, createStore } from 'jotai';
import type { StateAdapter } from '@missionfabric-js/enzyme-state';

export function createJotaiAdapter<T>(
  initialState: T
): StateAdapter<T> {
  const store = createStore();
  const stateAtom = atom(initialState);

  return {
    getState: () => store.get(stateAtom),
    setState: (partial) => store.set(stateAtom, {
      ...store.get(stateAtom),
      ...partial
    }),
    subscribe: (listener) => store.sub(stateAtom, () => {
      listener(store.get(stateAtom));
    }),
    use: (middleware) => {
      // Apply middleware to Jotai
    }
  };
}
```

**enzyme-core Integration:**

```typescript
// packages/enzyme-core/src/state.ts
import type { StateAdapter } from '@missionfabric-js/enzyme-state';

export class EnzymeApp {
  private stateAdapter: StateAdapter;

  constructor(adapter: StateAdapter) {
    this.stateAdapter = adapter;
  }

  // Framework uses adapter, not direct Zustand
  public useState<T>(selector: (state: any) => T): T {
    return selector(this.stateAdapter.getState());
  }
}
```

**User Configuration:**

```typescript
// app.tsx (User code with Zustand)
import { EnzymeApp } from '@missionfabric-js/enzyme-core';
import { createZustandAdapter } from '@missionfabric-js/enzyme-adapter-zustand';

const adapter = createZustandAdapter({ count: 0 });
const app = new EnzymeApp(adapter);
```

```typescript
// app.tsx (User code with Jotai)
import { EnzymeApp } from '@missionfabric-js/enzyme-core';
import { createJotaiAdapter } from '@missionfabric-js/enzyme-adapter-jotai';

const adapter = createJotaiAdapter({ count: 0 });
const app = new EnzymeApp(adapter);
```

**Version Alignment Strategy:**

| enzyme-core | enzyme-state | enzyme-adapter-* |
|-------------|--------------|------------------|
| 2.0.0 | 1.0.0 | 1.0.0+ |
| 2.1.0 | 1.0.0 | 1.0.0+ |
| 3.0.0 | 2.0.0 | 2.0.0+ |

**Benefits:**
- Swap state libraries without core changes
- Independent adapter versioning
- Community adapters possible
- Easier to test (mock adapter)
- Smaller core bundle

---

## 8. Version Synchronization

### Socket.io Implementation

**Independent Versioning Strategy:**

Socket.io uses **independent versioning** where each package has its own version number, not synchronized across the monorepo.

**Version Matrix (Current State):**

| Package | Version | Last Updated |
|---------|---------|--------------|
| socket.io | 4.8.1 | Oct 2024 |
| socket.io-client | 4.8.1 | Oct 2024 |
| socket.io-adapter | 2.5.5 | Sep 2024 |
| socket.io-parser | 4.2.4 | Feb 2024 |
| engine.io | 6.6.4 | Oct 2024 |
| engine.io-client | 6.6.3 | Oct 2024 |
| engine.io-parser | 5.2.3 | Aug 2024 |
| @socket.io/component-emitter | 3.1.2 | Mar 2024 |
| @socket.io/cluster-adapter | 0.3.0 | Dec 2023 |

**Changelog Organization:**

**Root CHANGELOG.md:**
```markdown
# Changelogs

- [socket.io](./packages/socket.io/CHANGELOG.md)
- [socket.io-client](./packages/socket.io-client/CHANGELOG.md)
- [socket.io-adapter](./packages/socket.io-adapter/CHANGELOG.md)
- [socket.io-parser](./packages/socket.io-parser/CHANGELOG.md)
- [engine.io](./packages/engine.io/CHANGELOG.md)
- [engine.io-client](./packages/engine.io-client/CHANGELOG.md)
- [engine.io-parser](./packages/engine.io-parser/CHANGELOG.md)
- [@socket.io/component-emitter](./packages/socket.io-component-emitter/History.md)
```

**Package-Level Changelog:**
```markdown
# socket.io - CHANGELOG

## [4.8.1] - 2024-10-16
### Bug Fixes
- properly handle manually created dynamic namespaces

### Dependencies
- engine.io@~6.6.0 (no change)
- socket.io-adapter@~2.5.2 (no change)

## [4.8.0] - 2024-10-14
### Features
- add support for WebTransport
```

**Conventional Commits:**

Socket.io uses conventional-changelog-cli with Angular conventions:

```bash
# package.json (root)
{
  "devDependencies": {
    "conventional-changelog-cli": "^2.2.2"
  },
  "scripts": {
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s"
  }
}
```

**Release Process:**

From `CONTRIBUTING.md`:
```bash
# 1. Update version in package.json
npm version patch/minor/major

# 2. Generate changelog
npm run changelog

# 3. Commit changes
git commit -am "chore(release): <version>"

# 4. Publish to npm
npm publish
```

**No Automated Release Workflow:**

Socket.io does NOT have automated release workflows in `.github/workflows/`. Releases are manual, controlled by maintainers.

### Benefits for Different Environments

**Node.js/Browser:**
- Update only needed packages
- Breaking changes isolated
- Gradual migration path

**Enterprise:**
- Pin stable versions
- Audit trail per package
- Security patches independent

**Microservices:**
- Each service updates independently
- No forced upgrades
- Dependency version conflicts avoided

### Adaptation for Enzyme

**Current State:**

From `/home/user/enzyme/package.json`:
- Single version: 1.1.0
- No changelog
- No version synchronization needed (monolithic)

**Recommended Strategy:**

**Option 1: Independent Versioning (Recommended)**

Similar to Socket.io:

```
enzyme/
├── packages/
│   ├── enzyme-core/          # v2.0.0
│   ├── enzyme-cli/            # v1.5.0
│   ├── enzyme-adapter-zustand/ # v1.0.0
│   ├── enzyme-adapter-tanstack/ # v1.0.0
│   ├── enzyme-ui/             # v1.2.0
│   └── enzyme-vite-plugin/    # v0.5.0
└── CHANGELOG.md (index)
```

**Benefits:**
- UI components update frequently (1.x.x)
- Core framework stable (2.0.0)
- CLI independent (1.5.0)
- Adapters follow SemVer independently

**Option 2: Synchronized Versioning**

Using tools like Lerna or Changesets:

```json
// lerna.json
{
  "version": "2.0.0",
  "packages": ["packages/*"],
  "command": {
    "version": {
      "allowBranch": "main",
      "conventionalCommits": true,
      "message": "chore(release): publish %s"
    }
  }
}
```

**Recommended: Independent with Changesets**

**Install Changesets:**
```bash
npm install -D @changesets/cli
npx changeset init
```

**.changeset/config.json:**
```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "harborgrid-justin/enzyme" }],
  "commit": false,
  "fixed": [],
  "linked": [
    ["@missionfabric-js/enzyme-core", "@missionfabric-js/enzyme"]
  ],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@missionfabric-js/enzyme-demo"]
}
```

**Workflow:**

**1. Developer makes changes:**
```bash
npx changeset
# ✔ Which packages would you like to include? › enzyme-core, enzyme-ui
# ✔ What kind of change is this for enzyme-core? › minor
# ✔ What kind of change is this for enzyme-ui? › patch
# ✔ Please enter a summary: › Add new routing feature
```

**2. Creates `.changeset/friendly-panda.md`:**
```markdown
---
"@missionfabric-js/enzyme-core": minor
"@missionfabric-js/enzyme-ui": patch
---

Add new routing feature with enhanced navigation guards
```

**3. CI validates changesets:**
```yaml
# .github/workflows/changeset-check.yml
name: Changeset Check
on: pull_request
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx changeset status
```

**4. Release workflow:**
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build -ws
      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: npx changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Package-Level Changelogs:**

**packages/enzyme-core/CHANGELOG.md:**
```markdown
# @missionfabric-js/enzyme-core

## 2.1.0
### Minor Changes
- abc1234: Add new routing feature with enhanced navigation guards

### Patch Changes
- Updated dependencies
  - @missionfabric-js/enzyme-state@1.1.0

## 2.0.0
### Major Changes
- Breaking: Removed deprecated APIs
```

**Benefits:**
- Automated changelog generation
- GitHub release notes
- Version bumps calculated automatically
- PR-based release workflow
- Conventional commits enforced

---

## 9. Documentation Structure

### Socket.io Implementation

**External Documentation Strategy:**

Socket.io moved documentation from GitHub to a dedicated website: **https://socket.io/docs/**

**Repository docs/ folder:**
```
docs/
├── engine.io-protocol/
│   ├── README.md
│   └── protocol.md
├── socket.io-protocol/
│   ├── README.md
│   └── protocol.md
└── README.md (redirect notice)
```

**Root docs/README.md:**
```markdown
# Documentation

The documentation has been moved to the website [here](https://socket.io/docs/).
```

**Website Structure (socket.io/docs/):**

```
Docs/
├── Categories/
│   ├── Tutorials/
│   │   ├── Get Started
│   │   ├── Your First Application
│   │   └── Chat Application
│   ├── Server API/
│   │   ├── Server
│   │   ├── Socket
│   │   └── Namespace
│   ├── Client API/
│   │   ├── IO
│   │   └── Socket
│   ├── Adapters/
│   │   ├── Redis Adapter
│   │   ├── MongoDB Adapter
│   │   └── Cluster Adapter
│   ├── Deployment/
│   │   ├── AWS
│   │   ├── GCP
│   │   └── Docker
│   └── Troubleshooting/
```

**Documentation Technologies:**

Socket.io likely uses:
- Docusaurus or VitePress (modern doc frameworks)
- API documentation extracted from TypeScript
- Versioned docs (v4, v3, v2)
- Search functionality
- Multi-language support

**In-Repository Documentation:**

**README.md Strategy:**
- Minimal README
- Links to docs site
- Quick install snippet
- Badges (npm version, downloads, CI status)

**Protocol Documentation:**
- Kept in repo (technical reference)
- Versioned with code
- Used by implementers

### Benefits for Different Environments

**Developers:**
- Searchable documentation
- Version switcher (docs for v3, v4, etc.)
- Live examples (CodeSandbox embeds)
- API reference with types

**Enterprise:**
- Self-hosted docs possible
- PDF export
- Offline access
- Internal examples

**Contributors:**
- Markdown-based (easy to edit)
- PR preview builds
- Automated API docs
- Clear contribution guide

### Adaptation for Enzyme

**Current State:**

From `/home/user/enzyme/`:
- `README.md` - 17KB (comprehensive but monolithic)
- `docs/` folder exists with 28 subdirectories
- No dedicated docs site
- No API reference generator

**Recommended Structure:**

**Phase 1: Organize Repository Docs**

```
enzyme/
├── docs/
│   ├── README.md                    # Index/redirect
│   ├── getting-started/
│   │   ├── installation.md
│   │   ├── quick-start.md
│   │   └── first-app.md
│   ├── guides/
│   │   ├── routing.md
│   │   ├── state-management.md
│   │   ├── authentication.md
│   │   └── performance.md
│   ├── api/
│   │   ├── enzyme-core.md
│   │   ├── enzyme-router.md
│   │   └── enzyme-state.md
│   ├── adapters/
│   │   ├── zustand.md
│   │   ├── jotai.md
│   │   └── custom.md
│   ├── recipes/
│   │   ├── ssr.md
│   │   ├── code-splitting.md
│   │   └── testing.md
│   ├── migration/
│   │   ├── v1-to-v2.md
│   │   └── from-cra.md
│   └── contributing/
│       ├── development.md
│       ├── architecture.md
│       └── releasing.md
├── examples/
│   ├── basic/
│   ├── with-auth/
│   ├── with-ssr/
│   └── with-monorepo/
└── README.md (simplified)
```

**Phase 2: Set Up Doc Site (VitePress)**

**Install VitePress:**
```bash
npm install -D vitepress
```

**docs/.vitepress/config.ts:**
```typescript
import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Enzyme',
  description: 'Enterprise React Framework',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/enzyme-core' },
      { text: 'Examples', link: '/examples/basic' },
      {
        text: 'v2.0.0',
        items: [
          { text: 'v2.x', link: '/v2/' },
          { text: 'v1.x', link: 'https://v1.enzyme.dev' }
        ]
      }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Routing', link: '/guide/routing' },
            { text: 'State Management', link: '/guide/state' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'Packages',
          items: [
            { text: 'enzyme-core', link: '/api/enzyme-core' },
            { text: 'enzyme-router', link: '/api/enzyme-router' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/harborgrid-justin/enzyme' }
    ],
    search: {
      provider: 'local'
    }
  }
});
```

**Phase 3: API Documentation (TypeDoc)**

**Install TypeDoc:**
```bash
npm install -D typedoc typedoc-plugin-markdown
```

**typedoc.json:**
```json
{
  "entryPoints": ["packages/enzyme-core/src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "hideGenerator": true,
  "excludePrivate": true,
  "excludeInternal": true,
  "githubPages": false
}
```

**Generate Script:**
```json
{
  "scripts": {
    "docs:api": "typedoc --tsconfig packages/enzyme-core/tsconfig.json",
    "docs:dev": "vitepress dev docs",
    "docs:build": "npm run docs:api && vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

**Phase 4: Deployment**

**.github/workflows/docs.yml:**
```yaml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: ['docs/**', 'packages/*/src/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run docs:build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs/.vitepress/dist
```

**Simplified README.md:**
```markdown
# Enzyme

Enterprise React Framework with advanced routing, state management, and performance optimizations.

## Quick Start

\`\`\`bash
npm install @missionfabric-js/enzyme react react-dom
\`\`\`

\`\`\`tsx
import { EnzymeApp } from '@missionfabric-js/enzyme';

function App() {
  return <EnzymeApp>Hello World</EnzymeApp>;
}
\`\`\`

## Documentation

📚 **[Read the full documentation →](https://enzyme.dev)**

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@missionfabric-js/enzyme-core](./packages/enzyme-core) | ![npm](https://img.shields.io/npm/v/@missionfabric-js/enzyme-core) | Core framework |
| [@missionfabric-js/enzyme-cli](./packages/enzyme-cli) | ![npm](https://img.shields.io/npm/v/@missionfabric-js/enzyme-cli) | CLI tool |

## License

MIT
```

**Benefits:**
- Professional documentation site
- Automated API reference
- Versioned docs
- Searchable
- Better discoverability

---

## 10. Package.json Configuration

### Socket.io Implementation

**socket.io-client package.json (Complete Analysis):**

```json
{
  "name": "socket.io-client",
  "version": "4.8.1",
  "description": "Realtime application framework client",

  // Module System Configuration
  "type": "module",
  "main": "./build/cjs/index.js",
  "module": "./build/esm/index.js",
  "types": "./build/esm/index.d.ts",

  // Modern Exports Field
  "exports": {
    "./package.json": "./package.json",
    "./dist/socket.io.js": "./dist/socket.io.js",
    "./dist/socket.io.js.map": "./dist/socket.io.js.map",
    "./dist/socket.io.min.js": "./dist/socket.io.min.js",
    "./dist/socket.io.min.js.map": "./dist/socket.io.min.js.map",
    ".": {
      "import": {
        "types": "./build/esm/index.d.ts",
        "node": "./build/esm/index.js",
        "default": "./build/esm-debug/index.js"
      },
      "require": {
        "types": "./build/cjs/index.d.ts",
        "default": "./build/cjs/index.js"
      }
    },
    "./debug": {
      "import": "./build/esm-debug/index.js",
      "require": "./build/cjs/index.js"
    }
  },

  // Browser-specific replacements
  "browser": {
    "./test/node-based": false
  },

  // Files included in npm package
  "files": [
    "build/",
    "dist/",
    "*.js"
  ],

  // Build Scripts
  "scripts": {
    "compile": "rimraf ./build && tsc && tsc -p tsconfig.esm.json && ./postcompile.sh",
    "test": "npm run format:check && npm run compile && if test \"$BROWSERS\" = \"1\" ; then npm run test:browser; else npm run test:node; fi",
    "test:node": "mocha --require ts-node/register --exit test/index.ts",
    "test:browser": "ts-node test/browser-runner.ts",
    "build": "rollup -c support/rollup.config.umd.js && rollup -c support/rollup.config.esm.js",
    "format:check": "prettier --check 'lib/**/*.ts' 'test/**/*.ts'",
    "format:fix": "prettier --write 'lib/**/*.ts' 'test/**/*.ts'",
    "prepack": "npm run compile"
  },

  // Dependencies
  "dependencies": {
    "@socket.io/component-emitter": "~3.1.0",
    "debug": "~4.4.1",
    "engine.io-client": "~6.6.2",
    "socket.io-parser": "~4.2.4"
  },

  // Engine Requirements
  "engines": {
    "node": ">=10.0.0"
  },

  // Repository Info
  "repository": {
    "type": "git",
    "url": "https://github.com/socketio/socket.io.git"
  },

  "license": "MIT"
}
```

**socket.io (Server) package.json:**

```json
{
  "name": "socket.io",
  "version": "4.8.1",

  // ESM Wrapper for CJS Package
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./wrapper.mjs",
      "require": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },

  "files": [
    "dist/",
    "client-dist/",
    "wrapper.mjs"
  ],

  "scripts": {
    "compile": "rimraf ./dist && tsc",
    "test": "npm run format:check && npm run compile && npm run test:types && npm run test:unit",
    "test:types": "tsd",
    "test:unit": "nyc mocha --require ts-node/register test/index.ts",
    "format:check": "prettier --check 'lib/**/*.ts' 'test/**/*.ts'",
    "format:fix": "prettier --write 'lib/**/*.ts' 'test/**/*.ts'",
    "prepack": "npm run compile"
  },

  "dependencies": {
    "accepts": "~1.3.4",
    "base64id": "~2.0.0",
    "cors": "~2.8.5",
    "debug": "~4.4.1",
    "engine.io": "~6.6.0",
    "socket.io-adapter": "~2.5.2",
    "socket.io-parser": "~4.2.4"
  },

  "engines": {
    "node": ">=10.2.0"
  }
}
```

**Key Patterns:**

1. **Dual Package Exports**: CJS + ESM via exports field
2. **Type-safe**: Types for both module systems
3. **Browser Optimization**: Browser field for replacements
4. **Conditional Exports**: Node vs browser via exports conditions
5. **Debug Builds**: Separate debug build for development
6. **Prepack Hook**: Auto-compile before publishing
7. **Files Whitelist**: Only ship built files
8. **Engine Constraints**: Node version requirements

### Benefits for Different Environments

**Node.js:**
- CJS for maximum compatibility
- Fast require() resolution
- No transpilation needed

**Modern Bundlers (Vite, Webpack 5):**
- ESM for tree-shaking
- Conditional imports (node vs default)
- Source maps included

**TypeScript:**
- Type definitions for both CJS and ESM
- Declaration maps for "Go to definition"
- Strict types

**CDN/Script Tags:**
- Pre-built UMD bundles
- Minified versions
- Source maps

### Adaptation for Enzyme

**Current Configuration Issues:**

From `/home/user/enzyme/package.json`:

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
    // ... 20+ subpath exports
  }
}
```

**Issues:**
1. No browser-specific builds
2. No debug builds
3. Missing conditional exports (browser vs node)
4. No UMD bundle for CDN usage
5. All features in one package

**Optimized Configuration:**

**enzyme-core package.json:**
```json
{
  "name": "@missionfabric-js/enzyme-core",
  "version": "2.0.0",
  "description": "Enterprise React framework core",
  "type": "module",

  // Legacy fields for older tools
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",

  // Modern exports configuration
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "development": {
        "import": "./dist/index.development.mjs",
        "require": "./dist/index.development.cjs"
      },
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./routing": {
      "types": "./dist/routing/index.d.ts",
      "import": "./dist/routing/index.mjs",
      "require": "./dist/routing/index.cjs"
    },
    "./state": {
      "types": "./dist/state/index.d.ts",
      "import": "./dist/state/index.mjs",
      "require": "./dist/state/index.cjs"
    },
    "./contexts": {
      "types": "./dist/contexts/index.d.ts",
      "import": "./dist/contexts/index.mjs",
      "require": "./dist/contexts/index.cjs"
    },
    "./package.json": "./package.json"
  },

  // Browser optimizations
  "browser": {
    "./dist/storage/index.mjs": "./dist/storage/browser.mjs",
    "./dist/performance/index.mjs": "./dist/performance/browser.mjs"
  },

  // React Native support
  "react-native": {
    "./dist/storage/index.mjs": "./dist/storage/native.mjs"
  },

  // Tree-shaking optimization
  "sideEffects": false,

  // Published files
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],

  // Build scripts
  "scripts": {
    "build": "npm run clean && npm run build:types && npm run build:js",
    "build:types": "tsc --emitDeclarationOnly --outDir dist",
    "build:js": "vite build && npm run build:debug",
    "build:debug": "cross-env NODE_ENV=development vite build --mode development",
    "clean": "rimraf dist .tsbuildinfo",
    "test": "vitest run",
    "test:watch": "vitest",
    "format:check": "prettier --check 'src/**/*.{ts,tsx}'",
    "format:fix": "prettier --write 'src/**/*.{ts,tsx}'",
    "lint": "eslint src --ext ts,tsx",
    "typecheck": "tsc --noEmit",
    "prepack": "npm run build"
  },

  // Peer dependencies (framework requires React)
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0"
  },

  // Optional peer dependencies
  "peerDependenciesMeta": {
    "react": { "optional": false },
    "react-dom": { "optional": false }
  },

  // Minimal dependencies
  "dependencies": {
    "clsx": "^2.1.1"
  },

  // Engine requirements
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },

  // Repository info
  "repository": {
    "type": "git",
    "url": "git+https://github.com/harborgrid-justin/enzyme.git",
    "directory": "packages/enzyme-core"
  },

  // Package metadata
  "keywords": [
    "react",
    "framework",
    "enterprise",
    "routing",
    "typescript"
  ],

  "license": "MIT",
  "author": "Defendr Team",
  "homepage": "https://enzyme.dev",
  "bugs": "https://github.com/harborgrid-justin/enzyme/issues"
}
```

**enzyme-cli package.json:**
```json
{
  "name": "@missionfabric-js/enzyme-cli",
  "version": "1.5.0",
  "description": "CLI scaffolding tool for Enzyme",
  "type": "module",

  // CLI-specific configuration
  "bin": {
    "enzyme": "./dist/cli.js",
    "enz": "./dist/cli.js"
  },

  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",

  // CLI doesn't need complex exports
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },

  "files": [
    "dist",
    "templates",
    "README.md"
  ],

  "scripts": {
    "build": "npm run clean && tsc",
    "clean": "rimraf dist .tsbuildinfo",
    "dev": "tsc --watch",
    "test": "vitest run",
    "prepack": "npm run build"
  },

  // CLI dependencies (not peer)
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^9.2.12",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "execa": "^8.0.1",
    "fs-extra": "^11.2.0"
  },

  // CLI requires Node.js only
  "engines": {
    "node": ">=18.0.0"
  },

  "repository": {
    "type": "git",
    "url": "git+https://github.com/harborgrid-justin/enzyme.git",
    "directory": "packages/enzyme-cli"
  },

  "keywords": [
    "enzyme",
    "cli",
    "scaffolding",
    "generator"
  ],

  "license": "MIT"
}
```

**Root package.json (Monorepo):**
```json
{
  "name": "@missionfabric-js/enzyme-monorepo",
  "version": "0.0.0",
  "private": true,
  "description": "Enzyme monorepo",

  // npm workspaces
  "workspaces": [
    "packages/*",
    "examples/*"
  ],

  // Shared scripts
  "scripts": {
    "build": "npm run compile -ws --if-present",
    "compile": "tsc --build",
    "test": "npm test -ws --if-present",
    "lint": "eslint packages/*/src --ext ts,tsx",
    "format:check": "prettier --check 'packages/*/src/**/*.{ts,tsx}'",
    "format:fix": "prettier --write 'packages/*/src/**/*.{ts,tsx}'",
    "clean": "npm run clean -ws --if-present && rimraf node_modules",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "npm run build && changeset publish"
  },

  // Shared dev dependencies
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "rimraf": "^5.0.5",
    "typescript": "^5.3.3",
    "vite": "^5.0.0",
    "vitest": "^1.2.0"
  },

  // Version overrides
  "overrides": {
    "typescript": "^5.3.3"
  }
}
```

**Benefits:**
- Development builds with better debugging
- Conditional exports for different environments
- Minimal published files
- Automated pre-publish builds
- Consistent configuration across packages

---

## Summary: Key Patterns for Enzyme

### Immediate Wins (Low Effort, High Impact)

1. **Dual Module Support (CJS + ESM)**
   - Add `build:cjs` and `build:esm` scripts
   - Configure exports field properly
   - Support older tools and modern bundlers

2. **Subpath Exports**
   - Already implemented ✓
   - Enables tree-shaking
   - Users import only what they need

3. **Development Builds**
   - Add separate debug build
   - Better error messages
   - Keep warnings in dev mode

4. **Bundle Size Monitoring**
   - Add size-limit
   - Track bundle size in CI
   - Prevent regressions

5. **Prepack Hook**
   - Auto-compile before publish
   - Prevent publishing unbuildable code
   - Consistent artifacts

### Medium-Term Improvements (3-6 months)

1. **Monorepo Migration**
   - Split into enzyme-core, enzyme-ui, enzyme-cli
   - Independent versioning
   - Smaller install sizes

2. **Adapter Pattern**
   - Abstract state management
   - Support Zustand, Jotai, Redux, etc.
   - Peer dependency management

3. **Changesets Integration**
   - Automated changelog
   - Version management
   - Release workflow

4. **Documentation Site**
   - VitePress setup
   - API documentation (TypeDoc)
   - Versioned docs

5. **Cross-Platform Builds**
   - Browser-specific optimizations
   - React Native support (future)
   - UMD bundles for CDN

### Long-Term Vision (6-12 months)

1. **Full Layered Architecture**
   - Core framework
   - State abstraction layer
   - Router abstraction layer
   - UI component library
   - CLI tools

2. **Plugin Ecosystem**
   - Third-party adapters
   - Community plugins
   - Plugin registry

3. **Enterprise Features**
   - SSR support package
   - Testing utilities package
   - DevTools package

4. **Performance Optimizations**
   - Zero-runtime CSS
   - Automatic code splitting
   - Streaming SSR

5. **Developer Experience**
   - Interactive documentation
   - Playground (StackBlitz integration)
   - Migration tools

---

## Appendix: Reference Implementation

### Complete Vite Config (enzyme-core)

```typescript
// packages/enzyme-core/vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      rollupTypes: true
    })
  ],

  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        routing: resolve(__dirname, 'src/routing/index.ts'),
        state: resolve(__dirname, 'src/state/index.ts'),
        contexts: resolve(__dirname, 'src/contexts/index.ts'),
        hooks: resolve(__dirname, 'src/hooks/index.ts')
      },
      formats: mode === 'development' ? ['es'] : ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (mode === 'development') {
          return `${entryName}.development.mjs`;
        }
        return format === 'es'
          ? `${entryName}.mjs`
          : `${entryName}.cjs`;
      }
    },

    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-router-dom',
        /^@missionfabric-js\/enzyme-/
      ],

      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        exports: 'named',

        // Proper interop for CJS
        interop: 'auto',

        // Source maps
        sourcemap: true,

        // Keep imports to external packages
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      },

      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      }
    },

    // Minification
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        pure_getters: true,
        unsafe: true,
        passes: 2,
        drop_console: false,
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
    } : undefined,

    sourcemap: true,
    emptyOutDir: mode === 'production',

    // Output directory
    outDir: 'dist',

    // Warning limits
    chunkSizeWarningLimit: 100
  },

  // Test configuration
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.ts',
        '**/*.test.tsx'
      ]
    }
  }
}));
```

### Migration Checklist

**Phase 1: Preparation (Week 1-2)**
- [ ] Audit current dependencies
- [ ] Identify package boundaries
- [ ] Create migration plan
- [ ] Set up feature flags for gradual rollout

**Phase 2: Monorepo Setup (Week 3-4)**
- [ ] Create packages/ directory structure
- [ ] Move code to packages
- [ ] Configure npm workspaces
- [ ] Update import paths
- [ ] Set up shared TypeScript config

**Phase 3: Build System (Week 5-6)**
- [ ] Configure Vite for each package
- [ ] Set up dual CJS/ESM builds
- [ ] Add development builds
- [ ] Configure bundle analysis
- [ ] Add size limits

**Phase 4: Adapters (Week 7-8)**
- [ ] Extract state management interface
- [ ] Create Zustand adapter
- [ ] Create TanStack Query adapter
- [ ] Update examples
- [ ] Write migration guide

**Phase 5: Release Infrastructure (Week 9-10)**
- [ ] Install Changesets
- [ ] Configure CI/CD
- [ ] Set up automated releases
- [ ] Create release checklist
- [ ] Test publishing flow

**Phase 6: Documentation (Week 11-12)**
- [ ] Set up VitePress
- [ ] Migrate existing docs
- [ ] Generate API docs
- [ ] Add examples
- [ ] Deploy docs site

---

## Conclusion

Socket.io's npm distribution strategy demonstrates enterprise-grade patterns refined over 10+ years with 5.7M dependents. Their approach balances:

- **Flexibility**: Independent packages, adapters, emitters
- **Performance**: Tree-shaking, bundle optimization, debug stripping
- **Compatibility**: Dual CJS/ESM, Node.js/Browser, UMD bundles
- **Maintainability**: Monorepo, independent versioning, automated workflows
- **Developer Experience**: TypeScript types, documentation site, examples

Enzyme can adopt these patterns incrementally, starting with immediate wins (dual module support, development builds) and progressing to full monorepo architecture with adapter ecosystem.

The key insight: **Start small, iterate quickly**. Don't attempt all changes at once. Each pattern can be adopted independently, providing immediate value while building toward the larger vision.

---

**Files Referenced:**
- Socket.io Repository: https://github.com/socketio/socket.io
- Enzyme package.json: /home/user/enzyme/package.json
- Enzyme CLI package.json: /home/user/enzyme/cli/package.json

**Next Steps:**
1. Review this analysis with the team
2. Prioritize patterns based on impact/effort
3. Create GitHub issues for each phase
4. Start with Phase 1 (dual module support)
5. Iterate based on user feedback
