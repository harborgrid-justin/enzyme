# Auto API Generation

Automatically generate REST API endpoints from file system structure with integrated RBAC and OpenAPI documentation.

## Table of Contents

- [Overview](#overview)
- [File Conventions](#file-conventions)
- [Route Scanner](#route-scanner)
- [API Generator](#api-generator)
- [Endpoint Registry](#endpoint-registry)
- [RBAC Integration](#rbac-integration)
- [OpenAPI Generation](#openapi-generation)
- [Complete Example](#complete-example)

## Overview

The Auto API Generation module allows you to define REST APIs through file structure conventions, automatically generating:

- Route endpoints with proper HTTP methods
- Path and query parameter definitions
- Permission requirements from folder structure
- OpenAPI/Swagger documentation
- RBAC integration
- Type-safe handlers

### Quick Start

```typescript
import { initializeAutoApi } from '@/lib/api/auto';

const api = await initializeAutoApi({
  rootDir: '/src/api',
  rbac: {
    checkPermission: (user, perm) => user.permissions.includes(perm),
    checkRole: (user, role) => user.roles.includes(role),
  },
});

// Use the generated API
const lookup = api.registry.getByPath('/api/users/123', 'GET');
if (lookup) {
  const access = await api.registry.checkAccess(lookup.endpoint.id, { user });
  if (access.allowed) {
    // Handle request
  }
}
```

## File Conventions

### Directory Structure

```
/api
├── (public)/           # Public routes (no auth)
│   └── health.ts      # GET /api/health
├── (auth)/            # Authenticated routes
│   ├── users/
│   │   ├── index.ts   # GET /api/users (list), POST /api/users (create)
│   │   ├── [id].ts    # GET/PUT/PATCH/DELETE /api/users/:id
│   │   ├── [id]/
│   │   │   └── posts/
│   │   │       ├── index.ts     # GET /api/users/:id/posts
│   │   │       └── [postId].ts  # GET /api/users/:id/posts/:postId
│   │   └── _schema.ts # OpenAPI schema
│   └── (admin)/       # Admin-only routes
│       └── settings/
│           └── index.ts # GET/POST /api/settings
└── webhooks/
    └── github.ts      # POST /api/webhooks/github
```

### File Patterns

| Pattern | Type | Methods | URL Example |
|---------|------|---------|-------------|
| `index.ts` | Collection | GET, POST | `/api/users` |
| `[param].ts` | Resource | GET, PUT, PATCH, DELETE | `/api/users/:id` |
| `create.ts` | Action | POST | `/api/users/create` |
| `update.ts` | Action | PUT, PATCH | `/api/users/update` |
| `delete.ts` | Action | DELETE | `/api/users/delete` |
| `(group)/` | Grouping | - | No path impact |
| `_schema.ts` | Schema | - | Ignored |
| `_middleware.ts` | Middleware | - | Ignored |
| `_access.ts` | Access | - | Ignored |

### Group Modifiers

Groups define access control without affecting URL paths.

| Group | Effect | Example |
|-------|--------|---------|
| `(public)` | No authentication | Anyone can access |
| `(auth)` | Requires authentication | Logged-in users |
| `(admin)` | Requires admin role | Admin users only |
| `(manager)` | Requires manager role | Manager users only |
| `(owner)` | Requires resource ownership | Resource owners only |
| `(team)` | Team scope | Team members only |
| `(org)` | Organization scope | Org members only |

### Parameter Types

#### Dynamic Parameters

```typescript
// [id].ts -> /api/users/:id
// [[id]].ts -> /api/users/:id? (optional)
// [...slug].ts -> /api/*slug (catch-all)
```

#### Nested Parameters

```typescript
// /api/orgs/[orgId]/teams/[teamId].ts
// URL: /api/orgs/:orgId/teams/:teamId
// Params: { orgId: string, teamId: string }
```

## Route Scanner

Scans the file system to discover API routes.

### scanApiRoutes()

**Signature:**

```typescript
async function scanApiRoutes(
  rootDir: string,
  config?: Partial<ApiScannerConfig>
): Promise<ScannedApiRoute[]>
```

**Example:**

```typescript
import { scanApiRoutes } from '@/lib/api/auto';

const routes = await scanApiRoutes('/src/api', {
  extensions: ['.ts', '.tsx'],
  ignorePatterns: ['**/*.test.ts'],
  baseUrl: '/api',
  parallel: true,
});

for (const route of routes) {
  console.log(`${route.httpMethods.join(', ')} ${route.urlPath}`);
  console.log(`  Resource: ${route.resourceName}`);
  console.log(`  Permissions: ${route.groupModifiers.map(g => g.type).join(', ')}`);
}
```

### ScannedApiRoute

```typescript
interface ScannedApiRoute {
  filePath: string;              // Absolute path to file
  relativePath: string;          // Relative to scan root
  urlPath: string;               // Generated URL path
  segments: ParsedApiSegment[];  // Parsed path segments
  httpMethods: HttpMethod[];     // Supported methods
  fileType: ApiFileType;         // File classification
  paramNames: string[];          // Extracted parameters
  resourceName: string;          // Primary resource
  parentResources: string[];     // Parent resources
  groupModifiers: GroupModifier[]; // Access modifiers
  hasSchema: boolean;            // Has schema file
  hasMiddleware: boolean;        // Has middleware
  hasAccessOverride: boolean;    // Has access override
  depth: number;                 // Nesting depth
}
```

### Configuration

```typescript
interface ApiScannerConfig {
  extensions: string[];          // File extensions (default: ['.ts', '.tsx'])
  ignorePatterns: string[];      // Patterns to ignore
  baseUrl: string;               // Base URL prefix (default: '/api')
  parallel: boolean;             // Parallel scanning
  cacheResults: boolean;         // Cache results
  classifyFile?: (filename: string) => ApiFileType;
  parseGroupModifier?: (name: string) => GroupModifier;
}
```

## API Generator

Generates endpoint definitions from scanned routes.

### generateApiEndpoints()

**Signature:**

```typescript
async function generateApiEndpoints(
  routes: ScannedApiRoute[],
  config?: Partial<ApiGeneratorConfig>
): Promise<GeneratedEndpoint[]>
```

**Example:**

```typescript
import { generateApiEndpoints } from '@/lib/api/auto';

const endpoints = await generateApiEndpoints(routes, {
  generateIds: true,
  generateTags: true,
  generateSchemas: true,
});

for (const endpoint of endpoints) {
  console.log(`${endpoint.id}: ${endpoint.method} ${endpoint.path}`);
  console.log(`  Permissions: ${endpoint.access.permissions.join(', ')}`);
}
```

### GeneratedEndpoint

```typescript
interface GeneratedEndpoint {
  id: string;                    // Unique endpoint ID
  path: string;                  // URL path with parameters
  method: HttpMethod;            // HTTP method
  displayName: string;           // Human-readable name
  description: string;           // Auto-generated description
  operationId: string;           // OpenAPI operation ID
  tags: string[];                // OpenAPI tags
  access: ComputedAccess;        // Access control
  pathParams: PathParameter[];   // Path parameters
  queryParams: QueryParameter[]; // Query parameters
  requestSchema?: EndpointSchema; // Request body schema
  responseSchema?: EndpointSchema; // Response schema
  middleware?: MiddlewareConfig; // Middleware configuration
  rateLimit?: RateLimitConfig;   // Rate limiting
  cache?: EndpointCacheConfig;   // Caching config
  deprecated?: DeprecationInfo;  // Deprecation info
  metadata: Record<string, unknown>; // Custom metadata
}
```

### ComputedAccess

```typescript
interface ComputedAccess {
  isPublic: boolean;             // No auth required
  requiresAuth: boolean;         // Auth required
  requiredRoles: string[];       // Required roles
  requiredPermissions: DerivedPermission[]; // Required permissions
  scope: PermissionScope;        // Resource scope
  ownershipCheck?: ResourceOwnershipCheck;
  customChecks?: AccessOverride[];
}
```

## Endpoint Registry

Manages and queries generated endpoints.

### Creating a Registry

```typescript
import { createEndpointRegistry } from '@/lib/api/auto';

const registry = createEndpointRegistry({
  validatePaths: true,
  enableCache: true,
  rbacIntegration: rbac,
});
```

### Registering Endpoints

```typescript
// Register single endpoint
registry.register(endpoint);

// Register multiple
registry.registerBatch(endpoints);

// Unregister
registry.unregister(endpointId);
```

### Querying Endpoints

```typescript
// Get by path and method
const lookup = registry.getByPath('/api/users/123', 'GET');
if (lookup) {
  console.log(lookup.endpoint);
  console.log(lookup.params); // { id: '123' }
}

// Get by ID
const endpoint = registry.getById('users:read');

// Get all for path
const endpoints = registry.getByPathPattern('/api/users/*');

// Filter endpoints
const publicEndpoints = registry.filter({
  isPublic: true,
});

const adminEndpoints = registry.filter({
  hasRole: 'admin',
});
```

### Access Control

```typescript
// Check access
const result = await registry.checkAccess(endpointId, {
  user: currentUser,
  resource: { id: '123', ownerId: 'user-456' },
});

if (result.allowed) {
  // Handle request
} else {
  // Access denied
  console.log(result.reason);
  console.log(result.missingPermissions);
}
```

### Event Listeners

```typescript
// Listen for registry changes
const unsubscribe = registry.on('endpoint:registered', (payload) => {
  console.log('Endpoint registered:', payload.endpoint.id);
});

// Available events:
// - endpoint:registered
// - endpoint:unregistered
// - endpoint:updated
// - registry:cleared

unsubscribe(); // Remove listener
```

### Statistics

```typescript
const stats = registry.getStats();
console.log(`Total endpoints: ${stats.totalEndpoints}`);
console.log(`Public: ${stats.publicEndpoints}`);
console.log(`Authenticated: ${stats.authenticatedEndpoints}`);
console.log(`By method:`, stats.byMethod);
console.log(`By tag:`, stats.byTag);
```

## RBAC Integration

Role-Based Access Control integration with automatic permission derivation.

### Creating RBAC Integration

```typescript
import { createRBACIntegration } from '@/lib/api/auto';

const rbac = createRBACIntegration({
  checkPermission: async (user, permission, context) => {
    return user.permissions.includes(permission);
  },
  checkRole: async (user, role, context) => {
    return user.roles.includes(role);
  },
  checkOwnership: async (user, resource) => {
    return resource.ownerId === user.id;
  },
  enableAudit: true,
  logDenials: true,
});
```

### Permission Derivation

Automatically derive permissions from endpoint paths and methods.

```typescript
import { derivePermissions } from '@/lib/api/auto';

// GET /api/users/:id
const perms = derivePermissions('/api/users/:id', 'GET');
// Result: [{ permission: 'users:read', resource: 'users', action: 'read' }]

// POST /api/users
const perms = derivePermissions('/api/users', 'POST');
// Result: [{ permission: 'users:create', resource: 'users', action: 'create' }]

// GET /api/orgs/:orgId/teams/:teamId
const perms = derivePermissions('/api/orgs/:orgId/teams/:teamId', 'GET');
// Result: [
//   { permission: 'teams:read', resource: 'teams', action: 'read' },
//   { permission: 'orgs:read', resource: 'orgs', action: 'read' },
// ]
```

### Permission Structure

```typescript
interface DerivedPermission {
  permission: string;            // Full permission (e.g., 'users:read')
  resource: string;              // Resource name
  action: string;                // Action (read, create, update, delete)
  scope?: PermissionScope;       // Scope (own, team, org, global)
  requiresOwnership?: boolean;   // Requires resource ownership
  parentResource?: string;       // Parent resource
  metadata?: Record<string, unknown>;
}
```

### Permission Checking

```typescript
const result = await rbac.checkAccess({
  user: currentUser,
  permissions: ['users:read', 'users:update'],
  roles: ['admin'],
  resource: { id: '123', ownerId: 'user-456' },
});

if (result.allowed) {
  // Access granted
} else {
  console.log('Denied:', result.reason);
  console.log('Missing:', result.missingPermissions);
}
```

### Audit Events

```typescript
rbac.on('audit', (event) => {
  console.log(`${event.action} ${event.result} for user ${event.userId}`);
  console.log(`Resource: ${event.resourceType}:${event.resourceId}`);
  console.log(`Permissions: ${event.permissions.join(', ')}`);
});
```

## OpenAPI Generation

Generate OpenAPI 3.0 specification from endpoints.

### generateOpenAPISpec()

```typescript
import { generateOpenAPISpec } from '@/lib/api/auto';

const spec = registry.generateOpenAPISpec({
  title: 'My API',
  version: '1.0.0',
  description: 'Auto-generated API documentation',
  servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  security: [{ bearerAuth: [] }],
});

// Serve spec
app.get('/api/docs/openapi.json', (req, res) => {
  res.json(spec);
});
```

### Schema Definition

Define schemas in `_schema.ts` files:

```typescript
// /api/users/_schema.ts
export const userSchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['user', 'admin'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const createUserSchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['user', 'admin'] },
  },
};
```

### Endpoint Handlers

Define handlers in route files:

```typescript
// /api/users/index.ts
import type { EndpointHandler } from '@/lib/api/auto';

/**
 * List users
 * @tag users
 * @summary List all users
 * @response 200 - List of users
 */
export const GET: EndpointHandler<User[]> = async (ctx) => {
  const { page = 1, limit = 20 } = ctx.query;

  const users = await db.users.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data: users,
    meta: { page, limit, total: await db.users.count() },
  };
};

/**
 * Create user
 * @tag users
 * @summary Create a new user
 * @request CreateUserDto
 * @response 201 - Created user
 */
export const POST: EndpointHandler<User, CreateUserDto> = async (ctx) => {
  const user = await db.users.create({
    data: ctx.body,
  });

  return {
    data: user,
    status: 201,
  };
};
```

## Complete Example

### File Structure

```
/src/api/
├── (public)/
│   └── health.ts
├── (auth)/
│   ├── users/
│   │   ├── index.ts
│   │   ├── [id].ts
│   │   ├── [id]/
│   │   │   ├── posts/
│   │   │   │   ├── index.ts
│   │   │   │   └── [postId].ts
│   │   │   └── profile.ts
│   │   └── _schema.ts
│   └── (admin)/
│       └── settings/
│           └── index.ts
└── webhooks/
    └── github.ts
```

### Implementation

```typescript
// Initialize auto API
const api = await initializeAutoApi({
  rootDir: '/src/api',
  scanner: {
    extensions: ['.ts'],
    baseUrl: '/api',
  },
  generator: {
    generateIds: true,
    generateTags: true,
  },
  rbac: {
    checkPermission: async (user, perm) => {
      return user.permissions.includes(perm);
    },
    checkRole: async (user, role) => {
      return user.roles.includes(role);
    },
    checkOwnership: async (user, resource) => {
      return resource.ownerId === user.id;
    },
  },
});

// Express integration
app.use(async (req, res, next) => {
  const lookup = api.registry.getByPath(req.path, req.method);

  if (!lookup) {
    return next(); // Not an auto-generated route
  }

  // Check access
  const access = await api.registry.checkAccess(
    lookup.endpoint.id,
    {
      user: req.user,
      params: lookup.params,
    }
  );

  if (!access.allowed) {
    return res.status(403).json({
      error: 'Forbidden',
      reason: access.reason,
    });
  }

  // Load handler
  const handler = await import(lookup.endpoint.metadata.filePath);
  const handlerFn = handler[req.method];

  if (!handlerFn) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Execute handler
  try {
    const result = await handlerFn({
      params: lookup.params,
      query: req.query,
      body: req.body,
      user: req.user,
      headers: req.headers,
    });

    res.status(result.status || 200).json(result.data);
  } catch (error) {
    next(error);
  }
});

// Serve OpenAPI spec
app.get('/api/docs/openapi.json', (req, res) => {
  const spec = api.registry.generateOpenAPISpec({
    title: 'My API',
    version: '1.0.0',
  });
  res.json(spec);
});

// Hot reload in development
if (process.env.NODE_ENV === 'development') {
  const watcher = chokidar.watch('/src/api/**/*.ts');
  watcher.on('change', async () => {
    await api.refresh();
    console.log('API routes refreshed');
  });
}
```

### Handler Examples

```typescript
// /api/users/index.ts
export const GET: EndpointHandler<User[]> = async (ctx) => {
  return {
    data: await db.users.findMany(),
  };
};

export const POST: EndpointHandler<User, CreateUserDto> = async (ctx) => {
  const user = await db.users.create({ data: ctx.body });
  return { data: user, status: 201 };
};

// /api/users/[id].ts
export const GET: EndpointHandler<User> = async (ctx) => {
  const user = await db.users.findUnique({
    where: { id: ctx.params.id },
  });
  if (!user) throw new NotFoundError();
  return { data: user };
};

export const PATCH: EndpointHandler<User, Partial<User>> = async (ctx) => {
  const user = await db.users.update({
    where: { id: ctx.params.id },
    data: ctx.body,
  });
  return { data: user };
};

export const DELETE: EndpointHandler<void> = async (ctx) => {
  await db.users.delete({ where: { id: ctx.params.id } });
  return { status: 204 };
};
```

## Best Practices

### 1. Consistent Naming

Use consistent resource naming across your API structure.

### 2. Group Organization

Organize routes by access level using group modifiers.

### 3. Schema Definitions

Always define schemas for request/response validation.

### 4. Permission Granularity

Use fine-grained permissions for better access control.

### 5. Documentation

Add JSDoc comments to handlers for better OpenAPI documentation.

## Related Documentation

### API Documentation
- **[API Module Overview](./README.md)** - Complete API module guide
- **[API Client](./API_CLIENT.md)** - HTTP client configuration
- **[Hooks](./HOOKS.md)** - React hooks for data fetching
- **[Types](./TYPES.md)** - TypeScript type reference
- **[Advanced Features](./ADVANCED.md)** - Gateway, orchestration, metrics

### Integration Guides
- **[Configuration](../config/README.md)** - Configuration options
- **[State Management](../state/README.md)** - Global state integration

### Security
- **[Security Module](../security/README.md)** - RBAC and access control
- **[Advanced Features - RBAC](./ADVANCED.md#rbac-integration)** - Role-based access control

### Reference
- **[OpenAPI Specification](https://swagger.io/specification/)** - API documentation standard
