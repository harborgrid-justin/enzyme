# Route Discovery

> Automatic route discovery and file-system based routing

## Overview

The route discovery module automatically scans your file system to discover routes based on file naming conventions. It eliminates manual route configuration while providing full type safety and conflict detection.

## Features

- **Auto-Discovery**: Scan file system for route files
- **File-Based Conventions**: Next.js-style routing patterns
- **Conflict Detection**: Build-time validation
- **Watch Mode**: Hot-reload routes in development
- **Code Generation**: Generate route types and registries
- **Parallel Scanning**: Fast scanning for large codebases

## Installation

```typescript
import {
  scanRouteFiles,
  DiscoveryEngine,
  createDiscoveryEngine,
  WatchMode,
} from '@/lib/routing/discovery';
```

## Quick Start

### Basic Route Scanning

```typescript
import { scanRouteFiles } from '@/lib/routing';

const routes = await scanRouteFiles(process.cwd(), {
  scanPaths: ['src/routes', 'src/features'],
  extensions: ['.tsx', '.ts'],
  ignorePatterns: [
    '**/*.test.tsx',
    '**/*.stories.tsx',
    '**/components/**',
  ],
});

console.log(`Discovered ${routes.length} routes`);
```

### Discovery Engine

```typescript
import { createDiscoveryEngine } from '@/lib/routing/discovery';

const engine = createDiscoveryEngine({
  rootDir: process.cwd(),
  scanner: {
    roots: ['src/routes'],
    extensions: ['.tsx'],
  },
  transformer: {
    generateTypes: true,
    outputDir: 'src/generated',
  },
});

const result = await engine.discover();

console.log('Routes discovered:', result.routes.length);
console.log('Conflicts found:', result.conflicts.length);
console.log('Generated types:', result.generatedCode?.types);
```

## File-System Conventions

The discovery system supports Next.js-style routing conventions.

### Static Routes

```
routes/
├── index.tsx          → /
├── about.tsx          → /about
└── contact.tsx        → /contact
```

### Dynamic Routes

```
routes/
├── users/
│   ├── index.tsx      → /users
│   └── [id].tsx       → /users/:id
└── posts/
    └── [slug].tsx     → /posts/:slug
```

### Nested Routes

```
routes/
└── users/
    ├── index.tsx      → /users
    ├── [id].tsx       → /users/:id
    └── [id]/
        ├── posts.tsx  → /users/:id/posts
        └── settings.tsx → /users/:id/settings
```

### Optional Segments

```
routes/
├── posts/
│   └── [[page]].tsx   → /posts or /posts/:page
└── blog/
    └── [[...slug]].tsx → /blog or /blog/*
```

### Catch-All Routes

```
routes/
└── docs/
    └── [...slug].tsx  → /docs/*
```

### Route Groups

```
routes/
├── (auth)/            → Group (not in URL)
│   ├── login.tsx      → /login
│   └── register.tsx   → /register
└── (marketing)/
    ├── about.tsx      → /about
    └── pricing.tsx    → /pricing
```

### Layouts

```
routes/
├── _layout.tsx        → Root layout
└── dashboard/
    ├── _layout.tsx    → Dashboard layout
    ├── index.tsx      → /dashboard
    └── analytics.tsx  → /dashboard/analytics
```

## Scanner Configuration

### Basic Configuration

```typescript
interface DiscoveryConfig {
  scanPaths: readonly string[];
  extensions: readonly string[];
  ignorePatterns: readonly string[];
  layoutFileName: string;
  parallel: boolean;
  cacheResults: boolean;
}

const config: DiscoveryConfig = {
  scanPaths: ['src/routes', 'src/features'],
  extensions: ['.tsx', '.ts'],
  ignorePatterns: [
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/__tests__/**',
    '**/*.stories.{ts,tsx}',
    '**/components/**',
    '**/hooks/**',
    '**/utils/**',
  ],
  layoutFileName: '_layout',
  parallel: true,
  cacheResults: true,
};
```

### Advanced Configuration

```typescript
import { AutoScanner, createAutoScanner } from '@/lib/routing/discovery';

const scanner = createAutoScanner({
  roots: ['src/routes'],
  extensions: ['.tsx', '.ts'],
  ignore: ['**/*.test.tsx'],
  caseSensitive: false,
  followSymlinks: false,
  maxDepth: 10,
  parallel: {
    enabled: true,
    workers: 4,
  },
});

const files = await scanner.scan();
```

## Path Extraction

Extract route paths from file paths.

```typescript
import { extractPathFromFile, parseSegments } from '@/lib/routing/discovery';

// Extract path from file
const path = extractPathFromFile('src/routes/users/[id]/posts.tsx', 'src/routes');
// => '/users/:id/posts'

// Parse individual segments
const segments = parseSegments(['users', '[id]', 'posts']);
// => [
//   { type: 'static', name: 'users' },
//   { type: 'dynamic', name: ':id', paramName: 'id' },
//   { type: 'static', name: 'posts' }
// ]
```

## Route Transformation

Transform discovered routes into route objects.

```typescript
import { createRouteTransformer, transformRoutes } from '@/lib/routing/discovery';

const transformer = createRouteTransformer({
  generateIds: true,
  generateTypes: true,
  sortBySpecificity: true,
  validateConflicts: true,
});

const transformed = await transformer.transform(discoveredRoutes);

console.log('Transformed routes:', transformed.routes);
console.log('Generated types:', transformed.generatedTypes);
console.log('Warnings:', transformed.warnings);
```

## Discovery Engine

The discovery engine coordinates scanning, transformation, and validation.

### Engine Configuration

```typescript
interface DiscoveryEngineConfig {
  rootDir: string;
  scanner: AutoScannerConfig;
  extractor?: PathExtractorConfig;
  transformer?: TransformerConfig;
  handlers?: DiscoveryHandlers;
}

interface DiscoveryHandlers {
  onScanStart?: () => void;
  onScanComplete?: (files: DiscoveredFile[]) => void;
  onRouteDiscovered?: (route: DiscoveredRoute) => void;
  onConflictDetected?: (conflict: RouteConflict) => void;
  onError?: (error: Error) => void;
}
```

### Usage

```typescript
const engine = createDiscoveryEngine({
  rootDir: process.cwd(),
  scanner: {
    roots: ['src/routes'],
    extensions: ['.tsx'],
  },
  handlers: {
    onScanStart: () => console.log('Scanning routes...'),
    onScanComplete: (files) => console.log(`Found ${files.length} files`),
    onRouteDiscovered: (route) => console.log(`Discovered: ${route.urlPath}`),
    onConflictDetected: (conflict) => console.error(`Conflict: ${conflict.message}`),
  },
});

const result = await engine.discover();

if (result.conflicts.hasErrors) {
  console.error('Route conflicts detected!');
  process.exit(1);
}
```

## Watch Mode

Monitor file system for changes and hot-reload routes.

### Basic Usage

```typescript
import { createWatchMode } from '@/lib/routing/discovery';

const watcher = createWatchMode({
  paths: ['src/routes'],
  extensions: ['.tsx', '.ts'],
  ignored: ['**/*.test.tsx'],
  debounceMs: 300,
  onFileChanged: async (event) => {
    console.log(`File ${event.type}: ${event.filePath}`);

    // Re-discover routes
    const routes = await scanRouteFiles(process.cwd(), config);

    // Update router
    updateRouter(routes);
  },
});

// Start watching
watcher.start();

// Stop watching
process.on('SIGINT', () => {
  watcher.stop();
});
```

### Vite Plugin

```typescript
import { createVitePlugin } from '@/lib/routing/discovery';

export default defineConfig({
  plugins: [
    createVitePlugin({
      routesDir: 'src/routes',
      outputDir: 'src/generated',
      generateTypes: true,
      watch: true,
    }),
  ],
});
```

### HMR Integration

```typescript
import { createHMRUpdater } from '@/lib/routing/discovery';

const hmr = createHMRUpdater({
  onUpdate: (routes) => {
    // Update router with new routes
    router.updateRoutes(routes);
  },
});

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    hmr.update(newModule);
  });
}
```

## Code Generation

Generate TypeScript types and route registries.

### Type Generation

```typescript
import { generateRouteTypes } from '@/lib/routing/discovery';

const types = generateRouteTypes(routes);

// Output: src/generated/routes.ts
// export const ROUTE_PATHS = {
//   home: '/' as const,
//   userDetail: '/users/:id' as const,
//   userPosts: '/users/:id/posts' as const,
// } as const;
//
// export type RoutePath = typeof ROUTE_PATHS[keyof typeof ROUTE_PATHS];
//
// export interface RouteParams {
//   '/users/:id': { id: string };
//   '/users/:id/posts': { id: string };
// }
```

### Registry Generation

```typescript
import { generateRouteRegistry } from '@/lib/routing/discovery';

const registry = generateRouteRegistry(routes, process.cwd());

// Output: src/generated/route-registry.ts
// import { lazy } from 'react';
//
// export const routeComponents = {
//   home: lazy(() => import('@/routes/index')),
//   userDetail: lazy(() => import('@/routes/users/[id]')),
// } as const;
//
// export const preloadRoute = {
//   home: () => import('@/routes/index'),
//   userDetail: () => import('@/routes/users/[id]'),
// } as const;
```

## Parallel Scanning

Scan large codebases efficiently with parallel processing.

```typescript
import { scanRouteFilesParallel } from '@/lib/routing';

const routes = await scanRouteFilesParallel(
  process.cwd(),
  config,
  {
    maxConcurrency: 4,
    scanTimeout: 30000,
    onProgress: (progress) => {
      console.log(`Progress: ${progress.scannedDirs}/${progress.totalDirs}`);
      console.log(`Routes found: ${progress.routesFound}`);
    },
  }
);
```

## Incremental Scanning

Update routes incrementally based on file changes.

```typescript
import { applyIncrementalChanges } from '@/lib/routing';

let cachedRoutes = await scanRouteFiles(process.cwd(), config);

// On file change
const changes = [
  { type: 'add', filePath: 'src/routes/new-page.tsx' },
  { type: 'unlink', filePath: 'src/routes/old-page.tsx' },
  { type: 'change', filePath: 'src/routes/updated-page.tsx' },
];

const result = applyIncrementalChanges(cachedRoutes, changes, config);

if (result.requiresFullRescan) {
  // Layout changed, need full rescan
  cachedRoutes = await scanRouteFiles(process.cwd(), config);
} else {
  // Update cache
  cachedRoutes = [
    ...cachedRoutes.filter(r => !result.removed.includes(r)),
    ...result.added,
  ];
}
```

## Statistics & Reporting

```typescript
import { calculateDiscoveryStats, buildLayoutTree } from '@/lib/routing';

const stats = calculateDiscoveryStats(routes, scanDuration, filesScanned, filesIgnored);

console.log(`Total routes: ${stats.totalRoutes}`);
console.log(`Layouts: ${stats.layoutCount}`);
console.log(`Dynamic routes: ${stats.dynamicRouteCount}`);
console.log(`Max depth: ${stats.maxDepth}`);
console.log(`Scan duration: ${stats.scanDurationMs}ms`);

// Build layout tree
const tree = buildLayoutTree(routes);

console.log('Layout tree:', tree.root);
console.log('Orphaned layouts:', tree.orphanedLayouts);
```

## Conflict Detection

Detect and report route conflicts during discovery.

```typescript
import { detectConflicts } from '@/lib/routing/core';

const result = detectConflicts(routes, {
  maxNestingDepth: 5,
  checkNestedDynamic: true,
  checkDeepNesting: true,
  checkIndexLayouts: true,
});

if (result.hasErrors) {
  console.error(result.report);
  process.exit(1);
}

if (result.hasWarnings) {
  console.warn(`Found ${result.conflicts.length} warnings`);
}
```

## Build Integration

### Vite Build Plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { routeDiscoveryPlugin } from '@/lib/routing/vite';

export default defineConfig({
  plugins: [
    routeDiscoveryPlugin({
      routesDir: 'src/routes',
      outputDir: 'src/generated',
      generateTypes: true,
      validateConflicts: true,
      onDiscoveryComplete: (result) => {
        console.log(`Discovered ${result.routes.length} routes`);
      },
    }),
  ],
});
```

### Webpack Plugin

```typescript
// webpack.config.js
const { RouteDiscoveryPlugin } = require('@/lib/routing/webpack');

module.exports = {
  plugins: [
    new RouteDiscoveryPlugin({
      routesDir: 'src/routes',
      outputDir: 'src/generated',
    }),
  ],
};
```

### CLI Usage

```bash
# Discover routes
npx enzyme-routes discover src/routes

# Generate types
npx enzyme-routes generate src/routes --output src/generated

# Validate routes
npx enzyme-routes validate src/routes

# Watch mode
npx enzyme-routes watch src/routes
```

## Best Practices

### Route Organization

```
src/
├── routes/              # Main application routes
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/          # Authentication group
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── dashboard/
│       ├── _layout.tsx
│       └── index.tsx
├── features/            # Feature-based routes
│   ├── blog/
│   │   └── routes/
│   │       └── [...slug].tsx
│   └── shop/
│       └── routes/
│           └── [id].tsx
└── generated/           # Generated files
    ├── routes.ts
    └── route-registry.ts
```

### Naming Conventions

```typescript
// Use consistent naming
routes/
├── users/
│   ├── index.tsx        // List
│   ├── [id].tsx         // Detail
│   ├── [id]/
│   │   ├── edit.tsx     // Edit
│   │   └── delete.tsx   // Delete
│   └── new.tsx          // Create

// Avoid conflicts
routes/
├── users/
│   ├── new.tsx          // ✓ Static route first
│   └── [id].tsx         // ✓ Dynamic route second
```

### Performance

```typescript
// Enable caching for faster subsequent scans
const routes = await scanRouteFilesCached(
  process.cwd(),
  config,
  5000 // Cache TTL
);

// Use parallel scanning for large projects
const routes = await scanRouteFilesParallel(
  process.cwd(),
  config,
  { maxConcurrency: 4 }
);

// Clear cache when needed
clearRouteCache();
```

### Type Safety

```typescript
// Generate types during build
const engine = createDiscoveryEngine({
  transformer: {
    generateTypes: true,
    outputDir: 'src/generated',
  },
});

// Use generated types
import { ROUTE_PATHS, RouteParams } from '@/generated/routes';

const userPath = ROUTE_PATHS.userDetail; // '/users/:id'
type UserParams = RouteParams['/users/:id']; // { id: string }
```

## Troubleshooting

### Routes Not Discovered

```typescript
// Check scan paths
console.log('Scanning:', config.scanPaths);

// Check ignore patterns
console.log('Ignoring:', config.ignorePatterns);

// Verify file extensions
console.log('Extensions:', config.extensions);
```

### Conflicts Detected

```typescript
// Get detailed conflict report
const result = detectConflicts(routes);
console.log(result.report);

// Fix conflicts by renaming or reorganizing files
```

### Performance Issues

```typescript
// Enable parallel scanning
const routes = await scanRouteFilesParallel(process.cwd(), config, {
  maxConcurrency: 4,
});

// Reduce scan scope
const config = {
  scanPaths: ['src/routes'], // Fewer directories
  ignorePatterns: ['**/components/**'], // More patterns
};

// Use caching
const routes = await scanRouteFilesCached(process.cwd(), config);
```

## Related Documentation

### Routing System
- [README.md](./README.md) - Routing overview
- [CORE.md](./CORE.md) - Core routing utilities
- [GUARDS.md](./GUARDS.md) - Route guards
- [LOADERS.md](./LOADERS.md) - Data loaders
- [NAVIGATION.md](./NAVIGATION.md) - Navigation components
- [ADVANCED.md](./ADVANCED.md) - Advanced patterns
- [TYPES.md](./TYPES.md) - Type definitions

### State & Auth
- [State System](../state/README.md) - Route state management
- [Auth Guards](../auth/GUARDS.md) - Auto-discovered guards
- [Auth System](../auth/README.md) - Auth integration
