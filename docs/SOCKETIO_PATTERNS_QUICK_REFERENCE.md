# Socket.io Hook Patterns - Quick Reference Guide

## Pattern Comparison Matrix

| Pattern | Socket.io Implementation | Enzyme Adaptation | Priority | Complexity |
|---------|-------------------------|-------------------|----------|------------|
| **Middleware Chain** | `io.use()`, `socket.use()` | Command & generator middleware | HIGH | Medium |
| **Namespaces** | `io.of('/name')` | Command namespaces | LOW | Medium |
| **Lifecycle Hooks** | `connection`, `disconnect`, `disconnecting` | `beforeCommand`, `afterCommand`, `onError` | MEDIUM | Low |
| **Authentication** | `socket.handshake.auth` + middleware | License validation, API key auth | HIGH | Low |
| **Room Management** | `socket.join()`, `io.to(room).emit()` | Context groups, project rooms | LOW | High |
| **Acknowledgments** | Callback + timeout | Hook callbacks with timeout | MEDIUM | Low |
| **Error Handling** | `connect_error`, error codes, context | EnzymeError with codes & suggestions | HIGH | Low |
| **Adapters** | Redis, MongoDB, Postgres adapters | Storage adapters (memory, Redis) | LOW | High |
| **Server Hooks** | `serverSideEmit`, bulk operations | Instance coordination | LOW | High |
| **Interception** | `onAny()`, `onAnyOutgoing()` | Hook interceptors for logging | MEDIUM | Low |

## Key Takeaways

### 1. Middleware Chain Pattern

**Socket.io:**
```javascript
io.use((socket, next) => {
  validateAuth(socket.handshake.auth)
    ? next()
    : next(new Error("auth failed"));
});
```

**Enzyme:**
```typescript
middleware.use({
  name: 'auth',
  priority: 10,
  async execute(context, next) {
    validateLicense(context.config)
      ? next()
      : next(new Error("license required"));
  }
});
```

**Why It Works:** Sequential execution with error propagation provides clean separation of concerns.

---

### 2. Error Handling with Context

**Socket.io:**
```javascript
const err = new Error("not authorized");
err.data = { code: 'AUTH_REQUIRED', retryable: true };
next(err);
```

**Enzyme:**
```typescript
throw new EnzymeError(
  EnzymeErrorCode.AUTH_REQUIRED,
  "Authentication required",
  {
    retryable: true,
    suggestions: ["Run: enzyme auth login"]
  }
);
```

**Why It Works:** Rich error context helps users fix issues without documentation.

---

### 3. Lifecycle Event Hooks

**Socket.io:**
```javascript
socket.on('disconnecting', () => {
  const rooms = Array.from(socket.rooms);
  rooms.forEach(room => cleanupRoom(room));
});
```

**Enzyme:**
```typescript
hooks: {
  async afterCommand(context, result) {
    await trackAnalytics(context, result);
    await cleanupTempFiles(context);
  }
}
```

**Why It Works:** Automatic resource cleanup and monitoring without manual tracking.

---

### 4. Hook Interception

**Socket.io:**
```javascript
socket.onAny((event, ...args) => {
  logger.info({ event, args });
  metrics.increment(`events.${event}`);
});
```

**Enzyme:**
```typescript
interceptor.beforeHook((hookName, plugin, args) => {
  logger.debug(`${plugin.name}.${hookName}`);
  metrics.timing(`hook.${hookName}.duration`);
});
```

**Why It Works:** Single place to monitor, log, and meter all activity.

---

### 5. Acknowledgment Pattern

**Socket.io:**
```javascript
socket.timeout(5000).emit('ping', (err, response) => {
  if (err) handleTimeout();
  else processResponse(response);
});
```

**Enzyme:**
```typescript
await executeHookWithTimeout(
  plugin.hooks.validate,
  [context],
  5000 // timeout
);
```

**Why It Works:** Prevents hanging on slow/buggy plugins.

---

## Implementation Priority

### Phase 1: Foundation (Week 1-2)

**Implement:**
1. Middleware chain with NextFunction
2. EnzymeError with error codes
3. Basic lifecycle hooks (before/after/error)

**Files to Create:**
- `/home/user/enzyme/cli/src/middleware/chain.ts`
- `/home/user/enzyme/cli/src/errors/types.ts`
- `/home/user/enzyme/cli/src/hooks/lifecycle.ts`

**Impact:**
- Better error messages
- Plugin authentication
- Command validation

---

### Phase 2: Developer Experience (Week 3-4)

**Implement:**
1. Hook interceptors for logging/metrics
2. Timeout protection
3. Audit trail for enterprise

**Files to Create:**
- `/home/user/enzyme/cli/src/hooks/interceptor.ts`
- `/home/user/enzyme/cli/src/hooks/executor.ts`
- `/home/user/enzyme/cli/src/audit/logger.ts`

**Impact:**
- Better debugging
- Performance monitoring
- Compliance features

---

### Phase 3: Advanced (Week 5-6)

**Implement:**
1. Storage adapter system
2. Multi-instance coordination
3. Context groups

**Files to Create:**
- `/home/user/enzyme/cli/src/adapters/storage/base.ts`
- `/home/user/enzyme/cli/src/adapters/storage/redis.ts`
- `/home/user/enzyme/cli/src/instance/manager.ts`

**Impact:**
- Team collaboration
- Shared caching
- Multi-user support

---

## Code Templates

### Template 1: Middleware

```typescript
export const myMiddleware: EnzymeMiddleware = {
  name: 'my-middleware',
  priority: 50, // Lower = runs earlier

  async execute(context: CommandContext, next: NextFunction) {
    // Pre-processing
    console.log('Before command');

    try {
      // Call next middleware
      await next();

      // Post-processing (only on success)
      console.log('After command success');

    } catch (error) {
      // Error handling
      console.error('Command failed:', error);
      throw error; // Re-throw or handle
    }
  }
};
```

### Template 2: Error with Context

```typescript
throw new EnzymeError(
  EnzymeErrorCode.YOUR_ERROR_CODE,
  "Human-readable message",
  {
    retryable: true,
    severity: 'error',
    context: { /* additional data */ },
    suggestions: [
      "First thing to try",
      "Second thing to try"
    ],
    documentationUrl: "https://enzyme.dev/docs/error-xyz"
  }
);
```

### Template 3: Plugin with Lifecycle

```typescript
export const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Does something awesome',

  hooks: {
    // Called once on plugin load
    async init(context: CommandContext) {
      console.log('Plugin initialized');
    },

    // Called before generation
    async beforeGenerate(context: GenerationContext) {
      // Validate, prepare, cache
    },

    // Called after generation
    async afterGenerate(
      context: GenerationContext,
      result: GenerationResult
    ) {
      // Cleanup, notify, track
    },

    // Called to validate
    async validate(context: GenerationContext): Promise<ValidationResult> {
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    },

    // Called on cleanup
    async cleanup(context: CommandContext) {
      console.log('Plugin cleaned up');
    }
  }
};
```

### Template 4: Hook Interceptor

```typescript
export const myInterceptor: HookInterceptor = {
  name: 'my-interceptor',
  priority: 10,

  // Before hook execution
  async beforeHook(hookName: string, plugin: Plugin, args: any[]) {
    console.log(`Starting ${plugin.name}.${hookName}`);
  },

  // After successful execution
  async afterHook(
    hookName: string,
    plugin: Plugin,
    args: any[],
    result: any,
    duration: number
  ) {
    console.log(`Completed ${plugin.name}.${hookName} in ${duration}ms`);
  },

  // On error
  async onHookError(
    hookName: string,
    plugin: Plugin,
    args: any[],
    error: Error
  ) {
    console.error(`Failed ${plugin.name}.${hookName}:`, error.message);
  }
};
```

---

## Configuration Examples

### Enable Authentication Middleware

```typescript
// enzyme.config.ts
export default {
  enterprise: true,

  auth: {
    enabled: true,
    provider: 'api-key', // or 'oauth', 'token'
    apiKeyFile: '~/.enzyme/api-key'
  },

  middleware: {
    enabled: [
      'auth',           // Authentication
      'validation',     // Input validation
      'rate-limit',     // Rate limiting
      'audit',          // Audit logging
      'metrics'         // Metrics collection
    ]
  }
};
```

### Enable Storage Adapter

```typescript
// enzyme.config.ts
export default {
  storage: {
    adapter: 'redis', // or 'memory', 'mongodb'
    redis: {
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD
    }
  },

  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour
    strategy: 'lru'
  }
};
```

### Enable Hook Interception

```typescript
// enzyme.config.ts
export default {
  debug: {
    enabled: true,
    interceptors: [
      'logging',    // Log all hooks
      'metrics',    // Collect metrics
      'audit',      // Audit trail
      'replay'      // Debug replay
    ]
  },

  logging: {
    level: 'debug',
    format: 'json',
    destination: './logs/enzyme.log'
  }
};
```

---

## Testing Patterns

### Test Middleware

```typescript
describe('AuthMiddleware', () => {
  it('should allow authenticated users', async () => {
    const context = createMockContext({ auth: validAuth });
    const next = jest.fn();

    await authMiddleware.execute(context, next);

    expect(next).toHaveBeenCalledWith(); // No error
  });

  it('should reject unauthenticated users', async () => {
    const context = createMockContext({ auth: null });
    const next = jest.fn();

    await authMiddleware.execute(context, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: EnzymeErrorCode.AUTH_REQUIRED
      })
    );
  });
});
```

### Test Plugin Lifecycle

```typescript
describe('MyPlugin', () => {
  it('should execute lifecycle in correct order', async () => {
    const calls: string[] = [];

    const plugin: Plugin = {
      name: 'test',
      version: '1.0.0',
      hooks: {
        init: () => calls.push('init'),
        beforeGenerate: () => calls.push('before'),
        afterGenerate: () => calls.push('after'),
        cleanup: () => calls.push('cleanup')
      }
    };

    const manager = new PluginManager();
    manager.register(plugin);

    await manager.executeHook('beforeGenerate', context);
    await manager.executeHook('afterGenerate', context, result);

    expect(calls).toEqual(['before', 'after']);
  });
});
```

---

## Performance Considerations

### 1. Middleware Order Matters

```typescript
// Good: Fast checks first
const middlewares = [
  cacheCheckMiddleware,      // priority: 5  (fast)
  validationMiddleware,      // priority: 10 (fast)
  authenticationMiddleware,  // priority: 20 (medium)
  databaseCheckMiddleware    // priority: 30 (slow)
];

// Bad: Slow checks first wastes time
const badMiddlewares = [
  databaseCheckMiddleware,   // Slow, runs first
  authenticationMiddleware,
  validationMiddleware,
  cacheCheckMiddleware
];
```

### 2. Use Timeouts

```typescript
// Good: Prevent hanging
await executeWithTimeout(plugin.hook, args, 5000);

// Bad: Could hang forever
await plugin.hook(...args);
```

### 3. Cache Aggressively

```typescript
// Good: Cache expensive operations
const template = await storage.getCached(
  `template:${name}`,
  () => loadTemplateFromDisk(name),
  3600000 // 1 hour
);

// Bad: Load from disk every time
const template = await loadTemplateFromDisk(name);
```

---

## Migration Guide

### From Current Enzyme to Enhanced System

#### Step 1: Add Middleware Support

```typescript
// Before
export const myPlugin: Plugin = {
  hooks: {
    async beforeGenerate(context) {
      if (!isValid(context)) {
        throw new Error("Invalid");
      }
    }
  }
};

// After
export const validationMiddleware: EnzymeMiddleware = {
  name: 'validation',
  async execute(context, next) {
    if (isValid(context)) {
      next();
    } else {
      next(new Error("Invalid"));
    }
  }
};
```

#### Step 2: Enhance Errors

```typescript
// Before
throw new Error("Component already exists");

// After
throw new EnzymeError(
  EnzymeErrorCode.NAMING_CONFLICT,
  "Component already exists",
  {
    retryable: true,
    suggestions: [
      "Use a different name",
      "Use --force to overwrite"
    ]
  }
);
```

#### Step 3: Add Interceptors

```typescript
// Before
export const myPlugin: Plugin = {
  hooks: {
    async beforeGenerate(context) {
      console.log('Starting generation');
      // ... logic
    }
  }
};

// After
// Logging is automatic via interceptor
export const myPlugin: Plugin = {
  hooks: {
    async beforeGenerate(context) {
      // Just business logic, logging handled by interceptor
    }
  }
};
```

---

## Resources

### Documentation
- Socket.io Docs: https://socket.io/docs/v4/
- Socket.io Server API: https://socket.io/docs/v4/server-api/
- Socket.io Middleware: https://socket.io/docs/v4/middlewares/

### Related Patterns
- Express.js middleware
- Koa.js middleware
- Redux middleware
- Webpack plugins
- Babel plugins

### Tools
- Socket.io Admin UI (for debugging)
- Socket.io Client tool
- Redis Commander (for Redis adapter)

---

## Questions & Answers

**Q: Should I use middleware or plugins?**
A: Both! Middleware for cross-cutting concerns (auth, logging), plugins for feature-specific logic.

**Q: How many middleware functions is too many?**
A: 5-10 is reasonable. Beyond that, consider combining related middleware.

**Q: Should middleware be async?**
A: Yes, always support async. Use `async/await` even for sync operations.

**Q: How do I debug middleware chains?**
A: Enable the logging interceptor and use --verbose flag.

**Q: Can middleware modify the context?**
A: Yes! That's one of their main purposes. Add auth data, cache entries, etc.

**Q: What's the difference between middleware and interceptors?**
A: Middleware runs in the command pipeline. Interceptors monitor hook execution.

---

## Next Steps

1. Review full analysis: `/home/user/enzyme/SOCKETIO_HOOK_PATTERNS_ANALYSIS.md`
2. Implement Phase 1 (middleware + errors)
3. Test with existing plugins
4. Gather developer feedback
5. Iterate and improve
6. Move to Phase 2

**Good luck building an amazing CLI framework!**
