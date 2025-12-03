# Axios Patterns - Quick Reference Guide

**Target Audience:** Enzyme Development Team
**Purpose:** Quick lookup for implementing axios-inspired patterns

---

## 1. Interceptor/Hook Pattern

### Axios Implementation
```javascript
// Request interceptor
axios.interceptors.request.use(
  config => {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor
axios.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);
```

### Enzyme Adaptation
```typescript
// Pre-generation hook
enzyme.hooks.preGenerate.use(
  async (context) => {
    console.log(`Generating ${context.type}: ${context.name}`);
    context.startTime = Date.now();
    return context;
  },
  async (error) => {
    console.error('Pre-generation failed:', error);
    throw error;
  }
);

// Post-generation hook
enzyme.hooks.postGenerate.use(async (context) => {
  const duration = Date.now() - context.startTime;
  await analytics.track('generation', { type: context.type, duration });
  return context;
});

// Conditional hook
enzyme.hooks.preValidate.use(
  async (context) => {
    await checkLicense();
    return context;
  },
  null,
  { runWhen: (ctx) => ctx.type === 'component' }
);
```

### Key Files
- **Create:** `/cli/src/core/HookManager.ts`
- **Update:** `/cli/src/core/EnzymeInstance.ts`
- **Example:** `/examples/custom-hooks/`

---

## 2. Enhanced Error Pattern

### Axios Implementation
```javascript
try {
  await axios.get('/api/users');
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Config:', error.config);
    console.log('Code:', error.code);
  }
}
```

### Enzyme Adaptation
```typescript
try {
  await enzyme.component('Button');
} catch (error) {
  if (EnzymeError.isEnzymeError(error)) {
    console.log('Error Code:', error.code);
    console.log('Command:', error.context.command);
    console.log('Phase:', error.context.phase);
    console.log('Duration:', error.context.duration);

    // Structured logging
    logger.error(JSON.stringify(error.toJSON(), null, 2));

    // Error handling by code
    switch (error.code) {
      case ErrorCodes.VALIDATION_FAILED:
        showValidationHelp();
        break;
      case ErrorCodes.FILE_EXISTS:
        promptForOverwrite();
        break;
      case ErrorCodes.TEMPLATE_ERROR:
        reportTemplateIssue(error);
        break;
    }
  }
}
```

### Key Files
- **Create:** `/cli/src/core/EnzymeError.ts`
- **Create:** `/cli/src/core/ErrorCodes.ts`
- **Update:** `/cli/src/generators/base.ts`

---

## 3. Config Merging Pattern

### Axios Implementation
```javascript
// Global defaults
axios.defaults.baseURL = 'https://api.example.com';
axios.defaults.timeout = 5000;

// Instance defaults (merges with global)
const api = axios.create({
  baseURL: 'https://api.other.com',  // Overrides
  headers: { 'X-Custom': 'value' }   // Merges
});

// Request config (merges with instance + global)
api.get('/users', {
  timeout: 10000  // Overrides instance timeout
});
```

### Enzyme Adaptation
```typescript
// Global configuration
enzyme.config = {
  typescript: true,
  features: { auth: true, state: 'zustand' },
  generators: { component: { tests: true } }
};

// Instance configuration (merges with global)
const customEnzyme = enzyme.create({
  features: { auth: true, theme: 'tailwind' },  // Deep merge
  generators: { component: { story: true } }    // Deep merge
});
// Result: features = { auth: true, state: 'zustand', theme: 'tailwind' }
// Result: generators.component = { tests: true, story: true }

// Command-specific config (merges with instance + global)
await customEnzyme.component('Button', {
  tests: false  // Overrides instance setting
});
```

### Key Files
- **Create:** `/cli/src/core/ConfigMerger.ts`
- **Update:** `/cli/src/config/manager.ts`

---

## 4. Transform Pipeline Pattern

### Axios Implementation
```javascript
// Request transform
axios.defaults.transformRequest = [
  ...axios.defaults.transformRequest,
  (data, headers) => {
    // Encrypt sensitive data
    if (data.password) {
      data.password = encrypt(data.password);
    }
    return data;
  }
];

// Response transform
axios.defaults.transformResponse = [
  ...axios.defaults.transformResponse,
  (data) => {
    // Normalize API response
    return {
      success: true,
      payload: data,
      timestamp: Date.now()
    };
  }
];
```

### Enzyme Adaptation
```typescript
// Input transform
enzyme.transforms.input.add((input, context) => {
  // Normalize component name
  if (input.name) {
    input.name = toPascalCase(input.name);
  }

  // Apply template from config
  if (!input.template && context.config.defaultTemplate) {
    input.template = context.config.defaultTemplate;
  }

  return input;
});

// Output transform
enzyme.transforms.output.add(async (output, context) => {
  // Run prettier on generated files
  for (const file of output.filesCreated) {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      await runPrettier(file);
    }
  }

  // Add git staging
  if (context.config.autoStage) {
    await gitAdd(output.filesCreated);
  }

  return output;
});
```

### Key Files
- **Create:** `/cli/src/core/TransformPipeline.ts`
- **Create:** `/cli/src/core/transforms/defaults.ts`
- **Update:** `/cli/src/generators/base.ts`

---

## 5. Adapter Pattern

### Axios Implementation
```javascript
// Custom adapter
const cacheAdapter = (config) => {
  const cache = new Map();
  const key = config.url;

  if (cache.has(key)) {
    return Promise.resolve(cache.get(key));
  }

  return axios.defaults.adapter(config).then(response => {
    cache.set(key, response);
    return response;
  });
};

const api = axios.create({ adapter: cacheAdapter });
```

### Enzyme Adaptation
```typescript
// Production: FileSystem adapter
const enzyme = createInstance({
  adapter: new FileSystemAdapter()
});

// Testing: Memory adapter
const testEnzyme = createInstance({
  adapter: new MemoryAdapter()
});

await testEnzyme.component('Button');
const files = testEnzyme.adapter.getFiles();
expect(files.has('src/components/Button.tsx')).toBe(true);

// Custom adapter
class LoggingAdapter extends FileSystemAdapter {
  async writeFile(path: string, content: string) {
    console.log(`Writing: ${path}`);
    return super.writeFile(path, content);
  }
}

const loggingEnzyme = createInstance({
  adapter: new LoggingAdapter()
});
```

### Key Files
- **Create:** `/cli/src/adapters/BaseAdapter.ts`
- **Create:** `/cli/src/adapters/FileSystemAdapter.ts`
- **Create:** `/cli/src/adapters/MemoryAdapter.ts`
- **Update:** `/cli/src/generators/base.ts`

---

## 6. Cancellation Pattern

### Axios Implementation
```javascript
// Method 1: CancelToken.source()
const source = axios.CancelToken.source();

axios.get('/api/users', {
  cancelToken: source.token
}).catch(error => {
  if (axios.isCancel(error)) {
    console.log('Canceled:', error.message);
  }
});

source.cancel('User canceled');

// Method 2: AbortController
const controller = new AbortController();

axios.get('/api/users', {
  signal: controller.signal
});

controller.abort();
```

### Enzyme Adaptation
```typescript
// Method 1: CancelToken
const { token, cancel } = CancelToken.source();

const promise = enzyme.component('Button', {
  cancelToken: token
});

// User can cancel (e.g., on Ctrl+C)
setTimeout(() => cancel('Operation timed out'), 30000);

try {
  await promise;
} catch (error) {
  if (CancelError.isCancelError(error)) {
    console.log('Generation canceled:', error.message);
  }
}

// Method 2: Timeout wrapper
async function generateWithTimeout(type, name, timeout) {
  const source = CancelToken.source();

  const timer = setTimeout(() => {
    source.cancel(`Timeout after ${timeout}ms`);
  }, timeout);

  try {
    const result = await enzyme.generate(type, name, {
      cancelToken: source.token
    });
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

await generateWithTimeout('component', 'Button', 5000);
```

### Key Files
- **Create:** `/cli/src/core/CancelToken.ts`
- **Create:** `/cli/src/core/CancelError.ts`
- **Update:** `/cli/src/generators/base.ts`

---

## 7. Factory Pattern

### Axios Implementation
```javascript
// Default instance
await axios.get('/api/users');

// Custom instance
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000
});

await api.get('/users');

// Sub-instance (inherits from parent)
const authApi = api.create({
  headers: { 'Authorization': 'Bearer token' }
});

await authApi.get('/me');
```

### Enzyme Adaptation
```typescript
// Default instance
await enzyme.component('Button');

// Custom instance
const customEnzyme = enzyme.create({
  typescript: true,
  features: { state: 'zustand', theme: 'tailwind' }
});

await customEnzyme.component('Counter');

// Environment-specific instances
const devEnzyme = enzyme.create({
  env: 'development',
  adapter: new FileSystemAdapter()
});

const testEnzyme = enzyme.create({
  env: 'test',
  adapter: new MemoryAdapter()
});

const prodEnzyme = enzyme.create({
  env: 'production',
  adapter: new RemoteAdapter({ endpoint: 'https://gen.example.com' })
});
```

### Key Files
- **Create:** `/cli/src/enzyme.ts` (main export)
- **Create:** `/cli/src/core/EnzymeInstance.ts`
- **Update:** `/cli/src/index.ts`

---

## 8. Observable Lifecycle Pattern

### Axios Implementation
```javascript
// Interceptor chain provides observability
axios.interceptors.request.use(config => {
  console.log('→ Request:', config.method, config.url);
  config.meta = { startTime: Date.now() };
  return config;
});

axios.interceptors.response.use(response => {
  const duration = Date.now() - response.config.meta.startTime;
  console.log('← Response:', response.status, `${duration}ms`);
  return response;
});
```

### Enzyme Adaptation
```typescript
// Phase tracking
enzyme.phases.on('phase:start', (phase) => {
  console.log(`[${phase.phase}] Started`);
});

enzyme.phases.on('phase:end', (phase) => {
  console.log(`[${phase.phase}] ${phase.duration}ms`);
});

await enzyme.component('Button');

// View execution timeline
const phases = enzyme.phases.getPhases();
console.table(phases.map(p => ({
  Phase: p.phase,
  Duration: `${p.duration}ms`,
  Status: p.error ? 'Failed' : 'Success'
})));

// Performance monitoring
enzyme.hooks.postGenerate.use(async (context) => {
  const phases = enzyme.phases.getPhases();
  const total = phases.reduce((sum, p) => sum + (p.duration || 0), 0);

  if (total > 1000) {
    console.warn(`Slow generation: ${total}ms`);

    // Send to monitoring
    await monitoring.track({
      operation: 'generate',
      type: context.type,
      duration: total,
      phases: phases.map(p => ({ phase: p.phase, duration: p.duration }))
    });
  }

  return context;
});
```

### Key Files
- **Create:** `/cli/src/core/GenerationPhase.ts`
- **Create:** `/cli/src/core/PhaseTracker.ts`
- **Update:** `/cli/src/generators/base.ts`

---

## Quick Comparison Matrix

| Pattern | Axios | Enzyme | Benefit |
|---------|-------|--------|---------|
| **Interceptors** | request/response | preGenerate/postGenerate | Cross-cutting concerns |
| **Transforms** | transformRequest/transformResponse | input/output transforms | Data normalization |
| **Adapters** | XHR/HTTP | FileSystem/Memory/Remote | Environment abstraction |
| **Config Merge** | Smart deep merge | Property-aware merge | Predictable overrides |
| **Errors** | AxiosError | EnzymeError | Rich debugging context |
| **Cancellation** | CancelToken | CancelToken | Graceful interruption |
| **Factory** | axios.create() | enzyme.create() | Instance isolation |
| **Lifecycle** | Interceptor chain | Phase tracking | Observability |

---

## Implementation Checklist

### Phase 1: Foundation ✅
- [ ] EnzymeError class with context
- [ ] ConfigMerger with strategies
- [ ] Factory pattern (enzyme.create)
- [ ] Unit tests for core patterns

### Phase 2: Core Patterns ✅
- [ ] HookManager implementation
- [ ] TransformPipeline for input/output
- [ ] CancelToken for interruption
- [ ] Integration tests

### Phase 3: Advanced Features ✅
- [ ] Adapter pattern (FileSystem, Memory)
- [ ] PhaseTracker for observability
- [ ] Performance optimization
- [ ] Example projects

### Phase 4: Developer Experience ✅
- [ ] Convenience methods (enzyme.component, etc.)
- [ ] Plugin SDK (createPlugin helper)
- [ ] Complete API documentation
- [ ] Migration guides

---

## Common Pitfalls & Solutions

### Pitfall 1: Breaking Existing Generators
**Problem:** New lifecycle breaks old generators
**Solution:** Make lifecycle optional, gradual migration
```typescript
// Support both old and new style
if (generator.run) {
  await generator.run();  // Old style
} else {
  await generator.execute();  // New style
}
```

### Pitfall 2: Performance Degradation
**Problem:** Too many hooks slow down generation
**Solution:** Lazy execution, skip when not needed
```typescript
// Only execute hook if handler exists
if (this.hooks.preGenerate.hasHandlers()) {
  await this.hooks.preGenerate.execute(context);
}
```

### Pitfall 3: Config Merge Confusion
**Problem:** Unexpected config behavior
**Solution:** Clear documentation, debug mode
```typescript
// Debug config merging
if (context.options.verbose) {
  console.log('Config merge:');
  console.log('  Base:', base);
  console.log('  Override:', override);
  console.log('  Result:', result);
}
```

### Pitfall 4: Memory Leaks
**Problem:** Event listeners not cleaned up
**Solution:** Proper cleanup in lifecycle
```typescript
// Always clean up
enzyme.hooks.onExit.use(async () => {
  enzyme.hooks.clear();
  enzyme.plugins.clear();
  enzyme.phases.clear();
});
```

---

## Testing Patterns

### Unit Test Template
```typescript
describe('HookManager', () => {
  let manager: HookManager;

  beforeEach(() => {
    manager = new HookManager();
  });

  it('should execute hooks in order', async () => {
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

  it('should support priority', async () => {
    const order: number[] = [];

    manager.use(async (ctx) => { order.push(1); return ctx; }, null, { priority: 1 });
    manager.use(async (ctx) => { order.push(2); return ctx; }, null, { priority: 2 });

    await manager.execute({});
    expect(order).toEqual([2, 1]);  // Higher priority first
  });
});
```

### Integration Test Template
```typescript
describe('Enzyme Generation', () => {
  let enzyme: EnzymeInstance;
  let memoryAdapter: MemoryAdapter;

  beforeEach(() => {
    memoryAdapter = new MemoryAdapter();
    enzyme = createInstance({
      adapter: memoryAdapter
    });
  });

  it('should generate component with hooks', async () => {
    const phases: string[] = [];

    enzyme.hooks.preGenerate.use((ctx) => {
      phases.push('pre');
      return ctx;
    });

    enzyme.hooks.postGenerate.use((ctx) => {
      phases.push('post');
      return ctx;
    });

    await enzyme.component('Button');

    expect(phases).toEqual(['pre', 'post']);

    const files = memoryAdapter.getFiles();
    expect(files.has('src/components/Button.tsx')).toBe(true);
  });
});
```

---

## Code Snippets

### Create Plugin
```typescript
export default createPlugin('enzyme-plugin-prettier', '1.0.0')
  .afterGenerate(async (context, result) => {
    for (const file of result.filesCreated) {
      await runPrettier(file);
    }
  })
  .config({ tabWidth: 2, semi: true })
  .build();
```

### Custom Hook
```typescript
enzyme.hooks.preGenerate.use(
  async (context) => {
    // Check license before generation
    const license = await checkLicense();
    if (!license.valid) {
      throw new Error('Invalid license');
    }
    context.license = license;
    return context;
  },
  async (error) => {
    console.error('License check failed:', error);
    throw error;
  },
  { priority: 100 }  // High priority
);
```

### Custom Transform
```typescript
enzyme.transforms.input.add((input, context) => {
  // Auto-add tests based on type
  if (input.type === 'component' && input.tests === undefined) {
    input.tests = context.config.generators.component.tests;
  }

  // Validate naming convention
  if (input.name && !/^[A-Z]/.test(input.name)) {
    throw new Error('Component name must start with uppercase');
  }

  return input;
});
```

### Error Handler
```typescript
try {
  await enzyme.component('Button');
} catch (error) {
  if (EnzymeError.isEnzymeError(error)) {
    // Structured error handling
    logger.error({
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly message
    if (error.code === ErrorCodes.FILE_EXISTS) {
      console.log('File already exists. Use --force to overwrite.');
    }
  } else {
    // Unexpected error
    logger.error('Unexpected error:', error);
  }
}
```

---

## Resources

### Documentation
- [Axios Documentation](https://axios-http.com/docs/intro)
- [Enzyme CLI Documentation](./docs/)
- [API Reference](./docs/api/)

### Examples
- [Custom Plugin Example](./examples/custom-plugin/)
- [Custom Adapter Example](./examples/custom-adapter/)
- [Advanced Hooks Example](./examples/advanced-hooks/)

### Tools
- [Plugin Starter Template](./templates/plugin-starter/)
- [Adapter Starter Template](./templates/adapter-starter/)

---

**Last Updated:** 2025-12-03
**Maintainer:** Enzyme Core Team
**Questions?** Open an issue on GitHub
