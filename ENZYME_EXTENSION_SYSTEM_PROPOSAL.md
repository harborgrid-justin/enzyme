# Enzyme Extension System Proposal
## Modern, Type-Safe Hook Architecture Inspired by Prisma

**Status:** Proposal
**Version:** 1.0.0
**Date:** December 3, 2025
**Based on:** Prisma Hook Patterns Research

---

## Executive Summary

This proposal outlines a modern extension system for Enzyme CLI that replaces the current plugin architecture with a more powerful, type-safe, and developer-friendly approach inspired by Prisma's evolution from middleware to extensions.

### Goals

1. ✅ **Type Safety**: Full TypeScript inference and autocomplete
2. ✅ **Composability**: Multiple extensions work together seamlessly
3. ✅ **Isolation**: Extensions don't interfere with each other
4. ✅ **Developer Experience**: Intuitive API with great DX
5. ✅ **Performance**: Minimal overhead, scoped execution
6. ✅ **Shareability**: Package and share as npm modules

---

## Current State Analysis

### Existing Plugin System

```typescript
// Current approach - cli/src/types/index.ts
export interface PluginHooks {
  beforeGenerate?: (context: GenerationContext) => Promise<void> | void
  afterGenerate?: (context: GenerationContext, result: GenerationResult) => Promise<void> | void
  validate?: (context: GenerationContext) => Promise<ValidationResult> | ValidationResult
  init?: (context: CommandContext) => Promise<void> | void
  cleanup?: (context: CommandContext) => Promise<void> | void
}

export interface Plugin {
  name: string
  version: string
  description?: string
  hooks: PluginHooks
  config?: Record<string, unknown>
}
```

### Limitations

1. ❌ **Limited hook points** - Only 5 hooks available
2. ❌ **Global only** - All plugins apply to all operations
3. ❌ **No composition** - Difficult to combine plugins
4. ❌ **Weak typing** - Generic context objects
5. ❌ **No scoping** - Can't create isolated enzyme instances
6. ❌ **No result transformation** - Can't modify generated output
7. ❌ **No custom commands** - Can't add CLI commands

---

## Proposed Extension System

### Core Concepts

1. **Extension Components** - Different types for different concerns
2. **Composability** - Stack multiple extensions
3. **Isolation** - Extended instances don't mutate base
4. **Type Safety** - Full TypeScript inference
5. **Discoverability** - IDE autocomplete for extensions

### Extension Component Types

```typescript
// Extension definition
export interface EnzymeExtension {
  // Extension metadata
  name: string
  version?: string

  // Component types
  generator?: GeneratorExtension
  command?: CommandExtension
  template?: TemplateExtension
  file?: FileExtension
  result?: ResultExtension
  client?: ClientExtension
}
```

---

## 1. Generator Extensions

Hook into the generation lifecycle to modify behavior.

### API Design

```typescript
interface GeneratorExtension {
  // Specific generator hooks
  component?: {
    beforeGenerate?: GeneratorHook
    afterGenerate?: GeneratorHook
    onError?: ErrorHook
    validate?: ValidationHook
  }

  page?: {
    beforeGenerate?: GeneratorHook
    afterGenerate?: GeneratorHook
    onError?: ErrorHook
    validate?: ValidationHook
  }

  hook?: {
    beforeGenerate?: GeneratorHook
    afterGenerate?: GeneratorHook
    onError?: ErrorHook
    validate?: ValidationHook
  }

  // Apply to all generators
  $allGenerators?: {
    beforeGenerate?: GeneratorHook
    afterGenerate?: GeneratorHook
    $allOperations?: GeneratorHook
    onError?: ErrorHook
  }
}

interface GeneratorHook {
  (context: {
    generator: string
    operation: 'generate' | 'update' | 'delete'
    name: string
    args: GeneratorArgs
    modify: (changes: Partial<GeneratorArgs>) => void
    execute: (args: GeneratorArgs) => Promise<GeneratorResult>
  }): Promise<GeneratorResult>
}
```

### Example Usage

```typescript
import { Enzyme } from '@enzyme/cli'

// Define extension
const autoTestExtension = Enzyme.defineExtension({
  name: 'auto-test',
  generator: {
    // Apply to specific generator
    component: {
      async beforeGenerate({ args, modify }) {
        // Always include tests
        modify({ withTests: true, withStory: true })
      },

      async afterGenerate({ result, addFiles }) {
        // Generate additional test helpers
        addFiles([{
          path: `${result.name}.helpers.ts`,
          content: generateTestHelpers(result.name)
        }])
      }
    },

    // Apply to all generators
    $allGenerators: {
      async afterGenerate({ result }) {
        // Format all generated files
        for (const file of result.files) {
          await formatFile(file.path)
        }
      }
    }
  }
})

// Apply extension
const enzyme = new Enzyme().$extends(autoTestExtension)

// Or apply multiple extensions
const enzyme = new Enzyme()
  .$extends(autoTestExtension)
  .$extends(loggingExtension)
  .$extends(gitIntegrationExtension)
```

---

## 2. Command Extensions

Add custom CLI commands.

### API Design

```typescript
interface CommandExtension {
  [commandName: string]: {
    description: string
    options?: OptionDefinition[]
    handler: CommandHandler
  }
}

interface CommandHandler {
  (context: CommandContext, options: any): Promise<void>
}
```

### Example Usage

```typescript
const customCommandsExtension = Enzyme.defineExtension({
  name: 'custom-commands',
  command: {
    analyze: {
      description: 'Analyze project structure',
      options: [
        { name: 'depth', type: 'number', default: 3 },
        { name: 'format', type: 'string', choices: ['json', 'table'] }
      ],
      async handler(context, options) {
        const analysis = await analyzeProject(context.cwd, options)

        if (options.format === 'json') {
          console.log(JSON.stringify(analysis, null, 2))
        } else {
          context.logger.table(analysis)
        }
      }
    },

    scaffold: {
      description: 'Scaffold a complete feature',
      async handler(context, options) {
        await enzyme.generate.component(options.name)
        await enzyme.generate.service(options.name)
        await enzyme.generate.page(options.name)
      }
    }
  }
})

// Usage
const enzyme = new Enzyme().$extends(customCommandsExtension)

// New commands available:
// enzyme analyze --depth 5 --format table
// enzyme scaffold UserProfile
```

---

## 3. Template Extensions

Add custom template helpers and filters.

### API Design

```typescript
interface TemplateExtension {
  helpers?: Record<string, TemplateHelper>
  filters?: Record<string, TemplateFilter>
  partials?: Record<string, string>
}

type TemplateHelper = (...args: any[]) => any
type TemplateFilter = (value: any, ...args: any[]) => any
```

### Example Usage

```typescript
const templateExtension = Enzyme.defineExtension({
  name: 'template-helpers',
  template: {
    helpers: {
      // Custom helpers for templates
      capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),

      timestamp: () => new Date().toISOString(),

      author: () => process.env.USER || 'unknown',

      license: (type: string = 'MIT') => {
        return readLicenseTemplate(type)
      }
    },

    filters: {
      // Custom filters
      kebab: (str: string) => kebabCase(str),
      pascal: (str: string) => pascalCase(str),
      snake: (str: string) => snakeCase(str)
    },

    partials: {
      // Reusable template parts
      header: `/**
 * @file {{name}}
 * @author {{author}}
 * @created {{timestamp}}
 */`,

      footer: `// Generated by Enzyme CLI v{{version}}`
    }
  }
})

// Templates can now use: {{capitalize name}}, {{author}}, {{name | kebab}}
```

---

## 4. File Extensions

Hook into file operations.

### API Design

```typescript
interface FileExtension {
  beforeWrite?: FileHook
  afterWrite?: FileHook
  beforeRead?: FileHook
  afterRead?: FileHook
  onError?: FileErrorHook
}

interface FileHook {
  (context: {
    path: string
    content: string
    modify: (changes: { content?: string; path?: string }) => void
  }): Promise<void>
}
```

### Example Usage

```typescript
const fileExtension = Enzyme.defineExtension({
  name: 'file-processing',
  file: {
    async beforeWrite({ path, content, modify }) {
      // Auto-format before writing
      const formatted = await prettier.format(content, {
        parser: getParser(path),
        ...prettierConfig
      })

      // Add file header
      const header = generateHeader(path)
      modify({ content: `${header}\n\n${formatted}` })
    },

    async afterWrite({ path, success }) {
      if (success) {
        console.log(`✓ Created ${path}`)

        // Update file registry
        await updateRegistry(path)
      }
    },

    async onError({ path, error, retry }) {
      console.error(`✗ Failed to write ${path}:`, error)

      // Retry on specific errors
      if (error.code === 'ENOSPC') {
        console.log('Disk full, cleaning up...')
        await cleanup()
        await retry()
      }
    }
  }
})
```

---

## 5. Result Extensions

Transform generated output.

### API Design

```typescript
interface ResultExtension {
  component?: {
    [fieldName: string]: ResultField
  }
  page?: {
    [fieldName: string]: ResultField
  }
  hook?: {
    [fieldName: string]: ResultField
  }
}

interface ResultField {
  needs: string[]  // Dependencies
  compute: (result: any) => any  // Computation
}
```

### Example Usage

```typescript
const resultExtension = Enzyme.defineExtension({
  name: 'result-enhancement',
  result: {
    component: {
      // Add computed metadata
      metadata: {
        needs: ['name', 'path'],
        compute(component) {
          return {
            displayName: pascalCase(component.name),
            fileName: `${component.name}.tsx`,
            testFileName: `${component.name}.test.tsx`,
            storyFileName: `${component.name}.stories.tsx`,
            importPath: `@/components/${component.path}/${component.name}`
          }
        }
      },

      // Generate boilerplate
      boilerplate: {
        needs: ['name'],
        compute(component) {
          return {
            props: `${component.name}Props`,
            testId: `test-${kebabCase(component.name)}`
          }
        }
      }
    },

    page: {
      routeConfig: {
        needs: ['name', 'path'],
        compute(page) {
          return {
            path: `/${kebabCase(page.name)}`,
            component: pascalCase(page.name),
            exact: true
          }
        }
      }
    }
  }
})

// Usage
const result = await enzyme.generate.component('UserProfile')
console.log(result.metadata.importPath)  // "@/components/user/UserProfile"
console.log(result.metadata.testFileName)  // "UserProfile.test.tsx"
console.log(result.boilerplate.props)  // "UserProfileProps"
```

---

## 6. Client Extensions

Add top-level CLI utilities.

### API Design

```typescript
interface ClientExtension {
  [methodName: string]: ClientMethod
}

type ClientMethod = (this: EnzymeClient, ...args: any[]) => any
```

### Example Usage

```typescript
const clientExtension = Enzyme.defineExtension({
  name: 'utilities',
  client: {
    // Health check
    async $healthCheck() {
      const checks = {
        nodeVersion: process.version,
        enzymeVersion: this.version,
        configValid: await this.validateConfig(),
        dependenciesInstalled: await checkDependencies()
      }

      return {
        healthy: Object.values(checks).every(Boolean),
        checks
      }
    },

    // Batch generation with rollback
    async $generateMany(items: GenerationItem[]) {
      const createdFiles: string[] = []

      try {
        for (const item of items) {
          const result = await this.generate[item.type](item.name, item.options)
          createdFiles.push(...result.files)
        }

        return { success: true, files: createdFiles }
      } catch (error) {
        // Rollback all files
        for (const file of createdFiles) {
          await fs.unlink(file).catch(() => {})
        }

        throw error
      }
    },

    // Smart cleanup
    async $cleanup(options: CleanupOptions) {
      const orphanedFiles = await findOrphanedFiles()
      const unusedComponents = await findUnusedComponents()

      if (options.interactive) {
        const selected = await promptForCleanup(orphanedFiles, unusedComponents)
        await deleteFiles(selected)
      } else {
        await deleteFiles([...orphanedFiles, ...unusedComponents])
      }
    }
  }
})

// Usage
const enzyme = new Enzyme().$extends(clientExtension)

const health = await enzyme.$healthCheck()
await enzyme.$generateMany([
  { type: 'component', name: 'Button' },
  { type: 'component', name: 'Input' },
  { type: 'page', name: 'Dashboard' }
])
await enzyme.$cleanup({ interactive: true })
```

---

## Type System Design

### Core Type Utilities

```typescript
// Similar to Prisma's type utilities
export namespace Enzyme {
  /**
   * Define an extension with type inference
   */
  export function defineExtension<T extends EnzymeExtension>(extension: T): T {
    return extension
  }

  /**
   * Get arguments for a generator
   */
  export type Args<
    Generator extends keyof Generators,
    Operation extends keyof Generators[Generator]
  > = Parameters<Generators[Generator][Operation]>[0]

  /**
   * Get result type for a generator
   */
  export type Result<
    Generator extends keyof Generators,
    Operation extends keyof Generators[Generator]
  > = ReturnType<Generators[Generator][Operation]>

  /**
   * Get extension context at runtime
   */
  export function getExtensionContext<T>(instance: T): T {
    return (instance as any).__enzymeContext
  }

  /**
   * Exact type matching (for strict type checking)
   */
  export type Exact<Input, Shape> =
    Input extends Shape
      ? Exclude<keyof Input, keyof Shape> extends never
        ? Input
        : never
      : never
}
```

### Usage with Type Safety

```typescript
// Full type inference
const extension = Enzyme.defineExtension({
  name: 'typed-extension',
  generator: {
    component: {
      async beforeGenerate({ args, modify }) {
        // args is fully typed as ComponentOptions
        // modify has correct parameter types
        modify({ withTests: true })  // ✓ Type-safe
        modify({ invalidProp: true })  // ✗ Type error
      }
    }
  }
})

// Type utilities
type ComponentArgs = Enzyme.Args<'component', 'generate'>
type ComponentResult = Enzyme.Result<'component', 'generate'>

// Strict type checking
function createComponentExtension<T, A>(
  args: Enzyme.Exact<A, ComponentArgs>
): ComponentResult {
  // Implementation
}
```

---

## Extension Composition

### Combining Extensions

```typescript
// Create base client
const enzyme = new Enzyme()

// Apply extensions in order
const extendedEnzyme = enzyme
  .$extends(loggingExtension)      // 1. Logging first
  .$extends(validationExtension)   // 2. Then validation
  .$extends(formattingExtension)   // 3. Then formatting
  .$extends(gitExtension)          // 4. Finally git integration

// Extensions execute in order:
// beforeGenerate: logging → validation → formatting → git → actual generation
// afterGenerate: actual generation → git → formatting → validation → logging
```

### Extension Isolation

```typescript
// Different configurations for different contexts
const productionEnzyme = new Enzyme()
  .$extends(strictValidationExtension)
  .$extends(minificationExtension)
  .$extends(productionLoggingExtension)

const developmentEnzyme = new Enzyme()
  .$extends(relaxedValidationExtension)
  .$extends(verboseLoggingExtension)
  .$extends(hotReloadExtension)

const testEnzyme = new Enzyme()
  .$extends(mockDataExtension)
  .$extends(snapshotExtension)

// Each instance is completely isolated
```

### Shared Extensions

```typescript
// Create shareable extension
export const myTeamExtension = Enzyme.defineExtension({
  name: '@myteam/enzyme-extension',
  version: '1.0.0',
  generator: {
    $allGenerators: {
      async beforeGenerate({ args, modify }) {
        // Team-specific logic
        modify({
          author: process.env.AUTHOR || 'Team',
          license: 'Proprietary'
        })
      }
    }
  },
  template: {
    helpers: {
      teamFormat: (str: string) => {
        // Team-specific formatting
      }
    }
  }
})

// Publish to npm: @myteam/enzyme-extension
// Use in projects:
import { myTeamExtension } from '@myteam/enzyme-extension'

const enzyme = new Enzyme().$extends(myTeamExtension)
```

---

## Real-World Extension Examples

### 1. Auto-Format Extension

```typescript
export const autoFormatExtension = Enzyme.defineExtension({
  name: 'auto-format',
  file: {
    async beforeWrite({ path, content, modify }) {
      const formatted = await prettier.format(content, {
        parser: getParserFromPath(path),
        ...loadPrettierConfig()
      })

      modify({ content: formatted })
    }
  }
})
```

### 2. Git Integration Extension

```typescript
export const gitExtension = Enzyme.defineExtension({
  name: 'git-integration',
  generator: {
    $allGenerators: {
      async afterGenerate({ result }) {
        // Stage generated files
        await exec(`git add ${result.files.join(' ')}`)

        // Create commit
        await exec(`git commit -m "Generate ${result.name}"`)
      }
    }
  }
})
```

### 3. Component Registry Extension

```typescript
export const registryExtension = Enzyme.defineExtension({
  name: 'component-registry',
  generator: {
    component: {
      async afterGenerate({ result, addFiles }) {
        // Update registry
        const registry = await loadRegistry()
        registry.components.push({
          name: result.name,
          path: result.path,
          createdAt: new Date(),
          dependencies: result.dependencies
        })
        await saveRegistry(registry)

        // Generate index
        addFiles([{
          path: 'src/components/index.ts',
          content: generateComponentIndex(registry.components)
        }])
      }
    }
  },

  command: {
    registry: {
      description: 'Show component registry',
      async handler(context) {
        const registry = await loadRegistry()
        context.logger.table(registry.components)
      }
    }
  }
})
```

### 4. Documentation Extension

```typescript
export const docsExtension = Enzyme.defineExtension({
  name: 'auto-docs',
  generator: {
    $allGenerators: {
      async afterGenerate({ generator, result, addFiles }) {
        // Generate documentation
        const docs = await generateDocs(generator, result)

        addFiles([{
          path: `docs/${result.name}.md`,
          content: docs
        }])

        // Update main docs index
        await updateDocsIndex(result.name)
      }
    }
  },

  command: {
    'docs:serve': {
      description: 'Serve documentation',
      async handler(context) {
        await startDocsServer()
      }
    }
  }
})
```

### 5. Validation Extension

```typescript
export const strictValidationExtension = Enzyme.defineExtension({
  name: 'strict-validation',
  generator: {
    $allGenerators: {
      async beforeGenerate({ name, args }) {
        // Name validation
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
          throw new Error('Name must be PascalCase')
        }

        // Check for duplicates
        if (await fileExists(args.path)) {
          throw new Error(`File already exists: ${args.path}`)
        }

        // Validate dependencies
        if (args.dependencies) {
          for (const dep of args.dependencies) {
            if (!await isInstalled(dep)) {
              throw new Error(`Dependency not installed: ${dep}`)
            }
          }
        }
      }
    }
  }
})
```

### 6. Performance Monitoring Extension

```typescript
export const performanceExtension = Enzyme.defineExtension({
  name: 'performance',
  client: {
    $metrics: {
      totalGenerations: 0,
      totalDuration: 0,
      slowOperations: [] as any[]
    }
  },
  generator: {
    $allGenerators: {
      async $allOperations({ generator, operation, execute, args }) {
        const start = performance.now()

        try {
          const result = await execute(args)
          const duration = performance.now() - start

          // Update metrics
          this.$metrics.totalGenerations++
          this.$metrics.totalDuration += duration

          // Track slow operations (>5s)
          if (duration > 5000) {
            this.$metrics.slowOperations.push({
              generator,
              operation,
              duration,
              timestamp: new Date()
            })
          }

          console.log(`⏱️  ${generator}.${operation} - ${duration.toFixed(2)}ms`)

          return result
        } catch (error) {
          const duration = performance.now() - start
          console.error(`❌ ${generator}.${operation} failed after ${duration.toFixed(2)}ms`)
          throw error
        }
      }
    }
  },
  command: {
    metrics: {
      description: 'Show performance metrics',
      async handler(context) {
        console.log('Performance Metrics:')
        console.log(`Total Generations: ${this.$metrics.totalGenerations}`)
        console.log(`Average Duration: ${(this.$metrics.totalDuration / this.$metrics.totalGenerations).toFixed(2)}ms`)

        if (this.$metrics.slowOperations.length > 0) {
          console.log('\nSlow Operations:')
          context.logger.table(this.$metrics.slowOperations)
        }
      }
    }
  }
})
```

---

## Migration Path

### Phase 1: Deprecation Notice (v1.1.0)
- Add deprecation warnings to current plugin system
- Document migration guide
- Provide codemods for automatic migration

### Phase 2: Dual Support (v1.2.0)
- Implement extension system alongside plugins
- Allow both systems to coexist
- Provide adapter to wrap plugins as extensions

### Phase 3: Extension-Only (v2.0.0)
- Remove plugin system completely
- Extensions are the only extensibility mechanism

### Plugin to Extension Adapter

```typescript
// Temporary adapter for backwards compatibility
function pluginToExtension(plugin: Plugin): EnzymeExtension {
  return Enzyme.defineExtension({
    name: plugin.name,
    generator: {
      $allGenerators: {
        async beforeGenerate(context) {
          if (plugin.hooks.beforeGenerate) {
            await plugin.hooks.beforeGenerate({
              type: context.generator,
              name: context.name,
              outputDir: context.args.outputDir,
              options: context.args,
              context: globalContext
            })
          }
          return context.execute(context.args)
        },

        async afterGenerate(context) {
          if (plugin.hooks.afterGenerate) {
            await plugin.hooks.afterGenerate(
              /* ... */,
              context.result
            )
          }
          return context.result
        }
      }
    }
  })
}

// Usage
const enzyme = new Enzyme()
  .$extends(pluginToExtension(oldPlugin))
```

---

## Implementation Checklist

### Core Infrastructure
- [ ] Define `EnzymeExtension` type
- [ ] Implement `Enzyme.defineExtension()`
- [ ] Implement `$extends()` method
- [ ] Create extension manager/loader
- [ ] Implement hook execution engine
- [ ] Add extension composition logic

### Extension Components
- [ ] Generator extensions
- [ ] Command extensions
- [ ] Template extensions
- [ ] File extensions
- [ ] Result extensions
- [ ] Client extensions

### Type System
- [ ] Type utilities (`Args`, `Result`, etc.)
- [ ] Runtime type validation
- [ ] Extension type inference
- [ ] TypeScript declaration generation

### Built-in Extensions
- [ ] Auto-format extension
- [ ] Logging extension
- [ ] Validation extension
- [ ] Git integration extension
- [ ] Performance monitoring extension

### Documentation
- [ ] Extension authoring guide
- [ ] API reference
- [ ] Type utilities documentation
- [ ] Migration guide (plugin → extension)
- [ ] Example extensions repository

### Testing
- [ ] Extension unit tests
- [ ] Composition tests
- [ ] Type safety tests
- [ ] Integration tests
- [ ] Performance benchmarks

---

## Success Metrics

### Developer Experience
- ✅ Extensions discoverable via IDE autocomplete
- ✅ Zero type errors when using extensions
- ✅ Extension composition "just works"
- ✅ Clear error messages when extension fails

### Performance
- ✅ Extension overhead < 5% of base operation
- ✅ Lazy loading of extensions
- ✅ No performance regression from current plugin system

### Adoption
- ✅ 3+ community extensions published within 3 months
- ✅ 80% of users migrate from plugins to extensions within 6 months
- ✅ Positive feedback from early adopters

---

## Conclusion

This extension system provides Enzyme CLI with a modern, type-safe, and composable hook architecture that significantly improves upon the current plugin system. Inspired by Prisma's successful evolution, this approach prioritizes developer experience, type safety, and flexibility while maintaining performance.

The key innovations include:

1. **Multiple extension points** - Generator, command, template, file, result, and client extensions
2. **Full type safety** - TypeScript inference throughout
3. **Composability** - Stack extensions without conflicts
4. **Isolation** - Independent extended instances
5. **Shareability** - Package as npm modules

By implementing this system, Enzyme CLI will provide enterprise-grade extensibility that empowers developers to customize and extend the framework to meet their specific needs while maintaining a consistent, type-safe developer experience.

---

**Next Steps:**
1. Review and approve proposal
2. Create proof-of-concept implementation
3. Build core infrastructure
4. Develop built-in extensions
5. Write documentation
6. Announce to community
7. Gather feedback and iterate
