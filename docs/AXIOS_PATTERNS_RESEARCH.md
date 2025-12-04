# Axios Hook/Interceptor Patterns Research
## Enterprise Developer Experience (DX) Best Practices for CLI Frameworks

**Research Date:** 2025-12-03
**Source:** https://github.com/axios/axios
**Target Application:** Enzyme CLI Framework

---

## Executive Summary

Axios is one of the most popular HTTP libraries (100M+ weekly downloads on npm) due to its exceptional developer experience. This research identifies 8 core patterns that make axios developer-friendly and proposes adaptations for the Enzyme CLI framework.

**Key Success Factors:**
- Composable interceptor chains for cross-cutting concerns
- Clear separation of concerns through adapters
- Intelligent configuration merging
- Promise-based async patterns with cancellation
- Extensible transform pipelines
- Developer-friendly error enrichment

---

## 1. Interceptor Pattern

### Pattern Name
**Dual-Channel Interceptor Manager** (Request/Response Interceptors)

### How It Works

Axios implements a sophisticated interceptor system through the `InterceptorManager` class:

```javascript
// From lib/core/InterceptorManager.js
function InterceptorManager() {
  this.handlers = [];
}

InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

InterceptorManager.prototype.forEach = function forEach(fn) {
  this.handlers.forEach(function(h) {
    if (h !== null) {
      fn(h);
    }
  });
};
```

**Execution Flow in Axios.js:**

```javascript
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

Axios.prototype.request = function request(config) {
  // Build interceptor chain
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  // Execute chain (async or sync mode)
  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];
    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    Array.prototype.concat.apply(chain, responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }
    return promise;
  }
};
```

### Why It's Developer-Friendly

1. **Composable Cross-Cutting Concerns**: Developers can inject logic without modifying core code
2. **Promise-Based Chain**: Familiar async/await patterns
3. **Conditional Execution**: `runWhen` option allows context-aware interceptor execution
4. **Synchronous Optimization**: Smart detection for sync interceptors improves performance
5. **Easy Cleanup**: `eject()` returns handler ID for later removal
6. **Null-Safe Iteration**: Ejected handlers become null (preserving array indices)
7. **Separation of Concerns**: Request and response interceptors are independent

### Code Example from Axios

```javascript
// Add a request interceptor
axios.interceptors.request.use(
  function (config) {
    // Do something before request is sent
    config.headers.Authorization = 'Bearer ' + token;
    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Add a response interceptor
const interceptorId = axios.interceptors.response.use(
  function (response) {
    // Any status code within the range of 2xx triggers this function
    return response.data;
  },
  function (error) {
    // Any status codes outside the range of 2xx triggers this function
    return Promise.reject(error);
  }
);

// Later, remove the interceptor
axios.interceptors.response.eject(interceptorId);
```

### Adaptation for Enzyme CLI Framework

```javascript
// enzyme/lib/core/HookManager.js
class HookManager {
  constructor() {
    this.handlers = [];
  }

  use(fulfilled, rejected, options = {}) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options.synchronous || false,
      runWhen: options.runWhen || null,
      priority: options.priority || 0
    });

    // Sort by priority for deterministic execution
    this.handlers.sort((a, b) => b.priority - a.priority);

    return this.handlers.length - 1;
  }

  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  forEach(fn) {
    this.handlers.forEach(h => h !== null && fn(h));
  }
}

// enzyme/lib/core/Enzyme.js
class Enzyme {
  constructor(config) {
    this.config = config;
    this.hooks = {
      preCommand: new HookManager(),    // Before command execution
      postCommand: new HookManager(),   // After command execution
      preValidation: new HookManager(), // Before input validation
      postValidation: new HookManager(),// After input validation
      onError: new HookManager(),       // Error handling
      onExit: new HookManager()         // Cleanup before exit
    };
  }

  async execute(commandName, args, options) {
    let context = { commandName, args, options, startTime: Date.now() };

    // Build hook chain
    const preChain = [];
    this.hooks.preCommand.forEach(hook => {
      if (!hook.runWhen || hook.runWhen(context)) {
        preChain.push(hook.fulfilled);
      }
    });

    const postChain = [];
    this.hooks.postCommand.forEach(hook => {
      postChain.push(hook.fulfilled);
    });

    try {
      // Execute pre-command hooks
      for (const hook of preChain) {
        context = await hook(context);
      }

      // Execute actual command
      const result = await this.runCommand(context);
      context.result = result;

      // Execute post-command hooks
      for (const hook of postChain) {
        context = await hook(context);
      }

      return context.result;
    } catch (error) {
      // Execute error hooks
      return this.handleError(error, context);
    }
  }
}

// Usage in enzyme
enzyme.hooks.preCommand.use(
  async (context) => {
    console.log(`[Enzyme] Executing: ${context.commandName}`);
    return context;
  },
  null,
  { priority: 10 }
);

enzyme.hooks.postCommand.use(
  async (context) => {
    const duration = Date.now() - context.startTime;
    console.log(`[Enzyme] Completed in ${duration}ms`);
    return context;
  }
);

// Conditional hook execution
enzyme.hooks.preCommand.use(
  async (context) => {
    // Only run for 'deploy' commands
    await validateCredentials();
    return context;
  },
  null,
  { runWhen: (ctx) => ctx.commandName === 'deploy' }
);
```

**Benefits for Enzyme:**
- Plugin developers can extend CLI behavior without forking
- Telemetry, logging, authentication can be injected as interceptors
- Command execution becomes observable and modifiable
- Third-party integrations (CI/CD, monitoring) can hook into lifecycle

---

## 2. Adapter Pattern

### Pattern Name
**Environment-Agnostic Adapter Strategy**

### How It Works

Axios uses adapters to abstract the underlying HTTP implementation, allowing the same API to work in different environments (Node.js vs Browser):

```javascript
// From lib/core/dispatchRequest.js
module.exports = function dispatchRequest(config) {
  // ... transformation logic ...

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);
      response.data = transformData(
        response.data,
        response.headers,
        response.status,
        config.transformResponse
      );
      return response;
    },
    function onAdapterRejection(reason) {
      if (!isCancel(reason)) {
        throwIfCancellationRequested(config);
        if (reason && reason.response) {
          reason.response.data = transformData(
            reason.response.data,
            reason.response.headers,
            reason.response.status,
            config.transformResponse
          );
        }
      }
      return Promise.reject(reason);
    }
  );
};
```

**Adapter Interface Contract:**
```javascript
// Both adapters follow the same interface:
// adapter(config) => Promise<response>

// Browser adapter (lib/adapters/xhr.js)
module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var request = new XMLHttpRequest();
    // ... setup and execution ...
    request.send(requestData);
  });
};

// Node.js adapter (lib/adapters/http.js)
module.exports = function httpAdapter(config) {
  return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
    var transport = config.protocol === 'https:' ? https : http;
    var req = transport.request(options, function handleResponse(res) {
      // ... handle response ...
    });
    req.end(data);
  });
};
```

**Adapter Selection (lib/defaults/index.js):**
```javascript
function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined' &&
             Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),
  // ... other defaults ...
};
```

### Why It's Developer-Friendly

1. **Write Once, Run Anywhere**: Same API works in Node.js and browsers
2. **Testability**: Mock adapters can be injected for testing
3. **Extensibility**: Custom adapters for GraphQL, WebSockets, or other protocols
4. **Separation of Concerns**: Transport logic isolated from request/response processing
5. **Performance Optimization**: Adapters can be optimized per-environment
6. **Future-Proof**: New transports (fetch API, HTTP/3) can be added without breaking changes

### Code Example from Axios

```javascript
// Using default adapter
const response = await axios.get('/api/users'); // Auto-selects XHR or HTTP

// Custom adapter for mocking
const mockAdapter = (config) => {
  return Promise.resolve({
    data: { users: [] },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: config
  });
};

const instance = axios.create({
  adapter: mockAdapter
});

// Custom adapter for caching
const cachedAdapter = (config) => {
  const cache = new Map();
  const cacheKey = config.url;

  if (cache.has(cacheKey)) {
    return Promise.resolve(cache.get(cacheKey));
  }

  return axios.defaults.adapter(config).then(response => {
    cache.set(cacheKey, response);
    return response;
  });
};
```

### Adaptation for Enzyme CLI Framework

```javascript
// enzyme/lib/core/adapters/BaseAdapter.js
class BaseAdapter {
  constructor(config) {
    this.config = config;
  }

  // Adapter interface contract
  async execute(command, args, options) {
    throw new Error('Adapter.execute() must be implemented');
  }

  async validate(command, args, options) {
    return true; // Default: always valid
  }
}

// enzyme/lib/core/adapters/ShellAdapter.js
class ShellAdapter extends BaseAdapter {
  async execute(command, args, options) {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: options.stdio || 'inherit'
      });

      let stdout = '';
      let stderr = '';

      if (proc.stdout) proc.stdout.on('data', d => stdout += d);
      if (proc.stderr) proc.stderr.on('data', d => stderr += d);

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({
            code,
            stdout,
            stderr,
            command,
            args
          });
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }
}

// enzyme/lib/core/adapters/DockerAdapter.js
class DockerAdapter extends BaseAdapter {
  async execute(command, args, options) {
    const { image, volumes, envVars } = this.config;

    const dockerArgs = [
      'run',
      '--rm',
      ...Object.entries(volumes || {}).map(([host, container]) =>
        `-v ${host}:${container}`
      ),
      ...Object.entries(envVars || {}).map(([key, val]) =>
        `-e ${key}=${val}`
      ),
      image,
      command,
      ...args
    ];

    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
      const proc = spawn('docker', dockerArgs);
      // ... similar to ShellAdapter ...
    });
  }
}

// enzyme/lib/core/adapters/RemoteAdapter.js
class RemoteAdapter extends BaseAdapter {
  async execute(command, args, options) {
    const { host, port, apiKey } = this.config;
    const axios = require('axios');

    const response = await axios.post(`https://${host}:${port}/execute`, {
      command,
      args,
      options
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return response.data;
  }
}

// enzyme/lib/core/adapters/index.js
function getDefaultAdapter() {
  // Auto-detect best adapter
  if (process.env.ENZYME_DOCKER) {
    return new DockerAdapter({ image: process.env.ENZYME_DOCKER });
  }

  if (process.env.ENZYME_REMOTE_HOST) {
    return new RemoteAdapter({
      host: process.env.ENZYME_REMOTE_HOST,
      port: process.env.ENZYME_REMOTE_PORT,
      apiKey: process.env.ENZYME_API_KEY
    });
  }

  return new ShellAdapter({});
}

// enzyme/lib/core/Enzyme.js
class Enzyme {
  constructor(config = {}) {
    this.config = config;
    this.adapter = config.adapter || getDefaultAdapter();
  }

  async run(command, args = [], options = {}) {
    // Execute through adapter
    return this.adapter.execute(command, args, options);
  }
}

// Usage
const enzyme = new Enzyme();
await enzyme.run('npm', ['install']); // Uses default adapter

// Custom adapter for testing
const mockAdapter = new BaseAdapter();
mockAdapter.execute = async () => ({ code: 0, stdout: 'Mocked!' });

const testEnzyme = new Enzyme({ adapter: mockAdapter });
const result = await testEnzyme.run('npm', ['test']);
console.log(result.stdout); // 'Mocked!'

// Kubernetes adapter
class K8sAdapter extends BaseAdapter {
  async execute(command, args, options) {
    const { namespace, pod } = this.config;
    return this.kubectlExec(namespace, pod, command, args);
  }
}

const k8sEnzyme = new Enzyme({
  adapter: new K8sAdapter({
    namespace: 'production',
    pod: 'app-runner-xyz'
  })
});
```

**Benefits for Enzyme:**
- Execute commands locally, in Docker, on remote servers, or in K8s
- Seamless testing with mock adapters
- Cloud-native deployments without code changes
- Security isolation through containerized execution
- Easy migration paths (local → Docker → K8s → serverless)

---

## 3. Transform Pipeline Pattern

### Pattern Name
**Composable Data Transform Pipeline**

### How It Works

Axios implements transform functions for request and response data transformation:

```javascript
// From lib/core/transformData.js
module.exports = function transformData(data, headers, status, fns) {
  var context = this || defaults;

  // Normalize to array
  fns = Array.isArray(fns) ? fns : [fns];

  // Apply each transform sequentially
  utils.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers, status);
  });

  return data;
};
```

**Default Transforms (lib/defaults/index.js):**

```javascript
var defaults = {
  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils.isFormData(data) ||
        utils.isArrayBuffer(data) ||
        utils.isBuffer(data) ||
        utils.isStream(data) ||
        utils.isFile(data) ||
        utils.isBlob(data)) {
      return data;
    }

    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }

    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }

    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }

    return data;
  }],

  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional || defaults.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this);
        }
      }
    }

    return data;
  }]
};
```

**Usage in dispatchRequest:**

```javascript
// Before sending request
config.data = transformData(
  config.data,
  config.headers,
  config.transformRequest
);

// After receiving response
response.data = transformData(
  response.data,
  response.headers,
  response.status,
  config.transformResponse
);
```

### Why It's Developer-Friendly

1. **Composability**: Multiple transforms can be chained
2. **Default Intelligence**: JSON, FormData, URLSearchParams handled automatically
3. **Override Flexibility**: Can replace or extend default transforms
4. **Context Awareness**: Transforms receive headers and status for informed decisions
5. **Type Safety**: Automatic Content-Type header management
6. **Error Resilience**: Graceful fallback for JSON parsing failures
7. **Functional Pattern**: Pure functions make testing easy

### Code Example from Axios

```javascript
// Add custom request transform
axios.defaults.transformRequest = [
  ...axios.defaults.transformRequest,
  function customTransform(data, headers) {
    // Encrypt sensitive data
    if (data.password) {
      data.password = encrypt(data.password);
    }
    return data;
  }
];

// Add custom response transform
const instance = axios.create({
  transformResponse: [
    ...axios.defaults.transformResponse,
    function customTransform(data) {
      // Normalize API response format
      return {
        success: true,
        payload: data,
        timestamp: Date.now()
      };
    }
  ]
});

// Replace all transforms
const rawInstance = axios.create({
  transformRequest: [(data) => data], // No transformation
  transformResponse: [(data) => data]  // Return raw response
});

// Conditional transformation
const conditionalTransform = function(data, headers, status) {
  if (status >= 200 && status < 300) {
    return data.result; // Unwrap successful responses
  }
  return data; // Keep error responses intact
};
```

### Adaptation for Enzyme CLI Framework

```javascript
// enzyme/lib/core/transforms.js

/**
 * Transform pipeline for CLI input/output processing
 */
class TransformPipeline {
  constructor(transforms = []) {
    this.transforms = Array.isArray(transforms) ? transforms : [transforms];
  }

  add(transform) {
    this.transforms.push(transform);
    return this;
  }

  async execute(data, context = {}) {
    let result = data;

    for (const transform of this.transforms) {
      result = await transform(result, context);
    }

    return result;
  }
}

// enzyme/lib/core/transforms/defaults.js

// Default input transforms
const defaultInputTransforms = [
  // 1. Normalize arguments
  function normalizeArgs(args, context) {
    if (typeof args === 'string') {
      return args.split(/\s+/);
    }
    if (Array.isArray(args)) {
      return args;
    }
    return [args];
  },

  // 2. Expand aliases
  function expandAliases(args, context) {
    const aliases = context.config?.aliases || {};
    return args.map(arg => {
      if (arg.startsWith('--')) {
        const flag = arg.slice(2);
        return aliases[flag] ? `--${aliases[flag]}` : arg;
      }
      return arg;
    });
  },

  // 3. Environment variable substitution
  function substituteEnvVars(args, context) {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return arg.replace(/\$\{([^}]+)\}/g, (_, varName) => {
          return process.env[varName] || '';
        });
      }
      return arg;
    });
  },

  // 4. Secret masking for logging
  function maskSecrets(args, context) {
    context.maskedArgs = args.map(arg => {
      if (typeof arg === 'string' &&
          (arg.includes('password') || arg.includes('token') || arg.includes('secret'))) {
        return arg.replace(/=(.+)/, '=***');
      }
      return arg;
    });
    return args;
  }
];

// Default output transforms
const defaultOutputTransforms = [
  // 1. Parse structured output
  function parseStructuredOutput(output, context) {
    if (context.format === 'json' && typeof output === 'string') {
      try {
        return JSON.parse(output);
      } catch {
        return output;
      }
    }
    return output;
  },

  // 2. Color coding for terminal
  function colorizeOutput(output, context) {
    if (context.colorize && typeof output === 'string') {
      const chalk = require('chalk');

      // Colorize error messages
      output = output.replace(/error:/gi, chalk.red('ERROR:'));
      output = output.replace(/warning:/gi, chalk.yellow('WARNING:'));
      output = output.replace(/success:/gi, chalk.green('SUCCESS:'));

      return output;
    }
    return output;
  },

  // 3. Pagination
  function paginateOutput(output, context) {
    if (context.paginate && typeof output === 'string') {
      const lines = output.split('\n');
      if (lines.length > context.pageSize) {
        return {
          data: lines.slice(0, context.pageSize),
          hasMore: true,
          total: lines.length
        };
      }
    }
    return output;
  },

  // 4. Format timestamps
  function formatTimestamps(output, context) {
    if (typeof output === 'object' && output.timestamp) {
      output.formattedTime = new Date(output.timestamp).toISOString();
    }
    return output;
  }
];

// enzyme/lib/core/Enzyme.js
class Enzyme {
  constructor(config = {}) {
    this.config = config;

    this.transforms = {
      input: new TransformPipeline(
        config.transformInput || defaultInputTransforms
      ),
      output: new TransformPipeline(
        config.transformOutput || defaultOutputTransforms
      )
    };
  }

  async execute(command, args, options = {}) {
    const context = {
      command,
      config: this.config,
      ...options
    };

    // Transform input
    const transformedArgs = await this.transforms.input.execute(args, context);

    // Execute command
    const result = await this.adapter.execute(
      command,
      transformedArgs,
      options
    );

    // Transform output
    const transformedOutput = await this.transforms.output.execute(
      result.stdout,
      { ...context, exitCode: result.code }
    );

    return {
      ...result,
      stdout: transformedOutput
    };
  }
}

// Usage examples

// 1. Add custom input transform
const enzyme = new Enzyme();
enzyme.transforms.input.add(async (args, context) => {
  // Inject authentication token
  if (context.command === 'deploy') {
    const token = await getAuthToken();
    return [...args, `--token=${token}`];
  }
  return args;
});

// 2. Custom output transform for structured data
enzyme.transforms.output.add((output, context) => {
  if (context.format === 'table' && Array.isArray(output)) {
    return formatAsTable(output);
  }
  return output;
});

// 3. Replace all transforms for raw mode
const rawEnzyme = new Enzyme({
  transformInput: [(args) => args],
  transformOutput: [(output) => output]
});

// 4. Validation transform
enzyme.transforms.input.add((args, context) => {
  if (context.command === 'deploy' && !args.includes('--env')) {
    throw new Error('--env flag is required for deploy command');
  }
  return args;
});

// 5. Caching transform
const cache = new Map();
enzyme.transforms.output.add((output, context) => {
  const cacheKey = `${context.command}:${JSON.stringify(context.args)}`;

  if (context.useCache && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  cache.set(cacheKey, output);
  return output;
});

// 6. Telemetry transform
enzyme.transforms.output.add(async (output, context) => {
  // Send metrics asynchronously
  sendMetrics({
    command: context.command,
    duration: context.duration,
    exitCode: context.exitCode,
    success: context.exitCode === 0
  }).catch(() => {}); // Don't fail on telemetry errors

  return output;
});
```

**Benefits for Enzyme:**
- Automatic handling of common CLI patterns (env vars, aliases)
- Security through secret masking
- Consistent output formatting (JSON, tables, colors)
- Validation pipeline before execution
- Observable command execution
- Easy testing through transform injection

---

## 4. Configuration Merging Strategy

### Pattern Name
**Smart Deep Merge with Property-Specific Strategies**

### How It Works

Axios implements intelligent config merging that respects different merge semantics for different property types:

```javascript
// From lib/core/mergeConfig.js

var mergeMap = {
  'url': valueFromConfig2,
  'method': valueFromConfig2,
  'data': valueFromConfig2,
  'baseURL': defaultToConfig2,
  'transformRequest': defaultToConfig2,
  'transformResponse': defaultToConfig2,
  'paramsSerializer': defaultToConfig2,
  'timeout': defaultToConfig2,
  'timeoutMessage': defaultToConfig2,
  'withCredentials': defaultToConfig2,
  'adapter': defaultToConfig2,
  'responseType': defaultToConfig2,
  'xsrfCookieName': defaultToConfig2,
  'xsrfHeaderName': defaultToConfig2,
  'onUploadProgress': defaultToConfig2,
  'onDownloadProgress': defaultToConfig2,
  'decompress': defaultToConfig2,
  'maxContentLength': defaultToConfig2,
  'maxBodyLength': defaultToConfig2,
  'transport': defaultToConfig2,
  'httpAgent': defaultToConfig2,
  'httpsAgent': defaultToConfig2,
  'cancelToken': defaultToConfig2,
  'socketPath': defaultToConfig2,
  'responseEncoding': defaultToConfig2,
  'validateStatus': mergeDirectKeys
};

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 */
module.exports = function mergeConfig(config1, config2) {
  config2 = config2 || {};
  var config = {};

  // Strategy 1: valueFromConfig2 - Always use config2, ignore config1
  function valueFromConfig2(target, source) {
    if (typeof source !== 'undefined') {
      return getMergedValue(target, source);
    }
  }

  // Strategy 2: defaultToConfig2 - Prefer config2, fallback to config1
  function defaultToConfig2(target, source) {
    if (typeof source !== 'undefined') {
      return getMergedValue(target, source);
    } else if (typeof target !== 'undefined') {
      return getMergedValue(undefined, target);
    }
  }

  // Strategy 3: mergeDirectKeys - Check hasOwnProperty, not just undefined
  function mergeDirectKeys(target, source) {
    if (source in config2) {
      return getMergedValue(target, source);
    } else if (target in config1) {
      return getMergedValue(undefined, target);
    }
  }

  // Deep merge for objects
  function getMergedValue(target, source) {
    if (utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(target)) {
      return utils.merge({}, target);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // Apply merge strategies
  utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge(config1[prop], config2[prop], prop);

    if (!utils.isUndefined(configValue) || (prop in config)) {
      config[prop] = configValue;
    }
  });

  return config;
};
```

**Merge Utilities (lib/utils.js):**

```javascript
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};

  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }

  return result;
}
```

### Why It's Developer-Friendly

1. **Property-Aware**: Different properties have different merge semantics
2. **Predictable**: Clear rules for how configs combine
3. **Deep Merge**: Nested objects merge intelligently
4. **Immutability**: Original configs unchanged, new config returned
5. **Type Preservation**: Arrays shallow-copied, objects deep-merged
6. **Flexible Override**: `url`, `method`, `data` always use latest config
7. **Sensible Defaults**: Most properties use defaultToConfig2 pattern

### Code Example from Axios

```javascript
// Global defaults
axios.defaults.baseURL = 'https://api.example.com';
axios.defaults.timeout = 5000;
axios.defaults.headers.common['Authorization'] = 'Bearer global-token';

// Instance defaults (merges with global)
const instance = axios.create({
  baseURL: 'https://api.other.com',  // Overrides global
  headers: {
    common: {
      'X-Custom-Header': 'value'  // Merges with Authorization
    }
  }
  // timeout not specified, inherits 5000 from global
});

// Request config (merges with instance + global)
instance.get('/users', {
  timeout: 10000,  // Overrides instance timeout
  headers: {
    'X-Request-ID': '123'  // Merges with common headers
  }
});

// Final merged config:
// {
//   baseURL: 'https://api.other.com',
//   timeout: 10000,
//   headers: {
//     Authorization: 'Bearer global-token',
//     'X-Custom-Header': 'value',
//     'X-Request-ID': '123'
//   }
// }
```

### Adaptation for Enzyme CLI Framework

```javascript
// enzyme/lib/core/mergeConfig.js

/**
 * Property-specific merge strategies for enzyme configuration
 */
const mergeMaps = {
  // Always use latest config (no inheritance)
  OVERRIDE: [
    'command',
    'args',
    'cwd',
    'stdio'
  ],

  // Prefer latest, fallback to previous
  DEFAULT: [
    'timeout',
    'maxBuffer',
    'encoding',
    'shell',
    'env',
    'uid',
    'gid'
  ],

  // Deep merge objects
  DEEP: [
    'hooks',
    'transforms',
    'validation',
    'telemetry'
  ],

  // Concatenate arrays
  CONCAT: [
    'plugins',
    'middlewares'
  ]
};

class ConfigMerger {
  constructor() {
    this.strategies = {
      override: this.overrideStrategy,
      default: this.defaultStrategy,
      deep: this.deepStrategy,
      concat: this.concatStrategy
    };
  }

  overrideStrategy(base, override) {
    return override !== undefined ? override : base;
  }

  defaultStrategy(base, override) {
    if (override !== undefined) {
      return this.clone(override);
    }
    if (base !== undefined) {
      return this.clone(base);
    }
    return undefined;
  }

  deepStrategy(base, override) {
    if (this.isPlainObject(override) && this.isPlainObject(base)) {
      return this.deepMerge(base, override);
    }
    return override !== undefined ? this.clone(override) : this.clone(base);
  }

  concatStrategy(base, override) {
    const baseArr = Array.isArray(base) ? base : [];
    const overrideArr = Array.isArray(override) ? override : [];
    return [...baseArr, ...overrideArr];
  }

  deepMerge(...objects) {
    const result = {};

    for (const obj of objects) {
      if (!this.isPlainObject(obj)) continue;

      for (const [key, value] of Object.entries(obj)) {
        if (this.isPlainObject(value) && this.isPlainObject(result[key])) {
          result[key] = this.deepMerge(result[key], value);
        } else if (Array.isArray(value)) {
          result[key] = [...value];
        } else if (this.isPlainObject(value)) {
          result[key] = this.deepMerge({}, value);
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  clone(value) {
    if (Array.isArray(value)) return [...value];
    if (this.isPlainObject(value)) return this.deepMerge({}, value);
    return value;
  }

  isPlainObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
  }

  getStrategy(key) {
    if (mergeMaps.OVERRIDE.includes(key)) return 'override';
    if (mergeMaps.DEFAULT.includes(key)) return 'default';
    if (mergeMaps.DEEP.includes(key)) return 'deep';
    if (mergeMaps.CONCAT.includes(key)) return 'concat';
    return 'default'; // fallback
  }

  merge(base = {}, override = {}) {
    const result = {};
    const allKeys = new Set([
      ...Object.keys(base),
      ...Object.keys(override)
    ]);

    for (const key of allKeys) {
      const strategyName = this.getStrategy(key);
      const strategy = this.strategies[strategyName];
      const value = strategy.call(this, base[key], override[key]);

      if (value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  }
}

// enzyme/lib/core/Enzyme.js
class Enzyme {
  constructor(baseConfig = {}) {
    this.merger = new ConfigMerger();
    this.baseConfig = baseConfig;
    this.globalConfig = this.getGlobalConfig();
  }

  getGlobalConfig() {
    // Load from ~/.enzymerc, enzyme.config.js, etc.
    return {
      timeout: 30000,
      shell: true,
      env: process.env,
      hooks: {
        preCommand: [],
        postCommand: []
      }
    };
  }

  async execute(command, args, requestConfig = {}) {
    // Three-level merge: global → instance → request
    const config = this.merger.merge(
      this.globalConfig,
      this.merger.merge(this.baseConfig, requestConfig)
    );

    return this.adapter.execute(command, args, config);
  }
}

// Usage examples

// 1. Global configuration
const globalEnzyme = new Enzyme({
  timeout: 60000,
  env: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info'
  },
  hooks: {
    preCommand: [logCommand]
  }
});

// 2. Command-specific override
await globalEnzyme.execute('npm', ['install'], {
  timeout: 120000,  // Override: 120s for npm install
  env: {
    NPM_TOKEN: 'secret',  // Deep merge: adds to global env
    LOG_LEVEL: 'debug'    // Deep merge: overrides global
  }
});

// Final merged config:
// {
//   timeout: 120000,              (from request)
//   shell: true,                  (from global)
//   env: {
//     NODE_ENV: 'production',     (from global)
//     LOG_LEVEL: 'debug',         (from request, overrode global)
//     NPM_TOKEN: 'secret'         (from request)
//   },
//   hooks: {
//     preCommand: [logCommand]    (from global)
//   }
// }

// 3. Plugin concatenation
const enzyme1 = new Enzyme({
  plugins: [pluginA, pluginB]
});

const enzyme2 = new Enzyme({
  plugins: [pluginC]
});

// Merge instances
const merged = enzyme1.merger.merge(
  enzyme1.baseConfig,
  enzyme2.baseConfig
);

console.log(merged.plugins); // [pluginA, pluginB, pluginC]

// 4. Validation rules merging
const baseValidation = {
  validation: {
    rules: {
      env: (value) => value !== 'development'
    },
    onError: 'throw'
  }
};

const extendedValidation = {
  validation: {
    rules: {
      timeout: (value) => value < 300000
    }
  }
};

const mergedValidation = merger.merge(baseValidation, extendedValidation);

// Result: Both validation rules present
// {
//   validation: {
//     rules: {
//       env: (value) => value !== 'development',
//       timeout: (value) => value < 300000
//     },
//     onError: 'throw'
//   }
// }
```

**Benefits for Enzyme:**
- Global → Instance → Request config hierarchy
- Plugin stacking without conflicts
- Environment variable inheritance with overrides
- Hook composition across config levels
- Predictable merge behavior
- Easy testing through isolated configs

---

## 5. Error Handling and Enhancement Pattern

### Pattern Name
**Enhanced Error Objects with Context Preservation**

### How It Works

Axios creates rich error objects that preserve request/response context:

```javascript
// From lib/core/AxiosError.js

function AxiosError(message, code, config, request, response) {
  Error.call(this, message);

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = (new Error()).stack;
  }

  this.message = message;
  this.name = 'AxiosError';
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  response && (this.response = response);
}

// Static error codes
AxiosError.ERR_BAD_OPTION_VALUE = 'ERR_BAD_OPTION_VALUE';
AxiosError.ERR_BAD_OPTION = 'ERR_BAD_OPTION';
AxiosError.ECONNABORTED = 'ECONNABORTED';
AxiosError.ETIMEDOUT = 'ETIMEDOUT';
AxiosError.ERR_NETWORK = 'ERR_NETWORK';
AxiosError.ERR_FR_TOO_MANY_REDIRECTS = 'ERR_FR_TOO_MANY_REDIRECTS';
AxiosError.ERR_DEPRECATED = 'ERR_DEPRECATED';
AxiosError.ERR_BAD_RESPONSE = 'ERR_BAD_RESPONSE';
AxiosError.ERR_BAD_REQUEST = 'ERR_BAD_REQUEST';
AxiosError.ERR_CANCELED = 'ERR_CANCELED';
AxiosError.ERR_NOT_SUPPORT = 'ERR_NOT_SUPPORT';
AxiosError.ERR_INVALID_URL = 'ERR_INVALID_URL';

// JSON serialization
AxiosError.prototype.toJSON = function toJSON() {
  return {
    message: this.message,
    name: this.name,
    description: this.description,
    number: this.number,
    fileName: this.fileName,
    lineNumber: this.lineNumber,
    columnNumber: this.columnNumber,
    stack: this.stack,
    config: this.config,
    code: this.code,
    status: this.response && this.response.status ? this.response.status : null
  };
};

// Factory for converting native errors
AxiosError.from = function(error, code, config, request, response, customProps) {
  var axiosError = Object.create(AxiosError.prototype);
  var errorPrototype = Object.getPrototypeOf(error);

  utils.toFlatObject(error, axiosError, function filter(obj) {
    return obj !== errorPrototype && obj !== Error.prototype;
  });

  AxiosError.call(axiosError, error.message, code, config, request, response);

  axiosError.cause = error;
  axiosError.name = error.name;

  customProps && Object.assign(axiosError, customProps);

  return axiosError;
};
```

**Error Usage in settle.js:**

```javascript
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;

  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError(
      'Request failed with status code ' + response.status,
      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE]
        [Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
};
```

### Why It's Developer-Friendly

1. **Context Preservation**: Errors include request, response, config
2. **Type Safety**: Structured error codes as constants
3. **Debuggability**: Stack traces, serialization support
4. **Error Categorization**: Different codes for different failures
5. **Original Error Chain**: `cause` property preserves original error
6. **JSON Serializable**: Errors can be logged/transmitted
7. **Helper Method**: `isAxiosError()` for type checking

### Code Example from Axios

```javascript
try {
  const response = await axios.get('/api/users');
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.log('Error code:', error.code);
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Headers:', error.response?.headers);
    console.log('Request:', error.config);

    if (error.code === 'ECONNABORTED') {
      console.log('Request timeout');
    } else if (error.code === 'ERR_NETWORK') {
      console.log('Network error');
    } else if (error.response) {
      // Server responded with error status
      console.log('Server error:', error.response.status);
    } else if (error.request) {
      // Request made but no response
      console.log('No response received');
    } else {
      // Something else
      console.log('Error:', error.message);
    }
  }
}
```

### Adaptation for Enzyme CLI Framework

```javascript
// enzyme/lib/core/EnzymeError.js

class EnzymeError extends Error {
  constructor(message, code, context = {}) {
    super(message);

    this.name = 'EnzymeError';
    this.code = code;
    this.timestamp = Date.now();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Command execution context
    this.command = context.command;
    this.args = context.args;
    this.config = context.config;
    this.cwd = context.cwd || process.cwd();

    // Execution results (if available)
    this.exitCode = context.exitCode;
    this.stdout = context.stdout;
    this.stderr = context.stderr;
    this.duration = context.duration;

    // Original error (if wrapping)
    if (context.originalError) {
      this.cause = context.originalError;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      stack: this.stack,
      command: this.command,
      args: this.args,
      exitCode: this.exitCode,
      cwd: this.cwd,
      stdout: this.stdout ? this.stdout.substring(0, 500) : null,
      stderr: this.stderr ? this.stderr.substring(0, 500) : null,
      duration: this.duration
    };
  }

  static from(error, code, context) {
    const enzymeError = new EnzymeError(
      error.message,
      code,
      { ...context, originalError: error }
    );

    enzymeError.name = error.name;

    return enzymeError;
  }
}

// Error codes
EnzymeError.ERR_COMMAND_NOT_FOUND = 'ERR_COMMAND_NOT_FOUND';
EnzymeError.ERR_EXECUTION_FAILED = 'ERR_EXECUTION_FAILED';
EnzymeError.ERR_TIMEOUT = 'ERR_TIMEOUT';
EnzymeError.ERR_VALIDATION_FAILED = 'ERR_VALIDATION_FAILED';
EnzymeError.ERR_PERMISSION_DENIED = 'ERR_PERMISSION_DENIED';
EnzymeError.ERR_INVALID_CONFIG = 'ERR_INVALID_CONFIG';
EnzymeError.ERR_HOOK_FAILED = 'ERR_HOOK_FAILED';
EnzymeError.ERR_ADAPTER_FAILED = 'ERR_ADAPTER_FAILED';
EnzymeError.ERR_TRANSFORM_FAILED = 'ERR_TRANSFORM_FAILED';
EnzymeError.ERR_CANCELED = 'ERR_CANCELED';

// Type checker
EnzymeError.isEnzymeError = function(error) {
  return error && error.name === 'EnzymeError';
};

// enzyme/lib/core/Enzyme.js
class Enzyme {
  async execute(command, args, options = {}) {
    const startTime = Date.now();
    const context = { command, args, config: options, cwd: options.cwd };

    try {
      // Validate command
      const validation = await this.validate(command, args, options);
      if (!validation.valid) {
        throw new EnzymeError(
          validation.error,
          EnzymeError.ERR_VALIDATION_FAILED,
          context
        );
      }

      // Execute through adapter
      const result = await this.adapter.execute(command, args, options);

      context.exitCode = result.code;
      context.stdout = result.stdout;
      context.stderr = result.stderr;
      context.duration = Date.now() - startTime;

      // Check exit code
      if (result.code !== 0 && options.throwOnError !== false) {
        throw new EnzymeError(
          `Command failed with exit code ${result.code}`,
          EnzymeError.ERR_EXECUTION_FAILED,
          context
        );
      }

      return result;
    } catch (error) {
      context.duration = Date.now() - startTime;

      // Convert to EnzymeError if not already
      if (!EnzymeError.isEnzymeError(error)) {
        if (error.code === 'ENOENT') {
          throw EnzymeError.from(
            error,
            EnzymeError.ERR_COMMAND_NOT_FOUND,
            context
          );
        } else if (error.code === 'ETIMEDOUT') {
          throw EnzymeError.from(
            error,
            EnzymeError.ERR_TIMEOUT,
            context
          );
        } else if (error.code === 'EACCES') {
          throw EnzymeError.from(
            error,
            EnzymeError.ERR_PERMISSION_DENIED,
            context
          );
        } else {
          throw EnzymeError.from(
            error,
            EnzymeError.ERR_EXECUTION_FAILED,
            context
          );
        }
      }

      throw error;
    }
  }

  async executeWithRetry(command, args, options = {}) {
    const maxRetries = options.retry || 0;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(command, args, options);
      } catch (error) {
        lastError = error;

        if (EnzymeError.isEnzymeError(error)) {
          // Don't retry validation or permission errors
          if (error.code === EnzymeError.ERR_VALIDATION_FAILED ||
              error.code === EnzymeError.ERR_PERMISSION_DENIED ||
              error.code === EnzymeError.ERR_COMMAND_NOT_FOUND) {
            throw error;
          }

          // Add retry information
          error.attempt = attempt + 1;
          error.maxRetries = maxRetries;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

// Usage examples

const enzyme = new Enzyme();

// 1. Basic error handling
try {
  await enzyme.execute('invalid-command', []);
} catch (error) {
  if (EnzymeError.isEnzymeError(error)) {
    console.error('Error code:', error.code);
    console.error('Command:', error.command);
    console.error('Exit code:', error.exitCode);
    console.error('Duration:', error.duration + 'ms');

    // Structured error logging
    logger.error(JSON.stringify(error.toJSON(), null, 2));
  }
}

// 2. Error categorization
try {
  await enzyme.execute('npm', ['install']);
} catch (error) {
  if (EnzymeError.isEnzymeError(error)) {
    switch (error.code) {
      case EnzymeError.ERR_COMMAND_NOT_FOUND:
        console.error('npm is not installed');
        break;
      case EnzymeError.ERR_TIMEOUT:
        console.error('Installation timed out');
        break;
      case EnzymeError.ERR_EXECUTION_FAILED:
        console.error('Installation failed:', error.stderr);
        break;
      case EnzymeError.ERR_PERMISSION_DENIED:
        console.error('Permission denied. Try with sudo?');
        break;
    }
  }
}

// 3. Retry with exponential backoff
try {
  await enzyme.executeWithRetry('curl', ['https://api.example.com'], {
    retry: 3,
    timeout: 5000
  });
} catch (error) {
  console.error(`Failed after ${error.attempt} attempts`);
}

// 4. Error hook for centralized handling
enzyme.hooks.onError.use(async (error, context) => {
  // Send to error tracking service
  await errorTracker.capture({
    error: error.toJSON(),
    context,
    user: getCurrentUser(),
    environment: process.env.NODE_ENV
  });

  // Notify on critical errors
  if (error.code === EnzymeError.ERR_EXECUTION_FAILED &&
      context.command === 'deploy') {
    await slack.notify(`Deployment failed: ${error.message}`);
  }

  return error;
});

// 5. Custom error subclass
class DeploymentError extends EnzymeError {
  constructor(message, context) {
    super(message, 'ERR_DEPLOYMENT_FAILED', context);
    this.name = 'DeploymentError';
    this.deploymentId = context.deploymentId;
    this.environment = context.environment;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      deploymentId: this.deploymentId,
      environment: this.environment
    };
  }
}
```

**Benefits for Enzyme:**
- Rich error context for debugging
- Structured error codes for programmatic handling
- Retry logic with error categorization
- Error tracking integration
- Developer-friendly error messages
- Serializable for logging/monitoring

---

## 6. Cancellation Pattern

### Pattern Name
**Promise-Based Cancellation with Subscription**

### How It Works

Axios implements cancellation through CancelToken with a subscription pattern:

```javascript
// From lib/cancel/CancelToken.js

function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;

  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;

  // Give executor the cancel function
  executor(function cancel(message, config, request) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new CanceledError(message, config, request);
    resolvePromise(token.reason);
  });
}

CancelToken.prototype.subscribe = function subscribe(listener) {
  if (this.reason) {
    listener(this.reason);
    return;
  }

  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};

CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }
  var index = this._listeners.indexOf(listener);
  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};

CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

// Static factory method
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};
```

**Usage in Adapters:**

```javascript
// From lib/adapters/xhr.js
module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var request = new XMLHttpRequest();

    // Handle browser request cancellation (as of v0.22.0)
    if (config.cancelToken || config.signal) {
      // Handle cancellation
      onCanceled = function(cancel) {
        if (!request) return;
        reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
        request.abort();
        request = null;
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);
      if (config.signal) {
        config.signal.aborted
          ? onCanceled()
          : config.signal.addEventListener('abort', onCanceled);
      }
    }

    request.send(requestData);
  });
};
```

### Why It's Developer-Friendly

1. **Promise-Based**: Fits naturally with async/await
2. **Subscription Pattern**: Multiple listeners can react to cancellation
3. **Idempotent**: Calling cancel multiple times is safe
4. **Factory Method**: `CancelToken.source()` provides convenient API
5. **Standard Support**: Also supports AbortController/AbortSignal
6. **Early Detection**: `throwIfRequested()` catches cancellation early
7. **Cleanup Integration**: Adapters can clean up resources on cancel

### Code Example from Axios

```javascript
// Method 1: CancelToken.source()
const source = axios.CancelToken.source();

axios.get('/api/data', {
  cancelToken: source.token
}).catch(function(thrown) {
  if (axios.isCancel(thrown)) {
    console.log('Request canceled:', thrown.message);
  }
});

// Cancel the request
source.cancel('Operation canceled by user');

// Method 2: CancelToken constructor
let cancel;
axios.get('/api/data', {
  cancelToken: new axios.CancelToken(function executor(c) {
    cancel = c;
  })
});

cancel('User navigated away');

// Method 3: AbortController (modern)
const controller = new AbortController();

axios.get('/api/data', {
  signal: controller.signal
});

controller.abort();
```

### Adaptation for Enzyme CLI Framework

```javascript
// enzyme/lib/core/CancelToken.js

class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function');
    }

    let resolvePromise;
    this.promise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    this._listeners = [];

    const token = this;

    executor(function cancel(reason) {
      if (token.reason) {
        return; // Already canceled
      }

      token.reason = reason || 'Canceled';
      token.timestamp = Date.now();

      // Notify all listeners
      token._listeners.forEach(listener => {
        try {
          listener(token.reason);
        } catch (err) {
          console.error('Cancel listener error:', err);
        }
      });

      resolvePromise(token.reason);
    });
  }

  subscribe(listener) {
    if (this.reason) {
      // Already canceled, call immediately
      listener(this.reason);
      return;
    }

    this._listeners.push(listener);
  }

  unsubscribe(listener) {
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  throwIfRequested() {
    if (this.reason) {
      const error = new Error(this.reason);
      error.code = 'ERR_CANCELED';
      error.isCancellation = true;
      throw error;
    }
  }

  static source() {
    let cancel;
    const token = new CancelToken(c => {
      cancel = c;
    });
    return { token, cancel };
  }
}

// enzyme/lib/core/adapters/ShellAdapter.js
class ShellAdapter extends BaseAdapter {
  async execute(command, args, options) {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');

      let proc = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', d => stdout += d);
      proc.stderr?.on('data', d => stderr += d);

      // Handle cancellation
      let onCanceled = null;

      if (options.cancelToken) {
        onCanceled = (reason) => {
          if (!proc) return;

          proc.kill(options.killSignal || 'SIGTERM');

          const error = new Error(`Command canceled: ${reason}`);
          error.code = 'ERR_CANCELED';
          error.isCancellation = true;
          reject(error);

          proc = null;
        };

        options.cancelToken.subscribe(onCanceled);
      }

      // AbortSignal support
      if (options.signal) {
        const abortHandler = () => {
          if (!proc) return;

          proc.kill(options.killSignal || 'SIGTERM');

          const error = new Error('Command aborted');
          error.code = 'ABORT_ERR';
          reject(error);

          proc = null;
        };

        if (options.signal.aborted) {
          abortHandler();
          return;
        }

        options.signal.addEventListener('abort', abortHandler);
      }

      proc.on('close', (code) => {
        if (!proc) return; // Already canceled

        if (options.cancelToken && onCanceled) {
          options.cancelToken.unsubscribe(onCanceled);
        }

        resolve({ code, stdout, stderr, command, args });
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }
}

// enzyme/lib/core/Enzyme.js
class Enzyme {
  async execute(command, args, options = {}) {
    // Check cancellation before starting
    if (options.cancelToken) {
      options.cancelToken.throwIfRequested();
    }

    // Execute
    const result = await this.adapter.execute(command, args, options);

    // Check cancellation after completion
    if (options.cancelToken) {
      options.cancelToken.throwIfRequested();
    }

    return result;
  }
}

// Usage examples

// 1. Basic cancellation
const { token, cancel } = CancelToken.source();

const promise = enzyme.execute('npm', ['install'], { cancelToken: token });

setTimeout(() => {
  cancel('Installation taking too long');
}, 30000);

try {
  await promise;
} catch (error) {
  if (error.isCancellation) {
    console.log('Canceled:', error.message);
  }
}

// 2. Multiple commands with shared cancellation
const source = CancelToken.source();

const commands = [
  enzyme.execute('npm', ['install'], { cancelToken: source.token }),
  enzyme.execute('npm', ['test'], { cancelToken: source.token }),
  enzyme.execute('npm', ['build'], { cancelToken: source.token })
];

// Cancel all
document.getElementById('stop-btn').addEventListener('click', () => {
  source.cancel('Build pipeline stopped by user');
});

try {
  await Promise.all(commands);
} catch (error) {
  console.log('Some commands were canceled');
}

// 3. Timeout with cancellation
async function executeWithTimeout(command, args, timeout) {
  const source = CancelToken.source();

  const timer = setTimeout(() => {
    source.cancel(`Timeout after ${timeout}ms`);
  }, timeout);

  try {
    const result = await enzyme.execute(command, args, {
      cancelToken: source.token
    });
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

// 4. Progress tracking with cancellation
const source = CancelToken.source();

source.token.subscribe((reason) => {
  console.log('Cleaning up resources:', reason);
  // Close file handles, database connections, etc.
});

const longRunningCommand = enzyme.execute('docker', ['build', '.'], {
  cancelToken: source.token
});

// User can cancel anytime
process.on('SIGINT', () => {
  source.cancel('Interrupted by user');
});

// 5. AbortController integration (modern browsers/Node 15+)
const controller = new AbortController();

enzyme.execute('curl', ['https://api.example.com'], {
  signal: controller.signal
});

// Cancel via standard API
controller.abort();

// 6. Cascading cancellation
class Pipeline {
  constructor() {
    this.source = CancelToken.source();
  }

  async run() {
    try {
      await enzyme.execute('npm', ['install'], {
        cancelToken: this.source.token
      });

      await enzyme.execute('npm', ['test'], {
        cancelToken: this.source.token
      });

      await enzyme.execute('npm', ['build'], {
        cancelToken: this.source.token
      });

      console.log('Pipeline complete');
    } catch (error) {
      if (error.isCancellation) {
        console.log('Pipeline canceled');
      } else {
        throw error;
      }
    }
  }

  cancel(reason) {
    this.source.cancel(reason);
  }
}

const pipeline = new Pipeline();
pipeline.run();

// Cancel entire pipeline
setTimeout(() => pipeline.cancel('Taking too long'), 60000);
```

**Benefits for Enzyme:**
- Long-running commands can be interrupted gracefully
- User can cancel operations (CI/CD pipelines, builds)
- Timeout enforcement
- Resource cleanup on cancellation
- Graceful shutdown on SIGINT/SIGTERM
- Standard AbortController support

---

## 7. Lifecycle Hook Pattern (dispatchRequest Flow)

### Pattern Name
**Transformation Sandwich with Cancellation Checks**

### How It Works

Axios orchestrates the complete request lifecycle through dispatchRequest:

```javascript
// From lib/core/dispatchRequest.js

module.exports = function dispatchRequest(config) {
  // 1. PRE-REQUEST PHASE: Cancellation check
  throwIfCancellationRequested(config);

  // 2. PRE-REQUEST PHASE: Header initialization
  config.headers = config.headers || {};

  // 3. PRE-REQUEST PHASE: Request data transformation
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // 4. PRE-REQUEST PHASE: Header normalization
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  // 5. PRE-REQUEST PHASE: Cleanup method-specific headers
  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  // 6. EXECUTION PHASE: Select and invoke adapter
  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(
    // 7. POST-RESPONSE PHASE: Success handler
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);

      // Transform response data
      response.data = transformData.call(
        config,
        response.data,
        response.headers,
        response.status,
        config.transformResponse
      );

      return response;
    },

    // 8. POST-RESPONSE PHASE: Error handler
    function onAdapterRejection(reason) {
      if (!isCancel(reason)) {
        throwIfCancellationRequested(config);

        // Transform error response if available
        if (reason && reason.response) {
          reason.response.data = transformData.call(
            config,
            reason.response.data,
            reason.response.headers,
            reason.response.status,
            config.transformResponse
          );
        }
      }

      return Promise.reject(reason);
    }
  );
};

function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError(null, config);
  }
}
```

**Complete Flow:**

```
User Request
    ↓
Request Interceptors (LIFO chain)
    ↓
[dispatchRequest]
    ├─ throwIfCancellationRequested
    ├─ transformRequest (data + headers)
    ├─ Header merging
    └─ Adapter execution
           ↓
      HTTP Call
           ↓
    ├─ Success: transformResponse
    └─ Error: transformResponse (if response exists)
    ↓
Response Interceptors (FIFO chain)
    ↓
User receives response/error
```

### Why It's Developer-Friendly

1. **Clear Phases**: Pre-request, execution, post-response
2. **Consistent Transforms**: Both success/error paths transform data
3. **Early Bailout**: Cancellation checked before and after
4. **Header Intelligence**: Automatic merging and cleanup
5. **Adapter Isolation**: Core logic independent of transport
6. **Error Parity**: Errors transformed same as successes
7. **Composability**: Interceptors wrap this core flow

### Code Example from Axios

```javascript
// The complete flow in action
axios.interceptors.request.use(config => {
  console.log('1. Request interceptor');
  config.startTime = Date.now();
  return config;
});

axios.defaults.transformRequest = [
  ...axios.defaults.transformRequest,
  (data) => {
    console.log('2. Request transform');
    return data;
  }
];

// [dispatchRequest executes here]
// 3. Adapter sends request
// 4. Server responds

axios.defaults.transformResponse = [
  ...axios.defaults.transformResponse,
  (data) => {
    console.log('5. Response transform');
    return data;
  }
];

axios.interceptors.response.use(response => {
  console.log('6. Response interceptor');
  console.log('Duration:', Date.now() - response.config.startTime);
  return response;
});

await axios.get('/api/data');
```

### Adaptation for Enzyme CLI Framework

```javascript
// enzyme/lib/core/dispatchCommand.js

async function dispatchCommand(config, adapter, hooks) {
  const context = {
    command: config.command,
    args: config.args,
    options: config,
    startTime: Date.now(),
    phase: 'pre-command'
  };

  try {
    // PHASE 1: Pre-command validation and transformation
    context.phase = 'validation';
    throwIfCancellationRequested(config);

    // Validate command and arguments
    if (config.validate !== false) {
      const validation = await validateCommand(context);
      if (!validation.valid) {
        throw new EnzymeError(
          validation.error,
          EnzymeError.ERR_VALIDATION_FAILED,
          context
        );
      }
    }

    // PHASE 2: Input transformation
    context.phase = 'input-transform';
    context.args = await transformInput(
      context.args,
      context,
      config.transformInput
    );

    // PHASE 3: Environment preparation
    context.phase = 'env-setup';
    context.env = prepareEnvironment(config.env, context);

    // PHASE 4: Working directory resolution
    context.cwd = resolveCwd(config.cwd, context);

    // PHASE 5: Adapter selection and execution
    context.phase = 'execution';
    throwIfCancellationRequested(config);

    const executionAdapter = adapter || getDefaultAdapter();
    const result = await executionAdapter.execute(
      context.command,
      context.args,
      {
        cwd: context.cwd,
        env: context.env,
        stdio: config.stdio,
        timeout: config.timeout,
        cancelToken: config.cancelToken,
        signal: config.signal
      }
    );

    // PHASE 6: Post-execution transformation (success)
    context.phase = 'output-transform';
    throwIfCancellationRequested(config);

    result.stdout = await transformOutput(
      result.stdout,
      { ...context, exitCode: result.code },
      config.transformOutput
    );

    result.stderr = await transformOutput(
      result.stderr,
      { ...context, exitCode: result.code, isError: true },
      config.transformOutput
    );

    // PHASE 7: Exit code validation
    context.phase = 'validation';
    const shouldThrow = config.throwOnError !== false && result.code !== 0;

    if (shouldThrow) {
      throw new EnzymeError(
        `Command failed with exit code ${result.code}`,
        EnzymeError.ERR_EXECUTION_FAILED,
        { ...context, ...result, duration: Date.now() - context.startTime }
      );
    }

    // PHASE 8: Success return
    context.phase = 'complete';
    return {
      ...result,
      duration: Date.now() - context.startTime,
      context
    };

  } catch (error) {
    // PHASE 9: Error handling and transformation
    context.phase = 'error-handling';
    context.duration = Date.now() - context.startTime;

    // Check if it's a cancellation
    if (error.isCancellation) {
      throw error;
    }

    // Transform error if it has output
    if (error.stderr) {
      error.stderr = await transformOutput(
        error.stderr,
        { ...context, isError: true },
        config.transformOutput
      ).catch(() => error.stderr); // Don't fail on transform error
    }

    // Enhance error with context
    if (!EnzymeError.isEnzymeError(error)) {
      throw EnzymeError.from(error, EnzymeError.ERR_EXECUTION_FAILED, context);
    }

    throw error;
  }
}

function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal?.aborted) {
    const error = new Error('Command aborted');
    error.code = 'ABORT_ERR';
    error.isCancellation = true;
    throw error;
  }
}

async function validateCommand(context) {
  // Check if command exists
  const which = require('which');

  try {
    await which(context.command);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: `Command not found: ${context.command}`
    };
  }
}

function prepareEnvironment(envConfig, context) {
  const base = { ...process.env };
  const custom = envConfig || {};

  // Merge and resolve variables
  return Object.entries({ ...base, ...custom }).reduce((acc, [key, value]) => {
    // Resolve ${VAR} references
    if (typeof value === 'string') {
      acc[key] = value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        return acc[varName] || process.env[varName] || '';
      });
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function resolveCwd(cwdConfig, context) {
  if (!cwdConfig) return process.cwd();

  const path = require('path');
  return path.isAbsolute(cwdConfig)
    ? cwdConfig
    : path.resolve(process.cwd(), cwdConfig);
}

async function transformInput(args, context, transforms) {
  if (!transforms) return args;

  const pipeline = new TransformPipeline(transforms);
  return pipeline.execute(args, context);
}

async function transformOutput(output, context, transforms) {
  if (!transforms) return output;

  const pipeline = new TransformPipeline(transforms);
  return pipeline.execute(output, context);
}

// enzyme/lib/core/Enzyme.js
class Enzyme {
  async execute(command, args, options = {}) {
    const config = this.merger.merge(
      this.globalConfig,
      this.merger.merge(this.baseConfig, {
        command,
        args,
        ...options
      })
    );

    // Execute through dispatchCommand (with hooks wrapped around it)
    return this.executeWithHooks(config);
  }

  async executeWithHooks(config) {
    let context = { ...config };

    try {
      // Execute pre-command hooks
      const preChain = [];
      this.hooks.preCommand.forEach(hook => {
        if (!hook.runWhen || hook.runWhen(context)) {
          preChain.push(hook.fulfilled);
        }
      });

      for (const hook of preChain) {
        context = await hook(context);
      }

      // Execute core command
      const result = await dispatchCommand(
        context,
        this.adapter,
        this.hooks
      );

      context.result = result;

      // Execute post-command hooks
      const postChain = [];
      this.hooks.postCommand.forEach(hook => {
        postChain.push(hook.fulfilled);
      });

      for (const hook of postChain) {
        context = await hook(context);
      }

      return context.result;

    } catch (error) {
      // Execute error hooks
      const errorChain = [];
      this.hooks.onError.forEach(hook => {
        errorChain.push(hook.fulfilled);
      });

      for (const hook of errorChain) {
        try {
          await hook(error, context);
        } catch (hookError) {
          console.error('Error hook failed:', hookError);
        }
      }

      throw error;
    }
  }
}

// Usage with complete lifecycle

const enzyme = new Enzyme();

// Hook into every phase
enzyme.hooks.preCommand.use(async (context) => {
  console.log(`[${context.phase}] Starting: ${context.command}`);
  context.metrics = { startTime: Date.now() };
  return context;
});

enzyme.hooks.postCommand.use(async (context) => {
  console.log(`[${context.phase}] Completed in ${context.result.duration}ms`);
  console.log(`Exit code: ${context.result.code}`);

  // Send telemetry
  await sendTelemetry({
    command: context.command,
    duration: context.result.duration,
    exitCode: context.result.code,
    success: context.result.code === 0
  });

  return context;
});

enzyme.hooks.onError.use(async (error, context) => {
  console.error(`[${context.phase}] Error:`, error.message);

  // Log to error tracking
  await errorTracker.capture({
    error: error.toJSON(),
    phase: context.phase,
    command: context.command,
    duration: context.duration
  });
});

// Execute command through full lifecycle
try {
  const result = await enzyme.execute('npm', ['install'], {
    cwd: '/path/to/project',
    timeout: 300000,
    transformInput: [
      (args) => {
        console.log('[input-transform] Adding --verbose');
        return [...args, '--verbose'];
      }
    ],
    transformOutput: [
      (output) => {
        console.log('[output-transform] Parsing npm output');
        return parseNpmOutput(output);
      }
    ]
  });

  console.log('Success:', result);
} catch (error) {
  console.error('Failed:', error.message);
}
```

**Benefits for Enzyme:**
- Clear phase separation for debugging
- Consistent error/success handling
- Cancellation checks at critical points
- Observable execution flow
- Transform parity (errors get transformed too)
- Easy testing through phase isolation

---

## 8. Factory Pattern with Instance Creation

### Pattern Name
**Factory Function with Prototype Extension**

### How It Works

Axios uses a factory pattern to create instances with custom configuration:

```javascript
// From lib/axios.js

function createInstance(defaultConfig) {
  // 1. Create new Axios instance with config
  var context = new Axios(defaultConfig);

  // 2. Bind request method to context
  var instance = bind(Axios.prototype.request, context);

  // 3. Copy Axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // 4. Copy context properties to instance
  utils.extend(instance, context);

  // 5. Add factory method to instance
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance
var axios = createInstance(defaults);

// Expose Axios class for extending
axios.Axios = Axios;

// Expose Cancel & CancelToken
axios.CanceledError = require('./cancel/CanceledError');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');
axios.VERSION = require('./env/data').version;
axios.toFormData = require('./helpers/toFormData');

// Expose AxiosError class
axios.AxiosError = require('./core/AxiosError');

// Alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose helper methods
axios.all = function all(promises) {
  return Promise.all(promises);
};

axios.spread = require('./helpers/spread');

// Expose isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;
```

**The bind utility:**

```javascript
// From lib/helpers/bind.js
module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};
```

**The extend utility:**

```javascript
// From lib/utils.js
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}
```

### Why It's Developer-Friendly

1. **Functional API**: Can call `axios()` or `axios.get()` directly
2. **Instance Isolation**: Multiple instances with different configs
3. **Config Inheritance**: Instances inherit from defaults
4. **Recursive Factory**: Instances can create sub-instances
5. **Prototype Sharing**: All methods available on instances
6. **Type Safety**: Exposes constructors for TypeScript
7. **Utility Exposure**: Helper functions available on main export

### Code Example from Axios

```javascript
// Use default instance
await axios.get('/api/users');

// Create custom instance
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'X-Custom-Header': 'value' }
});

await apiClient.get('/users');

// Create sub-instance
const authClient = apiClient.create({
  headers: { 'Authorization': 'Bearer token' }
  // Inherits baseURL and timeout from apiClient
});

await authClient.get('/me');

// Multiple isolated instances
const api1 = axios.create({ baseURL: 'https://api1.com' });
const api2 = axios.create({ baseURL: 'https://api2.com' });

api1.interceptors.request.use(/* ... */); // Only affects api1
api2.interceptors.request.use(/* ... */); // Only affects api2

// Use utilities
axios.all([
  api1.get('/data'),
  api2.get('/data')
]).then(axios.spread((res1, res2) => {
  console.log(res1.data, res2.data);
}));

// Type checking
if (axios.isAxiosError(error)) {
  console.log(error.response);
}
```

### Adaptation for Enzyme CLI Framework

```javascript
// enzyme/lib/utils/bind.js
function bind(fn, thisArg) {
  return function wrapped(...args) {
    return fn.apply(thisArg, args);
  };
}

function extend(target, source, thisArg) {
  Object.keys(source).forEach(key => {
    const value = source[key];
    if (thisArg && typeof value === 'function') {
      target[key] = bind(value, thisArg);
    } else {
      target[key] = value;
    }
  });
  return target;
}

// enzyme/lib/enzyme.js

const { Enzyme } = require('./core/Enzyme');
const { EnzymeError } = require('./core/EnzymeError');
const { CancelToken } = require('./core/CancelToken');
const defaults = require('./defaults');
const { mergeConfig } = require('./core/mergeConfig');

function createInstance(defaultConfig) {
  // 1. Create context with Enzyme instance
  const context = new Enzyme(defaultConfig);

  // 2. Bind execute method as main function
  const instance = bind(Enzyme.prototype.execute, context);

  // 3. Copy Enzyme prototype methods to instance
  extend(instance, Enzyme.prototype, context);

  // 4. Copy context properties to instance
  extend(instance, context);

  // 5. Add factory method for creating sub-instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  // 6. Add convenience methods
  instance.run = function run(command, ...args) {
    return instance.execute(command, args);
  };

  instance.sh = function sh(script, options) {
    return instance.execute('sh', ['-c', script], options);
  };

  instance.bash = function bash(script, options) {
    return instance.execute('bash', ['-c', script], options);
  };

  instance.spawn = function spawn(command, args, options) {
    return instance.execute(command, args, { ...options, stdio: 'inherit' });
  };

  instance.exec = async function exec(command, args, options) {
    const result = await instance.execute(command, args, {
      ...options,
      throwOnError: false
    });
    return result.stdout;
  };

  return instance;
}

// Create default instance
const enzyme = createInstance(defaults);

// Expose core classes
enzyme.Enzyme = Enzyme;
enzyme.EnzymeError = EnzymeError;
enzyme.CancelToken = CancelToken;

// Expose error utilities
enzyme.isEnzymeError = EnzymeError.isEnzymeError;

// Expose helper utilities
enzyme.parallel = function parallel(commands) {
  return Promise.all(commands);
};

enzyme.series = async function series(commands) {
  const results = [];
  for (const command of commands) {
    const result = await command;
    results.push(result);
  }
  return results;
};

enzyme.pipe = async function pipe(...commands) {
  let input = '';
  let result;

  for (const [command, args, options] of commands) {
    result = await enzyme.execute(command, args, {
      ...options,
      stdin: input
    });
    input = result.stdout;
  }

  return result;
};

// Version info
enzyme.VERSION = require('../package.json').version;

module.exports = enzyme;
module.exports.default = enzyme;
module.exports.enzyme = enzyme;

// enzyme/lib/defaults/index.js

module.exports = {
  // Execution options
  timeout: 0, // No timeout by default
  maxBuffer: 1024 * 1024, // 1MB
  encoding: 'utf8',
  shell: false,
  throwOnError: true,

  // Environment
  env: process.env,
  cwd: process.cwd(),

  // Stdio
  stdio: 'pipe', // 'pipe' | 'inherit' | 'ignore'

  // Validation
  validate: true,

  // Transforms
  transformInput: [],
  transformOutput: [],

  // Hooks
  hooks: {
    preCommand: [],
    postCommand: [],
    onError: []
  },

  // Adapters
  adapter: null, // Auto-detect

  // Cancellation
  cancelToken: null,
  signal: null
};

// Usage examples

// 1. Default instance
const enzyme = require('enzyme');
await enzyme('npm', ['install']);
await enzyme.run('npm', 'install');
await enzyme.sh('npm install && npm test');

// 2. Custom instance with config
const docker = enzyme.create({
  adapter: new DockerAdapter({
    image: 'node:18',
    volumes: { [process.cwd()]: '/app' }
  }),
  cwd: '/app'
});

await docker('npm', ['install']);
await docker('npm', ['test']);

// 3. Sub-instance inheritance
const production = enzyme.create({
  env: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info'
  },
  timeout: 60000
});

const deploy = production.create({
  hooks: {
    preCommand: [logToSlack],
    postCommand: [notifySuccess]
  }
  // Inherits NODE_ENV, LOG_LEVEL, timeout from production
});

await deploy('npm', ['run', 'deploy']);

// 4. Isolated instances for different environments
const dev = enzyme.create({
  env: { NODE_ENV: 'development' },
  cwd: './dev'
});

const staging = enzyme.create({
  env: { NODE_ENV: 'staging' },
  cwd: './staging'
});

const prod = enzyme.create({
  env: { NODE_ENV: 'production' },
  cwd: './prod'
});

// Each has independent hooks and config
dev.hooks.preCommand.use(/* dev-specific hooks */);
staging.hooks.preCommand.use(/* staging-specific hooks */);
prod.hooks.preCommand.use(/* prod-specific hooks */);

// 5. Convenience methods
const output = await enzyme.exec('ls', ['-la']); // Returns stdout only
console.log(output);

await enzyme.spawn('npm', ['test']); // Inherits stdio, shows output

await enzyme.bash(`
  echo "Building project..."
  npm run build
  echo "Done!"
`);

// 6. Utilities
await enzyme.parallel([
  enzyme('npm', ['install']),
  enzyme('docker', ['pull', 'node:18']),
  enzyme('git', ['fetch', '--all'])
]);

await enzyme.series([
  enzyme('npm', ['install']),
  enzyme('npm', ['test']),
  enzyme('npm', ['build'])
]);

await enzyme.pipe(
  ['cat', ['file.txt']],
  ['grep', ['error']],
  ['wc', ['-l']]
);

// 7. Error handling
try {
  await enzyme('invalid-command');
} catch (error) {
  if (enzyme.isEnzymeError(error)) {
    console.log('Code:', error.code);
    console.log('Command:', error.command);
  }
}

// 8. Type checking (for libraries)
const { Enzyme } = require('enzyme');

class CustomEnzyme extends Enzyme {
  async executeWithLogging(command, args, options) {
    console.log(`Running: ${command} ${args.join(' ')}`);
    return this.execute(command, args, options);
  }
}

const custom = new CustomEnzyme({ /* config */ });
await custom.executeWithLogging('npm', ['install']);

// 9. Plugin system
enzyme.hooks.preCommand.use(async (context) => {
  // Global logging plugin
  logger.info(`Executing: ${context.command}`);
  return context;
});

const withAuth = enzyme.create({
  transformInput: [
    async (args, context) => {
      // Auth plugin
      if (context.command === 'api-call') {
        const token = await getAuthToken();
        return [...args, `--token=${token}`];
      }
      return args;
    }
  ]
});
```

**Benefits for Enzyme:**
- Simple API: `enzyme(command, args)` just works
- Instance isolation for different environments
- Config inheritance reduces duplication
- Convenience methods for common patterns
- Composable utilities (parallel, series, pipe)
- Easy plugin system through hooks
- TypeScript-friendly with exposed constructors

---

## Summary of DX Best Practices

### Core Principles from Axios

1. **Composition over Configuration**
   - Small, focused features that compose together
   - Interceptors, transforms, adapters all independent
   - Easy to add/remove functionality

2. **Sensible Defaults with Easy Overrides**
   - Works out of the box
   - Every default can be overridden at multiple levels
   - Predictable merge strategies

3. **Promise-Based Async Patterns**
   - Natural async/await support
   - Cancellation through promises
   - Error handling through try/catch

4. **Context Preservation**
   - Errors include full request/response context
   - Interceptors receive full config
   - Transforms get headers, status, etc.

5. **Environment Agnostic**
   - Same API everywhere (browser/Node.js)
   - Adapter pattern abstracts transport
   - Automatic environment detection

6. **Developer Ergonomics**
   - Convenience methods (axios.get, axios.post)
   - Utility functions (axios.all, axios.spread)
   - Type checking (axios.isAxiosError)

7. **Extensibility**
   - Custom adapters
   - Transform pipelines
   - Interceptor chains
   - Instance factory pattern

8. **Observable Lifecycle**
   - Clear phases (pre-request, execution, post-response)
   - Hooks at every stage
   - Cancellation checks throughout

### Recommended Implementation Priority for Enzyme

**Phase 1: Foundation** (MVP)
1. Factory pattern with instance creation
2. Configuration merging
3. Basic adapter pattern (ShellAdapter)
4. Error enhancement

**Phase 2: Developer Experience**
5. Hook/Interceptor system
6. Transform pipelines
7. Cancellation support

**Phase 3: Advanced Features**
8. Multiple adapters (Docker, Remote, K8s)
9. Lifecycle observability
10. Plugin ecosystem

### Key Metrics to Track

- **Time to First Command**: How quickly can developers run their first command?
- **Config Complexity**: How many lines of config for common use cases?
- **Error Clarity**: Can developers debug errors without source code?
- **Extensibility**: Can developers add features without forking?
- **Adoption Rate**: How quickly do teams adopt enzyme vs. raw shell scripts?

---

## Code Structure Recommendations

```
enzyme/
├── lib/
│   ├── core/
│   │   ├── Enzyme.js                 # Main class
│   │   ├── HookManager.js            # Interceptor system
│   │   ├── EnzymeError.js            # Enhanced errors
│   │   ├── CancelToken.js            # Cancellation
│   │   ├── dispatchCommand.js        # Lifecycle orchestration
│   │   ├── mergeConfig.js            # Config merging
│   │   ├── TransformPipeline.js      # Transform system
│   │   └── settle.js                 # Exit code handling
│   ├── adapters/
│   │   ├── BaseAdapter.js            # Adapter interface
│   │   ├── ShellAdapter.js           # Local execution
│   │   ├── DockerAdapter.js          # Container execution
│   │   ├── RemoteAdapter.js          # Remote execution
│   │   └── K8sAdapter.js             # Kubernetes execution
│   ├── defaults/
│   │   ├── index.js                  # Default config
│   │   ├── transforms.js             # Default transforms
│   │   └── validators.js             # Default validators
│   ├── helpers/
│   │   ├── bind.js                   # Function binding
│   │   ├── extend.js                 # Object extension
│   │   ├── isEnzymeError.js          # Type checking
│   │   └── buildCommand.js           # Command building
│   └── enzyme.js                     # Main export
├── index.js                          # Entry point
└── package.json
```

---

## Conclusion

Axios's success comes from its focus on **developer experience through composable patterns**. The library doesn't try to do everything, but what it does, it does exceptionally well. Every pattern is:

- **Predictable**: Clear rules and conventions
- **Composable**: Features work together seamlessly
- **Extensible**: Easy to add custom behavior
- **Observable**: Developers can see what's happening
- **Debuggable**: Rich error context and type checking

For Enzyme, adopting these patterns means:

1. **Faster Adoption**: Familiar patterns from axios/express/etc.
2. **Better DX**: Less cognitive load, more productivity
3. **Enterprise Ready**: Extensibility for complex use cases
4. **Maintainable**: Clear separation of concerns
5. **Testable**: Dependency injection, mock adapters

The investment in these patterns will pay dividends as the enzyme ecosystem grows.
