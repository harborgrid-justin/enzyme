# Prisma Hook Patterns Research Report
## Enterprise Extension Patterns for Enzyme CLI Framework

**Date:** December 3, 2025
**Analyzed Repository:** Prisma (https://github.com/prisma/prisma)
**Target Framework:** Enzyme CLI
**Research Focus:** Hook/Middleware patterns for enterprise extensibility

---

## Executive Summary

This report analyzes Prisma ORM's hook and extension patterns to identify best-in-class extensibility mechanisms that can be adapted for the Enzyme CLI framework. Prisma has evolved from a simple middleware pattern (`$use`) to a sophisticated, type-safe extension system (`$extends`) that provides four distinct extension points: **Query**, **Model**, **Result**, and **Client** components.

### Key Insights for Enzyme

1. **Type-Safe Extensions Over Global Middleware**: Prisma deprecated global middleware in favor of composable, type-safe extensions
2. **Multiple Extension Points**: Different hook types for different concerns (lifecycle, data transformation, validation)
3. **Isolation & Composition**: Extensions can be combined without mutual interference
4. **Developer Experience**: Auto-completion, type inference, and clear extension APIs
5. **Progressive Enhancement**: Extensions don't mutate the base client, they create isolated variants

---

## 1. Middleware System ($use Pattern) - DEPRECATED

### Overview
Prisma's original middleware system used the `$use` method to add query-level lifecycle hooks. While deprecated as of v4.16.0 and removed in v6.14.0, it provides valuable lessons about the limitations of global middleware.

### Pattern Structure

```typescript
const prisma = new PrismaClient()

prisma.$use(async (params, next) => {
  // Before query: Manipulate params
  console.log(`Query: ${params.model}.${params.action}`)

  const result = await next(params)

  // After query: Process results
  return result
})
```

### Available Parameters
- `params.model` - Model name (e.g., 'User', 'Post')
- `params.action` - Operation (e.g., 'findMany', 'create', 'update')
- `params.args` - Query arguments
- `params.dataPath` - Path to data in nested queries
- `params.runInTransaction` - Boolean indicating if in transaction
- `next()` - Function to call next middleware or execute query

### Why It Was Developer-Friendly
1. ✅ Simple API - Just wrap the next() call
2. ✅ Global application - Runs for every query
3. ✅ Familiar pattern - Similar to Express middleware

### Limitations (Why It Was Deprecated)
1. ❌ **No type safety** - Lost TypeScript inference
2. ❌ **Global only** - Couldn't create scoped middleware instances
3. ❌ **Performance overhead** - Runs for ALL queries
4. ❌ **Transaction issues** - Problems with `$transaction` and `runInTransaction`
5. ❌ **Ordering complexity** - Middleware stack order hard to manage

### Lessons for Enzyme CLI

**DO:**
- Provide simple, chainable hook APIs
- Support both sync and async hooks
- Give access to operation metadata (model, action, args)

**DON'T:**
- Make all hooks global by default
- Sacrifice type safety for simplicity
- Run hooks unnecessarily (performance impact)

---

## 2. Client Extensions API ($extends Pattern) - MODERN APPROACH

### Overview
Introduced in v4.7.0 (Preview) and made Generally Available in v4.16.0, Client Extensions represent Prisma's modern approach to extensibility. They provide full type safety, composability, and isolation.

### Core Philosophy
- **Immutability**: Extensions don't mutate the base client
- **Composition**: Multiple extensions can be combined
- **Type Safety**: Full TypeScript inference maintained
- **Scoping**: Different extended clients for different contexts

### Basic Usage

```typescript
import { Prisma, PrismaClient } from '@prisma/client'

// Define reusable extension
const auditExtension = Prisma.defineExtension({
  name: 'audit',
  query: {
    $allModels: {
      async create({ args, query }) {
        args.data = { ...args.data, createdAt: new Date() }
        return query(args)
      }
    }
  }
})

// Apply extension
const prisma = new PrismaClient().$extends(auditExtension)
```

### Extension Component Types

#### 2.1 Query Extensions
Hook into query lifecycle to modify queries or results.

```typescript
const queryExtension = Prisma.defineExtension({
  query: {
    // Apply to specific model
    user: {
      async findMany({ args, query }) {
        // Modify query arguments
        args.take = args.take || 100
        return query(args)
      }
    },

    // Apply to all models
    $allModels: {
      // Apply to all operations on all models
      async $allOperations({ model, operation, args, query }) {
        const start = Date.now()
        const result = await query(args)
        const end = Date.now()
        console.log(`${model}.${operation} took ${end - start}ms`)
        return result
      }
    }
  }
})
```

**Query Extension Context:**
- `model` - Name of the model
- `operation` - Name of the operation
- `args` - Query arguments (mutable except `select` and `include`)
- `query(args)` - Function to execute the query

**Use Cases:**
- Performance monitoring/logging
- Row-level security (RLS)
- Automatic field injection
- Query modification (soft deletes, multi-tenancy)
- Caching layer integration

#### 2.2 Model Extensions
Add custom methods to models (like repository pattern).

```typescript
const modelExtension = Prisma.defineExtension({
  model: {
    user: {
      // Add custom method to User model
      async findByEmail(email: string) {
        return prisma.user.findUnique({ where: { email } })
      },

      async exists(id: string) {
        const count = await prisma.user.count({ where: { id } })
        return count > 0
      }
    },

    // Add method to all models
    $allModels: {
      async exists<T>(this: T, id: string) {
        const context = Prisma.getExtensionContext(this)
        const count = await (context as any).count({ where: { id } })
        return count > 0
      }
    }
  }
})

// Usage
const exists = await prisma.user.exists('user-123')
const user = await prisma.user.findByEmail('test@example.com')
```

**Model Extension Features:**
- Add methods alongside default operations (findMany, create, etc.)
- Repository pattern implementation
- Business logic encapsulation
- Reusable query patterns
- Call other custom methods using `Prisma.getExtensionContext(this)`

**Use Cases:**
- Repository pattern
- Active Record-like methods (save(), delete())
- Complex query builders
- Business logic encapsulation
- Domain-specific operations

#### 2.3 Result Extensions
Add computed fields and methods to query results.

```typescript
const resultExtension = Prisma.defineExtension({
  result: {
    user: {
      // Add computed field
      fullName: {
        needs: { firstName: true, lastName: true },
        compute(user) {
          return `${user.firstName} ${user.lastName}`
        }
      },

      // Add method to result
      isAdmin: {
        needs: { role: true },
        compute(user) {
          return user.role === 'ADMIN'
        }
      }
    }
  }
})

// Usage
const user = await prisma.user.findFirst()
console.log(user.fullName) // "John Doe"
console.log(user.isAdmin)  // true/false
```

**Result Extension Features:**
- `needs` - Declare field dependencies
- `compute` - Synchronous computation function
- Lazy evaluation - Only computed when accessed
- Full type safety - TypeScript knows about new fields

**Use Cases:**
- Virtual/computed fields
- Field transformations (dates, formatting)
- Hiding sensitive fields (password obfuscation)
- Internationalization (i18n)
- Data serialization/deserialization

**Limitations:**
- Cannot reference relation fields in `needs`
- Compute function must be synchronous
- Only for adding fields, not removing them

#### 2.4 Client Extensions
Add top-level methods to Prisma Client.

```typescript
const clientExtension = Prisma.defineExtension({
  client: {
    // Add utility method
    async $healthCheck() {
      try {
        await prisma.$queryRaw`SELECT 1`
        return { status: 'healthy' }
      } catch (error) {
        return { status: 'unhealthy', error }
      }
    },

    // Add transaction helper
    async $executeInTransaction(fn: (tx: PrismaClient) => Promise<void>) {
      return prisma.$transaction(fn)
    }
  }
})

// Usage
const health = await prisma.$healthCheck()
await prisma.$executeInTransaction(async (tx) => {
  await tx.user.create({ data: { name: 'John' } })
})
```

**Use Cases:**
- Health checks
- Transaction helpers
- Connection pooling utilities
- Custom query builders
- Framework-specific adapters

### Why Extensions Are Developer-Friendly

1. **Type Safety**: Full TypeScript inference and autocomplete
2. **Composition**: Combine multiple extensions without conflicts
3. **Isolation**: Each extended client is independent
4. **Shareability**: Package as npm modules with `Prisma.defineExtension`
5. **Performance**: Scoped execution, not global overhead
6. **Discoverability**: Extensions show up in IDE autocomplete

### Adaptation for Enzyme CLI

```typescript
// Enzyme equivalent pattern
import { Enzyme } from '@enzyme/cli'

const loggingExtension = Enzyme.defineExtension({
  name: 'logging',

  // Before/after generation hooks
  generator: {
    component: {
      async beforeGenerate({ name, options, modify }) {
        console.log(`Generating component: ${name}`)
        // Modify generation options
        modify({ withTests: true })
      },

      async afterGenerate({ name, files, addFile }) {
        console.log(`Generated ${files.length} files`)
        // Add additional file
        addFile('CHANGELOG.md', `## ${name} - ${new Date()}`)
      }
    }
  },

  // Add custom commands
  commands: {
    async analyze() {
      // Custom command implementation
    }
  },

  // Add template helpers
  templates: {
    uppercase: (str: string) => str.toUpperCase(),
    formatDate: (date: Date) => date.toISOString()
  }
})

// Apply extension
const enzyme = new Enzyme().$extends(loggingExtension)
```

---

## 3. Query Lifecycle Hooks

### Overview
Query lifecycle hooks allow interception at various stages of query execution.

### Lifecycle Stages

```typescript
// 1. Query Construction
// 2. Validation
// 3. Before Execution (Query Hook)
// 4. Execution
// 5. After Execution (Query Hook)
// 6. Result Transformation (Result Extension)
// 7. Return to User
```

### Complete Lifecycle Example

```typescript
const lifecycleExtension = Prisma.defineExtension({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // STAGE 1: Pre-execution
        console.log(`[PRE] ${model}.${operation}`)

        // STAGE 2: Validation
        if (operation === 'delete' && model === 'User') {
          throw new Error('Direct user deletion not allowed')
        }

        // STAGE 3: Query modification
        const startTime = performance.now()

        try {
          // STAGE 4: Execute
          const result = await query(args)

          // STAGE 5: Post-execution
          const duration = performance.now() - startTime
          console.log(`[POST] ${model}.${operation} - ${duration}ms`)

          // STAGE 6: Return (result extensions handle transformation)
          return result
        } catch (error) {
          // STAGE 7: Error handling
          console.error(`[ERROR] ${model}.${operation}:`, error)
          throw error
        }
      }
    }
  }
})
```

### Why Developer-Friendly

1. **Clear execution order** - Predictable hook execution
2. **Async-first** - All hooks support promises
3. **Error boundaries** - Try-catch wraps each stage
4. **Chainable** - Multiple extensions compose naturally

### Adaptation for Enzyme CLI

```typescript
// File generation lifecycle
const fileLifecycle = Enzyme.defineExtension({
  file: {
    async beforeWrite({ path, content, modify }) {
      // Validate file doesn't exist
      if (await exists(path)) {
        throw new Error(`File exists: ${path}`)
      }

      // Auto-format
      const formatted = await prettier.format(content)
      modify({ content: formatted })
    },

    async afterWrite({ path, success }) {
      if (success) {
        console.log(`✓ Created ${path}`)
      }
    },

    async onError({ path, error, retry }) {
      console.error(`✗ Failed to write ${path}:`, error)
      // Allow retry logic
      if (shouldRetry(error)) {
        await retry()
      }
    }
  }
})
```

---

## 4. Model-Level Hooks (via Model Extensions)

### Overview
While Prisma doesn't have traditional ORM hooks (beforeCreate, afterSave), model extensions provide a superior alternative by allowing custom methods that encapsulate hook-like behavior.

### Traditional ORM Hooks (What Prisma Avoids)

```typescript
// Other ORMs (Sequelize, TypeORM)
User.beforeCreate((user) => {
  user.password = hash(user.password)
})
```

**Problems:**
- Global mutation of model behavior
- Hard to disable for specific contexts
- Transaction rollback issues
- Testing difficulties

### Prisma's Alternative: Model Extensions

```typescript
const userExtension = Prisma.defineExtension({
  model: {
    user: {
      // Explicit method replaces beforeCreate hook
      async createWithHashedPassword(data: UserCreateInput) {
        return prisma.user.create({
          data: {
            ...data,
            password: await hash(data.password)
          }
        })
      },

      // Replaces afterUpdate hook
      async updateAndNotify(id: string, data: UserUpdateInput) {
        const user = await prisma.user.update({
          where: { id },
          data
        })

        // Post-update logic
        await sendNotification(user.email, 'Profile updated')

        return user
      },

      // Replaces beforeDelete hook with soft delete
      async softDelete(id: string) {
        return prisma.user.update({
          where: { id },
          data: { deletedAt: new Date() }
        })
      }
    }
  }
})
```

### Why This Approach Is Better

1. **Explicit over Implicit**: Developer chooses when to use hook behavior
2. **Testable**: Easy to test with/without hook logic
3. **Context-aware**: Can pass different options per call
4. **Transaction-safe**: No mysterious behavior during rollbacks
5. **Type-safe**: Full TypeScript support

### Popular Model Extension Patterns

#### Repository Pattern
```typescript
const repositoryExtension = Prisma.defineExtension({
  model: {
    $allModels: {
      async findOrCreate<T>(
        this: T,
        where: any,
        create: any
      ) {
        const context = Prisma.getExtensionContext(this)

        let record = await (context as any).findUnique({ where })

        if (!record) {
          record = await (context as any).create({ data: create })
        }

        return record
      }
    }
  }
})

// Usage
const user = await prisma.user.findOrCreate(
  { email: 'test@example.com' },
  { email: 'test@example.com', name: 'Test User' }
)
```

#### Active Record Pattern
```typescript
const activeRecordExtension = Prisma.defineExtension({
  result: {
    user: {
      save: {
        needs: { id: true },
        compute(user) {
          return async () => {
            return prisma.user.update({
              where: { id: user.id },
              data: user
            })
          }
        }
      },

      delete: {
        needs: { id: true },
        compute(user) {
          return async () => {
            return prisma.user.delete({
              where: { id: user.id }
            })
          }
        }
      }
    }
  }
})

// Usage
const user = await prisma.user.findFirst()
user.name = 'Updated Name'
await user.save()
await user.delete()
```

### Adaptation for Enzyme CLI

```typescript
// Generator-level hooks via extensions
const generatorExtension = Enzyme.defineExtension({
  generator: {
    component: {
      // Replaces "beforeCreate" hook
      async createWithTests(name: string, options: ComponentOptions) {
        return enzyme.generate.component({
          name,
          ...options,
          withTests: true,
          withStory: true
        })
      },

      // Replaces "afterCreate" hook
      async createAndRegister(name: string, options: ComponentOptions) {
        const result = await enzyme.generate.component({ name, ...options })

        // Post-generation logic
        await updateComponentRegistry(name)
        await generateDocs(name)

        return result
      }
    }
  }
})
```

---

## 5. Transaction Hooks

### Overview
Prisma's transaction handling is complex, and the old middleware had significant issues with transaction awareness. The extension system provides better transaction control.

### Transaction Awareness Problems (Old Middleware)

```typescript
// OLD - Middleware approach (problematic)
prisma.$use(async (params, next) => {
  // Problem: Can't access transaction client
  // Problem: runInTransaction not always set correctly
  // Problem: Can't run code after transaction commits

  if (params.runInTransaction) {
    // Limited transaction context
  }

  return next(params)
})
```

**Issues:**
1. No access to transaction Prisma client
2. `runInTransaction` parameter unreliable
3. No `afterCommit` or `beforeCommit` hooks
4. Breaking out of transaction if `next()` called multiple times
5. Audit trail challenges (can't get 'before' values)

### Modern Approach: Client Extensions for Transactions

```typescript
const transactionExtension = Prisma.defineExtension({
  client: {
    // Wrapper for transaction with hooks
    async $transactionWithHooks<T>(
      fn: (tx: PrismaClient) => Promise<T>,
      options?: {
        beforeCommit?: () => Promise<void>
        afterCommit?: () => Promise<void>
        onRollback?: (error: Error) => Promise<void>
      }
    ): Promise<T> {
      let result: T

      try {
        result = await prisma.$transaction(async (tx) => {
          const txResult = await fn(tx)

          // Run before commit hook
          if (options?.beforeCommit) {
            await options.beforeCommit()
          }

          return txResult
        })

        // Run after commit hook
        if (options?.afterCommit) {
          await options.afterCommit()
        }

        return result
      } catch (error) {
        // Run on rollback hook
        if (options?.onRollback) {
          await options.onRollback(error as Error)
        }
        throw error
      }
    }
  }
})

// Usage
await prisma.$transactionWithHooks(
  async (tx) => {
    await tx.user.create({ data: { name: 'John' } })
    await tx.post.create({ data: { title: 'Hello' } })
  },
  {
    beforeCommit: async () => {
      console.log('About to commit...')
    },
    afterCommit: async () => {
      await sendNotification('Transaction completed')
    },
    onRollback: async (error) => {
      console.error('Transaction rolled back:', error)
    }
  }
)
```

### Advanced Transaction Patterns

#### Audit Trail in Transactions
```typescript
const auditExtension = Prisma.defineExtension({
  client: {
    async $auditedTransaction<T>(
      fn: (tx: PrismaClient) => Promise<T>
    ): Promise<T> {
      const auditLog: any[] = []

      return prisma.$transaction(async (tx) => {
        // Create extended transaction client that logs changes
        const auditedTx = tx.$extends({
          query: {
            $allModels: {
              async $allOperations({ model, operation, args, query }) {
                // Capture before state for updates/deletes
                let beforeState
                if (operation === 'update' || operation === 'delete') {
                  beforeState = await (tx as any)[model].findUnique({
                    where: args.where
                  })
                }

                const result = await query(args)

                // Log the operation
                auditLog.push({
                  model,
                  operation,
                  before: beforeState,
                  after: result,
                  timestamp: new Date()
                })

                return result
              }
            }
          }
        })

        const result = await fn(auditedTx as any)

        // Save audit log after successful transaction
        await tx.auditLog.createMany({
          data: auditLog
        })

        return result
      })
    }
  }
})

// Usage
await prisma.$auditedTransaction(async (tx) => {
  await tx.user.update({
    where: { id: '123' },
    data: { name: 'Updated' }
  })
  // Audit log automatically created
})
```

### Why Developer-Friendly

1. **Explicit transaction scoping** - Clear transaction boundaries
2. **Hook control** - Choose which transactions get hooks
3. **Access to transaction client** - Full Prisma client available
4. **Composable** - Extensions can be applied to transaction client
5. **Type-safe** - Transaction result types preserved

### Adaptation for Enzyme CLI

```typescript
// Multi-file generation with rollback
const transactionalGeneration = Enzyme.defineExtension({
  client: {
    async $generateWithRollback<T>(
      fn: (generator: EnzymeGenerator) => Promise<T>,
      options?: {
        beforeCommit?: () => Promise<void>
        afterCommit?: () => Promise<void>
        onRollback?: (error: Error) => Promise<void>
      }
    ): Promise<T> {
      const createdFiles: string[] = []

      try {
        const result = await fn({
          ...enzyme,
          onFileCreate: (path: string) => {
            createdFiles.push(path)
          }
        })

        if (options?.beforeCommit) {
          await options.beforeCommit()
        }

        if (options?.afterCommit) {
          await options.afterCommit()
        }

        return result
      } catch (error) {
        // Rollback: Delete all created files
        for (const file of createdFiles) {
          await fs.unlink(file).catch(() => {})
        }

        if (options?.onRollback) {
          await options.onRollback(error as Error)
        }

        throw error
      }
    }
  }
})

// Usage
await enzyme.$generateWithRollback(
  async (gen) => {
    await gen.component('Button')
    await gen.component('Input')
    await gen.page('Dashboard')
  },
  {
    afterCommit: async () => {
      console.log('✓ All files generated successfully')
    },
    onRollback: async (error) => {
      console.error('✗ Generation failed, rolled back all changes')
    }
  }
)
```

---

## 6. Logging Middleware

### Overview
Logging is one of the most common use cases for middleware/extensions. Prisma's query extensions provide a perfect mechanism for implementing comprehensive logging.

### Basic Query Logging

```typescript
const queryLoggingExtension = Prisma.defineExtension({
  name: 'queryLogging',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now()

        console.log(`[Query] ${model}.${operation}`, {
          args: JSON.stringify(args)
        })

        try {
          const result = await query(args)
          const duration = performance.now() - start

          console.log(`[Success] ${model}.${operation} - ${duration}ms`)

          return result
        } catch (error) {
          const duration = performance.now() - start

          console.error(`[Error] ${model}.${operation} - ${duration}ms`, {
            error: error.message
          })

          throw error
        }
      }
    }
  }
})
```

### Advanced Structured Logging

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'queries.log' })
  ]
})

const structuredLoggingExtension = Prisma.defineExtension({
  name: 'structuredLogging',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const queryId = crypto.randomUUID()
        const startTime = Date.now()

        // Log query start
        logger.info('query.start', {
          queryId,
          model,
          operation,
          args: sanitizeArgs(args), // Remove sensitive data
          timestamp: new Date().toISOString()
        })

        try {
          const result = await query(args)
          const duration = Date.now() - startTime

          // Log query success
          logger.info('query.success', {
            queryId,
            model,
            operation,
            duration,
            resultCount: Array.isArray(result) ? result.length : 1,
            timestamp: new Date().toISOString()
          })

          return result
        } catch (error) {
          const duration = Date.now() - startTime

          // Log query error
          logger.error('query.error', {
            queryId,
            model,
            operation,
            duration,
            error: {
              message: error.message,
              code: error.code,
              stack: error.stack
            },
            timestamp: new Date().toISOString()
          })

          throw error
        }
      }
    }
  }
})

function sanitizeArgs(args: any): any {
  // Remove sensitive fields like passwords
  const sanitized = { ...args }
  if (sanitized.data?.password) {
    sanitized.data.password = '[REDACTED]'
  }
  return sanitized
}
```

### Performance Monitoring Extension

```typescript
const performanceMonitoringExtension = Prisma.defineExtension({
  name: 'performanceMonitoring',
  client: {
    $queryMetrics: {
      totalQueries: 0,
      totalDuration: 0,
      slowQueries: [] as any[],
      errorCount: 0
    }
  },
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now()

        try {
          const result = await query(args)
          const duration = performance.now() - start

          // Update metrics
          this.$queryMetrics.totalQueries++
          this.$queryMetrics.totalDuration += duration

          // Track slow queries (>1s)
          if (duration > 1000) {
            this.$queryMetrics.slowQueries.push({
              model,
              operation,
              duration,
              timestamp: new Date()
            })
          }

          return result
        } catch (error) {
          this.$queryMetrics.errorCount++
          throw error
        }
      }
    }
  }
})

// Usage
const prisma = new PrismaClient().$extends(performanceMonitoringExtension)

// Later, access metrics
console.log('Metrics:', prisma.$queryMetrics)
```

### Why Developer-Friendly

1. **Non-invasive** - Logging doesn't change query behavior
2. **Configurable** - Easy to enable/disable per environment
3. **Structured data** - JSON logging for analysis tools
4. **Performance tracking** - Built-in timing
5. **Error context** - Full error details with query context

### Adaptation for Enzyme CLI

```typescript
const cliLoggingExtension = Enzyme.defineExtension({
  name: 'logging',

  generator: {
    $allGenerators: {
      async $allOperations({ generator, operation, args, execute }) {
        const start = performance.now()
        const operationId = crypto.randomUUID()

        // Log start
        logger.info('generation.start', {
          operationId,
          generator,
          operation,
          args,
          timestamp: new Date().toISOString()
        })

        try {
          const result = await execute(args)
          const duration = performance.now() - start

          // Log success
          logger.info('generation.success', {
            operationId,
            generator,
            operation,
            duration,
            filesCreated: result.files.length,
            timestamp: new Date().toISOString()
          })

          return result
        } catch (error) {
          const duration = performance.now() - start

          // Log error
          logger.error('generation.error', {
            operationId,
            generator,
            operation,
            duration,
            error: {
              message: error.message,
              stack: error.stack
            },
            timestamp: new Date().toISOString()
          })

          throw error
        }
      }
    }
  }
})
```

---

## 7. Error Handling Middleware

### Overview
Error handling is critical for a good developer experience. Prisma extensions provide excellent hooks for transforming, logging, and recovering from errors.

### Basic Error Transformation

```typescript
const errorHandlingExtension = Prisma.defineExtension({
  name: 'errorHandling',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args)
        } catch (error) {
          // Transform Prisma errors into application errors
          if (error.code === 'P2002') {
            // Unique constraint violation
            throw new UniqueConstraintError(
              `${model} with these properties already exists`,
              { model, fields: error.meta?.target }
            )
          }

          if (error.code === 'P2025') {
            // Record not found
            throw new NotFoundError(
              `${model} not found`,
              { model, operation }
            )
          }

          // Re-throw unknown errors
          throw error
        }
      }
    }
  }
})
```

### Advanced Error Recovery

```typescript
const errorRecoveryExtension = Prisma.defineExtension({
  name: 'errorRecovery',
  client: {
    async $executeWithRetry<T>(
      fn: (client: PrismaClient) => Promise<T>,
      options: {
        maxRetries?: number
        retryDelay?: number
        retryableErrors?: string[]
      } = {}
    ): Promise<T> {
      const {
        maxRetries = 3,
        retryDelay = 1000,
        retryableErrors = ['P1001', 'P1002', 'P1017'] // Connection errors
      } = options

      let lastError: Error

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await fn(prisma)
        } catch (error) {
          lastError = error

          // Check if error is retryable
          const isRetryable = retryableErrors.includes(error.code)

          if (!isRetryable || attempt === maxRetries - 1) {
            throw error
          }

          // Log retry attempt
          console.warn(
            `Query failed (attempt ${attempt + 1}/${maxRetries}), ` +
            `retrying in ${retryDelay}ms...`,
            { code: error.code, message: error.message }
          )

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }

      throw lastError!
    }
  }
})

// Usage
const user = await prisma.$executeWithRetry(
  async (client) => client.user.findFirst(),
  { maxRetries: 3, retryDelay: 1000 }
)
```

### Error Context Enhancement

```typescript
class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly context: {
      model: string
      operation: string
      args: any
      originalError: Error
    }
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

const errorContextExtension = Prisma.defineExtension({
  name: 'errorContext',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args)
        } catch (error) {
          // Enhance error with full context
          throw new DatabaseError(
            `Database operation failed: ${model}.${operation}`,
            {
              model,
              operation,
              args,
              originalError: error
            }
          )
        }
      }
    }
  }
})
```

### Error Reporting Extension

```typescript
import * as Sentry from '@sentry/node'

const errorReportingExtension = Prisma.defineExtension({
  name: 'errorReporting',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args)
        } catch (error) {
          // Report to error tracking service
          Sentry.captureException(error, {
            tags: {
              model,
              operation,
              prismaVersion: '5.0.0'
            },
            extra: {
              args: sanitizeArgs(args),
              errorCode: error.code,
              errorMeta: error.meta
            }
          })

          // Re-throw to maintain error flow
          throw error
        }
      }
    }
  }
})
```

### Why Developer-Friendly

1. **Centralized error handling** - One place for all error logic
2. **Error transformation** - Convert DB errors to domain errors
3. **Retry logic** - Automatic retry for transient failures
4. **Error reporting** - Integration with monitoring services
5. **Context preservation** - Full query context in errors

### Adaptation for Enzyme CLI

```typescript
const cliErrorHandlingExtension = Enzyme.defineExtension({
  name: 'errorHandling',

  generator: {
    $allGenerators: {
      async $allOperations({ generator, operation, args, execute }) {
        try {
          return await execute(args)
        } catch (error) {
          // Transform errors into user-friendly messages
          if (error.code === 'EEXIST') {
            throw new FileExistsError(
              `File already exists. Use --force to overwrite.`,
              { path: error.path }
            )
          }

          if (error.code === 'EACCES') {
            throw new PermissionError(
              `Permission denied. Check file permissions.`,
              { path: error.path }
            )
          }

          // Log to error service
          await reportError(error, { generator, operation, args })

          throw error
        }
      }
    }
  },

  client: {
    async $executeWithRetry<T>(
      fn: () => Promise<T>,
      maxRetries: number = 3
    ): Promise<T> {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn()
        } catch (error) {
          if (i === maxRetries - 1) throw error

          console.warn(`Retrying... (${i + 1}/${maxRetries})`)
          await new Promise(r => setTimeout(r, 1000))
        }
      }
      throw new Error('Max retries exceeded')
    }
  }
})
```

---

## 8. Result Transformations

### Overview
Result extensions allow synchronous transformation of query results, adding computed fields, hiding sensitive data, and implementing serialization logic.

### Computed Fields Pattern

```typescript
const computedFieldsExtension = Prisma.defineExtension({
  result: {
    user: {
      // Full name from first + last
      fullName: {
        needs: { firstName: true, lastName: true },
        compute(user) {
          return `${user.firstName} ${user.lastName}`
        }
      },

      // Age from birthDate
      age: {
        needs: { birthDate: true },
        compute(user) {
          if (!user.birthDate) return null
          const today = new Date()
          const birthDate = new Date(user.birthDate)
          let age = today.getFullYear() - birthDate.getFullYear()
          const monthDiff = today.getMonth() - birthDate.getMonth()

          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }

          return age
        }
      },

      // Gravatar URL from email
      gravatarUrl: {
        needs: { email: true },
        compute(user) {
          const hash = crypto.createHash('md5').update(user.email).digest('hex')
          return `https://www.gravatar.com/avatar/${hash}`
        }
      }
    },

    post: {
      // Reading time from content
      readingTime: {
        needs: { content: true },
        compute(post) {
          const wordsPerMinute = 200
          const wordCount = post.content.split(/\s+/).length
          const minutes = Math.ceil(wordCount / wordsPerMinute)
          return `${minutes} min read`
        }
      },

      // Excerpt from content
      excerpt: {
        needs: { content: true },
        compute(post) {
          return post.content.substring(0, 150) + '...'
        }
      }
    }
  }
})

// Usage
const user = await prisma.user.findFirst()
console.log(user.fullName)    // "John Doe"
console.log(user.age)          // 30
console.log(user.gravatarUrl)  // "https://..."

const post = await prisma.post.findFirst()
console.log(post.readingTime)  // "5 min read"
console.log(post.excerpt)      // "Lorem ipsum..."
```

### Field Transformation (Serialization)

```typescript
const serializationExtension = Prisma.defineExtension({
  result: {
    user: {
      // Transform Date to ISO string
      createdAtISO: {
        needs: { createdAt: true },
        compute(user) {
          return user.createdAt.toISOString()
        }
      },

      // Format date for display
      createdAtFormatted: {
        needs: { createdAt: true },
        compute(user) {
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(user.createdAt)
        }
      },

      // Relative time (e.g., "2 days ago")
      createdAtRelative: {
        needs: { createdAt: true },
        compute(user) {
          const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
          const daysDiff = Math.floor(
            (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
          return rtf.format(-daysDiff, 'day')
        }
      }
    }
  }
})
```

### Hiding Sensitive Fields

```typescript
const securityExtension = Prisma.defineExtension({
  result: {
    user: {
      // Hide password completely
      password: {
        needs: {},
        compute() {
          return undefined
        }
      },

      // Or obfuscate it
      passwordHash: {
        needs: { password: true },
        compute(user) {
          return '********'
        }
      },

      // Mask email for privacy
      emailMasked: {
        needs: { email: true },
        compute(user) {
          const [local, domain] = user.email.split('@')
          const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1)
          return `${maskedLocal}@${domain}`
        }
      },

      // Last 4 digits of phone
      phoneLast4: {
        needs: { phone: true },
        compute(user) {
          return user.phone.slice(-4)
        }
      }
    }
  }
})
```

### Internationalization (i18n)

```typescript
function createI18nExtension(locale: string) {
  return Prisma.defineExtension({
    result: {
      product: {
        // Localized price
        priceFormatted: {
          needs: { price: true, currency: true },
          compute(product) {
            return new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: product.currency
            }).format(product.price)
          }
        },

        // Localized date
        createdAtLocalized: {
          needs: { createdAt: true },
          compute(product) {
            return new Intl.DateTimeFormat(locale, {
              dateStyle: 'full',
              timeStyle: 'short'
            }).format(product.createdAt)
          }
        }
      }
    }
  })
}

// Usage
const prismaUS = new PrismaClient().$extends(createI18nExtension('en-US'))
const prismaFR = new PrismaClient().$extends(createI18nExtension('fr-FR'))

const productUS = await prismaUS.product.findFirst()
console.log(productUS.priceFormatted) // "$99.99"

const productFR = await prismaFR.product.findFirst()
console.log(productFR.priceFormatted) // "99,99 €"
```

### Performance: Lazy Evaluation

Result extensions compute values **only when accessed**, not automatically after every query:

```typescript
const user = await prisma.user.findFirst()
// fullName NOT yet computed

console.log(user.firstName) // No computation
console.log(user.fullName)  // NOW computed (first access)
console.log(user.fullName)  // Computed again (not cached)
```

### Why Developer-Friendly

1. **Lazy computation** - Only computed when accessed
2. **Type-safe** - TypeScript knows about new fields
3. **Composable** - Multiple result extensions work together
4. **Clean separation** - Business logic separate from data layer
5. **Reusable** - Share extensions across projects

### Limitations

1. ❌ Cannot access relation fields in `needs`
2. ❌ Must be synchronous (no async compute)
3. ❌ Cannot remove/hide original fields (only override)
4. ❌ Computed every access (not memoized)

### Adaptation for Enzyme CLI

```typescript
const templateTransformExtension = Enzyme.defineExtension({
  result: {
    component: {
      // Add computed metadata
      componentMetadata: {
        needs: { name: true, path: true },
        compute(component) {
          return {
            displayName: pascalCase(component.name),
            fileName: `${component.name}.tsx`,
            testFileName: `${component.name}.test.tsx`,
            storyFileName: `${component.name}.stories.tsx`
          }
        }
      },

      // Generate import path
      importPath: {
        needs: { path: true, name: true },
        compute(component) {
          return `@/components/${component.path}/${component.name}`
        }
      }
    },

    page: {
      // Generate route path
      routePath: {
        needs: { name: true },
        compute(page) {
          return `/${kebabCase(page.name)}`
        }
      }
    }
  }
})

// Usage
const component = await enzyme.generate.component('UserProfile')
console.log(component.componentMetadata.displayName) // "UserProfile"
console.log(component.importPath) // "@/components/user/UserProfile"
```

---

## 9. Query Modification Patterns

### Overview
Query extensions allow modifying query arguments before execution, enabling patterns like soft deletes, multi-tenancy, row-level security, and automatic field injection.

### Soft Delete Pattern

```typescript
const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: {
    $allModels: {
      // Intercept delete and convert to update
      async delete({ model, args, query }) {
        return (prisma[model] as any).update({
          ...args,
          data: { deletedAt: new Date() }
        })
      },

      // Intercept deleteMany
      async deleteMany({ model, args, query }) {
        return (prisma[model] as any).updateMany({
          ...args,
          data: { deletedAt: new Date() }
        })
      },

      // Filter out soft-deleted records from reads
      async findUnique({ args, query }) {
        args.where = { ...args.where, deletedAt: null }
        return query(args)
      },

      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null }
        return query(args)
      },

      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null }
        return query(args)
      },

      async count({ args, query }) {
        args.where = { ...args.where, deletedAt: null }
        return query(args)
      }
    }
  },

  model: {
    $allModels: {
      // Add method to find deleted records
      async findManyWithDeleted<T>(this: T, args?: any) {
        const context = Prisma.getExtensionContext(this)
        return (context as any).findMany(args)
      },

      // Add method to restore deleted records
      async restore<T>(this: T, where: any) {
        const context = Prisma.getExtensionContext(this)
        return (context as any).updateMany({
          where: { ...where, deletedAt: { not: null } },
          data: { deletedAt: null }
        })
      },

      // Add method to permanently delete
      async forceDelete<T>(this: T, where: any) {
        const context = Prisma.getExtensionContext(this)
        return (context as any).deleteMany({ where })
      }
    }
  }
})

// Usage
await prisma.user.delete({ where: { id: '123' } }) // Soft delete
await prisma.user.findMany() // Excludes soft-deleted
await prisma.user.findManyWithDeleted() // Includes soft-deleted
await prisma.user.restore({ id: '123' }) // Restore
await prisma.user.forceDelete({ id: '123' }) // Permanent delete
```

### Multi-Tenancy Pattern

```typescript
function createTenantExtension(tenantId: string) {
  return Prisma.defineExtension({
    name: 'multiTenancy',
    query: {
      $allModels: {
        async $allOperations({ args, query, operation }) {
          // Skip for certain models (e.g., global settings)
          const globalModels = ['Setting', 'Migration']
          if (globalModels.includes(model)) {
            return query(args)
          }

          // Inject tenantId into all queries
          if (operation === 'create') {
            args.data = { ...args.data, tenantId }
          } else if (operation === 'createMany') {
            args.data = args.data.map((item: any) => ({ ...item, tenantId }))
          } else {
            // Add to where clause
            args.where = { ...args.where, tenantId }
          }

          return query(args)
        }
      }
    }
  })
}

// Usage per tenant
const tenant1Client = new PrismaClient().$extends(createTenantExtension('tenant-1'))
const tenant2Client = new PrismaClient().$extends(createTenantExtension('tenant-2'))

// Queries automatically scoped to tenant
await tenant1Client.user.findMany() // Only tenant-1 users
await tenant2Client.user.create({ data: { name: 'John' } }) // Auto-adds tenantId
```

### Row-Level Security (RLS)

```typescript
function createRLSExtension(userId: string, role: string) {
  return Prisma.defineExtension({
    name: 'rowLevelSecurity',
    query: {
      post: {
        // Users can only see published posts or their own drafts
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            OR: [
              { published: true },
              { authorId: userId }
            ]
          }
          return query(args)
        },

        // Users can only update their own posts
        async update({ args, query }) {
          if (role !== 'ADMIN') {
            args.where = { ...args.where, authorId: userId }
          }
          return query(args)
        },

        // Users can only delete their own posts
        async delete({ args, query }) {
          if (role !== 'ADMIN') {
            args.where = { ...args.where, authorId: userId }
          }
          return query(args)
        }
      },

      user: {
        // Users can only see public profiles (except admins)
        async findMany({ args, query }) {
          if (role !== 'ADMIN') {
            args.where = {
              ...args.where,
              OR: [
                { isPublic: true },
                { id: userId }
              ]
            }
          }
          return query(args)
        }
      }
    }
  })
}

// Usage per user
const userClient = new PrismaClient().$extends(
  createRLSExtension('user-123', 'USER')
)

const adminClient = new PrismaClient().$extends(
  createRLSExtension('admin-456', 'ADMIN')
)

await userClient.post.findMany() // Only published posts + user's drafts
await adminClient.post.findMany() // All posts
```

### Automatic Field Injection

```typescript
const autoFieldsExtension = Prisma.defineExtension({
  name: 'autoFields',
  query: {
    $allModels: {
      async create({ args, query }) {
        args.data = {
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: getCurrentUserId(),
          version: 1
        }
        return query(args)
      },

      async update({ args, query }) {
        args.data = {
          ...args.data,
          updatedAt: new Date(),
          updatedBy: getCurrentUserId(),
          version: { increment: 1 }
        }
        return query(args)
      },

      async createMany({ args, query }) {
        args.data = args.data.map((item: any) => ({
          ...item,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: getCurrentUserId(),
          version: 1
        }))
        return query(args)
      }
    }
  }
})

function getCurrentUserId(): string {
  // Get from async context, request context, etc.
  return 'user-123'
}
```

### Query Defaults Pattern

```typescript
const queryDefaultsExtension = Prisma.defineExtension({
  name: 'queryDefaults',
  query: {
    post: {
      // Default limit for findMany
      async findMany({ args, query }) {
        args.take = args.take || 50 // Default to 50 results
        return query(args)
      }
    },

    user: {
      // Default sorting
      async findMany({ args, query }) {
        args.orderBy = args.orderBy || { createdAt: 'desc' }
        return query(args)
      }
    },

    $allModels: {
      // Default includes for all models
      async findUnique({ args, query, model }) {
        if (model === 'User') {
          args.include = { ...args.include, profile: true }
        }
        return query(args)
      }
    }
  }
})
```

### Input Validation Pattern

```typescript
const validationExtension = Prisma.defineExtension({
  name: 'validation',
  query: {
    user: {
      async create({ args, query }) {
        // Validate email format
        if (args.data.email && !isValidEmail(args.data.email)) {
          throw new Error('Invalid email format')
        }

        // Validate password strength
        if (args.data.password && !isStrongPassword(args.data.password)) {
          throw new Error('Password must be at least 8 characters')
        }

        // Sanitize inputs
        if (args.data.bio) {
          args.data.bio = sanitizeHtml(args.data.bio)
        }

        return query(args)
      }
    },

    post: {
      async create({ args, query }) {
        // Check for profanity
        if (containsProfanity(args.data.content)) {
          throw new Error('Content contains inappropriate language')
        }

        return query(args)
      }
    }
  }
})
```

### Why Developer-Friendly

1. **Transparent** - Modifications happen automatically
2. **Consistent** - Same rules apply everywhere
3. **Composable** - Multiple query extensions stack
4. **Testable** - Easy to test with/without extensions
5. **Documented** - Extension name describes behavior

### Adaptation for Enzyme CLI

```typescript
const cliQueryModificationExtension = Enzyme.defineExtension({
  name: 'queryModification',

  generator: {
    component: {
      // Auto-add tests and stories
      async generate({ args, execute }) {
        args.options = {
          ...args.options,
          withTests: args.options.withTests ?? true,
          withStory: args.options.withStory ?? true
        }
        return execute(args)
      }
    },

    $allGenerators: {
      // Auto-format all generated files
      async $allOperations({ args, execute }) {
        const result = await execute(args)

        // Format all created files
        for (const file of result.files) {
          await formatFile(file.path)
        }

        return result
      }
    }
  },

  file: {
    // Auto-inject headers
    async write({ args, execute }) {
      const header = generateFileHeader({
        author: getCurrentUser(),
        date: new Date(),
        project: getProjectName()
      })

      args.content = `${header}\n\n${args.content}`

      return execute(args)
    }
  }
})
```

---

## 10. Generator Hooks (for prisma generate)

### Overview
Prisma generators have their own lifecycle separate from runtime queries. While the `$use` and `$extends` patterns don't apply to generation time, there are hook patterns for custom generators.

### Generator Lifecycle

```
1. Schema Parsing
2. Generator Invocation
3. beforeGenerate (custom hook)
4. File Generation
5. afterGenerate (custom hook)
6. Post-processing (formatting, etc.)
```

### Custom Generator Structure

```typescript
import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper'
import { getDMMF, getConfig } from '@prisma/internals'

generatorHandler({
  onManifest() {
    return {
      defaultOutput: '../generated',
      prettyName: 'My Generator',
      requiresGenerators: ['prisma-client-js']
    }
  },

  async onGenerate(options: GeneratorOptions) {
    // Access to full schema
    const dmmf = options.dmmf
    const config = await getConfig({
      datamodel: options.datamodel
    })

    // HOOK: Before generation
    await beforeGenerate(options)

    try {
      // Generate files
      const files = await generateFiles(dmmf, options)

      // Write files
      for (const file of files) {
        await fs.writeFile(file.path, file.content)
      }

      // HOOK: After generation
      await afterGenerate(options, files)

    } catch (error) {
      // HOOK: On error
      await onGenerateError(error, options)
      throw error
    }
  }
})

async function beforeGenerate(options: GeneratorOptions) {
  console.log('Starting generation...')
  // Validate schema
  // Setup output directory
  // Clear previous output
}

async function afterGenerate(options: GeneratorOptions, files: File[]) {
  console.log(`Generated ${files.length} files`)
  // Run prettier
  // Generate index file
  // Update package.json
}

async function onGenerateError(error: Error, options: GeneratorOptions) {
  console.error('Generation failed:', error)
  // Cleanup partial files
  // Report error
}
```

### Pre/Post Generate Hooks (Feature Request)

There's an open feature request for built-in hooks in `prisma.yml` or `package.json`:

```json
{
  "prisma": {
    "hooks": {
      "preGenerate": "echo 'Starting generation...'",
      "postGenerate": "prettier --write generated/**/*.ts"
    }
  }
}
```

**Current Workaround:**
Use npm scripts:

```json
{
  "scripts": {
    "prisma:generate": "prisma generate && npm run format:generated",
    "format:generated": "prettier --write node_modules/.prisma/client/**/*.ts"
  }
}
```

### Generator Extensions Pattern

While not officially supported, you can create wrapper generators:

```typescript
// wrapper-generator.ts
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function generateWithHooks(options: {
  beforeGenerate?: () => Promise<void>
  afterGenerate?: () => Promise<void>
  onError?: (error: Error) => Promise<void>
}) {
  try {
    // Before hook
    if (options.beforeGenerate) {
      await options.beforeGenerate()
    }

    // Run prisma generate
    await execAsync('prisma generate')

    // After hook
    if (options.afterGenerate) {
      await options.afterGenerate()
    }
  } catch (error) {
    // Error hook
    if (options.onError) {
      await options.onError(error as Error)
    }
    throw error
  }
}

// Usage
await generateWithHooks({
  beforeGenerate: async () => {
    console.log('Cleaning output directory...')
    await fs.rm('./generated', { recursive: true })
  },

  afterGenerate: async () => {
    console.log('Formatting generated files...')
    await execAsync('prettier --write ./generated')

    console.log('Running type check...')
    await execAsync('tsc --noEmit')
  },

  onError: async (error) => {
    console.error('Generation failed:', error)
    await sendErrorNotification(error)
  }
})
```

### Community Generator Hooks

Some generators provide their own hooks:

```typescript
// Custom generator with hooks
generator customGen {
  provider = "custom-generator"
  output   = "./generated"

  // Generator-specific config
  hooks = {
    beforeGenerate = "scripts/pre-generate.sh"
    afterGenerate  = "scripts/post-generate.sh"
  }
}
```

### Why Limited Hook Support

Prisma keeps generation simple and deterministic:
1. **Reproducibility** - Same schema = same output
2. **Performance** - No extra processing overhead
3. **Simplicity** - Clear separation of concerns
4. **Tooling integration** - Works with any build system

### Adaptation for Enzyme CLI

The Enzyme CLI can have rich generator hooks since it's purpose-built for generation:

```typescript
const generatorHooksExtension = Enzyme.defineExtension({
  name: 'generatorHooks',

  generator: {
    // Lifecycle hooks for ALL generators
    $allGenerators: {
      async beforeGenerate({ generator, args, modify }) {
        console.log(`Starting ${generator} generation...`)

        // Validate arguments
        validateArgs(args)

        // Clean output directory
        await cleanOutputDir(args.outputDir)

        // Modify args if needed
        modify({
          outputDir: path.resolve(args.outputDir)
        })
      },

      async afterGenerate({ generator, args, result, addFiles }) {
        console.log(`Completed ${generator} generation`)

        // Format all generated files
        for (const file of result.files) {
          await formatFile(file)
        }

        // Add changelog entry
        addFiles([{
          path: 'CHANGELOG.md',
          content: `## ${new Date().toISOString()}\n- Generated ${generator}\n`
        }])

        // Update registry
        await updateComponentRegistry(result.files)
      },

      async onError({ generator, error, cleanup }) {
        console.error(`${generator} generation failed:`, error)

        // Cleanup partial files
        await cleanup()

        // Report error
        await reportError(error)
      }
    },

    // Specific generator hooks
    component: {
      async beforeGenerate({ args, modify }) {
        // Component-specific pre-processing
        const template = await loadTemplate(args.template)
        modify({ template })
      },

      async afterGenerate({ result, addFiles }) {
        // Auto-generate Storybook story
        addFiles([{
          path: `${result.name}.stories.tsx`,
          content: generateStory(result.name)
        }])
      }
    }
  }
})
```

---

## Summary of Patterns & Enzyme Adaptations

| Pattern | Prisma Implementation | Enzyme Adaptation | Priority |
|---------|----------------------|-------------------|----------|
| **Middleware** | Deprecated `$use` | Learn from mistakes | High |
| **Extensions** | Modern `$extends` API | `Enzyme.defineExtension()` | High |
| **Query Hooks** | Query component | Generator lifecycle hooks | High |
| **Model Methods** | Model component | Custom commands/generators | Medium |
| **Result Transform** | Result component | Output transformation | Medium |
| **Client Methods** | Client component | CLI-level utilities | Low |
| **Transactions** | Transaction hooks | Multi-file rollback | Medium |
| **Logging** | Query logging | Generation logging | High |
| **Error Handling** | Error transformation | User-friendly errors | High |
| **Query Modification** | Auto-inject fields | Auto-add tests/format | High |
| **Generator Hooks** | Limited support | Rich lifecycle | High |

---

## Key Takeaways for Enzyme CLI

### 1. Type Safety is Non-Negotiable
- Prisma's migration from `$use` to `$extends` was driven by type safety
- Extensions maintain full TypeScript inference
- Enzyme should provide typed extension APIs from day one

### 2. Composition Over Configuration
- Extensions should be composable and isolated
- Multiple extensions should work together without conflicts
- Base client should never be mutated

### 3. Developer Experience Principles
- **Discoverability**: Extensions show in autocomplete
- **Explicit**: Clear what each extension does
- **Optional**: Extensions are opt-in, not required
- **Reusable**: Package extensions as npm modules
- **Testable**: Easy to test with/without extensions

### 4. Performance Considerations
- Global middleware has performance overhead
- Scoped extensions run only when needed
- Lazy evaluation (result extensions)
- Early exits (check model/operation first)

### 5. Hook Patterns to Implement
1. **Before/After Generation** - File creation lifecycle
2. **Validation** - Pre-generation checks
3. **Transformation** - Post-generation formatting
4. **Error Recovery** - Rollback on failure
5. **Logging** - Structured operation logging

### 6. Extension Component Types for Enzyme
```typescript
Enzyme.defineExtension({
  generator: {}, // Modify generation behavior
  command: {},   // Add CLI commands
  template: {},  // Add template helpers
  file: {},      // File operation hooks
  client: {},    // CLI-level utilities
  result: {}     // Transform generated output
})
```

### 7. Real-World Extension Examples to Build
- **Auto-format** - Format all generated files with Prettier
- **Auto-test** - Always include test files
- **Git integration** - Auto-commit generated files
- **Component registry** - Track all generated components
- **Template library** - Custom template sets
- **Multi-language** - i18n template support
- **Validation** - Pre-generation validation
- **Rollback** - Transaction-like file generation

---

## Recommended Next Steps

1. **Design Extension API**
   - Define `Enzyme.defineExtension()` signature
   - Create type utilities (similar to Prisma's `Args`, `Result`, etc.)
   - Design extension component types

2. **Implement Core Extension System**
   - Extension loader/manager
   - Hook execution engine
   - Extension composition logic

3. **Build Built-in Extensions**
   - Logging extension
   - Formatting extension
   - Validation extension
   - Git integration extension

4. **Create Extension Examples**
   - Custom template library
   - Component registry
   - Auto-documentation
   - Team-specific generators

5. **Documentation**
   - Extension authoring guide
   - Type utility reference
   - Best practices
   - Migration guide (from plugin to extension)

---

## References & Sources

### Official Prisma Documentation
- [Middleware (Reference)](https://www.prisma.io/docs/orm/prisma-client/client-extensions/middleware)
- [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [Query Component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/query)
- [Model Component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/model)
- [Result Component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/result)
- [Client Component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/client)
- [Type Utilities](https://www.prisma.io/docs/orm/prisma-client/client-extensions/type-utilities)
- [Shared Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions/shared-extensions)
- [Soft Delete Middleware](https://www.prisma.io/docs/orm/prisma-client/client-extensions/middleware/soft-delete-middleware)

### Blog Posts & Announcements
- [Client Extensions Preview](https://www.prisma.io/blog/client-extensions-preview-8t3w27xkrxxn)
- [Client Extensions GA (4.16.0)](https://www.prisma.io/blog/client-extensions-ga-4g4yIu8eOSbB)

### GitHub Resources
- [Prisma Repository](https://github.com/prisma/prisma)
- [Prisma Client Extensions Examples](https://github.com/prisma/prisma-client-extensions)
- [Original Extensions Proposal (#15074)](https://github.com/prisma/prisma/issues/15074)

### Community Resources
- [DEV: Extending Prisma ORM with Custom Middleware](https://dev.to/emal_isuranga_2d9d79931d7/extending-prisma-orm-with-custom-middleware-logging-validation-and-security-29cc)
- [Medium: Soft Delete with Client Extensions](https://medium.com/@erciliomarquesmanhica/implementing-soft-delete-in-prisma-using-client-extensions-a-step-by-step-guide-for-nestjs-51a9d0716831)
- [ZenStack: Prisma Client Extensions Use Cases](https://zenstack.dev/blog/prisma-client-extensions)
- [prisma-extension-soft-delete](https://github.com/olivierwilkinson/prisma-extension-soft-delete)
- [NestJS Prisma Integration](https://nestjs-prisma.dev/docs/prisma-middleware/)

---

**End of Report**

*This research provides a comprehensive foundation for implementing enterprise-grade extensibility in the Enzyme CLI framework. The patterns identified here represent industry best practices for creating developer-friendly, type-safe, and composable hook systems.*
