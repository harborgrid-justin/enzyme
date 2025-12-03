# Enzyme CLI - Axios Patterns Implementation Roadmap

**Status:** Draft
**Date:** 2025-12-03
**Target Version:** 2.0.0

---

## Current State Analysis

### Existing Patterns in Enzyme CLI

Based on analysis of the codebase at `/home/user/enzyme/cli/`:

#### ✅ Already Implemented
1. **Plugin/Hook System** (`/cli/src/plugins/loader.ts`)
   - PluginManager with lifecycle hooks
   - beforeGenerate, afterGenerate, validate, init, cleanup hooks
   - Plugin registration and execution

2. **Base Generator Pattern** (`/cli/src/generators/base.ts`)
   - Lifecycle hooks: beforeGenerate, afterGenerate, onError
   - Template rendering with Handlebars
   - Validation utilities
   - File system operations

3. **Command Context Pattern** (`/cli/src/types/index.ts`)
   - CommandContext with logger, config, pluginManager
   - GlobalOptions for CLI flags
   - Structured types for generation

#### ❌ Missing Patterns (Inspired by Axios)
1. **Interceptor Chain Pattern** - No request/response interceptor pattern
2. **Transform Pipeline** - No composable transforms for inputs/outputs
3. **Adapter Pattern** - No abstraction for different execution environments
4. **Smart Config Merging** - Basic config, no property-specific merge strategies
5. **Enhanced Error Objects** - Basic Error, no context preservation
6. **Cancellation Pattern** - No cancellation support for long-running operations
7. **Factory Pattern** - No instance creation with inheritance
8. **Observable Lifecycle** - Limited visibility into command execution phases

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

#### 1.1 Enhanced Error System

**Files to Create:**
- `/cli/src/core/EnzymeError.ts`
- `/cli/src/core/ErrorCodes.ts`

**Implementation:**
```typescript
// cli/src/core/EnzymeError.ts
export class EnzymeError extends Error {
  constructor(
    message: string,
    public code: string,
    public context: {
      command?: string;
      args?: string[];
      cwd?: string;
      config?: any;
      phase?: string;
      duration?: number;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'EnzymeError';
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack
    };
  }

  static isEnzymeError(error: any): error is EnzymeError {
    return error?.name === 'EnzymeError';
  }
}

// cli/src/core/ErrorCodes.ts
export const ErrorCodes = {
  GENERATION_FAILED: 'ERR_GENERATION_FAILED',
  VALIDATION_FAILED: 'ERR_VALIDATION_FAILED',
  PLUGIN_FAILED: 'ERR_PLUGIN_FAILED',
  CONFIG_INVALID: 'ERR_CONFIG_INVALID',
  FILE_EXISTS: 'ERR_FILE_EXISTS',
  TEMPLATE_ERROR: 'ERR_TEMPLATE_ERROR',
  CANCELED: 'ERR_CANCELED'
} as const;
```

**Integration Points:**
- Update `BaseGenerator.onError()` to use EnzymeError
- Update all throw statements in generators
- Add error context capture in command execution

**Benefits:**
- Rich debugging information
- Structured error codes for programmatic handling
- Context preservation for error tracking
- JSON serializable for logging services

---

#### 1.2 Configuration Merger

**Files to Create:**
- `/cli/src/core/ConfigMerger.ts`
- `/cli/src/core/mergeStrategies.ts`

**Implementation:**
```typescript
// cli/src/core/ConfigMerger.ts
export class ConfigMerger {
  private strategies = {
    override: (base: any, override: any) => override ?? base,
    deep: (base: any, override: any) => this.deepMerge(base, override),
    concat: (base: any, override: any) => {
      const arr1 = Array.isArray(base) ? base : [];
      const arr2 = Array.isArray(override) ? override : [];
      return [...arr1, ...arr2];
    }
  };

  private propertyMap = {
    // Override strategy - always use latest
    command: 'override',
    name: 'override',
    type: 'override',

    // Deep merge strategy
    features: 'deep',
    generators: 'deep',
    typescript: 'deep',

    // Concat strategy
    plugins: 'concat',

    // Default: deep merge
    '*': 'deep'
  };

  merge(base: any, override: any): any {
    const result: any = {};
    const allKeys = new Set([
      ...Object.keys(base || {}),
      ...Object.keys(override || {})
    ]);

    for (const key of allKeys) {
      const strategyName = this.propertyMap[key] || this.propertyMap['*'];
      const strategy = this.strategies[strategyName];
      const value = strategy(base?.[key], override?.[key]);

      if (value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  }

  private deepMerge(...objects: any[]): any {
    // Implementation similar to axios
  }
}
```

**Integration Points:**
- Update `ConfigManager.load()` to use ConfigMerger
- Use in command context creation
- Apply to generator options merging

**Benefits:**
- Predictable config behavior
- Plugin config stacking
- Environment-specific overrides
- Type-aware merging

---

#### 1.3 Factory Pattern with Instance Creation

**Files to Create:**
- `/cli/src/core/EnzymeInstance.ts`
- `/cli/src/enzyme.ts` (new main export)

**Implementation:**
```typescript
// cli/src/core/EnzymeInstance.ts
export class EnzymeInstance {
  constructor(public config: EnzymeConfig) {
    this.hooks = new HookManager();
    this.plugins = new PluginManager();
    this.merger = new ConfigMerger();
  }

  async generate(type: string, name: string, options = {}) {
    const context = this.createContext(type, name, options);
    return this.executeWithHooks(context);
  }

  create(config: Partial<EnzymeConfig>) {
    return createInstance(
      this.merger.merge(this.config, config)
    );
  }
}

// cli/src/enzyme.ts
function createInstance(config: EnzymeConfig) {
  const context = new EnzymeInstance(config);

  // Bind generate method
  const instance = bind(EnzymeInstance.prototype.generate, context);

  // Copy prototype methods
  extend(instance, EnzymeInstance.prototype, context);
  extend(instance, context);

  // Add factory method
  instance.create = (instanceConfig: Partial<EnzymeConfig>) => {
    return createInstance(merger.merge(config, instanceConfig));
  };

  return instance;
}

export const enzyme = createInstance(defaults);
export default enzyme;
```

**Integration Points:**
- New main export for programmatic API
- CLI commands use enzyme instance internally
- Allow custom instances in tests

**Benefits:**
- Programmatic API for automation
- Instance isolation for parallel operations
- Config inheritance for different environments
- Easy mocking in tests

---

### Phase 2: Core Patterns (Week 3-4)

#### 2.1 Hook/Interceptor Manager

**Files to Create:**
- `/cli/src/core/HookManager.ts`
- `/cli/src/core/hooks/index.ts`

**Implementation:**
```typescript
// cli/src/core/HookManager.ts
export class HookManager {
  private handlers: Array<{
    fulfilled: Function;
    rejected?: Function;
    synchronous?: boolean;
    runWhen?: (context: any) => boolean;
    priority?: number;
  } | null> = [];

  use(fulfilled: Function, rejected?: Function, options = {}) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options.synchronous || false,
      runWhen: options.runWhen,
      priority: options.priority || 0
    });

    // Sort by priority
    this.handlers.sort((a, b) =>
      (b?.priority || 0) - (a?.priority || 0)
    );

    return this.handlers.length - 1;
  }

  eject(id: number) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  async execute(context: any): Promise<any> {
    let result = context;

    for (const handler of this.handlers) {
      if (!handler) continue;

      if (handler.runWhen && !handler.runWhen(result)) {
        continue;
      }

      try {
        result = await handler.fulfilled(result);
      } catch (error) {
        if (handler.rejected) {
          result = await handler.rejected(error);
        } else {
          throw error;
        }
      }
    }

    return result;
  }
}
```

**Integration Points:**
- Add hooks to EnzymeInstance: preGenerate, postGenerate, preValidate, postValidate, onError
- Update BaseGenerator to use hooks
- Expose hooks in CLI commands

**Usage Example:**
```typescript
enzyme.hooks.preGenerate.use(async (context) => {
  console.log(`Generating ${context.type}: ${context.name}`);
  context.startTime = Date.now();
  return context;
});

enzyme.hooks.postGenerate.use(async (context) => {
  const duration = Date.now() - context.startTime;
  console.log(`Generation completed in ${duration}ms`);

  // Send telemetry
  await analytics.track('generation', {
    type: context.type,
    duration,
    success: true
  });

  return context;
});

// Conditional hooks
enzyme.hooks.preValidate.use(
  async (context) => {
    await checkLicense();
    return context;
  },
  null,
  { runWhen: (ctx) => ctx.type === 'component' }
);
```

**Benefits:**
- Observable generation pipeline
- Plugin developers can inject behavior
- Telemetry and monitoring hooks
- Conditional execution based on context

---

#### 2.2 Transform Pipeline

**Files to Create:**
- `/cli/src/core/TransformPipeline.ts`
- `/cli/src/core/transforms/defaults.ts`
- `/cli/src/core/transforms/input.ts`
- `/cli/src/core/transforms/output.ts`

**Implementation:**
```typescript
// cli/src/core/TransformPipeline.ts
export class TransformPipeline<T = any> {
  private transforms: Array<(data: T, context: any) => T | Promise<T>>;

  constructor(transforms: any[] = []) {
    this.transforms = Array.isArray(transforms) ? transforms : [transforms];
  }

  add(transform: (data: T, context: any) => T | Promise<T>) {
    this.transforms.push(transform);
    return this;
  }

  async execute(data: T, context: any = {}): Promise<T> {
    let result = data;

    for (const transform of this.transforms) {
      result = await transform(result, context);
    }

    return result;
  }
}

// cli/src/core/transforms/input.ts
export const defaultInputTransforms = [
  // Normalize names
  (input: any, context: any) => {
    if (input.name) {
      input.name = input.name.trim();
    }
    return input;
  },

  // Resolve paths
  (input: any, context: any) => {
    if (input.dir) {
      input.dir = path.resolve(context.cwd, input.dir);
    }
    return input;
  },

  // Apply aliases
  (input: any, context: any) => {
    const aliases = context.config?.aliases || {};
    if (input.type && aliases[input.type]) {
      input.type = aliases[input.type];
    }
    return input;
  }
];

// cli/src/core/transforms/output.ts
export const defaultOutputTransforms = [
  // Format file paths
  (output: GenerationResult, context: any) => {
    output.filesCreated = output.filesCreated.map(f =>
      path.relative(context.cwd, f)
    );
    return output;
  },

  // Add metadata
  (output: GenerationResult, context: any) => {
    output.metadata = {
      generatedAt: new Date().toISOString(),
      enzymeVersion: context.version,
      generator: context.type
    };
    return output;
  }
];
```

**Integration Points:**
- Add transforms to EnzymeInstance
- Apply in BaseGenerator before/after generation
- Expose transform API for plugins

**Usage Example:**
```typescript
// Add custom input transform
enzyme.transforms.input.add((input, context) => {
  // Auto-generate test file if not specified
  if (input.type === 'component' && input.tests === undefined) {
    input.tests = context.config.generators.component.tests;
  }
  return input;
});

// Add custom output transform
enzyme.transforms.output.add((output, context) => {
  // Post-process generated files
  output.filesCreated.forEach(file => {
    if (file.endsWith('.ts')) {
      // Run prettier on generated files
      execSync(`prettier --write ${file}`);
    }
  });
  return output;
});
```

**Benefits:**
- Consistent pre/post processing
- Plugin-based customization
- Easy testing through transform injection
- Separation of concerns

---

#### 2.3 Cancellation Pattern

**Files to Create:**
- `/cli/src/core/CancelToken.ts`
- `/cli/src/core/CancelError.ts`

**Implementation:**
```typescript
// cli/src/core/CancelToken.ts
export class CancelToken {
  private _listeners: Array<(reason: string) => void> = [];
  public reason?: string;
  public promise: Promise<string>;

  constructor(executor: (cancel: (reason?: string) => void) => void) {
    let resolvePromise: (reason: string) => void;

    this.promise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    executor((reason = 'Operation canceled') => {
      if (this.reason) return;

      this.reason = reason;
      this._listeners.forEach(listener => listener(reason));
      resolvePromise!(reason);
    });
  }

  subscribe(listener: (reason: string) => void) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    this._listeners.push(listener);
  }

  unsubscribe(listener: (reason: string) => void) {
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  throwIfRequested() {
    if (this.reason) {
      throw new CancelError(this.reason);
    }
  }

  static source() {
    let cancel!: (reason?: string) => void;
    const token = new CancelToken(c => { cancel = c; });
    return { token, cancel };
  }
}

// cli/src/core/CancelError.ts
export class CancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CancelError';
  }

  static isCancelError(error: any): error is CancelError {
    return error?.name === 'CancelError';
  }
}
```

**Integration Points:**
- Add cancelToken to GeneratorOptions
- Check cancellation in BaseGenerator lifecycle
- Support in long-running operations (file I/O, npm install)

**Usage Example:**
```typescript
const { token, cancel } = CancelToken.source();

// Start generation
const generationPromise = enzyme.generate('component', 'MyComponent', {
  cancelToken: token
});

// User can cancel
setTimeout(() => {
  cancel('User canceled generation');
}, 5000);

try {
  await generationPromise;
} catch (error) {
  if (CancelError.isCancelError(error)) {
    console.log('Generation canceled:', error.message);
  }
}
```

**Benefits:**
- Graceful cancellation of long operations
- User can interrupt CLI commands (Ctrl+C)
- Cleanup resources on cancellation
- Better UX for slow operations

---

### Phase 3: Advanced Patterns (Week 5-6)

#### 3.1 Adapter Pattern for Generators

**Files to Create:**
- `/cli/src/adapters/BaseAdapter.ts`
- `/cli/src/adapters/FileSystemAdapter.ts`
- `/cli/src/adapters/MemoryAdapter.ts` (for testing)
- `/cli/src/adapters/RemoteAdapter.ts` (optional)

**Implementation:**
```typescript
// cli/src/adapters/BaseAdapter.ts
export abstract class BaseAdapter {
  abstract writeFile(path: string, content: string): Promise<void>;
  abstract readFile(path: string): Promise<string>;
  abstract exists(path: string): Promise<boolean>;
  abstract ensureDir(path: string): Promise<void>;
  abstract remove(path: string): Promise<void>;
}

// cli/src/adapters/FileSystemAdapter.ts
export class FileSystemAdapter extends BaseAdapter {
  async writeFile(filePath: string, content: string) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async readFile(filePath: string) {
    return fs.readFile(filePath, 'utf-8');
  }

  async exists(filePath: string) {
    return fs.pathExists(filePath);
  }

  async ensureDir(dirPath: string) {
    await fs.ensureDir(dirPath);
  }

  async remove(filePath: string) {
    await fs.remove(filePath);
  }
}

// cli/src/adapters/MemoryAdapter.ts
export class MemoryAdapter extends BaseAdapter {
  private files = new Map<string, string>();

  async writeFile(filePath: string, content: string) {
    this.files.set(filePath, content);
  }

  async readFile(filePath: string) {
    const content = this.files.get(filePath);
    if (!content) throw new Error(`File not found: ${filePath}`);
    return content;
  }

  async exists(filePath: string) {
    return this.files.has(filePath);
  }

  async ensureDir(dirPath: string) {
    // No-op for memory adapter
  }

  async remove(filePath: string) {
    this.files.delete(filePath);
  }

  getFiles() {
    return new Map(this.files);
  }

  clear() {
    this.files.clear();
  }
}
```

**Integration Points:**
- Update BaseGenerator to use adapter
- Add adapter to GeneratorOptions
- Default to FileSystemAdapter

**Usage Example:**
```typescript
// Production: FileSystem adapter
const enzyme = createInstance({
  adapter: new FileSystemAdapter()
});

// Testing: Memory adapter
const testEnzyme = createInstance({
  adapter: new MemoryAdapter()
});

await testEnzyme.generate('component', 'TestComponent');
const files = testEnzyme.adapter.getFiles();

expect(files.has('src/components/TestComponent.tsx')).toBe(true);
expect(files.get('src/components/TestComponent.tsx')).toContain('export');
```

**Benefits:**
- Easy testing without filesystem
- Remote generation (generate on server, download)
- Preview mode (memory adapter)
- Dry-run implementation

---

#### 3.2 Observable Lifecycle with Phases

**Files to Create:**
- `/cli/src/core/GenerationPhase.ts`
- `/cli/src/core/PhaseTracker.ts`

**Implementation:**
```typescript
// cli/src/core/GenerationPhase.ts
export enum GenerationPhase {
  VALIDATION = 'validation',
  PRE_GENERATE = 'pre-generate',
  TEMPLATE_LOAD = 'template-load',
  TEMPLATE_RENDER = 'template-render',
  FILE_WRITE = 'file-write',
  POST_GENERATE = 'post-generate',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export interface PhaseContext {
  phase: GenerationPhase;
  type: string;
  name: string;
  startTime: number;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}

// cli/src/core/PhaseTracker.ts
export class PhaseTracker {
  private phases: PhaseContext[] = [];
  private currentPhase?: PhaseContext;

  startPhase(phase: GenerationPhase, context: any) {
    this.currentPhase = {
      phase,
      type: context.type,
      name: context.name,
      startTime: Date.now()
    };
    this.phases.push(this.currentPhase);

    // Emit event
    this.emit('phase:start', this.currentPhase);
  }

  endPhase(metadata?: Record<string, any>) {
    if (this.currentPhase) {
      this.currentPhase.duration = Date.now() - this.currentPhase.startTime;
      this.currentPhase.metadata = metadata;

      // Emit event
      this.emit('phase:end', this.currentPhase);

      this.currentPhase = undefined;
    }
  }

  failPhase(error: Error) {
    if (this.currentPhase) {
      this.currentPhase.error = error;
      this.emit('phase:error', this.currentPhase);
    }
  }

  getPhases() {
    return [...this.phases];
  }

  private emit(event: string, data: any) {
    // Simple event emitter
    // Can be enhanced with EventEmitter
  }
}
```

**Integration Points:**
- Add PhaseTracker to EnzymeInstance
- Track phases in BaseGenerator
- Expose phase events for monitoring

**Usage Example:**
```typescript
enzyme.phases.on('phase:start', (phase) => {
  console.log(`[${phase.phase}] Started`);
});

enzyme.phases.on('phase:end', (phase) => {
  console.log(`[${phase.phase}] Completed in ${phase.duration}ms`);
});

enzyme.phases.on('phase:error', (phase) => {
  console.error(`[${phase.phase}] Failed:`, phase.error);
});

await enzyme.generate('component', 'MyComponent');

// View execution timeline
const phases = enzyme.phases.getPhases();
phases.forEach(p => {
  console.log(`${p.phase}: ${p.duration}ms`);
});
```

**Benefits:**
- Detailed execution visibility
- Performance profiling
- Debugging generation issues
- Telemetry integration

---

### Phase 4: Developer Experience (Week 7-8)

#### 4.1 Convenience Methods

**Files to Update:**
- `/cli/src/enzyme.ts`

**Implementation:**
```typescript
// Add convenience methods to enzyme instance
enzyme.component = (name: string, options = {}) => {
  return enzyme.generate('component', name, options);
};

enzyme.page = (name: string, options = {}) => {
  return enzyme.generate('page', name, options);
};

enzyme.hook = (name: string, options = {}) => {
  return enzyme.generate('hook', name, options);
};

enzyme.service = (name: string, options = {}) => {
  return enzyme.generate('service', name, options);
};

// Utilities
enzyme.parallel = (operations: Promise<any>[]) => {
  return Promise.all(operations);
};

enzyme.series = async (operations: Promise<any>[]) => {
  const results = [];
  for (const op of operations) {
    results.push(await op);
  }
  return results;
};
```

**Usage Example:**
```typescript
// Before
await enzyme.generate('component', 'Button');

// After
await enzyme.component('Button');

// Parallel generation
await enzyme.parallel([
  enzyme.component('Button'),
  enzyme.component('Input'),
  enzyme.component('Select')
]);

// Series generation
await enzyme.series([
  enzyme.component('Button'),
  enzyme.page('Dashboard'),
  enzyme.hook('useAuth')
]);
```

---

#### 4.2 Plugin SDK

**Files to Create:**
- `/cli/src/sdk/createPlugin.ts`
- `/cli/src/sdk/PluginBuilder.ts`

**Implementation:**
```typescript
// cli/src/sdk/createPlugin.ts
export function createPlugin(name: string, version: string) {
  return new PluginBuilder(name, version);
}

// cli/src/sdk/PluginBuilder.ts
export class PluginBuilder {
  private plugin: Plugin;

  constructor(name: string, version: string) {
    this.plugin = {
      name,
      version,
      hooks: {}
    };
  }

  beforeGenerate(hook: (context: GenerationContext) => void | Promise<void>) {
    this.plugin.hooks.beforeGenerate = hook;
    return this;
  }

  afterGenerate(hook: (context: GenerationContext, result: GenerationResult) => void | Promise<void>) {
    this.plugin.hooks.afterGenerate = hook;
    return this;
  }

  validate(hook: (context: GenerationContext) => ValidationResult | Promise<ValidationResult>) {
    this.plugin.hooks.validate = hook;
    return this;
  }

  config(config: Record<string, any>) {
    this.plugin.config = config;
    return this;
  }

  build() {
    return this.plugin;
  }
}
```

**Usage Example:**
```typescript
// Create a plugin easily
export default createPlugin('enzyme-plugin-prettier', '1.0.0')
  .afterGenerate(async (context, result) => {
    for (const file of result.filesCreated) {
      await runPrettier(file);
    }
  })
  .config({
    tabWidth: 2,
    semi: true
  })
  .build();
```

---

## Migration Guide

### For Existing Generators

```typescript
// Before
export class ComponentGenerator extends BaseGenerator {
  async run() {
    await this.validate();
    const files = await this.generate();
    // ... write files
  }
}

// After
export class ComponentGenerator extends BaseGenerator {
  async run() {
    // Lifecycle now handled by base class
    return super.run();
  }

  // Just implement these
  protected getName() { return 'Component'; }
  protected async validate() { /* ... */ }
  protected async generate() { /* ... */ }
}
```

### For Plugin Developers

```typescript
// Before
export const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    afterGenerate: async (context, result) => {
      // Custom logic
    }
  }
};

// After (same API, now with more hooks)
export const myPlugin = createPlugin('my-plugin', '1.0.0')
  .beforeGenerate(async (context) => {
    // Pre-generation logic
  })
  .afterGenerate(async (context, result) => {
    // Post-generation logic
  })
  .validate(async (context) => {
    // Validation logic
    return { valid: true, errors: [], warnings: [] };
  })
  .build();
```

### For CLI Users

```typescript
// Before: CLI only
$ enzyme generate component Button

// After: CLI + Programmatic API
import { enzyme } from '@enzyme/cli';

await enzyme.component('Button', {
  dir: 'src/components',
  tests: true,
  story: true
});

// With custom instance
const customEnzyme = enzyme.create({
  typescript: true,
  features: { state: 'zustand' }
});

await customEnzyme.component('Counter');
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('EnzymeError', () => {
  it('should preserve context', () => {
    const error = new EnzymeError('Generation failed', 'ERR_GENERATION_FAILED', {
      command: 'generate',
      type: 'component',
      name: 'Button'
    });

    expect(error.code).toBe('ERR_GENERATION_FAILED');
    expect(error.context.type).toBe('component');
    expect(EnzymeError.isEnzymeError(error)).toBe(true);
  });

  it('should serialize to JSON', () => {
    const error = new EnzymeError('Test error', 'ERR_TEST');
    const json = error.toJSON();

    expect(json.message).toBe('Test error');
    expect(json.code).toBe('ERR_TEST');
  });
});

describe('ConfigMerger', () => {
  it('should merge configs with correct strategies', () => {
    const merger = new ConfigMerger();

    const base = {
      features: { auth: true },
      plugins: ['plugin1']
    };

    const override = {
      features: { state: true },
      plugins: ['plugin2']
    };

    const result = merger.merge(base, override);

    expect(result.features).toEqual({ auth: true, state: true });
    expect(result.plugins).toEqual(['plugin1', 'plugin2']);
  });
});

describe('HookManager', () => {
  it('should execute hooks in order', async () => {
    const manager = new HookManager();
    const order: number[] = [];

    manager.use(async (ctx) => {
      order.push(1);
      return ctx;
    });

    manager.use(async (ctx) => {
      order.push(2);
      return ctx;
    });

    await manager.execute({});
    expect(order).toEqual([1, 2]);
  });

  it('should support conditional execution', async () => {
    const manager = new HookManager();
    let executed = false;

    manager.use(
      async (ctx) => {
        executed = true;
        return ctx;
      },
      null,
      { runWhen: (ctx) => ctx.type === 'component' }
    );

    await manager.execute({ type: 'page' });
    expect(executed).toBe(false);

    await manager.execute({ type: 'component' });
    expect(executed).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Enzyme Instance', () => {
  it('should generate component with hooks', async () => {
    const enzyme = createInstance(testConfig);
    const logs: string[] = [];

    enzyme.hooks.preGenerate.use((ctx) => {
      logs.push('pre');
      return ctx;
    });

    enzyme.hooks.postGenerate.use((ctx) => {
      logs.push('post');
      return ctx;
    });

    await enzyme.component('TestComponent');

    expect(logs).toEqual(['pre', 'post']);
  });

  it('should support cancellation', async () => {
    const enzyme = createInstance(testConfig);
    const { token, cancel } = CancelToken.source();

    setTimeout(() => cancel(), 100);

    await expect(
      enzyme.component('TestComponent', { cancelToken: token })
    ).rejects.toThrow(CancelError);
  });
});
```

---

## Performance Considerations

### Benchmarks

```typescript
// Measure generation time
const start = Date.now();
await enzyme.component('TestComponent');
const duration = Date.now() - start;

console.log(`Generation took ${duration}ms`);

// Target: < 100ms for simple component
// Target: < 500ms for complex component with tests + story
```

### Optimization Strategies

1. **Template Caching**: Cache compiled Handlebars templates
2. **Lazy Loading**: Load plugins on-demand
3. **Parallel I/O**: Write multiple files in parallel
4. **Transform Optimization**: Skip unnecessary transforms

---

## Documentation Updates

### API Documentation

Create comprehensive API docs:
- `/docs/api/enzyme-instance.md`
- `/docs/api/hooks.md`
- `/docs/api/transforms.md`
- `/docs/api/adapters.md`
- `/docs/api/plugins.md`

### Migration Guide

Create migration guides:
- `/docs/migrations/v1-to-v2.md`
- `/docs/migrations/plugin-api.md`

### Examples

Create example projects:
- `/examples/custom-instance/`
- `/examples/custom-plugin/`
- `/examples/custom-adapter/`

---

## Success Metrics

### Developer Experience
- ⬇️ Time to first generation: < 30 seconds
- ⬇️ Config complexity: < 10 lines for common setups
- ⬆️ Plugin adoption: 10+ community plugins in 6 months
- ⬆️ API satisfaction: > 90% developer satisfaction

### Technical Metrics
- ⬇️ Generation time: < 100ms for simple components
- ⬆️ Test coverage: > 85%
- ⬆️ Type safety: 100% typed APIs
- ⬇️ Error recovery: < 5% unhandled errors

### Ecosystem Growth
- ⬆️ npm downloads: 2x growth in 6 months
- ⬆️ GitHub stars: 1000+ stars
- ⬆️ Community plugins: 10+ published plugins
- ⬆️ Documentation completeness: 100% API coverage

---

## Rollout Plan

### Week 1-2: Foundation
- ✅ Enhanced error system
- ✅ Config merger
- ✅ Factory pattern
- 📝 Documentation
- ✅ Unit tests

### Week 3-4: Core Patterns
- ✅ Hook manager
- ✅ Transform pipeline
- ✅ Cancellation
- 📝 Integration tests
- 📝 Migration guide

### Week 5-6: Advanced Features
- ✅ Adapter pattern
- ✅ Observable lifecycle
- ✅ Phase tracking
- 📝 Performance tests
- 📝 Example projects

### Week 7-8: Developer Experience
- ✅ Convenience methods
- ✅ Plugin SDK
- 📝 Complete API docs
- 📝 Video tutorials
- 🚀 Beta release

### Week 9-10: Refinement
- 🐛 Bug fixes
- 📊 Performance optimization
- 📝 Documentation polish
- 🎨 CLI UX improvements
- 🚀 v2.0.0 stable release

---

## Breaking Changes

### v2.0.0 Breaking Changes

1. **Error Handling**
   - Before: `throw new Error(message)`
   - After: `throw new EnzymeError(message, code, context)`
   - Migration: Update error handling to check `EnzymeError.isEnzymeError()`

2. **Generator API**
   - Before: Custom `run()` implementation
   - After: Implement `getName()`, `validate()`, `generate()`
   - Migration: Refactor generators to use lifecycle hooks

3. **Plugin API**
   - Before: Manual hook execution
   - After: Automatic hook execution through HookManager
   - Migration: Update plugins to use new hook registration

4. **Config Merging**
   - Before: Simple object spread
   - After: Smart property-aware merging
   - Migration: Review config overrides, may behave differently

---

## Conclusion

This roadmap transforms Enzyme CLI from a simple code generator into an enterprise-grade, extensible CLI framework inspired by axios's best practices. The implementation focuses on:

1. **Developer Experience**: Intuitive APIs, great error messages, powerful debugging
2. **Extensibility**: Hooks, transforms, adapters allow infinite customization
3. **Reliability**: Cancellation, error recovery, type safety
4. **Performance**: Caching, parallel operations, lazy loading
5. **Observability**: Phase tracking, telemetry, debugging tools

By adopting these patterns, Enzyme CLI will:
- ✅ Match axios's developer-friendliness
- ✅ Support enterprise use cases
- ✅ Enable a thriving plugin ecosystem
- ✅ Scale from simple to complex projects
- ✅ Provide best-in-class CLI experience

**Next Steps:**
1. Review and approve roadmap
2. Create GitHub issues for each phase
3. Set up project board for tracking
4. Begin Phase 1 implementation
5. Gather community feedback throughout

---

**Prepared by:** Claude (Anthropic AI)
**Date:** 2025-12-03
**Version:** 1.0
**Status:** Draft - Awaiting Review
