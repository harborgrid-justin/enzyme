# Routing Type Definitions

> Complete TypeScript type reference for the routing module

## Overview

The routing module provides comprehensive TypeScript types for type-safe routing. Types are organized by module and use advanced TypeScript features like template literal types for compile-time parameter extraction.

## Core Types

### Route Parameter Extraction

Template literal types that extract parameters from route patterns at compile time.

#### ExtractRequiredParams

Extract required parameter names from a route path.

```typescript
type ExtractRequiredParams<TPath extends string>;

// Examples
type UserParams = ExtractRequiredParams<'/users/:id'>;
// => { id: string }

type PostParams = ExtractRequiredParams<'/users/:id/posts/:postId'>;
// => { id: string; postId: string }

type NoParams = ExtractRequiredParams<'/about'>;
// => Record<string, never>
```

#### ExtractOptionalParams

Extract optional parameter names from a route path.

```typescript
type ExtractOptionalParams<TPath extends string>;

// Examples
type SearchParams = ExtractOptionalParams<'/search/:query?'>;
// => { query?: string }

type MixedParams = ExtractOptionalParams<'/users/:id/:tab?'>;
// => { tab?: string }
```

#### ExtractRouteParams

Combined required and optional parameters.

```typescript
type ExtractRouteParams<TPath extends string>;

// Examples
type Params = ExtractRouteParams<'/users/:id/:tab?'>;
// => { id: string; tab?: string }

type ComplexParams = ExtractRouteParams<'/posts/:year/:month?/:day?'>;
// => { year: string; month?: string; day?: string }
```

### Route Condition Types

Type-level predicates for route analysis.

#### HasParams

Check if a route path has any parameters.

```typescript
type HasParams<TPath extends string>;

// Examples
type HasP = HasParams<'/users/:id'>; // true
type NoP = HasParams<'/about'>; // false
```

#### RequiresParams

Check if a route requires parameters (has non-optional params).

```typescript
type RequiresParams<TPath extends string>;

// Examples
type Req = RequiresParams<'/users/:id'>; // true
type NoReq = RequiresParams<'/search/:query?'>; // false
```

#### HasOnlyOptionalParams

Check if a route has only optional parameters.

```typescript
type HasOnlyOptionalParams<TPath extends string>;

// Examples
type OnlyOpt = HasOnlyOptionalParams<'/search/:query?'>; // true
type HasReq = HasOnlyOptionalParams<'/users/:id'>; // false
```

#### ParamsFor

Get the params type for a path, with proper handling for parameterless routes.

```typescript
type ParamsFor<TPath extends string>;

// Examples
type Params = ParamsFor<'/users/:id'>; // { id: string }
type NoParams = ParamsFor<'/about'>; // undefined
```

### Route Segment Types

Types for analyzing route structure.

#### ExtractSegments

Extract all segments from a route path as a tuple.

```typescript
type ExtractSegments<TPath extends string>;

// Examples
type Segs = ExtractSegments<'/users/:id/posts/:postId'>;
// => ['users', ':id', 'posts', ':postId']

type RootSeg = ExtractSegments<'/'>;
// => []
```

#### RouteDepth

Get the depth (number of segments) of a route.

```typescript
type RouteDepth<TPath extends string>;

// Examples
type Depth = RouteDepth<'/users/:id/posts'>; // 3
type RootDepth = RouteDepth<'/'>; // 0
```

#### IsChildRoute

Check if a route is a child of another.

```typescript
type IsChildRoute<TChild extends string, TParent extends string>;

// Examples
type IsChild = IsChildRoute<'/users/:id', '/users'>; // true
type NotChild = IsChildRoute<'/users', '/users/:id'>; // false
```

#### GetParentPath

Get the parent path of a route.

```typescript
type GetParentPath<TPath extends string>;

// Examples
type Parent = GetParentPath<'/users/:id/posts'>; // '/users/:id'
type RootParent = GetParentPath<'/users'>; // '/'
```

### Segment Analysis Types

#### IsDynamicSegment

Check if a path segment is dynamic.

```typescript
type IsDynamicSegment<TSegment extends string>;

// Examples
type IsDyn = IsDynamicSegment<':id'>; // true
type NotDyn = IsDynamicSegment<'users'>; // false
```

#### IsOptionalSegment

Check if a path segment is optional.

```typescript
type IsOptionalSegment<TSegment extends string>;

// Examples
type IsOpt = IsOptionalSegment<':id?'>; // true
type NotOpt = IsOptionalSegment<':id'>; // false
```

#### IsCatchAllSegment

Check if a path segment is catch-all.

```typescript
type IsCatchAllSegment<TSegment extends string>;

// Examples
type IsCatch = IsCatchAllSegment<'*'>; // true
type NotCatch = IsCatchAllSegment<':id'>; // false
```

## Builder Types

### RouteBuilder

Type-safe route builder function signature.

```typescript
type RouteBuilder<TPath extends string>;

// Examples
type HomeBuilder = RouteBuilder<'/'>;
// => (query?: Record<string, string>) => '/'

type UserBuilder = RouteBuilder<'/users/:id'>;
// => (params: { id: string }, query?: Record<string, string>) => string

type SearchBuilder = RouteBuilder<'/search/:query?'>;
// => (params?: { query: string }, query?: Record<string, string>) => string
```

### TypedRouteRegistry

Type-safe route registry with builders for all routes.

```typescript
type TypedRouteRegistry<TRoutes extends Record<string, string>>;

// Example
const routes = {
  home: '/',
  users: '/users',
  userDetail: '/users/:id',
} as const;

type Registry = TypedRouteRegistry<typeof routes>;
// => {
//   home: (query?: Record<string, string>) => '/';
//   users: (query?: Record<string, string>) => '/users';
//   userDetail: (params: { id: string }, query?: ...) => string;
// }
```

### BuildPath

Build a URL path type from a pattern and params.

```typescript
type BuildPath<TPath extends string, TParams extends Record<string, string>>;

// Examples
type URL = BuildPath<'/users/:id', { id: '123' }>;
// => '/users/123'

type PostURL = BuildPath<'/posts/:slug', { slug: 'hello-world' }>;
// => '/posts/hello-world'
```

## Navigation Types

### TypedLinkProps

Type-safe link props for a route.

```typescript
type TypedLinkProps<TPath extends string>;

// Examples
type UserLinkProps = TypedLinkProps<'/users/:id'>;
// => {
//   to: '/users/:id';
//   params: { id: string };
//   query?: Record<string, string>;
// }

type HomeLinkProps = TypedLinkProps<'/'>;
// => {
//   to: '/';
//   query?: Record<string, string>;
// }
```

### TypedNavigate

Type-safe navigation function type.

```typescript
type TypedNavigate<TPath extends string, TOptions = unknown>;

// Examples
type NavigateToUser = TypedNavigate<'/users/:id'>;
// => (params: { id: string }, options?: unknown) => void

type NavigateHome = TypedNavigate<'/'>;
// => (options?: unknown) => void
```

## Route Map Types

### TypedRouteMap

Create a complete type-safe route map from paths.

```typescript
type TypedRouteMap<TPaths extends Record<string, string>>;

// Example
const routes = {
  home: '/',
  user: '/users/:id',
  post: '/posts/:postId',
} as const;

type RouteMap = TypedRouteMap<typeof routes>;
// => {
//   home: {
//     path: '/';
//     params: Record<string, never>;
//     hasParams: false;
//     requiresParams: false;
//   };
//   user: {
//     path: '/users/:id';
//     params: { id: string };
//     hasParams: true;
//     requiresParams: true;
//   };
//   post: {
//     path: '/posts/:postId';
//     params: { postId: string };
//     hasParams: true;
//     requiresParams: true;
//   };
// }
```

### InferRouteTypes

Infer route types from a route configuration object.

```typescript
type InferRouteTypes<TConfig extends Record<string, { path: string }>>;

// Example
const config = {
  home: { path: '/', component: HomePage },
  user: { path: '/users/:id', component: UserPage },
} as const;

type Routes = InferRouteTypes<typeof config>;
// => {
//   home: { path: '/'; params: ...; builder: ... };
//   user: { path: '/users/:id'; params: { id: string }; builder: ... };
// }
```

### MergeRoutes

Merge multiple route configurations into one.

```typescript
type MergeRoutes<TRoutes extends readonly Record<string, string>[]>;

// Example
const authRoutes = { login: '/login', logout: '/logout' } as const;
const userRoutes = { profile: '/profile', settings: '/settings' } as const;

type AllRoutes = MergeRoutes<[typeof authRoutes, typeof userRoutes]>;
// => { login: '/login'; logout: '/logout'; profile: '/profile'; settings: '/settings' }
```

## Segment Parser Types

### RouteSegmentType

Types of route segments in file-system routing.

```typescript
type RouteSegmentType =
  | 'static'      // about.tsx -> /about
  | 'dynamic'     // [id].tsx -> /:id
  | 'catchAll'    // [...slug].tsx -> /*
  | 'optional'    // [[id]].tsx -> /:id?
  | 'group'       // (auth)/ -> (ignored in path)
  | 'layout'      // _layout.tsx
  | 'index';      // index.tsx -> /
```

### ParsedRouteSegment

Parsed route segment from a filename.

```typescript
interface ParsedRouteSegment {
  type: RouteSegmentType;
  name: string;
  paramName?: string;
  isOptional: boolean;
  originalFilename: string;
}
```

### SegmentParserConfig

Configuration for segment parsing.

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
```

## Conflict Detection Types

### RouteForConflictDetection

Route structure for conflict detection.

```typescript
interface RouteForConflictDetection {
  urlPath: string;
  filePath: string;
  segments: readonly ParsedRouteSegment[];
  isLayout: boolean;
  isIndex: boolean;
  depth: number;
}
```

### ConflictType

Types of route conflicts.

```typescript
type ConflictType = 'exact' | 'ambiguous' | 'shadow';
```

### ConflictSeverity

Severity levels for conflicts.

```typescript
type ConflictSeverity = 'error' | 'warning';
```

### RouteConflict

Information about a route conflict.

```typescript
interface RouteConflict {
  type: ConflictType;
  path: string;
  files: readonly string[];
  message: string;
  severity: ConflictSeverity;
}
```

### ConflictDetectionResult

Result of conflict detection analysis.

```typescript
interface ConflictDetectionResult {
  hasErrors: boolean;
  hasWarnings: boolean;
  conflicts: readonly RouteConflict[];
  report: string;
}
```

## Guard Types

### GuardContext

Context passed to route guards.

```typescript
interface GuardContext {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  user?: GuardUser;
  features?: Record<string, boolean>;
  data?: Record<string, unknown>;
}
```

### GuardUser

User information for guards.

```typescript
interface GuardUser {
  id: string;
  isAuthenticated: boolean;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}
```

### GuardResult

Result returned by a guard.

```typescript
type GuardResultType = 'allow' | 'deny' | 'redirect';

interface GuardResultObject {
  type: GuardResultType;
  reason?: string;
  redirectTo?: string;
  metadata?: Record<string, unknown>;
}

type GuardResult = boolean | GuardResultObject | Promise<boolean | GuardResultObject>;
```

### RouteGuard

Base interface for route guards.

```typescript
interface RouteGuard {
  name: string;
  canActivate(context: GuardContext): GuardResult;
  canDeactivate?(context: GuardContext): GuardResult;
  priority?: number;
}
```

## Discovery Types

### DiscoveredRoute

Route discovered from file system.

```typescript
interface DiscoveredRoute {
  filePath: string;
  relativePath: string;
  urlPath: string;
  segments: readonly ParsedRouteSegment[];
  isLayout: boolean;
  isIndex: boolean;
  depth: number;
  parentLayout?: string;
}
```

### DiscoveryConfig

Configuration for route discovery.

```typescript
interface DiscoveryConfig {
  scanPaths: readonly string[];
  extensions: readonly string[];
  ignorePatterns: readonly string[];
  cacheResults: boolean;
}
```

### RouteDiscoveryStats

Statistics about route discovery.

```typescript
interface RouteDiscoveryStats {
  totalRoutes: number;
  layoutCount: number;
  dynamicRouteCount: number;
  maxDepth: number;
  scanDurationMs: number;
  filesScanned: number;
  filesIgnored: number;
}
```

## Advanced Routing Types

### Parallel Routes

```typescript
interface ParallelRouteSlot {
  name: string;
  component: React.ComponentType;
  loading?: React.ComponentType;
  default?: React.ComponentType | null;
}

interface ParallelRoutesConfig {
  slots: Record<string, ParallelRouteSlot>;
  layout?: React.ComponentType;
}
```

### Intercepting Routes

```typescript
enum InterceptionLevel {
  CURRENT = '.',
  PARENT = '..',
  GRANDPARENT = '...',
  ROOT = '....',
}

interface InterceptingRouteConfig {
  pattern: string;
  level: InterceptionLevel;
  interceptComponent: React.ComponentType;
  fullComponent: React.ComponentType;
  allowedOrigins?: string[];
}
```

### Route Groups

```typescript
interface RouteGroupConfig {
  name: string;
  layout?: React.ComponentType;
  guards?: RouteGuard[];
  middleware?: MiddlewareFunction[];
  meta?: Record<string, unknown>;
}
```

### Catch-All Routes

```typescript
interface CatchAllRouteConfig {
  basePath: string;
  paramName: string;
  optional: boolean;
  component: React.ComponentType;
  maxSegments?: number;
  validateSegment?: (segment: string) => boolean;
}
```

## Utility Types

### Prettify

Prettify a type for better IntelliSense display.

```typescript
type Prettify<T> = {
  [K in keyof T]: T[K];
};
```

### PartialBy

Make specific keys optional.

```typescript
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

### RoutePathFromId

Extract route path from a route ID in a registry.

```typescript
type RoutePathFromId<
  TRegistry extends Record<string, string>,
  TId extends keyof TRegistry
> = TRegistry[TId];
```

### ParamNames

Extract all parameter names as a union type.

```typescript
type ParamNames<TPath extends string> = keyof ExtractRouteParams<TPath>;
```

### ParamCount

Get the number of parameters in a route.

```typescript
type ParamCount<TPath extends string>;

// Examples
type Count = ParamCount<'/users/:id/posts/:postId'>; // 2
type NoParams = ParamCount<'/about'>; // 0
```

## Runtime Type Guards

### Route Guards

```typescript
function isRouteGuard(value: unknown): value is RouteGuard;
function isGuardResult(value: unknown): value is GuardResultObject;
function isGuardContext(value: unknown): value is GuardContext;

// Auth guards
function isAuthGuard(guard: RouteGuard): guard is AuthGuard;
function isAuthState(value: unknown): value is AuthState;

// Role guards
function isRoleGuard(guard: RouteGuard): guard is RoleGuard;
function isRoleCheckResult(value: unknown): value is RoleCheckResult;

// Permission guards
function isPermissionGuard(guard: RouteGuard): guard is PermissionGuard;
function isStructuredPermission(value: unknown): value is StructuredPermission;

// Feature guards
function isFeatureGuard(guard: RouteGuard): guard is FeatureGuard;
```

### Route Types

```typescript
function isDiscoveredRoute(value: unknown): value is DiscoveredRoute;
function isParsedRouteSegment(value: unknown): value is ParsedRouteSegment;
function isRouteConflict(value: unknown): value is RouteConflict;
```

## Type Helpers

### Runtime Helpers

```typescript
// Create type-safe builder
function createBuilder<TPath extends string>(
  path: TPath,
  buildPathFn: (pattern: string, params?: Record<string, string>) => string
): RouteBuilder<TPath>;

// Create route registry
function createRegistry<T extends Record<string, string>>(
  routes: T,
  buildPathFn: (pattern: string, params?: Record<string, string>) => string
): TypedRouteRegistry<T>;

// Validate parameters
function validateParams<TPath extends string>(
  path: TPath,
  params: Record<string, unknown>,
  extractParamNamesFn: (pattern: string) => string[]
): params is ExtractRouteParams<TPath>;
```

## Usage Examples

### Type-Safe Route Building

```typescript
// Define routes
const routes = {
  home: '/',
  users: '/users',
  userDetail: '/users/:id',
  userEdit: '/users/:id/edit',
  search: '/search/:query?',
} as const;

// Create registry
type Routes = typeof routes;
type Registry = TypedRouteRegistry<Routes>;

// Use in components
function MyComponent() {
  const registry = useRouteRegistry<Routes>();

  // Type-safe navigation
  registry.home(); // '/'
  registry.userDetail({ id: '123' }); // '/users/123'
  registry.search({ query: 'react' }); // '/search/react'
  registry.search(); // '/search'
}
```

### Parameter Extraction

```typescript
// Extract parameters at type level
type UserDetailParams = ExtractRouteParams<'/users/:id'>;
// => { id: string }

type SearchParams = ExtractRouteParams<'/search/:query?'>;
// => { query?: string }

// Use in components
function UserPage({ params }: { params: UserDetailParams }) {
  const userId = params.id; // Type-safe!
}
```

### Route Analysis

```typescript
// Check route properties
type HasP = HasParams<'/users/:id'>; // true
type ReqP = RequiresParams<'/users/:id'>; // true
type Depth = RouteDepth<'/users/:id/posts'>; // 3

// Conditional types based on route
type LinkProps<T extends string> = RequiresParams<T> extends true
  ? { to: T; params: ExtractRouteParams<T> }
  : { to: T; params?: never };
```

## Related Documentation

- [Core Routing](./CORE.md)
- [Route Guards](./GUARDS.md)
- [Navigation](./NAVIGATION.md)
- [Route Discovery](./DISCOVERY.md)
