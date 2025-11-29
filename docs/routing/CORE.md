# Core Routing Utilities

> Framework-agnostic routing utilities for type-safe path building and route management

## Overview

The core routing module (`@/lib/routing/core`) provides reusable, framework-agnostic utilities that form the foundation of the routing system. These utilities can be used in any JavaScript/TypeScript project, not just with React Router.

## Features

- **Path Building**: Construct URLs with type-safe parameters
- **Pattern Matching**: Match paths against route patterns
- **Parameter Extraction**: Parse parameters from URLs
- **Segment Parsing**: Convert file paths to route patterns
- **Conflict Detection**: Validate route configurations
- **Type System**: Compile-time type extraction

## Installation

```typescript
import {
  buildPath,
  extractParamNames,
  matchPathPattern,
  parsePathParams,
  detectConflicts,
} from '@/lib/routing/core';
```

## Path Utilities

### buildPath

Build a URL path from a pattern and parameters.

```typescript
function buildPath(
  pattern: string,
  params?: Record<string, string | number>,
  query?: Record<string, string | number>
): string;
```

**Examples:**

```typescript
import { buildPath } from '@/lib/routing/core';

// Required parameters
buildPath('/users/:id', { id: '123' });
// => '/users/123'

// Optional parameters
buildPath('/users/:id?', {});
// => '/users'

buildPath('/users/:id?', { id: '456' });
// => '/users/456'

// With query string
buildPath('/search', {}, { q: 'react', filter: 'recent' });
// => '/search?q=react&filter=recent'

// Combined
buildPath('/users/:id', { id: '123' }, { tab: 'posts' });
// => '/users/123?tab=posts'
```

### extractParamNames

Extract parameter names from a route pattern.

```typescript
function extractParamNames(pattern: string): string[];
```

**Examples:**

```typescript
extractParamNames('/users/:id');
// => ['id']

extractParamNames('/users/:id/posts/:postId');
// => ['id', 'postId']

extractParamNames('/search/:query?');
// => ['query']

extractParamNames('/about');
// => []
```

### matchPathPattern

Check if a path matches a route pattern.

```typescript
function matchPathPattern(pattern: string, path: string): boolean;
```

**Examples:**

```typescript
// Static routes
matchPathPattern('/about', '/about');
// => true

matchPathPattern('/about', '/contact');
// => false

// Dynamic routes
matchPathPattern('/users/:id', '/users/123');
// => true

matchPathPattern('/users/:id', '/posts/123');
// => false

// Optional parameters
matchPathPattern('/search/:query?', '/search');
// => true

matchPathPattern('/search/:query?', '/search/react');
// => true

// Catch-all routes
matchPathPattern('/docs/*', '/docs/getting-started');
// => true

matchPathPattern('/docs/*', '/docs/api/reference');
// => true
```

### parsePathParams

Extract parameter values from a path using a pattern.

```typescript
function parsePathParams(
  pattern: string,
  path: string
): Record<string, string> | null;
```

**Examples:**

```typescript
parsePathParams('/users/:id', '/users/123');
// => { id: '123' }

parsePathParams('/users/:id/posts/:postId', '/users/123/posts/456');
// => { id: '123', postId: '456' }

parsePathParams('/users/:id', '/posts/123');
// => null (no match)

// With URL encoding
parsePathParams('/search/:query', '/search/hello%20world');
// => { query: 'hello world' }

// Catch-all
parsePathParams('/docs/*', '/docs/getting-started/installation');
// => { '*': 'getting-started/installation' }
```

### Additional Path Utilities

```typescript
// Get static prefix (before first dynamic segment)
getStaticPrefix('/users/:id/posts');
// => '/users'

// Normalize path
normalizePath('users/123/');
// => '/users/123'

// Join path segments
joinPath('/users', '123', 'posts');
// => '/users/123/posts'

// Split path into segments
splitPath('/users/123/posts');
// => ['users', '123', 'posts']

// Get path depth
getPathDepth('/users/123/posts');
// => 3

// Check if child path
isChildPath('/users/123/posts', '/users');
// => true

// Get parent path
getParentPath('/users/123/posts');
// => '/users/123'

// Get last segment
getLastSegment('/users/123/posts');
// => 'posts'
```

## Query String Utilities

### buildQueryString

Build a query string from parameters.

```typescript
function buildQueryString(
  query: Record<string, string | number | boolean | undefined>
): string;
```

**Examples:**

```typescript
buildQueryString({ page: 1, sort: 'name' });
// => 'page=1&sort=name'

buildQueryString({ filter: undefined, sort: 'name' });
// => 'sort=name'

buildQueryString({ active: true, id: 123 });
// => 'active=true&id=123'
```

### parseQueryString

Parse a query string into parameters.

```typescript
function parseQueryString(queryString: string): Record<string, string>;
```

**Examples:**

```typescript
parseQueryString('?page=1&sort=name');
// => { page: '1', sort: 'name' }

parseQueryString('page=1&sort=name');
// => { page: '1', sort: 'name' }
```

## Segment Parsing

Convert file-system paths to route patterns using Next.js conventions.

### parseRouteSegment

Parse a filename or directory name into a route segment.

```typescript
function parseRouteSegment(
  filename: string,
  config?: SegmentParserConfig
): ParsedRouteSegment;
```

**Examples:**

```typescript
// Static routes
parseRouteSegment('about.tsx');
// => { type: 'static', name: 'about', isOptional: false }

// Dynamic routes
parseRouteSegment('[id].tsx');
// => { type: 'dynamic', name: ':id', paramName: 'id', isOptional: false }

// Optional parameters
parseRouteSegment('[[id]].tsx');
// => { type: 'optional', name: ':id?', paramName: 'id', isOptional: true }

// Catch-all routes
parseRouteSegment('[...slug].tsx');
// => { type: 'catchAll', name: '*', paramName: 'slug', isOptional: false }

// Route groups
parseRouteSegment('(auth)');
// => { type: 'group', name: '', isOptional: false }

// Layouts
parseRouteSegment('_layout.tsx');
// => { type: 'layout', name: 'layout', isOptional: false }

// Index routes
parseRouteSegment('index.tsx');
// => { type: 'index', name: '', isOptional: false }
```

### parseDirectoryPath

Parse a full directory path into route segments.

```typescript
function parseDirectoryPath(
  dirPath: string,
  filename: string,
  config?: SegmentParserConfig
): readonly ParsedRouteSegment[];
```

**Examples:**

```typescript
parseDirectoryPath('users/[id]', 'posts.tsx');
// => [
//   { type: 'static', name: 'users' },
//   { type: 'dynamic', name: ':id', paramName: 'id' },
//   { type: 'static', name: 'posts' }
// ]

parseDirectoryPath('(auth)', 'login.tsx');
// => [
//   { type: 'group', name: '' },
//   { type: 'static', name: 'login' }
// ]
```

### segmentsToUrlPath

Convert parsed segments to a URL path.

```typescript
function segmentsToUrlPath(
  segments: readonly ParsedRouteSegment[]
): string;
```

**Examples:**

```typescript
const segments = parseDirectoryPath('users/[id]', 'posts.tsx');
segmentsToUrlPath(segments);
// => '/users/:id/posts'

const groupSegments = parseDirectoryPath('(auth)', 'login.tsx');
segmentsToUrlPath(groupSegments);
// => '/login' (group is ignored)
```

### Segment Utilities

```typescript
// Check if segment is dynamic
isDynamicSegment(segment);

// Check if segment appears in URL
isUrlSegment(segment);

// Extract parameter names from segments
extractSegmentParams(segments);
// => ['id', 'postId']

// Generate route ID
generateRouteId(segments, '/users/:id');
// => 'USERS_BY_ID'

// Generate display name
generateDisplayName(segments);
// => 'User Detail'

// Calculate depth
calculateSegmentDepth(segments);
// => 3

// Check for layout
hasLayoutSegment(segments);
// => true

// Check if index route
isIndexRoute(segments);
// => false
```

## Configuration

### Segment Parser Config

Customize parsing behavior:

```typescript
interface SegmentParserConfig {
  extensions?: readonly string[];
  layoutPrefix?: string;
  indexName?: string;
  dynamicBrackets?: readonly [string, string];
  optionalBrackets?: readonly [string, string];
  catchAllPrefix?: string;
  groupBrackets?: readonly [string, string];
}

// Default configuration
const DEFAULT_SEGMENT_PARSER_CONFIG = {
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  layoutPrefix: '_',
  indexName: 'index',
  dynamicBrackets: ['[', ']'],
  optionalBrackets: ['[[', ']]'],
  catchAllPrefix: '...',
  groupBrackets: ['(', ')'],
};
```

## Conflict Detection

Validate route configurations and detect conflicts.

### detectConflicts

Detect all route conflicts in a set of routes.

```typescript
function detectConflicts(
  routes: readonly RouteForConflictDetection[],
  options?: ConflictDetectionOptions
): ConflictDetectionResult;
```

**Examples:**

```typescript
const result = detectConflicts(routes, {
  maxNestingDepth: 5,
  checkNestedDynamic: true,
  checkDeepNesting: true,
  checkIndexLayouts: true,
});

if (result.hasErrors) {
  console.error(result.report);
}

if (result.hasWarnings) {
  console.warn('Route warnings:', result.conflicts);
}
```

### Specific Conflict Detection

```typescript
// Find exact duplicates
findExactDuplicates(routes);
// => [{ type: 'exact', path: '/users', files: [...] }]

// Find static routes shadowed by dynamic routes
findDynamicShadows(routes);
// => [{ type: 'shadow', path: '/users/new', files: [...] }]

// Find ambiguous routes
findAmbiguousRoutes(routes);
// => [{ type: 'ambiguous', path: '/users/:id', files: [...] }]

// Find catch-all conflicts
findCatchAllConflicts(routes);

// Find nested dynamic conflicts
findNestedDynamicConflicts(routes);

// Find deep nesting warnings
findDeepNestingWarnings(routes, 5);

// Find index-layout conflicts
findIndexLayoutConflicts(routes);
```

### generateConflictReport

Generate a human-readable conflict report:

```typescript
const report = generateConflictReport(conflicts);
console.log(report);

// Output:
// ======================================================================
//   ROUTE CONFLICT REPORT
// ======================================================================
//
// ERRORS (2):
// --------------------------------------------------
//
//   [EXACT] Duplicate route definition for "/users"...
//
//   Files involved:
//     - src/routes/users/index.tsx
//     - src/routes/users.tsx
//
// WARNINGS (1):
// --------------------------------------------------
//
//   [SHADOW] Static route "/users/new" may be shadowed...
//
//   Files involved:
//     - src/routes/users/[id].tsx
//     - src/routes/users/new.tsx
```

## Route Specificity

Control route matching order with specificity calculation.

### getPatternSpecificity

Calculate specificity score for a route pattern:

```typescript
// Higher = more specific = matched first
getPatternSpecificity('/users/new');      // 200 (2 static)
getPatternSpecificity('/users/:id');      // 150 (1 static + 1 dynamic)
getPatternSpecificity('/users/:id?');     // 130 (1 static + 1 optional)
getPatternSpecificity('/users/*');        // 110 (1 static + 1 catch-all)
```

### comparePatternSpecificity

Sort routes by specificity:

```typescript
const routes = ['/users/:id', '/users/new', '/users/*'];
routes.sort(comparePatternSpecificity);
// => ['/users/new', '/users/:id', '/users/*']
```

### sortBySpecificity

Sort full route objects:

```typescript
const sortedRoutes = sortBySpecificity(routes);
// Routes are sorted: most specific first
```

## Type System

The core module provides TypeScript utilities for type-safe routing.

### Type-Safe Parameter Extraction

```typescript
// Extract required parameters
type UserParams = ExtractRequiredParams<'/users/:id/posts/:postId'>;
// => { id: string; postId: string }

// Extract optional parameters
type SearchParams = ExtractOptionalParams<'/search/:query?'>;
// => { query?: string }

// Combined parameters
type RouteParams = ExtractRouteParams<'/users/:id/:tab?'>;
// => { id: string; tab?: string }

// Check if route has parameters
type HasP = HasParams<'/users/:id'>; // true
type NoP = HasParams<'/about'>; // false

// Check if parameters are required
type ReqP = RequiresParams<'/users/:id'>; // true
type OptP = RequiresParams<'/search/:query?'>; // false
```

### Route Builder Types

```typescript
// Create type-safe builder function
type UserBuilder = RouteBuilder<'/users/:id'>;
// => (params: { id: string }, query?: Record<string, string>) => string

type HomeBuilder = RouteBuilder<'/'>;
// => (query?: Record<string, string>) => '/'

// Create route registry
const routes = {
  home: '/',
  userDetail: '/users/:id',
  search: '/search/:query?',
} as const;

type Registry = TypedRouteRegistry<typeof routes>;
// => {
//   home: (query?: Record<string, string>) => '/';
//   userDetail: (params: { id: string }, query?: ...) => string;
//   search: (params?: { query: string }, query?: ...) => string;
// }
```

### Runtime Helpers

```typescript
import { createBuilder, createRegistry, validateParams } from '@/lib/routing/core';

// Create a builder function
const userRoute = createBuilder('/users/:id', buildPath);
userRoute({ id: '123' }); // '/users/123'

// Create a registry
const registry = createRegistry(routes, buildPath);
registry.userDetail({ id: '123' }); // '/users/123'

// Validate parameters
validateParams('/users/:id', { id: '123' }, extractParamNames); // true
validateParams('/users/:id', { userId: '123' }, extractParamNames); // false
```

## Validation

```typescript
// Validate routes and throw on errors
validateRoutes(routes);

// Check if routes are valid (without throwing)
if (areRoutesValid(routes)) {
  console.log('All routes valid');
}
```

## Best Practices

### Use Type-Safe Builders

```typescript
// Define routes as const
const routes = {
  home: '/',
  userDetail: '/users/:id',
  userPosts: '/users/:id/posts',
} as const;

// Create builders
const builders = createRegistry(routes, buildPath);

// Type-safe usage
builders.userDetail({ id: '123' });
builders.home(); // No parameters needed
```

### Validate at Build Time

```typescript
// In your build script
const routes = await scanRouteFiles(process.cwd(), config);
const result = detectConflicts(routes);

if (result.hasErrors) {
  console.error(result.report);
  process.exit(1);
}
```

### Normalize Paths Consistently

```typescript
// Always normalize user input
const userPath = normalizePath(inputPath);

// Use consistent path building
const path = buildPath(pattern, params);
```

## Examples

### Custom Route Matching

```typescript
function findMatchingRoute(path: string, routes: Route[]) {
  for (const route of routes) {
    if (matchPathPattern(route.pattern, path)) {
      const params = parsePathParams(route.pattern, path);
      return { route, params };
    }
  }
  return null;
}
```

### Path Hierarchy

```typescript
function buildBreadcrumbs(path: string) {
  const segments = splitPath(path);
  const breadcrumbs = [];

  for (let i = 0; i < segments.length; i++) {
    const crumbPath = `/${segments.slice(0, i + 1).join('/')}`;
    breadcrumbs.push({
      path: crumbPath,
      label: segments[i],
    });
  }

  return breadcrumbs;
}
```

### Route Sorting

```typescript
function sortRoutes(routes: Route[]) {
  return routes.sort((a, b) => {
    // First by specificity
    const specDiff = comparePatternSpecificity(a.pattern, b.pattern);
    if (specDiff !== 0) return specDiff;

    // Then by depth
    const depthA = getPathDepth(a.pattern);
    const depthB = getPathDepth(b.pattern);
    if (depthA !== depthB) return depthA - depthB;

    // Finally alphabetically
    return a.pattern.localeCompare(b.pattern);
  });
}
```

## Related Documentation

- [Type Definitions](./TYPES.md)
- [Route Guards](./GUARDS.md)
- [Route Discovery](./DISCOVERY.md)
