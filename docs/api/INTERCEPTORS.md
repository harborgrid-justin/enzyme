# Request Interceptors

Interceptors for modifying requests, responses, and handling cross-cutting concerns like CSRF protection, authentication, and logging.

## Table of Contents

- [Overview](#overview)
- [CSRF Interceptor](#csrf-interceptor)
- [Custom Interceptors](#custom-interceptors)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

## Overview

Interceptors allow you to intercept and modify requests/responses globally before they are sent or after they are received.

### Types of Interceptors

1. **Request Interceptors** - Modify requests before they are sent
2. **Response Interceptors** - Modify responses after they are received
3. **Error Interceptors** - Handle or transform errors

### Adding Interceptors

```typescript
import { apiClient } from '@/lib/api';

// Request interceptor
const removeRequestInterceptor = apiClient.addRequestInterceptor((config) => {
  // Modify request config
  return config;
});

// Response interceptor
const removeResponseInterceptor = apiClient.addResponseInterceptor((response) => {
  // Modify response
  return response;
});

// Error interceptor
const removeErrorInterceptor = apiClient.addErrorInterceptor((error) => {
  // Handle error
  return error;
});

// Remove interceptors when no longer needed
removeRequestInterceptor();
removeResponseInterceptor();
removeErrorInterceptor();
```

## CSRF Interceptor

Automatically adds CSRF tokens to mutation requests for protection against Cross-Site Request Forgery attacks.

### createCsrfInterceptor()

**Signature:**

```typescript
function createCsrfInterceptor(
  config?: CsrfInterceptorConfig
): RequestInterceptor
```

**Configuration:**

```typescript
interface CsrfInterceptorConfig {
  cookieName?: string;           // Cookie containing token (default: 'csrf_token')
  headerName?: string;            // Header to send token (default: 'X-CSRF-Token')
  protectedMethods?: string[];    // Methods requiring CSRF (default: ['POST', 'PUT', 'PATCH', 'DELETE'])
  tokenExtractor?: () => string | null; // Custom token extraction
  excludePatterns?: Array<string | RegExp>; // URLs to exclude
  onMissingToken?: (config: RequestConfig) => void; // Missing token callback
}
```

### Basic Usage

```typescript
import { apiClient } from '@/lib/api';
import { createCsrfInterceptor } from '@/lib/api/interceptors';

// Add CSRF protection
apiClient.addRequestInterceptor(createCsrfInterceptor());

// All mutation requests now include CSRF token
await apiClient.post('/users', userData); // Includes X-CSRF-Token header
```

### Pre-configured Interceptors

#### defaultCsrfInterceptor

Standard configuration using `csrf_token` cookie and `X-CSRF-Token` header.

```typescript
import { defaultCsrfInterceptor } from '@/lib/api/interceptors';

apiClient.addRequestInterceptor(defaultCsrfInterceptor);
```

#### xsrfInterceptor

Angular/Django style using `XSRF-TOKEN` cookie and `X-XSRF-Token` header.

```typescript
import { xsrfInterceptor } from '@/lib/api/interceptors';

apiClient.addRequestInterceptor(xsrfInterceptor);
```

#### railsCsrfInterceptor

Rails style reading token from meta tag.

```typescript
import { railsCsrfInterceptor } from '@/lib/api/interceptors';

// Expects: <meta name="csrf-token" content="token-value">
apiClient.addRequestInterceptor(railsCsrfInterceptor);
```

### Custom Token Extraction

```typescript
import { createCsrfInterceptor } from '@/lib/api/interceptors';

// Extract from meta tag
const csrfInterceptor = createCsrfInterceptor({
  tokenExtractor: () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content') || null;
  },
});

// Extract from localStorage
const csrfInterceptor = createCsrfInterceptor({
  tokenExtractor: () => localStorage.getItem('csrf_token'),
});

// Extract from custom store
const csrfInterceptor = createCsrfInterceptor({
  tokenExtractor: () => authStore.getCsrfToken(),
});
```

### URL Exclusions

```typescript
const csrfInterceptor = createCsrfInterceptor({
  excludePatterns: [
    '/api/webhooks',           // Exact string match
    /\/api\/public\/.*/,       // RegExp pattern
    '/auth/login',             // Login endpoint
  ],
});
```

### Missing Token Handler

```typescript
const csrfInterceptor = createCsrfInterceptor({
  onMissingToken: (config) => {
    console.warn('CSRF token missing for request:', config.url);
    // Trigger token refresh
    refreshCsrfToken();
  },
});
```

### CSRF Utility Functions

#### setCsrfToken()

Manually set CSRF token in cookies.

```typescript
import { setCsrfToken } from '@/lib/api/interceptors';

setCsrfToken('my-token-value', 'csrf_token', {
  path: '/',
  secure: true,
  sameSite: 'Strict',
  maxAge: 86400, // 24 hours
});
```

#### getCsrfToken()

Get current CSRF token value.

```typescript
import { getCsrfToken } from '@/lib/api/interceptors';

const token = getCsrfToken('csrf_token');
if (token) {
  console.log('Current CSRF token:', token);
}
```

#### clearCsrfToken()

Clear CSRF token from cookies.

```typescript
import { clearCsrfToken } from '@/lib/api/interceptors';

clearCsrfToken('csrf_token', '/');
```

## Custom Interceptors

### Request Interceptors

Modify requests before they are sent.

#### Authentication

```typescript
apiClient.addRequestInterceptor((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});
```

#### Request ID

```typescript
apiClient.addRequestInterceptor((config) => {
  config.meta = {
    ...config.meta,
    requestId: crypto.randomUUID(),
  };
  config.headers = {
    ...config.headers,
    'X-Request-ID': config.meta.requestId,
  };
  return config;
});
```

#### Timestamp

```typescript
apiClient.addRequestInterceptor((config) => {
  config.meta = {
    ...config.meta,
    timestamp: Date.now(),
  };
  return config;
});
```

#### API Version

```typescript
apiClient.addRequestInterceptor((config) => {
  config.headers = {
    ...config.headers,
    'API-Version': '2.0',
  };
  return config;
});
```

#### Content Negotiation

```typescript
apiClient.addRequestInterceptor((config) => {
  if (config.acceptJson !== false) {
    config.headers = {
      ...config.headers,
      'Accept': 'application/json',
    };
  }
  return config;
});
```

#### URL Transformation

```typescript
apiClient.addRequestInterceptor((config) => {
  // Add tenant ID to URLs
  const tenantId = getCurrentTenantId();
  if (tenantId && !config.url?.includes('/public/')) {
    config.url = `/tenants/${tenantId}${config.url}`;
  }
  return config;
});
```

### Response Interceptors

Modify responses after they are received.

#### Data Unwrapping

```typescript
apiClient.addResponseInterceptor((response) => {
  // Unwrap envelope format
  if (response.data && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
});
```

#### Date Parsing

```typescript
apiClient.addResponseInterceptor((response) => {
  // Parse ISO date strings to Date objects
  const parseDates = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;

    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        obj[key] = new Date(value);
      } else if (typeof value === 'object') {
        obj[key] = parseDates(value);
      }
    }
    return obj;
  };

  response.data = parseDates(response.data);
  return response;
});
```

#### Response Caching

```typescript
const cache = new Map<string, any>();

apiClient.addResponseInterceptor((response) => {
  if (response.request.method === 'GET') {
    const cacheKey = `${response.request.url}?${JSON.stringify(response.request.params)}`;
    cache.set(cacheKey, response.data);
  }
  return response;
});
```

#### Performance Logging

```typescript
apiClient.addResponseInterceptor((response) => {
  const duration = response.timing?.duration || 0;
  if (duration > 1000) {
    console.warn(`Slow request: ${response.request.url} took ${duration}ms`);
  }
  return response;
});
```

#### Response Normalization

```typescript
apiClient.addResponseInterceptor((response) => {
  // Normalize API response format
  if (!response.data) {
    response.data = { data: null, meta: {} };
  }
  if (!response.data.meta) {
    response.data.meta = {
      timestamp: Date.now(),
      requestId: response.request.meta?.requestId,
    };
  }
  return response;
});
```

### Error Interceptors

Handle or transform errors.

#### Authentication Errors

```typescript
apiClient.addErrorInterceptor((error) => {
  if (error.status === 401) {
    // Clear tokens
    localStorage.removeItem('auth_token');
    // Redirect to login
    window.location.href = '/login';
  }
  return error;
});
```

#### Token Refresh

```typescript
apiClient.addErrorInterceptor(async (error) => {
  if (error.status === 401 && error.code === 'TOKEN_EXPIRED') {
    try {
      // Attempt to refresh token
      const newToken = await refreshAuthToken();
      localStorage.setItem('auth_token', newToken);

      // Retry the original request
      const originalRequest = error.request;
      if (originalRequest) {
        return apiClient.request(originalRequest);
      }
    } catch (refreshError) {
      // Refresh failed, redirect to login
      window.location.href = '/login';
    }
  }
  return error;
});
```

#### Error Reporting

```typescript
apiClient.addErrorInterceptor((error) => {
  // Send to error tracking service
  if (error.status >= 500) {
    errorTracker.captureException(error, {
      tags: {
        url: error.request?.url,
        method: error.request?.method,
        status: error.status,
      },
      extra: {
        requestId: error.requestId,
        correlationId: error.correlationId,
      },
    });
  }
  return error;
});
```

#### User-Friendly Messages

```typescript
apiClient.addErrorInterceptor((error) => {
  // Transform error messages for users
  const userMessages: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Please log in to continue.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    429: 'Too many requests. Please try again later.',
    500: 'An unexpected error occurred. Please try again.',
  };

  if (error.status && userMessages[error.status]) {
    error.message = userMessages[error.status];
  }

  return error;
});
```

#### Retry Logic

```typescript
const MAX_RETRIES = 3;
const retryCount = new Map<string, number>();

apiClient.addErrorInterceptor(async (error) => {
  if (error.retryable && error.request) {
    const requestId = error.request.meta?.requestId || error.request.url;
    const count = retryCount.get(requestId) || 0;

    if (count < MAX_RETRIES) {
      retryCount.set(requestId, count + 1);

      // Exponential backoff
      const delay = Math.pow(2, count) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry request
      return apiClient.request(error.request);
    }

    retryCount.delete(requestId);
  }

  return error;
});
```

## Common Patterns

### Request Correlation

Track requests across multiple services.

```typescript
apiClient.addRequestInterceptor((config) => {
  // Generate or propagate correlation ID
  const correlationId = config.meta?.correlationId || crypto.randomUUID();

  config.meta = {
    ...config.meta,
    correlationId,
  };

  config.headers = {
    ...config.headers,
    'X-Correlation-ID': correlationId,
  };

  return config;
});

apiClient.addResponseInterceptor((response) => {
  // Log correlation ID
  console.log(`[${response.request.meta?.correlationId}] ${response.status} ${response.request.url}`);
  return response;
});
```

### Request Timing

Measure and log request performance.

```typescript
const timings = new Map<string, number>();

apiClient.addRequestInterceptor((config) => {
  const requestId = crypto.randomUUID();
  config.meta = { ...config.meta, requestId };
  timings.set(requestId, Date.now());
  return config;
});

apiClient.addResponseInterceptor((response) => {
  const requestId = response.request.meta?.requestId;
  if (requestId) {
    const start = timings.get(requestId);
    if (start) {
      const duration = Date.now() - start;
      console.log(`Request ${response.request.url} took ${duration}ms`);
      timings.delete(requestId);
    }
  }
  return response;
});
```

### Conditional Headers

Add headers based on conditions.

```typescript
apiClient.addRequestInterceptor((config) => {
  // Add X-Debug header in development
  if (process.env.NODE_ENV === 'development') {
    config.headers = {
      ...config.headers,
      'X-Debug': 'true',
    };
  }

  // Add feature flags
  const flags = getActiveFeatureFlags();
  if (flags.length > 0) {
    config.headers = {
      ...config.headers,
      'X-Feature-Flags': flags.join(','),
    };
  }

  return config;
});
```

### Response Transformation

Transform API responses to match application needs.

```typescript
apiClient.addResponseInterceptor((response) => {
  // Transform snake_case to camelCase
  const toCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(toCamelCase);
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((result, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = toCamelCase(obj[key]);
        return result;
      }, {} as any);
    }
    return obj;
  };

  response.data = toCamelCase(response.data);
  return response;
});
```

## Best Practices

### 1. Order Matters

Interceptors execute in the order they are added. Add interceptors in logical order:

```typescript
// 1. Add request metadata
apiClient.addRequestInterceptor(addRequestIdInterceptor);

// 2. Add authentication
apiClient.addRequestInterceptor(authInterceptor);

// 3. Add CSRF protection
apiClient.addRequestInterceptor(csrfInterceptor);

// Response interceptors execute in reverse order
apiClient.addResponseInterceptor(parseDataInterceptor);
apiClient.addResponseInterceptor(logResponseInterceptor);
```

### 2. Keep Interceptors Pure

Avoid side effects when possible:

```typescript
// ✅ Good - pure transformation
apiClient.addRequestInterceptor((config) => ({
  ...config,
  headers: { ...config.headers, 'X-Custom': 'value' },
}));

// ❌ Bad - mutating config
apiClient.addRequestInterceptor((config) => {
  config.headers['X-Custom'] = 'value';
  return config;
});
```

### 3. Handle Errors Gracefully

Always return the error, even if you can't handle it:

```typescript
// ✅ Good
apiClient.addErrorInterceptor((error) => {
  if (error.status === 401) {
    handleAuthError();
  }
  return error; // Always return
});

// ❌ Bad
apiClient.addErrorInterceptor((error) => {
  if (error.status === 401) {
    handleAuthError();
    // Forgot to return!
  }
});
```

### 4. Clean Up

Remove interceptors when they're no longer needed:

```typescript
useEffect(() => {
  const removeInterceptor = apiClient.addRequestInterceptor(interceptor);

  return () => {
    removeInterceptor(); // Cleanup on unmount
  };
}, []);
```

### 5. Type Safety

Use TypeScript for better type safety:

```typescript
import type { RequestInterceptor } from '@/lib/api/types';

const authInterceptor: RequestInterceptor = (config) => {
  // Type-safe implementation
  return config;
};
```

## Related Documentation

### API Documentation
- **[API Module Overview](./README.md)** - Complete API module guide
- **[API Client](./API_CLIENT.md)** - HTTP client, configuration, and utilities
- **[Hooks](./HOOKS.md)** - React hooks for data fetching
- **[Types](./TYPES.md)** - TypeScript type reference
- **[Advanced Features](./ADVANCED.md)** - API Gateway and middleware

### Integration Guides
- **[State Management](../state/README.md)** - Global state integration
- **[Shared Utilities](../shared/README.md)** - Event bus utilities
- **[Configuration](../config/README.md)** - Configuration options

### Reference
- **[Performance Guide](../performance/README.md)** - Performance optimization
