# Advanced API Features

Enterprise-grade features including API Gateway, Request Orchestration, Rate Limiting, Response Normalization, API Versioning, Request Deduplication, and Metrics Collection.

## Table of Contents

- [API Gateway](#api-gateway)
- [Request Orchestrator](#request-orchestrator)
- [Rate Limiter](#rate-limiter)
- [Request Deduplication](#request-deduplication)
- [Response Normalizer](#response-normalizer)
- [API Versioning](#api-versioning)
- [API Metrics](#api-metrics)

## API Gateway

The API Gateway provides a centralized interface for API communication with middleware support, routing, and request/response interception.

### Creating a Gateway

**Signature:**

```typescript
function createAPIGateway(config: GatewayConfig): APIGateway
```

**Example:**

```typescript
import { createAPIGateway, loggingMiddleware } from '@/lib/api/advanced';

const gateway = createAPIGateway({
  baseUrl: 'https://api.example.com',
  defaultApiVersion: 'v1',
  timeout: 30000,
  getAuthToken: () => localStorage.getItem('token'),
  defaultRetry: {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
  },
});

// Add middleware
gateway.use(loggingMiddleware);
```

### HTTP Methods

#### get()

```typescript
async get<T>(
  path: string,
  options?: Partial<Omit<GatewayRequest, 'path' | 'method' | 'body'>>
): Promise<GatewayResponse<T>>
```

**Example:**

```typescript
const response = await gateway.get<User[]>('/users', {
  params: { page: 1, limit: 20 },
  apiVersion: 'v2',
});
```

#### post()

```typescript
async post<T, B>(
  path: string,
  body?: B,
  options?: Partial<Omit<GatewayRequest<B>, 'path' | 'method' | 'body'>>
): Promise<GatewayResponse<T>>
```

**Example:**

```typescript
const user = await gateway.post<User, CreateUserDto>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});
```

#### put(), patch(), delete()

Similar signatures for other HTTP methods.

### Middleware

Middleware intercepts and processes requests/responses.

**Signature:**

```typescript
type GatewayMiddleware = (
  request: GatewayRequest,
  next: () => Promise<GatewayResponse>
) => Promise<GatewayResponse>
```

**Example:**

```typescript
// Logging middleware
const loggingMiddleware: GatewayMiddleware = async (request, next) => {
  console.log(`${request.method} ${request.path}`);
  const response = await next();
  console.log(`Response: ${response.status}`);
  return response;
};

// Timing middleware
const timingMiddleware: GatewayMiddleware = async (request, next) => {
  const start = Date.now();
  const response = await next();
  console.log(`Duration: ${Date.now() - start}ms`);
  return response;
};

// Authentication middleware
const authMiddleware: GatewayMiddleware = async (request, next) => {
  if (!request.skipAuth) {
    const token = await getAuthToken();
    request.headers = {
      ...request.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return next();
};

gateway.use(loggingMiddleware);
gateway.use(timingMiddleware);
gateway.use(authMiddleware);
```

### Built-in Middleware

#### loggingMiddleware

Logs all requests and responses.

```typescript
import { loggingMiddleware } from '@/lib/api/advanced';

gateway.use(loggingMiddleware);
```

#### correlationIdMiddleware

Adds correlation IDs to requests.

```typescript
import { correlationIdMiddleware } from '@/lib/api/advanced';

gateway.use(correlationIdMiddleware);
```

### Interceptors

Similar to middleware but focused on transformation.

**Example:**

```typescript
// Request interceptor
gateway.addRequestInterceptor((request) => {
  request.headers['X-Client-Version'] = '1.0.0';
  return request;
});

// Response interceptor
gateway.addResponseInterceptor((response) => {
  // Transform timestamps
  if (response.data?.createdAt) {
    response.data.createdAt = new Date(response.data.createdAt);
  }
  return response;
});

// Error interceptor
gateway.addErrorInterceptor((error) => {
  if (error.status === 401) {
    window.location.href = '/login';
  }
  return error;
});
```

### Caching

The gateway supports response caching.

**Example:**

```typescript
const users = await gateway.get<User[]>('/users', {
  cache: {
    ttl: 300000, // 5 minutes
    staleWhileRevalidate: true,
  },
});

// Clear cache
gateway.clearCache(); // Clear all
gateway.clearCache('GET:/users'); // Clear specific
```

### Configuration

```typescript
interface GatewayConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
  defaultApiVersion?: string;
  getAuthToken?: () => string | null | Promise<string | null>;
  defaultRetry?: RetryConfig;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  errorInterceptors?: ErrorInterceptor[];
  middleware?: GatewayMiddleware[];
  debug?: boolean;
}
```

## Request Orchestrator

Orchestrates complex request patterns including parallel, sequential, dependent, and waterfall execution.

### Creating an Orchestrator

```typescript
import { createRequestOrchestrator } from '@/lib/api/advanced';

const orchestrator = createRequestOrchestrator(
  gateway.request.bind(gateway)
);
```

### Parallel Requests

Execute multiple independent requests concurrently.

```typescript
const results = await orchestrator.parallel<User>([
  { path: '/users/1', method: 'GET' },
  { path: '/users/2', method: 'GET' },
  { path: '/users/3', method: 'GET' },
], {
  maxConcurrency: 5, // Max 5 concurrent requests
  stopOnError: false, // Continue on errors
  batchDelay: 100, // Delay between batches
});
```

### Sequential Requests

Execute requests one after another.

```typescript
const results = await orchestrator.sequence([
  { path: '/step1', method: 'POST', body: data },
  { path: '/step2', method: 'POST', body: data },
  { path: '/step3', method: 'POST', body: data },
], {
  delay: 1000, // Wait 1s between requests
  stopOnError: true,
});
```

### Waterfall Pattern

Each step's output feeds the next step.

```typescript
const { result, results } = await orchestrator.waterfall<InitData, FinalResult>(
  [
    {
      id: 'fetchUser',
      execute: async (input) => {
        const user = await gateway.get(`/users/${input.userId}`);
        return user.data;
      },
    },
    {
      id: 'fetchPosts',
      execute: async (user) => {
        const posts = await gateway.get(`/users/${user.id}/posts`);
        return { user, posts: posts.data };
      },
    },
    {
      id: 'enrichPosts',
      execute: async ({ user, posts }) => {
        const enriched = await Promise.all(
          posts.map(post => enrichPost(post))
        );
        return { user, posts: enriched };
      },
    },
  ],
  { userId: '123' }
);
```

### Dependency-Based Orchestration

Execute requests in optimal order based on dependencies.

```typescript
const result = await orchestrator.orchestrate([
  {
    id: 'user',
    request: { path: '/users/me', method: 'GET' },
  },
  {
    id: 'preferences',
    request: { path: '/users/me/preferences', method: 'GET' },
    dependsOn: ['user'],
  },
  {
    id: 'posts',
    request: { path: '/posts', method: 'GET' },
    dependsOn: ['user'],
    condition: (results) => results.user?.role === 'author',
  },
  {
    id: 'analytics',
    request: { path: '/analytics', method: 'GET' },
    dependsOn: ['posts'],
    transform: (data) => data.summary,
    priority: 1,
  },
]);

console.log('User:', result.results.user);
console.log('Posts:', result.results.posts);
console.log('Analytics:', result.results.analytics);
```

### Retry with Fallback

```typescript
const result = await orchestrator.withFallback<User>(
  { path: '/users/primary', method: 'GET' },
  [
    { path: '/users/backup', method: 'GET' },
    { path: '/users/cache', method: 'GET' },
  ]
);
```

### Pagination

```typescript
const allItems = await orchestrator.paginate<Item>({
  path: '/items',
  method: 'GET',
}, {
  pageParam: 'page',
  limitParam: 'limit',
  pageSize: 100,
  maxPages: 10,
  getItems: (data) => data.items,
  hasMore: (data) => data.hasNext,
});
```

## Rate Limiter

Client-side rate limiting to prevent API abuse and respect server limits.

### Creating a Rate Limiter

```typescript
import { createRateLimiter, RATE_LIMIT_PRESETS } from '@/lib/api/advanced';

const limiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  strategy: 'queue', // 'queue' | 'reject' | 'delay'
});

// Or use preset
const limiter = createRateLimiter(RATE_LIMIT_PRESETS.standard);
```

### Rate Limit Presets

```typescript
RATE_LIMIT_PRESETS = {
  conservative: { maxRequests: 60, windowMs: 60000, strategy: 'queue' },
  standard: { maxRequests: 100, windowMs: 60000, strategy: 'queue' },
  aggressive: { maxRequests: 300, windowMs: 60000, strategy: 'delay' },
  burst: { maxRequests: 30, windowMs: 1000, strategy: 'queue' },
}
```

### Executing Requests

```typescript
const result = await limiter.execute('/users', async () => {
  return fetch('/api/users').then(r => r.json());
});
```

### Strategies

#### Queue Strategy

Queues excess requests for later execution.

```typescript
const limiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 1000,
  strategy: 'queue',
  maxQueueSize: 50,
});
```

#### Reject Strategy

Throws error when limit exceeded.

```typescript
const limiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 1000,
  strategy: 'reject',
});

try {
  await limiter.execute('/api', makeRequest);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Retry after ${error.retryAfter}ms`);
  }
}
```

#### Delay Strategy

Waits until rate limit resets.

```typescript
const limiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 1000,
  strategy: 'delay',
  maxDelay: 30000, // Max 30s delay
});
```

### Status Monitoring

```typescript
const status = limiter.getStatus('/api/users');
console.log(`${status.remaining} requests remaining`);
console.log(`Reset in ${status.resetIn}ms`);
console.log(`Queue size: ${status.queueSize}`);
```

### Server Rate Limit Headers

```typescript
// Update from response headers
limiter.updateFromHeaders('/api/users', {
  'x-ratelimit-remaining': '50',
  'x-ratelimit-limit': '100',
  'x-ratelimit-reset': '1234567890',
});

// Handle 429 response
limiter.handle429('/api/users', '60'); // Retry after 60 seconds
```

### Configuration

```typescript
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  strategy?: 'queue' | 'reject' | 'delay';
  maxQueueSize?: number;
  maxDelay?: number;
  keyGenerator?: (endpoint: string) => string;
}
```

## Request Deduplication

Automatically deduplicates concurrent identical requests.

### Creating a Deduplicator

```typescript
import { createRequestDeduplicator } from '@/lib/api/advanced';

const deduplicator = createRequestDeduplicator({
  keyGenerator: (url, options) => `${options.method}:${url}`,
  ttl: 5000, // Keep results for 5s
});
```

### Deduplicated Fetch

```typescript
import { createDeduplicatedFetch } from '@/lib/api/advanced';

const fetch = createDeduplicatedFetch();

// Only one actual request is made
const [r1, r2, r3] = await Promise.all([
  fetch('/api/users'),
  fetch('/api/users'),
  fetch('/api/users'),
]);
```

### Function Deduplication

```typescript
import { deduplicateFunction } from '@/lib/api/advanced';

const fetchUser = deduplicateFunction(
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  },
  {
    keyGenerator: (userId) => userId,
  }
);

// Only one API call
const [user1, user2] = await Promise.all([
  fetchUser('123'),
  fetchUser('123'),
]);
```

### React Query Integration

```typescript
import { ReactQueryDeduplicator } from '@/lib/api/advanced';

const deduplicator = new ReactQueryDeduplicator();

// Use with React Query
const queryFn = deduplicator.wrap(async () => {
  const response = await fetch('/api/users');
  return response.json();
});
```

### Statistics

```typescript
const stats = deduplicator.getStats();
console.log(`Deduplication rate: ${stats.deduplicationRate * 100}%`);
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Deduplicated: ${stats.deduplicatedRequests}`);
```

## Response Normalizer

Normalizes API responses to a consistent format.

### Creating a Normalizer

```typescript
import { createResponseNormalizer } from '@/lib/api/advanced';

const normalizer = createResponseNormalizer({
  format: 'json-api', // 'json-api' | 'hal' | 'odata' | 'custom'
  normalizeErrors: true,
  extractPagination: true,
});
```

### Normalizing Responses

```typescript
const normalized = normalizer.normalize(response);

// Normalized structure
interface NormalizedResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: number;
    version?: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  links?: {
    self?: string;
    next?: string;
    previous?: string;
    first?: string;
    last?: string;
  };
}
```

### Error Normalization

```typescript
import { normalizeErrors } from '@/lib/api/advanced';

const normalized = normalizeErrors(errorResponse);

interface NormalizedError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
  source?: {
    pointer?: string;
    parameter?: string;
  };
}
```

### Custom Format

```typescript
const normalizer = createResponseNormalizer({
  format: 'custom',
  extractData: (response) => response.payload,
  extractPagination: (response) => ({
    page: response.page,
    pageSize: response.size,
    total: response.totalItems,
  }),
});
```

## API Versioning

Manage multiple API versions with automatic transformation.

### Creating a Version Manager

```typescript
import { createVersionManager } from '@/lib/api/advanced';

const versionManager = createVersionManager({
  strategy: 'url', // 'url' | 'header' | 'param'
  defaultVersion: 'v1',
  supportedVersions: ['v1', 'v2', 'v3'],
});
```

### Versioning Strategies

#### URL Strategy

```typescript
const manager = createVersionManager({
  strategy: 'url',
  urlTemplate: '/api/{version}/users',
});

// Generates: /api/v2/users
```

#### Header Strategy

```typescript
const manager = createVersionManager({
  strategy: 'header',
  headerName: 'API-Version',
});

// Adds header: API-Version: v2
```

#### Parameter Strategy

```typescript
const manager = createVersionManager({
  strategy: 'param',
  paramName: 'version',
});

// Adds query param: ?version=v2
```

### Version Transformations

```typescript
versionManager.addTransform('v1', 'v2', {
  request: (data) => {
    // Transform v1 request to v2 format
    return {
      ...data,
      fullName: `${data.firstName} ${data.lastName}`,
    };
  },
  response: (data) => {
    // Transform v2 response to v1 format
    const [firstName, lastName] = data.fullName.split(' ');
    return { ...data, firstName, lastName };
  },
});
```

### Deprecation

```typescript
versionManager.deprecate('v1', {
  sunsetDate: '2024-12-31',
  message: 'v1 will be removed on December 31, 2024',
  replacementVersion: 'v2',
});
```

## API Metrics

Collect and analyze API performance metrics.

### Creating a Metrics Collector

```typescript
import {
  createMetricsCollector,
  consoleReporter,
} from '@/lib/api/advanced';

const metrics = createMetricsCollector({
  reporter: consoleReporter,
  reportInterval: 60000, // Report every minute
  aggregationWindow: 300000, // 5 minute window
});
```

### Recording Metrics

```typescript
// Automatic recording via interceptor
gateway.addResponseInterceptor((response) => {
  metrics.record({
    endpoint: response.request.url,
    method: response.request.method,
    status: response.status,
    duration: response.duration,
    size: JSON.stringify(response.data).length,
  });
  return response;
});
```

### Metrics Data

```typescript
interface RequestMetric {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  size?: number;
  timestamp: number;
  error?: string;
}

interface EndpointMetrics {
  endpoint: string;
  requestCount: number;
  errorCount: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  averageSize?: number;
}

interface OverallMetrics {
  totalRequests: number;
  totalErrors: number;
  averageDuration: number;
  requestsPerSecond: number;
  errorRate: number;
  endpoints: EndpointMetrics[];
}
```

### Custom Reporter

```typescript
const customReporter = (metrics: OverallMetrics) => {
  // Send to analytics service
  analytics.track('api_metrics', {
    total_requests: metrics.totalRequests,
    error_rate: metrics.errorRate,
    avg_duration: metrics.averageDuration,
  });
};

const collector = createMetricsCollector({
  reporter: customReporter,
  reportInterval: 60000,
});
```

### Batched Reporter

```typescript
import { createBatchedReporter } from '@/lib/api/advanced';

const reporter = createBatchedReporter({
  batchSize: 100,
  flushInterval: 30000,
  endpoint: '/api/metrics',
});
```

### Query Metrics

```typescript
// Get overall metrics
const overall = collector.getOverallMetrics();

// Get endpoint-specific metrics
const endpointMetrics = collector.getEndpointMetrics('/api/users');

// Get time-series data
const timeSeries = collector.getTimeSeriesData('/api/users', {
  startTime: Date.now() - 3600000, // Last hour
  interval: 60000, // 1 minute buckets
});
```

## Related Documentation

### API Documentation
- **[API Module Overview](./README.md)** - Complete API module guide
- **[API Client](./API_CLIENT.md)** - HTTP client and configuration
- **[Hooks](./HOOKS.md)** - React hooks for data fetching
- **[Types](./TYPES.md)** - TypeScript type reference
- **[Interceptors](./INTERCEPTORS.md)** - Request/response interceptors
- **[Auto Generation](./AUTO_GENERATION.md)** - Auto-generate REST APIs

### Integration Guides
- **[Queries Module](../queries/README.md)** - React Query integration
- **[Performance Module](../performance/README.md)** - Performance monitoring
- **[State Management](../state/README.md)** - Global state integration

### Advanced Topics
- **[Security Module](../security/README.md)** - RBAC and authentication
- **[Realtime Module](../realtime/README.md)** - WebSocket integration

### Reference
- **[Configuration](../config/README.md)** - Configuration options
