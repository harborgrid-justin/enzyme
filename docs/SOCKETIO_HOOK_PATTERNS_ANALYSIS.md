# Socket.io Hook Patterns Analysis for Enzyme CLI Framework

**Research Date:** December 3, 2025
**Target Repository:** https://github.com/socketio/socket.io
**Analyzed Version:** 4.8.1
**Report Purpose:** Identify enterprise-grade hook/middleware patterns from Socket.io's real-time architecture to enhance the Enzyme CLI framework

---

## Executive Summary

Socket.io's event-driven architecture provides a sophisticated hook and middleware system that has proven itself in production at scale (62.7k+ stars, 5.7M+ dependents). This analysis identifies 10 core patterns that can be adapted to enhance Enzyme CLI's plugin system, particularly around lifecycle management, validation chains, error handling, and async event orchestration.

**Key Findings:**
- Socket.io uses a dual-layer middleware system (server-level and socket-level)
- Hook chains execute sequentially with error propagation
- Catch-all listeners enable powerful debugging and monitoring
- Adapter pattern provides extensibility without core modifications
- Type-safe hook definitions using TypeScript generics

---

## 1. Middleware System (io.use, socket.use)

### Pattern Overview

Socket.io implements a **layered middleware architecture** with two distinct levels:
- **Server-level middleware** (`io.use`) - Executes for every incoming connection
- **Socket-level middleware** (`socket.use`) - Executes for every packet on a connected socket

### How It Works

**Architecture:**
```
Client Connection → Server Middleware Chain → Socket Creation → Socket Middleware Chain → Event Handlers
```

**Execution Flow:**
1. Middleware functions receive `(socket, next)` parameters
2. Must call `next()` to continue chain or `next(error)` to abort
3. Sequential execution - stops on first error
4. Error objects can carry additional context via `.data` property

### Code Example from Socket.io

```javascript
// Server-level middleware - runs once per connection
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (isValidToken(token)) {
    // Attach user data to socket
    socket.data.user = decodeToken(token);
    next(); // Continue to next middleware
  } else {
    const err = new Error("not authorized");
    err.data = { content: "Please retry later" };
    next(err); // Abort connection with error
  }
});

// Socket-level middleware - runs for every packet
socket.use(([event, ...args], next) => {
  // Validate event permissions
  if (hasPermission(socket.data.user, event)) {
    next();
  } else {
    next(new Error("unauthorized event"));
  }
});
```

### Why It's Developer-Friendly

1. **Separation of Concerns:** Server middleware handles connection-level logic, socket middleware handles packet-level logic
2. **Composability:** Stack multiple middleware functions for clean code organization
3. **Error Context:** Rich error objects with additional data for client-side handling
4. **Async-First:** Natural support for async operations (database lookups, API calls)
5. **Early Exit:** Stop processing immediately on validation failure
6. **Type Safety:** Strongly typed in TypeScript with generic parameters

### Adaptation for Enzyme CLI

**Current Enzyme State:**
```typescript
// Current: Single-layer plugin hooks
export interface PluginHooks {
  beforeGenerate?: (context: GenerationContext) => Promise<void> | void;
  afterGenerate?: (context: GenerationContext, result: GenerationResult) => Promise<void> | void;
  validate?: (context: GenerationContext) => Promise<ValidationResult> | ValidationResult;
}
```

**Proposed Enhancement:**
```typescript
// Enhanced: Multi-layer middleware system
export interface EnzymeMiddleware {
  name: string;
  priority?: number; // Execution order (lower = earlier)

  // Command-level middleware (runs before command execution)
  execute?: (context: CommandContext, next: NextFunction) => Promise<void>;

  // Generator-level middleware (runs for each file generation)
  generate?: (context: GenerationContext, next: NextFunction) => Promise<void>;
}

export type NextFunction = (error?: Error) => void;

// Usage in Enzyme
export const authMiddleware: EnzymeMiddleware = {
  name: 'auth',
  priority: 10,

  async execute(context, next) {
    // Check if user is authenticated for enterprise features
    if (context.config.enterprise && !context.auth) {
      const error = new Error("Enterprise features require authentication");
      error.data = { code: 'AUTH_REQUIRED', retry: true };
      return next(error);
    }
    next();
  },

  async generate(context, next) {
    // Validate file permissions before generation
    if (!hasWritePermission(context.outputDir)) {
      return next(new Error("Permission denied"));
    }
    next();
  }
};

// Middleware chain execution
class MiddlewareChain {
  private middlewares: EnzymeMiddleware[] = [];

  use(middleware: EnzymeMiddleware) {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => (a.priority || 50) - (b.priority || 50));
  }

  async execute(context: CommandContext): Promise<void> {
    let index = 0;

    const next = async (error?: Error): Promise<void> => {
      if (error) throw error;

      if (index >= this.middlewares.length) return;

      const middleware = this.middlewares[index++];
      if (middleware.execute) {
        await middleware.execute(context, next);
      } else {
        await next();
      }
    };

    await next();
  }
}
```

**Benefits for Enzyme:**
- Pre-validate project structure before running generators
- Check authentication for premium features
- Implement rate limiting for API-dependent commands
- Audit logging middleware for enterprise compliance
- Dry-run middleware that intercepts file writes

---

## 2. Namespace-Level Hooks

### Pattern Overview

Socket.io **namespaces** provide logical separation of concerns, where each namespace has its own:
- Event handlers
- Middleware stack
- Room management
- Connection lifecycle

### How It Works

**Architecture:**
```
Server
├── / (main namespace)
│   ├── Middleware chain
│   ├── Connection handlers
│   └── Event handlers
├── /admin (custom namespace)
│   ├── Own middleware chain
│   ├── Own connection handlers
│   └── Own event handlers
└── /dynamic-* (dynamic namespaces via regex)
    └── Shared middleware from parent
```

### Code Example from Socket.io

```javascript
// Main namespace
io.on('connection', (socket) => {
  console.log('User connected to main namespace');
});

// Custom namespace with own middleware
const adminNamespace = io.of('/admin');

adminNamespace.use((socket, next) => {
  if (socket.handshake.auth.isAdmin) {
    next();
  } else {
    next(new Error('Admin access required'));
  }
});

adminNamespace.on('connection', (socket) => {
  console.log('Admin connected');

  socket.on('deleteUser', async (userId) => {
    // Admin-only operations
  });
});

// Dynamic namespaces with function-based creation
io.of((name, auth, next) => {
  // Create namespace on-demand based on business logic
  const match = name.match(/^\/tenant-(\w+)$/);
  if (match) {
    const tenantId = match[1];
    // Verify tenant exists
    next(null, true); // Create namespace
  } else {
    next(null, false); // Reject
  }
});
```

### Why It's Developer-Friendly

1. **Logical Isolation:** Different parts of the application don't interfere with each other
2. **Security Boundaries:** Apply different authentication rules per namespace
3. **Dynamic Creation:** Create namespaces on-demand for multi-tenant apps
4. **Middleware Inheritance:** Child namespaces inherit parent middleware
5. **Resource Management:** Automatically cleanup empty namespaces (v4.6.0+)

### Adaptation for Enzyme CLI

**Proposed Enhancement:**
```typescript
// Command namespaces for logical separation
export interface CommandNamespace {
  name: string;
  description: string;
  middleware: EnzymeMiddleware[];
  commands: Map<string, Command>;
  parent?: CommandNamespace;
}

export class NamespaceManager {
  private namespaces = new Map<string, CommandNamespace>();

  // Register namespace with middleware
  register(namespace: CommandNamespace) {
    this.namespaces.set(namespace.name, namespace);
  }

  // Execute command with namespace-specific middleware
  async executeCommand(
    namespaceName: string,
    commandName: string,
    context: CommandContext
  ) {
    const namespace = this.namespaces.get(namespaceName);
    if (!namespace) throw new Error(`Namespace ${namespaceName} not found`);

    // Build middleware chain: parent → namespace → command
    const middlewareChain = [
      ...(namespace.parent?.middleware || []),
      ...namespace.middleware
    ];

    // Execute middleware chain
    await this.executeMiddlewareChain(middlewareChain, context);

    // Execute command
    const command = namespace.commands.get(commandName);
    await command?.execute(context);
  }
}

// Usage in Enzyme
const generatorNamespace: CommandNamespace = {
  name: 'generate',
  description: 'Code generation commands',
  middleware: [
    projectValidationMiddleware,  // Ensure in valid project
    dependencyCheckMiddleware,     // Check required dependencies
    templateCacheMiddleware        // Warm template cache
  ],
  commands: new Map([
    ['component', componentCommand],
    ['page', pageCommand],
    ['hook', hookCommand]
  ])
};

const enterpriseNamespace: CommandNamespace = {
  name: 'enterprise',
  description: 'Enterprise-only features',
  middleware: [
    licenseValidationMiddleware,   // Check license
    telemetryMiddleware,           // Track usage
    complianceMiddleware           // Audit logging
  ],
  commands: new Map([
    ['audit', auditCommand],
    ['deploy', deployCommand]
  ])
};
```

**Benefits for Enzyme:**
- Separate free vs premium command pipelines
- Different validation rules for different command groups
- Multi-tenant project workspace support
- Plugin commands can register in their own namespaces
- Cleaner command organization

---

## 3. Connection/Disconnection Lifecycle Hooks

### Pattern Overview

Socket.io provides **rich lifecycle events** for managing connection state:
- `connection` - New client connected
- `disconnect` - Client disconnected (with reason)
- `disconnecting` - About to disconnect (access to rooms)
- `connect_error` - Connection failed

### How It Works

**Lifecycle Flow:**
```
Client Initiates → Middleware Chain → connection event → Active Socket → disconnecting event → disconnect event → Cleanup
                      ↓ (if error)
                   connect_error
```

### Code Example from Socket.io

```javascript
// Server-side lifecycle management
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Access connection metadata
  console.log('Handshake:', socket.handshake.auth);
  console.log('Transport:', socket.conn.transport.name);

  // Track active sockets
  activeConnections.set(socket.id, {
    connectedAt: Date.now(),
    user: socket.data.user
  });

  // Listen for disconnection (before cleanup)
  socket.on('disconnecting', (reason) => {
    console.log('Client disconnecting:', reason);

    // Access rooms before they're cleared
    const rooms = Array.from(socket.rooms);
    console.log('Was in rooms:', rooms);

    // Notify other room members
    rooms.forEach(room => {
      socket.to(room).emit('user-leaving', socket.data.user);
    });
  });

  // Listen for disconnection (after cleanup)
  socket.on('disconnect', (reason, details) => {
    console.log('Client disconnected:', reason);

    // Cleanup resources
    activeConnections.delete(socket.id);

    // Handle different disconnect reasons
    if (reason === 'transport error') {
      logNetworkIssue(details);
    } else if (reason === 'server namespace disconnect') {
      // Forced disconnect by server
      auditLog.write('forced-disconnect', socket.id);
    }
  });
});

// Connection error handling
io.engine.on('connection_error', (err) => {
  console.log('Connection failed:', err.code, err.message);

  // Track failed connection attempts
  metrics.increment('connection_errors', {
    code: err.code,
    message: err.message
  });
});
```

### Why It's Developer-Friendly

1. **Rich Context:** Access to disconnect reasons and additional details
2. **Cleanup Hooks:** `disconnecting` allows cleanup before resources are released
3. **Error Metadata:** Connection errors include request context
4. **Type Safety:** Disconnect reasons are typed enums
5. **Automatic Cleanup:** Rooms and event listeners auto-cleanup
6. **Monitoring Ready:** Built-in events for metrics collection

### Adaptation for Enzyme CLI

**Proposed Enhancement:**
```typescript
// CLI lifecycle hooks
export interface CLILifecycleHooks {
  // Command lifecycle
  beforeCommand?: (context: CommandContext) => Promise<void>;
  afterCommand?: (context: CommandContext, result: CommandResult) => Promise<void>;
  onCommandError?: (context: CommandContext, error: Error) => Promise<void>;

  // Plugin lifecycle
  onPluginLoad?: (plugin: Plugin) => Promise<void>;
  onPluginUnload?: (plugin: Plugin) => Promise<void>;
  onPluginError?: (plugin: Plugin, error: Error) => Promise<void>;

  // Generation lifecycle
  beforeGenerate?: (context: GenerationContext) => Promise<void>;
  afterGenerate?: (context: GenerationContext, result: GenerationResult) => Promise<void>;
  onGenerateError?: (context: GenerationContext, error: Error) => Promise<void>;

  // Session lifecycle
  onSessionStart?: (context: SessionContext) => Promise<void>;
  onSessionEnd?: (context: SessionContext, summary: SessionSummary) => Promise<void>;
}

// Enhanced command execution with lifecycle
export class CommandExecutor {
  private hooks: CLILifecycleHooks[] = [];

  async execute(command: Command, context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // Execute beforeCommand hooks
      await this.executeHooks('beforeCommand', context);

      // Execute command
      const result = await command.execute(context);

      // Add metadata
      result.duration = Date.now() - startTime;
      result.timestamp = new Date().toISOString();

      // Execute afterCommand hooks
      await this.executeHooks('afterCommand', context, result);

      return result;

    } catch (error) {
      // Execute error hooks
      await this.executeHooks('onCommandError', context, error);

      throw error;
    }
  }

  private async executeHooks<T extends keyof CLILifecycleHooks>(
    hookName: T,
    ...args: any[]
  ): Promise<void> {
    for (const hooks of this.hooks) {
      const hook = hooks[hookName];
      if (hook) {
        await (hook as any)(...args);
      }
    }
  }
}

// Usage in plugins
export const analyticsPlugin: Plugin = {
  name: 'analytics',
  version: '1.0.0',

  hooks: {
    async beforeCommand(context) {
      // Start tracking
      analytics.track('command-started', {
        command: context.command,
        user: context.user,
        timestamp: Date.now()
      });
    },

    async afterCommand(context, result) {
      // Track completion
      analytics.track('command-completed', {
        command: context.command,
        duration: result.duration,
        success: result.success,
        filesCreated: result.filesCreated?.length || 0
      });
    },

    async onCommandError(context, error) {
      // Track errors with context
      errorTracking.report(error, {
        command: context.command,
        args: context.args,
        config: context.config
      });
    }
  }
};
```

**Benefits for Enzyme:**
- Track command usage analytics
- Implement performance monitoring
- Error reporting with full context
- Resource cleanup (temp files, connections)
- Session replay for debugging
- Automatic telemetry collection

---

## 4. Authentication Middleware Patterns

### Pattern Overview

Socket.io provides **flexible authentication patterns** through:
- Handshake authentication via `socket.handshake.auth`
- Middleware-based validation
- Session integration with Express
- Custom `allowRequest` function for Engine.IO

### How It Works

**Authentication Flow:**
```
Client → Sends auth data → Server middleware validates → Accept/Reject → Socket created with user context
```

### Code Example from Socket.io

```javascript
// Client sends authentication
const socket = io({
  auth: {
    token: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    sessionId: "abc123"
  }
});

// Server middleware validates
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    // Verify JWT token
    const decoded = await verifyJWT(token);

    // Attach user to socket
    socket.data.user = decoded;
    socket.data.userId = decoded.id;

    // Join user-specific room
    socket.join(`user:${decoded.id}`);

    next(); // Allow connection

  } catch (error) {
    next(new Error("Authentication failed"));
  }
});

// Express session integration
import session from 'express-session';

const sessionMiddleware = session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
});

// Share session with Socket.io
io.engine.use(sessionMiddleware);

io.use((socket, next) => {
  const req = socket.request as any;

  // Access Express session
  if (req.session.userId) {
    socket.data.userId = req.session.userId;
    next();
  } else {
    next(new Error("Not authenticated"));
  }
});

// Low-level allowRequest hook
const io = new Server(httpServer, {
  allowRequest: async (req, callback) => {
    // Custom validation logic
    const isAllowed = await validateOrigin(req.headers.origin);
    callback(null, isAllowed);
  }
});
```

### Why It's Developer-Friendly

1. **Flexible Auth:** Support multiple auth methods (JWT, session, API key)
2. **Early Rejection:** Deny connection before socket creation
3. **Context Enrichment:** Attach user data to socket for later use
4. **Session Integration:** Seamless Express session sharing
5. **Type Safety:** Typed auth object and user data
6. **Error Messages:** Detailed error feedback to client

### Adaptation for Enzyme CLI

**Proposed Enhancement:**
```typescript
// Authentication middleware for enterprise features
export interface EnzymeAuth {
  // User authentication
  apiKey?: string;
  token?: string;

  // License validation
  licenseKey?: string;
  organization?: string;

  // Session info
  sessionId?: string;
  workspaceId?: string;
}

export interface AuthContext {
  user?: {
    id: string;
    email: string;
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
  };
  license?: {
    key: string;
    type: 'trial' | 'paid' | 'enterprise';
    expiresAt: Date;
    features: string[];
  };
  workspace?: {
    id: string;
    name: string;
    members: number;
  };
}

// Authentication middleware
export const authMiddleware: EnzymeMiddleware = {
  name: 'auth',
  priority: 5, // Run early

  async execute(context, next) {
    // Load auth from config file
    const auth = await loadAuth(context.config);

    if (!auth) {
      // Free tier - continue with limited features
      context.auth = { user: null };
      return next();
    }

    try {
      // Validate API key or token
      const authContext = await validateCredentials(auth);

      // Attach auth context to command context
      context.auth = authContext;

      // Check feature access
      if (context.command.requiresAuth && !authContext.user) {
        const error = new Error("Authentication required");
        error.code = 'AUTH_REQUIRED';
        error.data = {
          command: context.command.name,
          message: 'This feature requires authentication. Run: enzyme auth login'
        };
        return next(error);
      }

      // Check license for enterprise features
      if (context.command.requiresEnterprise && authContext.user?.plan !== 'enterprise') {
        const error = new Error("Enterprise license required");
        error.code = 'LICENSE_REQUIRED';
        error.data = {
          feature: context.command.name,
          currentPlan: authContext.user?.plan || 'free',
          upgradeUrl: 'https://enzyme.dev/pricing'
        };
        return next(error);
      }

      next();

    } catch (error) {
      error.data = {
        message: 'Authentication failed. Please run: enzyme auth login'
      };
      next(error);
    }
  }
};

// Usage in commands
export const deployCommand: Command = {
  name: 'deploy',
  description: 'Deploy application',
  requiresEnterprise: true, // Requires enterprise license

  async execute(context) {
    // Auth context is guaranteed to exist
    const { user, workspace } = context.auth!;

    context.logger.info(`Deploying as ${user.email} to ${workspace.name}`);

    // Enterprise-only features
    await deployWithCDN(context);
    await enableAutoScaling(context);
    await setupMonitoring(context);
  }
};

// License validation helper
async function validateCredentials(auth: EnzymeAuth): Promise<AuthContext> {
  // Verify with license server
  const response = await fetch('https://api.enzyme.dev/v1/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auth)
  });

  if (!response.ok) {
    throw new Error('License validation failed');
  }

  const data = await response.json();

  return {
    user: data.user,
    license: {
      key: auth.licenseKey!,
      type: data.license.type,
      expiresAt: new Date(data.license.expiresAt),
      features: data.license.features
    },
    workspace: data.workspace
  };
}
```

**Benefits for Enzyme:**
- Monetize premium features with license checks
- Multi-tenant workspace support
- API key management for CI/CD integration
- Feature flagging based on user plan
- Usage tracking per organization
- Secure credential storage

---

## 5. Room Management Hooks

### Pattern Overview

Socket.io **rooms** provide a powerful grouping mechanism for broadcast management:
- Dynamic room joining/leaving
- Automatic cleanup on disconnect
- Room-based broadcasting
- Server-only concept (no client awareness)

### How It Works

**Room Architecture:**
```
Socket A → joins room "project:123"
Socket B → joins room "project:123"  } Grouped for targeted broadcasts
Socket C → joins room "user:456"      } Separate room

io.to("project:123").emit() → Reaches Socket A and B only
```

### Code Example from Socket.io

```javascript
// Join rooms dynamically
io.on('connection', (socket) => {
  // Join room based on user context
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);

  // Join project-specific rooms
  socket.on('join-project', async (projectId) => {
    // Validate access
    const hasAccess = await checkProjectAccess(userId, projectId);

    if (hasAccess) {
      await socket.join(`project:${projectId}`);

      // Notify others in the room
      socket.to(`project:${projectId}`).emit('user-joined', {
        userId,
        userName: socket.data.user.name
      });
    }
  });

  // Leave room
  socket.on('leave-project', (projectId) => {
    socket.leave(`project:${projectId}`);

    // Notify others
    socket.to(`project:${projectId}`).emit('user-left', { userId });
  });

  // Broadcasting to room
  socket.on('project-update', (projectId, data) => {
    // Broadcast to all in room except sender
    socket.to(`project:${projectId}`).emit('project-updated', data);
  });

  // Access current rooms
  console.log('Socket rooms:', Array.from(socket.rooms));
  // Output: Set { 'socket-id-123', 'user:456', 'project:789' }

  // Disconnecting hook - access rooms before cleanup
  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('project:')) {
        socket.to(room).emit('user-disconnected', { userId });
      }
    });
  });
});

// Server-side room management
// Get all sockets in a room
const socketsInRoom = await io.in('project:123').fetchSockets();
console.log(`${socketsInRoom.length} users in project 123`);

// Make all sockets join a room
await io.in('department:engineering').socketsJoin('company-wide-room');

// Make sockets leave a room
await io.in('project:123').socketsLeave('project:123');

// Disconnect all sockets in a room
await io.in('project:123').disconnectSockets();
```

### Why It's Developer-Friendly

1. **Dynamic Grouping:** Create/join rooms on-the-fly based on business logic
2. **Automatic Cleanup:** Rooms cleaned up when empty
3. **Targeted Broadcasting:** Send messages to specific groups efficiently
4. **No Client Complexity:** Rooms are server-side only
5. **Chainable API:** Fluent interface for complex targeting
6. **Exclusion Support:** Broadcast to room except certain sockets

### Adaptation for Enzyme CLI

**Proposed Enhancement:**
```typescript
// Context grouping system for Enzyme
export interface ContextGroup {
  name: string;
  type: 'workspace' | 'project' | 'user' | 'session' | 'custom';
  members: Set<string>; // Context IDs
  metadata: Record<string, any>;
  createdAt: Date;
}

export class ContextGroupManager {
  private groups = new Map<string, ContextGroup>();
  private contextGroups = new Map<string, Set<string>>(); // contextId → groupNames

  // Join a group
  join(contextId: string, groupName: string, metadata?: Record<string, any>) {
    // Get or create group
    let group = this.groups.get(groupName);
    if (!group) {
      group = {
        name: groupName,
        type: this.inferType(groupName),
        members: new Set(),
        metadata: metadata || {},
        createdAt: new Date()
      };
      this.groups.set(groupName, group);
    }

    // Add context to group
    group.members.add(contextId);

    // Track groups for context
    if (!this.contextGroups.has(contextId)) {
      this.contextGroups.set(contextId, new Set());
    }
    this.contextGroups.get(contextId)!.add(groupName);
  }

  // Leave a group
  leave(contextId: string, groupName: string) {
    const group = this.groups.get(groupName);
    if (group) {
      group.members.delete(contextId);

      // Cleanup empty groups
      if (group.members.size === 0) {
        this.groups.delete(groupName);
      }
    }

    this.contextGroups.get(contextId)?.delete(groupName);
  }

  // Get all contexts in a group
  getMembers(groupName: string): string[] {
    const group = this.groups.get(groupName);
    return group ? Array.from(group.members) : [];
  }

  // Get all groups for a context
  getGroups(contextId: string): string[] {
    const groups = this.contextGroups.get(contextId);
    return groups ? Array.from(groups) : [];
  }

  // Broadcast hook execution to group
  async executeHookForGroup(
    groupName: string,
    hookName: string,
    ...args: any[]
  ) {
    const members = this.getMembers(groupName);

    // Execute hook for each member in parallel
    await Promise.all(
      members.map(contextId =>
        this.executeHookForContext(contextId, hookName, ...args)
      )
    );
  }

  private inferType(groupName: string): ContextGroup['type'] {
    if (groupName.startsWith('workspace:')) return 'workspace';
    if (groupName.startsWith('project:')) return 'project';
    if (groupName.startsWith('user:')) return 'user';
    if (groupName.startsWith('session:')) return 'session';
    return 'custom';
  }
}

// Usage in Enzyme CLI
export const workspacePlugin: Plugin = {
  name: 'workspace',
  version: '1.0.0',

  hooks: {
    async init(context) {
      const groupManager = new ContextGroupManager();
      context.groupManager = groupManager;

      // Auto-join groups based on context
      const projectId = context.config.projectId;
      const workspaceId = context.config.workspaceId;
      const userId = context.auth?.user?.id;

      if (projectId) {
        groupManager.join(context.id, `project:${projectId}`);
      }

      if (workspaceId) {
        groupManager.join(context.id, `workspace:${workspaceId}`);
      }

      if (userId) {
        groupManager.join(context.id, `user:${userId}`);
      }
    },

    async beforeGenerate(context) {
      // Notify all contexts in the same project
      const projectId = context.context.config.projectId;

      await context.groupManager.executeHookForGroup(
        `project:${projectId}`,
        'onProjectActivity',
        {
          type: 'generation-started',
          artifact: context.type,
          name: context.name,
          user: context.context.auth?.user?.email
        }
      );
    }
  }
};

// Multi-user collaboration plugin
export const collaborationPlugin: Plugin = {
  name: 'collaboration',
  version: '1.0.0',

  hooks: {
    async afterGenerate(context, result) {
      // Notify team members about new files
      const workspaceId = context.context.config.workspaceId;

      if (workspaceId && result.success) {
        await notifyWorkspaceMembers(workspaceId, {
          type: 'files-generated',
          user: context.context.auth?.user?.name,
          files: result.filesCreated,
          project: context.context.config.projectId
        });
      }
    }
  }
};

// Shared cache across project contexts
export const cachePlugin: Plugin = {
  name: 'cache',
  version: '1.0.0',

  hooks: {
    async beforeGenerate(context) {
      const projectId = context.context.config.projectId;
      const cacheKey = `project:${projectId}:templates`;

      // Check if other contexts in project have cached templates
      const members = context.groupManager.getMembers(`project:${projectId}`);

      for (const memberId of members) {
        const cachedTemplates = await getCacheForContext(memberId, cacheKey);
        if (cachedTemplates) {
          context.cachedTemplates = cachedTemplates;
          return;
        }
      }

      // Load and cache templates
      const templates = await loadTemplates(context);
      await setCacheForContext(context.id, cacheKey, templates);
    }
  }
};
```

**Benefits for Enzyme:**
- Multi-user workspace collaboration
- Shared cache across CLI instances
- Team notifications for file changes
- Project-wide hooks and events
- Resource pooling (template cache, dependency cache)
- Conflict detection across concurrent users

---

## 6. Event Acknowledgment Patterns

### Pattern Overview

Socket.io provides **bidirectional acknowledgments** for request-response patterns:
- Callback-based acknowledgments
- Timeout support (v4.4.0+)
- Error handling in acknowledgments
- Works in both directions (client→server, server→client)

### How It Works

**Acknowledgment Flow:**
```
Sender → emit(event, data, callback) → Receiver processes → Receiver calls callback(response) → Sender receives response
                                                    ↓ (timeout)
                                           callback(timeoutError)
```

### Code Example from Socket.io

```javascript
// Server-side with acknowledgment
io.on('connection', (socket) => {
  // Receive event with acknowledgment callback
  socket.on('update-item', async (itemId, updates, callback) => {
    try {
      // Perform async operation
      const result = await database.updateItem(itemId, updates);

      // Send success response
      callback({
        status: 'ok',
        data: result,
        timestamp: Date.now()
      });

    } catch (error) {
      // Send error response
      callback({
        status: 'error',
        message: error.message,
        code: error.code
      });
    }
  });

  // Server-initiated event with acknowledgment
  socket.emit('notification', { message: 'New message' }, (response) => {
    if (response.received) {
      console.log('Client confirmed receipt');
    }
  });

  // With timeout
  socket.timeout(5000).emit('ping', (err, response) => {
    if (err) {
      console.log('Client did not respond in 5 seconds');
    } else {
      console.log('Pong received:', response);
    }
  });
});

// Client-side
const socket = io();

// Send with acknowledgment
socket.emit('update-item', 123, { name: 'Updated' }, (response) => {
  if (response.status === 'ok') {
    console.log('Update successful:', response.data);
  } else {
    console.error('Update failed:', response.message);
  }
});

// Listen and acknowledge
socket.on('notification', (data, callback) => {
  console.log('Received:', data.message);

  // Acknowledge receipt
  callback({ received: true, timestamp: Date.now() });
});

// With timeout and error handling
socket.timeout(3000).emit('get-data', { id: 456 }, (err, response) => {
  if (err) {
    // Timeout occurred
    showError('Request timed out');
  } else if (response.error) {
    // Server returned error
    showError(response.error);
  } else {
    // Success
    displayData(response.data);
  }
});
```

### Why It's Developer-Friendly

1. **Request-Response Pattern:** Natural async/await-like flow
2. **Timeout Protection:** Prevent hanging requests
3. **Error Propagation:** Clean error handling in callbacks
4. **Type Safety:** TypeScript support for callback signatures
5. **Bidirectional:** Works both client→server and server→client
6. **No Boilerplate:** No need to manually track request IDs

### Adaptation for Enzyme CLI

**Proposed Enhancement:**
```typescript
// Hook acknowledgment system for Enzyme
export type HookCallback = (error: Error | null, result?: any) => void;

export interface PluginHooksWithAck {
  beforeGenerate?: (
    context: GenerationContext,
    callback: HookCallback
  ) => void | Promise<void>;

  afterGenerate?: (
    context: GenerationContext,
    result: GenerationResult,
    callback: HookCallback
  ) => void | Promise<void>;

  validate?: (
    context: GenerationContext,
    callback: (error: Error | null, result?: ValidationResult) => void
  ) => void | Promise<void>;
}

// Hook executor with acknowledgment and timeout
export class HookExecutor {
  async executeWithTimeout<T>(
    hook: Function,
    args: any[],
    timeout: number = 5000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      let acknowledged = false;

      // Callback for hook to acknowledge
      const callback = (error: Error | null, result?: T) => {
        if (acknowledged) return; // Prevent double acknowledgment
        acknowledged = true;

        clearTimeout(timeoutId);

        if (error) {
          reject(error);
        } else {
          resolve(result as T);
        }
      };

      // Set timeout
      timeoutId = setTimeout(() => {
        if (!acknowledged) {
          acknowledged = true;
          reject(new Error(`Hook timeout after ${timeout}ms`));
        }
      }, timeout);

      // Execute hook
      const argsWithCallback = [...args, callback];

      Promise.resolve(hook(...argsWithCallback))
        .then(() => {
          // If hook returns a promise and doesn't use callback, auto-acknowledge
          if (!acknowledged) {
            acknowledged = true;
            clearTimeout(timeoutId);
            resolve(undefined as T);
          }
        })
        .catch((error) => {
          if (!acknowledged) {
            acknowledged = true;
            clearTimeout(timeoutId);
            reject(error);
          }
        });
    });
  }
}

// Usage in Enzyme plugins
export const databasePlugin: Plugin = {
  name: 'database',
  version: '1.0.0',

  hooks: {
    // Async hook with acknowledgment
    async validate(context, callback) {
      try {
        // Perform async validation (e.g., check naming conflicts in DB)
        const exists = await checkNameConflict(context.name);

        if (exists) {
          callback(null, {
            valid: false,
            errors: [`Component "${context.name}" already exists in database`],
            warnings: []
          });
        } else {
          callback(null, {
            valid: true,
            errors: [],
            warnings: []
          });
        }
      } catch (error) {
        // Report error
        callback(error as Error);
      }
    },

    // Hook with timeout protection
    async beforeGenerate(context, callback) {
      // Long-running operation with manual acknowledgment
      const lockId = await acquireLock(context.name);

      try {
        await registerGeneration(context);

        // Success - acknowledge and pass data
        callback(null, { lockId });

      } catch (error) {
        await releaseLock(lockId);
        callback(error as Error);
      }
    }
  }
};

// Enhanced plugin manager
export class EnhancedPluginManager extends PluginManager {
  private hookExecutor = new HookExecutor();

  async executeHookWithAck<T>(
    hookName: string,
    args: any[],
    options: { timeout?: number } = {}
  ): Promise<T[]> {
    const plugins = this.getPlugins();
    const results: T[] = [];

    for (const plugin of plugins) {
      const hook = plugin.hooks[hookName];
      if (!hook) continue;

      try {
        const result = await this.hookExecutor.executeWithTimeout<T>(
          hook.bind(plugin),
          args,
          options.timeout || 5000
        );

        if (result !== undefined) {
          results.push(result);
        }

      } catch (error) {
        this.context?.logger.error(
          `Plugin ${plugin.name} hook ${hookName} failed: ${error.message}`
        );

        // Decide whether to continue or abort
        if (error.message.includes('timeout')) {
          this.context?.logger.warn(`Plugin ${plugin.name} timed out, skipping`);
        } else {
          throw error; // Abort on actual errors
        }
      }
    }

    return results;
  }

  // Execute validation hooks and collect results
  async validateWithAck(context: GenerationContext): Promise<ValidationResult> {
    const results = await this.executeHookWithAck<ValidationResult>(
      'validate',
      [context],
      { timeout: 10000 } // Longer timeout for validation
    );

    // Aggregate results
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const result of results) {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Command with acknowledgment
export const generateCommand: Command = {
  name: 'generate',

  async execute(context) {
    context.logger.info('Validating with plugins...');

    // Execute validation with timeout
    const validation = await context.pluginManager.validateWithAck(
      generationContext
    );

    if (!validation.valid) {
      context.logger.error('Validation failed:');
      validation.errors.forEach(err => context.logger.error(`  - ${err}`));
      throw new Error('Validation failed');
    }

    if (validation.warnings.length > 0) {
      context.logger.warn('Validation warnings:');
      validation.warnings.forEach(warn => context.logger.warn(`  - ${warn}`));
    }

    // Continue with generation...
  }
};
```

**Benefits for Enzyme:**
- Timeout protection for slow plugins
- Better error handling with callback pattern
- Plugin can signal partial success/failure
- Async validation with results
- Prevent CLI hanging on buggy plugins
- Collect structured responses from hooks

---

## 7. Error Handling Middleware

### Pattern Overview

Socket.io has **comprehensive error handling** at multiple levels:
- Middleware errors stop connection
- `connect_error` event on client
- `connection_error` event on server
- Typed error codes for common issues
- Error context with additional data

### How It Works

**Error Flow:**
```
Middleware → Error detected → next(error) → Connection refused → Client receives connect_error
                                                                        ↓
                                                            Can retry with backoff
```

### Code Example from Socket.io

```javascript
// Server-side error handling
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    const err = new Error("Authentication required");
    err.data = {
      code: 'AUTH_REQUIRED',
      message: 'Please provide authentication token',
      retryable: true
    };
    return next(err);
  }

  try {
    const user = verifyToken(token);
    socket.data.user = user;
    next();
  } catch (error) {
    const err = new Error("Invalid token");
    err.data = {
      code: 'INVALID_TOKEN',
      message: 'Token verification failed',
      retryable: false
    };
    next(err);
  }
});

// Engine.IO connection error event
io.engine.on('connection_error', (err) => {
  console.error('Connection error:', {
    code: err.code,
    message: err.message,
    context: err.context,
    req: {
      headers: err.req.headers,
      url: err.req.url
    }
  });

  // Handle specific error codes
  switch (err.code) {
    case 1: // Session ID unknown
      metrics.increment('sticky_session_failures');
      break;
    case 3: // Bad request
      metrics.increment('malformed_requests');
      logSecurityEvent(err);
      break;
    case 4: // Forbidden
      metrics.increment('unauthorized_attempts');
      break;
    case 5: // Unsupported protocol version
      metrics.increment('version_mismatches');
      break;
  }
});

// Client-side error handling
const socket = io({
  auth: { token: localStorage.getItem('token') }
});

socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);

  // Access additional error data
  if (err.data) {
    console.log('Error code:', err.data.code);
    console.log('Details:', err.data.message);

    // Handle retryable errors
    if (err.data.retryable) {
      // Refresh token and retry
      refreshAuthToken().then(newToken => {
        socket.auth = { token: newToken };
        socket.connect();
      });
    } else {
      // Redirect to login
      redirectToLogin();
    }
  }
});

// Socket-level error handling
socket.use(([event, ...args], next) => {
  try {
    // Validate event data
    const schema = eventSchemas[event];
    if (schema) {
      schema.parse(args[0]);
    }
    next();
  } catch (error) {
    // Send error back to sender
    const err = new Error("Invalid event data");
    err.data = {
      event,
      validation: error.errors
    };
    next(err);
  }
});
```

### Why It's Developer-Friendly

1. **Rich Error Context:** Errors carry additional metadata
2. **Error Codes:** Standardized codes for common issues
3. **Retryability Hints:** Client knows if retry makes sense
4. **No Silent Failures:** All errors surfaced to client
5. **Monitoring Ready:** Error events for metrics/logging
6. **Granular Control:** Different error handling at each layer

### Adaptation for Enzyme CLI

**Proposed Enhancement:**
```typescript
// Enhanced error system for Enzyme
export enum EnzymeErrorCode {
  // Authentication errors (1xxx)
  AUTH_REQUIRED = 1001,
  INVALID_TOKEN = 1002,
  LICENSE_EXPIRED = 1003,
  INSUFFICIENT_PERMISSIONS = 1004,

  // Validation errors (2xxx)
  INVALID_PROJECT_STRUCTURE = 2001,
  NAMING_CONFLICT = 2002,
  MISSING_DEPENDENCIES = 2003,
  INVALID_CONFIGURATION = 2004,

  // Plugin errors (3xxx)
  PLUGIN_LOAD_FAILED = 3001,
  PLUGIN_TIMEOUT = 3002,
  PLUGIN_VALIDATION_FAILED = 3003,

  // File system errors (4xxx)
  FILE_EXISTS = 4001,
  PERMISSION_DENIED = 4002,
  DISK_FULL = 4003,
  INVALID_PATH = 4004,

  // Network errors (5xxx)
  API_UNAVAILABLE = 5001,
  NETWORK_TIMEOUT = 5002,
  RATE_LIMITED = 5003,
}

export interface EnzymeErrorData {
  code: EnzymeErrorCode;
  message: string;
  retryable: boolean;
  severity: 'fatal' | 'error' | 'warning' | 'info';
  context?: Record<string, any>;
  suggestions?: string[];
  documentationUrl?: string;
}

export class EnzymeError extends Error {
  public readonly code: EnzymeErrorCode;
  public readonly data: EnzymeErrorData;

  constructor(code: EnzymeErrorCode, message: string, data?: Partial<EnzymeErrorData>) {
    super(message);
    this.name = 'EnzymeError';
    this.code = code;
    this.data = {
      code,
      message,
      retryable: false,
      severity: 'error',
      ...data
    };
  }

  isRetryable(): boolean {
    return this.data.retryable;
  }

  isFatal(): boolean {
    return this.data.severity === 'fatal';
  }
}

// Error handling middleware
export const errorHandlingMiddleware: EnzymeMiddleware = {
  name: 'error-handler',
  priority: 1, // Run first

  async execute(context, next) {
    try {
      await next();
    } catch (error) {
      // Convert to EnzymeError if needed
      const enzymeError = error instanceof EnzymeError
        ? error
        : new EnzymeError(
            EnzymeErrorCode.PLUGIN_VALIDATION_FAILED,
            error.message,
            { context: { originalError: error } }
          );

      // Log error with context
      context.logger.error(`Error: ${enzymeError.message}`);

      if (enzymeError.data.context) {
        context.logger.debug('Error context:', enzymeError.data.context);
      }

      // Show suggestions
      if (enzymeError.data.suggestions && enzymeError.data.suggestions.length > 0) {
        context.logger.info('\nSuggestions:');
        enzymeError.data.suggestions.forEach((suggestion, i) => {
          context.logger.info(`  ${i + 1}. ${suggestion}`);
        });
      }

      // Show documentation link
      if (enzymeError.data.documentationUrl) {
        context.logger.info(`\nLearn more: ${enzymeError.data.documentationUrl}`);
      }

      // Report to error tracking service
      if (context.config.errorReporting?.enabled) {
        await reportError(enzymeError, context);
      }

      // Exit with appropriate code
      process.exit(enzymeError.isFatal() ? 1 : 0);
    }
  }
};

// Usage in plugins
export const validationPlugin: Plugin = {
  name: 'validation',
  version: '1.0.0',

  hooks: {
    async validate(context) {
      // Check naming conflicts
      const exists = await fileExists(context.outputDir, context.name);

      if (exists) {
        throw new EnzymeError(
          EnzymeErrorCode.NAMING_CONFLICT,
          `Component "${context.name}" already exists`,
          {
            retryable: true,
            severity: 'error',
            context: {
              existingFile: path.join(context.outputDir, context.name),
              type: context.type
            },
            suggestions: [
              `Use a different name for your ${context.type}`,
              'Use --force flag to overwrite existing files',
              `Run "enzyme remove ${context.type} ${context.name}" first`
            ],
            documentationUrl: 'https://enzyme.dev/docs/naming-conflicts'
          }
        );
      }

      return { valid: true, errors: [], warnings: [] };
    }
  }
};

// Error recovery in command execution
export class CommandExecutor {
  async executeWithRetry(
    command: Command,
    context: CommandContext,
    maxRetries: number = 3
  ): Promise<CommandResult> {
    let attempt = 0;
    let lastError: EnzymeError | null = null;

    while (attempt < maxRetries) {
      try {
        return await command.execute(context);

      } catch (error) {
        lastError = error instanceof EnzymeError
          ? error
          : new EnzymeError(
              EnzymeErrorCode.PLUGIN_VALIDATION_FAILED,
              error.message
            );

        // Only retry if error is retryable
        if (!lastError.isRetryable()) {
          throw lastError;
        }

        attempt++;

        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          context.logger.warn(
            `Command failed, retrying in ${backoff}ms... (attempt ${attempt}/${maxRetries})`
          );
          await sleep(backoff);
        }
      }
    }

    throw lastError;
  }
}

// Error reporting service
async function reportError(error: EnzymeError, context: CommandContext) {
  try {
    await fetch('https://api.enzyme.dev/v1/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.auth?.token}`
      },
      body: JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          data: error.data,
          stack: error.stack
        },
        context: {
          command: context.command,
          version: context.version,
          nodeVersion: process.version,
          platform: process.platform,
          config: context.config
        },
        timestamp: new Date().toISOString()
      })
    });
  } catch {
    // Silent failure - don't interrupt user experience
  }
}
```

**Benefits for Enzyme:**
- Structured error handling across all plugins
- User-friendly error messages with suggestions
- Automatic retry for transient errors
- Error tracking and monitoring
- Standardized error codes for debugging
- Documentation links for self-service
- Graceful degradation on non-fatal errors

---

## 8. Adapter Hooks (for Custom Adapters)

### Pattern Overview

Socket.io **adapters** are responsible for broadcasting events across sockets. The adapter system provides:
- Swappable broadcast backend (memory, Redis, MongoDB, etc.)
- Adapter lifecycle events
- Custom adapter implementation hooks
- Cross-server communication in clusters

### How It Works

**Adapter Architecture:**
```
io.emit() → Adapter.broadcast() → Redis/MongoDB/Memory → Other servers → Target sockets
                                          ↓
                                    Lifecycle events:
                                    - create-room
                                    - delete-room
                                    - join-room
                                    - leave-room
```

### Code Example from Socket.io

```javascript
// Adapter lifecycle events
io.of('/').adapter.on('create-room', (room) => {
  console.log(`Room ${room} was created`);

  // Track room creation
  metrics.increment('rooms.created', { room });
});

io.of('/').adapter.on('delete-room', (room) => {
  console.log(`Room ${room} was deleted`);

  // Cleanup room-specific resources
  cleanupRoomResources(room);
  metrics.increment('rooms.deleted', { room });
});

io.of('/').adapter.on('join-room', (room, id) => {
  console.log(`Socket ${id} joined room ${room}`);

  // Track room membership
  metrics.gauge('room.members', getRoomSize(room), { room });
});

io.of('/').adapter.on('leave-room', (room, id) => {
  console.log(`Socket ${id} left room ${room}`);

  // Update membership count
  metrics.gauge('room.members', getRoomSize(room), { room });
});

// Custom adapter implementation
import { Adapter } from 'socket.io-adapter';

class CustomAdapter extends Adapter {
  constructor(nsp) {
    super(nsp);
    // Initialize custom backend
    this.redis = createRedisClient();
  }

  // Override broadcast method
  async broadcast(packet, opts) {
    const rooms = opts.rooms;
    const except = opts.except;
    const flags = opts.flags;

    // Custom broadcast logic
    if (flags.local) {
      // Only local broadcast
      super.broadcast(packet, opts);
    } else {
      // Publish to Redis for cross-server broadcast
      await this.redis.publish('socket.io', JSON.stringify({
        packet,
        rooms: Array.from(rooms),
        except: Array.from(except)
      }));
    }
  }

  // Override addAll - called when socket joins a room
  addAll(id, rooms) {
    super.addAll(id, rooms);

    // Notify other servers
    rooms.forEach(room => {
      this.redis.publish('socket.io#join', JSON.stringify({
        id,
        room
      }));
    });
  }

  // Override del - called when socket leaves a room
  del(id, room) {
    super.del(id, room);

    // Notify other servers
    this.redis.publish('socket.io#leave', JSON.stringify({
      id,
      room
    }));
  }

  // Subscribe to events from other servers
  async init() {
    this.redis.subscribe('socket.io');

    this.redis.on('message', (channel, message) => {
      const data = JSON.parse(message);

      if (channel === 'socket.io') {
        // Broadcast to local sockets
        super.broadcast(data.packet, {
          rooms: new Set(data.rooms),
          except: new Set(data.except)
        });
      }
    });
  }
}

// Use custom adapter
io.adapter((nsp) => new CustomAdapter(nsp));

// Server-to-server events via adapter
io.serverSideEmit('worker-ready', { workerId: process.pid });

io.on('worker-ready', (data) => {
  console.log(`Worker ${data.workerId} is ready`);
});
```

### Why It's Developer-Friendly

1. **Pluggable Architecture:** Swap broadcast mechanism without code changes
2. **Lifecycle Hooks:** Monitor room operations for metrics
3. **Horizontal Scaling:** Built-in multi-server support
4. **Type Safety:** Abstract class with typed methods
5. **Official Adapters:** 8+ production-ready implementations
6. **Custom Extensions:** Easy to implement domain-specific logic

### Adaptation for Enzyme CLI

**Proposed Enhancement:**
```typescript
// Storage adapter system for Enzyme
export abstract class StorageAdapter {
  abstract name: string;
  abstract version: string;

  // Lifecycle methods
  abstract init(context: CommandContext): Promise<void>;
  abstract close(): Promise<void>;

  // CRUD operations
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract has(key: string): Promise<boolean>;
  abstract keys(pattern?: string): Promise<string[]>;

  // Cache operations
  abstract getCached<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T>;

  // Bulk operations
  abstract getMany<T>(keys: string[]): Promise<Map<string, T>>;
  abstract setMany<T>(entries: Map<string, T>, ttl?: number): Promise<void>;
  abstract deleteMany(keys: string[]): Promise<void>;

  // Events
  protected emit(event: string, data: any): void {
    // Implemented by subclass
  }
}

// In-memory adapter (default)
export class MemoryStorageAdapter extends StorageAdapter {
  name = 'memory';
  version = '1.0.0';

  private cache = new Map<string, { value: any; expiresAt?: number }>();
  private events = new EventEmitter();

  async init(context: CommandContext): Promise<void> {
    context.logger.debug('Memory storage adapter initialized');
  }

  async close(): Promise<void> {
    this.cache.clear();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.emit('expired', { key });
      return null;
    }

    this.emit('get', { key });
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: any = { value };

    if (ttl) {
      entry.expiresAt = Date.now() + ttl;
    }

    this.cache.set(key, entry);
    this.emit('set', { key, ttl });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.emit('delete', { key });
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key) && (await this.get(key)) !== null;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());

    if (!pattern) return allKeys;

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  async getCached<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Cache it
    await this.set(key, value, ttl);

    return value;
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  async setMany<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(key);
    }
  }

  protected emit(event: string, data: any): void {
    this.events.emit(event, data);
  }

  // Subscribe to events
  on(event: string, handler: (data: any) => void): void {
    this.events.on(event, handler);
  }
}

// Redis adapter for distributed CLI usage
export class RedisStorageAdapter extends StorageAdapter {
  name = 'redis';
  version = '1.0.0';

  private redis!: Redis;
  private events = new EventEmitter();

  async init(context: CommandContext): Promise<void> {
    this.redis = new Redis(context.config.redis);
    context.logger.info('Redis storage adapter connected');
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (ttl) {
      await this.redis.setex(key, Math.ceil(ttl / 1000), serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async getCached<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600000
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  // ... other methods
}

// Usage in Enzyme
export class EnzymeContext {
  private storageAdapter: StorageAdapter;

  async init(config: EnzymeConfig) {
    // Choose adapter based on config
    if (config.storage?.adapter === 'redis') {
      this.storageAdapter = new RedisStorageAdapter();
    } else {
      this.storageAdapter = new MemoryStorageAdapter();
    }

    await this.storageAdapter.init(this as any);

    // Subscribe to events
    this.storageAdapter.on('set', (data) => {
      this.logger.debug(`Cache set: ${data.key}`);
    });
  }

  // Template caching
  async getTemplate(name: string): Promise<string> {
    return this.storageAdapter.getCached(
      `template:${name}`,
      async () => {
        return await loadTemplateFromDisk(name);
      },
      3600000 // 1 hour TTL
    );
  }

  // Dependency resolution caching
  async resolveDependencies(packageJson: any): Promise<DependencyTree> {
    const cacheKey = `deps:${hashObject(packageJson.dependencies)}`;

    return this.storageAdapter.getCached(
      cacheKey,
      async () => {
        return await resolveNpmDependencies(packageJson);
      },
      86400000 // 24 hour TTL
    );
  }
}

// Plugin using adapter events
export const cacheMonitorPlugin: Plugin = {
  name: 'cache-monitor',
  version: '1.0.0',

  hooks: {
    async init(context) {
      // Monitor cache operations
      context.storageAdapter.on('get', ({ key }) => {
        context.metrics.increment('cache.get', { key });
      });

      context.storageAdapter.on('set', ({ key }) => {
        context.metrics.increment('cache.set', { key });
      });

      context.storageAdapter.on('expired', ({ key }) => {
        context.logger.debug(`Cache expired: ${key}`);
        context.metrics.increment('cache.expired', { key });
      });
    }
  }
};
```

**Benefits for Enzyme:**
- Shared cache across team members (via Redis)
- Template caching for faster generation
- Dependency resolution caching
- Session state persistence
- Distributed rate limiting
- Metrics and monitoring hooks

---

## 9. Server Instance Hooks

### Pattern Overview

Socket.io provides **server-level hooks** for managing the entire server lifecycle and operations:
- `connection` event for new clients
- `serverSideEmit` for inter-server communication
- Utility methods for bulk socket operations
- Engine.IO events for low-level control

### How It Works

**Server Instance Architecture:**
```
Server Instance
├── Namespaces
│   └── Sockets
├── Engine.IO server
│   ├── HTTP requests
│   ├── WebSocket upgrades
│   └── Connection errors
└── Adapter (broadcast backend)
```

### Code Example from Socket.io

```javascript
// Server initialization hooks
const io = new Server(httpServer, {
  // Initialization options
  cors: { origin: '*' },
  connectTimeout: 45000
});

// Main connection event
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
});

// Server-to-server communication (in cluster)
io.serverSideEmit('server-started', {
  serverId: process.pid,
  timestamp: Date.now()
});

io.on('server-started', (data, callback) => {
  console.log(`Server ${data.serverId} started`);

  // Acknowledge receipt
  if (callback) {
    callback({ received: true });
  }
});

// Bulk socket operations
// Get all connected sockets
const sockets = await io.fetchSockets();
console.log(`${sockets.length} sockets connected`);

sockets.forEach(socket => {
  console.log({
    id: socket.id,
    rooms: Array.from(socket.rooms),
    data: socket.data,
    handshake: socket.handshake
  });
});

// Make all sockets join a room
await io.socketsJoin('maintenance-mode');

// Broadcast to all sockets
io.emit('server-announcement', {
  message: 'Server maintenance in 5 minutes'
});

// Disconnect all sockets
await io.disconnectSockets();

// Engine.IO hooks
io.engine.on('initial_headers', (headers, req) => {
  // Customize response headers
  headers['X-Server-Id'] = process.pid;
  headers['X-Powered-By'] = 'Socket.io';
});

io.engine.on('headers', (headers, req) => {
  // Set headers for each HTTP request
  headers['X-Request-Id'] = generateRequestId();
});

io.engine.on('connection_error', (err) => {
  console.error('Connection error:', {
    code: err.code,
    message: err.message,
    context: err.context
  });
});

// Custom session ID generation
io.engine.generateId = (req) => {
  // Generate custom socket ID
  return `${Date.now()}-${randomBytes(16).toString('hex')}`;
};

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    io.fetchSockets().then(sockets => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        connections: sockets.length,
        uptime: process.uptime()
      }));
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Stop accepting new connections
  io.disconnectSockets(true);

  // Wait for existing connections to close
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Close server
  io.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

### Why It's Developer-Friendly

1. **Bulk Operations:** Manage all sockets at once
2. **Server Communication:** Built-in pub/sub between servers
3. **Graceful Shutdown:** Clean disconnect of all clients
4. **Health Checks:** Easy to implement monitoring endpoints
5. **Custom Headers:** Full control over HTTP responses
6. **Session Management:** Custom ID generation

### Adaptation for Enzyme CLI

**Proposed Enhancement:**
```typescript
// CLI instance management
export class EnzymeInstance {
  private static instances = new Map<string, EnzymeInstance>();
  private instanceId: string;
  private startTime: Date;
  private context: CommandContext;

  constructor(context: CommandContext) {
    this.instanceId = generateInstanceId();
    this.startTime = new Date();
    this.context = context;

    // Register instance
    EnzymeInstance.instances.set(this.instanceId, this);

    // Announce to other instances (if using shared storage)
    this.announceInstance();
  }

  // Announce this CLI instance to others
  private async announceInstance() {
    if (!this.context.storageAdapter) return;

    await this.context.storageAdapter.set(
      `instance:${this.instanceId}`,
      {
        instanceId: this.instanceId,
        pid: process.pid,
        user: this.context.auth?.user,
        project: this.context.config.projectId,
        startTime: this.startTime.toISOString(),
        version: this.context.version
      },
      300000 // 5 minute TTL
    );

    // Heartbeat every minute
    setInterval(async () => {
      await this.heartbeat();
    }, 60000);
  }

  // Send heartbeat
  private async heartbeat() {
    await this.context.storageAdapter?.set(
      `instance:${this.instanceId}:heartbeat`,
      {
        timestamp: new Date().toISOString(),
        activeCommand: this.context.currentCommand
      },
      120000 // 2 minute TTL
    );
  }

  // Get all active instances
  static async getActiveInstances(
    storage: StorageAdapter
  ): Promise<InstanceInfo[]> {
    const keys = await storage.keys('instance:*');
    const instances: InstanceInfo[] = [];

    for (const key of keys) {
      if (key.includes(':heartbeat')) continue;

      const info = await storage.get<InstanceInfo>(key);
      if (info) instances.push(info);
    }

    return instances;
  }

  // Broadcast event to all instances
  async broadcastToInstances(event: string, data: any) {
    if (!this.context.storageAdapter) return;

    // Publish event
    await this.context.storageAdapter.set(
      `event:${event}:${Date.now()}`,
      {
        event,
        data,
        sourceInstance: this.instanceId,
        timestamp: new Date().toISOString()
      },
      5000 // 5 second TTL
    );
  }

  // Execute command on all instances
  async executeOnAllInstances(
    command: string,
    args: any[]
  ): Promise<void> {
    await this.broadcastToInstances('execute-command', {
      command,
      args
    });
  }

  // Graceful shutdown
  async shutdown() {
    this.context.logger.info('Shutting down gracefully...');

    // Cleanup plugins
    await this.context.pluginManager.clear();

    // Close storage adapter
    await this.context.storageAdapter?.close();

    // Remove instance registration
    await this.context.storageAdapter?.delete(`instance:${this.instanceId}`);

    // Remove from local registry
    EnzymeInstance.instances.delete(this.instanceId);

    this.context.logger.success('Shutdown complete');
  }

  // Get instance metrics
  async getMetrics(): Promise<InstanceMetrics> {
    return {
      instanceId: this.instanceId,
      uptime: Date.now() - this.startTime.getTime(),
      commandsExecuted: this.context.metrics.get('commands.executed'),
      filesGenerated: this.context.metrics.get('files.generated'),
      cacheHits: this.context.metrics.get('cache.hits'),
      cacheMisses: this.context.metrics.get('cache.misses'),
      errors: this.context.metrics.get('errors')
    };
  }
}

// Global CLI operations
export class EnzymeGlobalOperations {
  static async getAllInstances(
    storage: StorageAdapter
  ): Promise<InstanceInfo[]> {
    return EnzymeInstance.getActiveInstances(storage);
  }

  // Broadcast message to all CLI instances
  static async broadcastMessage(
    storage: StorageAdapter,
    message: string
  ): Promise<void> {
    await storage.set(
      `broadcast:${Date.now()}`,
      {
        type: 'message',
        message,
        timestamp: new Date().toISOString()
      },
      10000 // 10 second TTL
    );
  }

  // Kill all CLI instances (force)
  static async killAllInstances(
    storage: StorageAdapter
  ): Promise<void> {
    const instances = await this.getAllInstances(storage);

    for (const instance of instances) {
      // Signal instance to shut down
      await storage.set(
        `instance:${instance.instanceId}:shutdown`,
        { force: true },
        30000
      );
    }
  }

  // Get aggregate metrics across all instances
  static async getGlobalMetrics(
    storage: StorageAdapter
  ): Promise<GlobalMetrics> {
    const instances = await this.getAllInstances(storage);
    const metrics = await Promise.all(
      instances.map(async (inst) => {
        return storage.get<InstanceMetrics>(
          `instance:${inst.instanceId}:metrics`
        );
      })
    );

    return {
      totalInstances: instances.length,
      totalCommandsExecuted: metrics.reduce(
        (sum, m) => sum + (m?.commandsExecuted || 0),
        0
      ),
      totalFilesGenerated: metrics.reduce(
        (sum, m) => sum + (m?.filesGenerated || 0),
        0
      ),
      aggregatedAt: new Date().toISOString()
    };
  }
}

// Health check command
export const healthCommand: Command = {
  name: 'health',
  description: 'Check CLI health and active instances',

  async execute(context) {
    const instances = await EnzymeGlobalOperations.getAllInstances(
      context.storageAdapter
    );

    context.logger.header('Enzyme CLI Health Check');
    context.logger.newLine();

    context.logger.info(`Active instances: ${instances.length}`);
    context.logger.newLine();

    if (instances.length > 0) {
      context.logger.info('Instance Details:');
      context.logger.table(
        instances.map(inst => ({
          'Instance ID': inst.instanceId.substring(0, 8),
          'PID': inst.pid,
          'User': inst.user?.email || 'Unknown',
          'Project': inst.project || 'N/A',
          'Uptime': formatDuration(Date.now() - new Date(inst.startTime).getTime()),
          'Version': inst.version
        }))
      );
    }

    // Show global metrics
    const metrics = await EnzymeGlobalOperations.getGlobalMetrics(
      context.storageAdapter
    );

    context.logger.newLine();
    context.logger.info('Global Metrics:');
    context.logger.info(`  Commands executed: ${metrics.totalCommandsExecuted}`);
    context.logger.info(`  Files generated: ${metrics.totalFilesGenerated}`);
  }
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  const instance = EnzymeInstance.current;
  if (instance) {
    await instance.shutdown();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  const instance = EnzymeInstance.current;
  if (instance) {
    await instance.shutdown();
  }
  process.exit(0);
});
```

**Benefits for Enzyme:**
- Multi-instance coordination in teams
- Global health checks and monitoring
- Shared caching across instances
- Broadcast notifications to all CLI users
- Instance metrics aggregation
- Graceful shutdown handling
- Conflict detection when multiple users work simultaneously

---

## 10. Broadcast Interception

### Pattern Overview

Socket.io provides **catch-all listeners** for intercepting and monitoring events:
- `onAny()` - Intercept all incoming events
- `onAnyOutgoing()` - Intercept all outgoing events
- `prependAny()` - Priority interception
- Event-driven debugging and logging

### How It Works

**Interception Flow:**
```
Incoming: Remote → socket.onAny() → socket.on(event) → Handler
Outgoing: socket.emit() → socket.onAnyOutgoing() → Transport
```

### Code Example from Socket.io

```javascript
// Intercept all incoming events
socket.onAny((eventName, ...args) => {
  console.log('[INCOMING]', eventName, args);

  // Log to monitoring system
  logger.info({
    type: 'incoming-event',
    event: eventName,
    socketId: socket.id,
    userId: socket.data.userId,
    args: args,
    timestamp: Date.now()
  });

  // Track metrics
  metrics.increment('events.incoming', {
    event: eventName,
    userId: socket.data.userId
  });
});

// Intercept all outgoing events
socket.onAnyOutgoing((eventName, ...args) => {
  console.log('[OUTGOING]', eventName, args);

  // Log outgoing events
  logger.info({
    type: 'outgoing-event',
    event: eventName,
    socketId: socket.id,
    args: args,
    timestamp: Date.now()
  });
});

// Priority interception (runs before other listeners)
socket.prependAny((eventName, ...args) => {
  // Validate all events before processing
  if (!isValidEventName(eventName)) {
    console.warn('Invalid event name:', eventName);
    // Could throw error to prevent processing
  }
});

// Remove specific listener
const listener = (eventName, ...args) => {
  console.log('Event:', eventName);
};

socket.onAny(listener);
// ... later
socket.offAny(listener);

// Remove all catch-all listeners
socket.offAny();

// Use case: Rate limiting
const eventCounts = new Map();

socket.onAny((eventName) => {
  const key = `${socket.id}:${eventName}`;
  const count = eventCounts.get(key) || 0;

  if (count > 100) {
    socket.disconnect(true);
    console.log('Rate limit exceeded');
    return;
  }

  eventCounts.set(key, count + 1);

  // Reset counter after 1 minute
  setTimeout(() => {
    eventCounts.delete(key);
  }, 60000);
});

// Use case: Event replay for debugging
const eventHistory: any[] = [];

socket.onAny((eventName, ...args) => {
  eventHistory.push({
    type: 'incoming',
    event: eventName,
    args,
    timestamp: Date.now()
  });
});

socket.onAnyOutgoing((eventName, ...args) => {
  eventHistory.push({
    type: 'outgoing',
    event: eventName,
    args,
    timestamp: Date.now()
  });
});

// Replay events for debugging
function replayEvents() {
  console.log('Event history:');
  eventHistory.forEach((entry, i) => {
    console.log(`${i}. [${entry.type}] ${entry.event}`, entry.args);
  });
}

// Use case: Event transformation
socket.prependAny((eventName, ...args) => {
  // Transform legacy event names to new format
  if (eventName === 'update-user') {
    // Change event name
    eventName = 'user:update';
  }

  // Could modify args as well
});
```

### Why It's Developer-Friendly

1. **Global Monitoring:** Single place to monitor all events
2. **Debugging:** Log all communication for troubleshooting
3. **Metrics:** Easy to track event volume and patterns
4. **Rate Limiting:** Implement per-event or global rate limits
5. **Event Replay:** Record and replay events for debugging
6. **Validation:** Validate all events in one place
7. **No Event Registration:** Works for all events automatically

### Adaptation for Enzyme CLI

**Proposed Enhancement:**
```typescript
// Hook interception system for Enzyme
export interface HookInterceptor {
  name: string;
  priority: number;

  // Intercept before hook execution
  beforeHook?: (
    hookName: string,
    plugin: Plugin,
    args: any[]
  ) => Promise<void> | void;

  // Intercept after hook execution
  afterHook?: (
    hookName: string,
    plugin: Plugin,
    args: any[],
    result: any,
    duration: number
  ) => Promise<void> | void;

  // Intercept hook errors
  onHookError?: (
    hookName: string,
    plugin: Plugin,
    args: any[],
    error: Error
  ) => Promise<void> | void;
}

export class InterceptorManager {
  private interceptors: HookInterceptor[] = [];

  // Register interceptor
  register(interceptor: HookInterceptor) {
    this.interceptors.push(interceptor);
    this.interceptors.sort((a, b) => a.priority - b.priority);
  }

  // Execute hook with interception
  async executeHook(
    hookName: string,
    plugin: Plugin,
    args: any[]
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Execute beforeHook interceptors
      for (const interceptor of this.interceptors) {
        if (interceptor.beforeHook) {
          await interceptor.beforeHook(hookName, plugin, args);
        }
      }

      // Execute actual hook
      const hook = plugin.hooks[hookName];
      const result = hook ? await hook(...args) : undefined;

      const duration = Date.now() - startTime;

      // Execute afterHook interceptors
      for (const interceptor of this.interceptors) {
        if (interceptor.afterHook) {
          await interceptor.afterHook(hookName, plugin, args, result, duration);
        }
      }

      return result;

    } catch (error) {
      // Execute onHookError interceptors
      for (const interceptor of this.interceptors) {
        if (interceptor.onHookError) {
          await interceptor.onHookError(hookName, plugin, args, error as Error);
        }
      }

      throw error;
    }
  }
}

// Logging interceptor
export const loggingInterceptor: HookInterceptor = {
  name: 'logging',
  priority: 10,

  beforeHook(hookName, plugin, args) {
    console.log(`[HOOK] ${plugin.name}.${hookName} started`);
  },

  afterHook(hookName, plugin, args, result, duration) {
    console.log(`[HOOK] ${plugin.name}.${hookName} completed in ${duration}ms`);
  },

  onHookError(hookName, plugin, args, error) {
    console.error(`[HOOK ERROR] ${plugin.name}.${hookName}:`, error.message);
  }
};

// Metrics interceptor
export const metricsInterceptor: HookInterceptor = {
  name: 'metrics',
  priority: 5,

  afterHook(hookName, plugin, args, result, duration) {
    metrics.timing(`hook.${hookName}.duration`, duration, {
      plugin: plugin.name
    });

    metrics.increment(`hook.${hookName}.success`, {
      plugin: plugin.name
    });
  },

  onHookError(hookName, plugin, args, error) {
    metrics.increment(`hook.${hookName}.error`, {
      plugin: plugin.name,
      error: error.name
    });
  }
};

// Audit interceptor
export const auditInterceptor: HookInterceptor = {
  name: 'audit',
  priority: 1,

  async beforeHook(hookName, plugin, args) {
    // Log to audit trail
    await auditLog.write({
      type: 'hook-execution',
      hookName,
      plugin: plugin.name,
      args: sanitizeForAudit(args),
      timestamp: new Date().toISOString(),
      user: getCurrentUser()
    });
  }
};

// Rate limiting interceptor
export const rateLimitInterceptor: HookInterceptor = {
  name: 'rate-limit',
  priority: 2,

  private counts: Map<string, number> = new Map();

  async beforeHook(hookName, plugin, args) {
    const key = `${plugin.name}:${hookName}`;
    const count = this.counts.get(key) || 0;

    // Allow max 100 hook executions per minute per plugin
    if (count > 100) {
      throw new EnzymeError(
        EnzymeErrorCode.RATE_LIMITED,
        `Rate limit exceeded for ${plugin.name}.${hookName}`,
        {
          retryable: true,
          suggestions: ['Wait a moment before retrying']
        }
      );
    }

    this.counts.set(key, count + 1);

    // Reset after 1 minute
    setTimeout(() => {
      this.counts.delete(key);
    }, 60000);
  }
};

// Debug replay interceptor
export const debugInterceptor: HookInterceptor = {
  name: 'debug',
  priority: 100, // Run last

  private history: HookEvent[] = [];

  beforeHook(hookName, plugin, args) {
    this.history.push({
      type: 'before',
      hookName,
      plugin: plugin.name,
      args: deepClone(args),
      timestamp: Date.now()
    });
  },

  afterHook(hookName, plugin, args, result, duration) {
    this.history.push({
      type: 'after',
      hookName,
      plugin: plugin.name,
      result: deepClone(result),
      duration,
      timestamp: Date.now()
    });
  },

  onHookError(hookName, plugin, args, error) {
    this.history.push({
      type: 'error',
      hookName,
      plugin: plugin.name,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: Date.now()
    });
  },

  // Export history for debugging
  exportHistory(): HookEvent[] {
    return this.history;
  },

  // Save history to file
  async saveHistory(filepath: string) {
    await fs.writeFile(
      filepath,
      JSON.stringify(this.history, null, 2),
      'utf8'
    );
  }
};

// Usage in Enzyme
export class EnhancedPluginManager extends PluginManager {
  private interceptorManager = new InterceptorManager();

  constructor(context: CommandContext) {
    super(context);

    // Register default interceptors
    this.interceptorManager.register(loggingInterceptor);
    this.interceptorManager.register(metricsInterceptor);

    // Register audit interceptor for enterprise
    if (context.config.enterprise) {
      this.interceptorManager.register(auditInterceptor);
    }

    // Register debug interceptor in verbose mode
    if (context.options.verbose) {
      this.interceptorManager.register(debugInterceptor);
    }
  }

  async executeHook(hookName: string, ...args: any[]): Promise<void> {
    for (const plugin of this.getPlugins()) {
      await this.interceptorManager.executeHook(hookName, plugin, args);
    }
  }
}

// Debug command
export const debugCommand: Command = {
  name: 'debug',
  description: 'Export debug information',

  async execute(context) {
    const interceptor = context.interceptorManager.get('debug') as typeof debugInterceptor;

    if (!interceptor) {
      context.logger.error('Debug mode not enabled. Run with --verbose flag.');
      return;
    }

    // Export hook history
    const filepath = path.join(process.cwd(), 'enzyme-debug.json');
    await interceptor.saveHistory(filepath);

    context.logger.success(`Debug information saved to ${filepath}`);

    // Show summary
    const history = interceptor.exportHistory();
    const summary = {
      totalHooks: history.length,
      errors: history.filter(e => e.type === 'error').length,
      slowestHook: history
        .filter(e => e.type === 'after')
        .sort((a, b) => b.duration - a.duration)[0]
    };

    context.logger.info('\nSummary:');
    context.logger.info(`  Total hooks: ${summary.totalHooks}`);
    context.logger.info(`  Errors: ${summary.errors}`);

    if (summary.slowestHook) {
      context.logger.info(
        `  Slowest hook: ${summary.slowestHook.plugin}.${summary.slowestHook.hookName} (${summary.slowestHook.duration}ms)`
      );
    }
  }
};
```

**Benefits for Enzyme:**
- Comprehensive logging of all plugin activity
- Performance monitoring per hook
- Audit trail for compliance
- Rate limiting to prevent plugin abuse
- Debug mode with event replay
- Security monitoring for suspicious behavior
- Automatic metrics collection

---

## Summary & Recommendations for Enzyme CLI

### Key Patterns to Implement Immediately

1. **Multi-Layer Middleware System** (Pattern #1)
   - Priority: HIGH
   - Impact: Foundation for all other patterns
   - Effort: Medium
   - Benefits: Authentication, validation, logging, caching

2. **Enhanced Error Handling** (Pattern #7)
   - Priority: HIGH
   - Impact: Better developer experience
   - Effort: Low
   - Benefits: User-friendly errors, retry logic, suggestions

3. **Lifecycle Hooks** (Pattern #3)
   - Priority: MEDIUM
   - Impact: Better plugin integration
   - Effort: Low
   - Benefits: Analytics, monitoring, cleanup

4. **Hook Interception** (Pattern #10)
   - Priority: MEDIUM
   - Impact: Debugging and monitoring
   - Effort: Low
   - Benefits: Metrics, logging, rate limiting

### Patterns for Future Enhancement

5. **Storage Adapter System** (Pattern #8)
   - Priority: LOW
   - Impact: Team collaboration
   - Effort: High
   - Benefits: Shared cache, multi-instance coordination

6. **Namespace System** (Pattern #2)
   - Priority: LOW
   - Impact: Code organization
   - Effort: Medium
   - Benefits: Logical separation, security boundaries

### Implementation Roadmap

**Phase 1 (Week 1-2): Foundation**
- Implement middleware chain with priority
- Add NextFunction pattern
- Enhance error types with EnzymeError
- Add lifecycle hooks to existing plugin system

**Phase 2 (Week 3-4): Developer Experience**
- Implement hook interception for logging
- Add metrics collection
- Create audit trail for enterprise
- Add timeout protection for plugins

**Phase 3 (Week 5-6): Advanced Features**
- Implement storage adapter system
- Add namespace support
- Create instance management
- Build team collaboration features

### Code Architecture Changes

```typescript
// Proposed new structure
src/
├── middleware/
│   ├── chain.ts          // Middleware chain execution
│   ├── auth.ts           // Authentication middleware
│   ├── validation.ts     // Validation middleware
│   └── error-handler.ts  // Error handling middleware
├── hooks/
│   ├── interceptor.ts    // Hook interception system
│   ├── executor.ts       // Hook execution with timeout
│   └── lifecycle.ts      // Lifecycle event definitions
├── adapters/
│   ├── storage/
│   │   ├── base.ts       // StorageAdapter abstract class
│   │   ├── memory.ts     // In-memory implementation
│   │   └── redis.ts      // Redis implementation
│   └── index.ts
├── errors/
│   ├── types.ts          // EnzymeError and error codes
│   ├── handlers.ts       // Error handling utilities
│   └── reporting.ts      // Error reporting service
└── instance/
    ├── manager.ts        // Instance management
    ├── registry.ts       // Instance registry
    └── coordination.ts   // Multi-instance coordination
```

### Metrics for Success

After implementation, track:
- Plugin execution time (should decrease with caching)
- Error recovery rate (should increase with retries)
- User satisfaction (measure through feedback)
- Plugin adoption (more plugins using new hooks)
- Cache hit rate (measure effectiveness)

---

## Conclusion

Socket.io's architecture demonstrates how a well-designed hook system enables:
1. **Composability** - Stack functionality without coupling
2. **Extensibility** - Add features without modifying core
3. **Observability** - Monitor and debug complex systems
4. **Reliability** - Handle errors gracefully
5. **Performance** - Cache and optimize transparently

By adopting these patterns, Enzyme CLI can evolve into an enterprise-grade framework with:
- Better plugin ecosystem
- Improved developer experience
- Team collaboration support
- Production-ready monitoring
- Scalable architecture

The event-driven, hook-based architecture that makes Socket.io excellent for real-time applications translates perfectly to CLI frameworks where asynchronous operations, plugin composition, and lifecycle management are equally critical.
