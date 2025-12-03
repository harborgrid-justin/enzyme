# Results Extension

Comprehensive result transformation and computed fields extension for the enzyme framework, inspired by Prisma's result extensions.

## Overview

The Results Extension provides enterprise-grade capabilities for transforming, enhancing, and manipulating API results and data structures. It includes:

1. **Computed Fields** - Add derived properties to results
2. **Result Transformations** - Transform API responses
3. **Field Dependencies** - Define field dependencies for computation order
4. **Memoization** - Cache computed values for performance
5. **Result Normalization** - Normalize nested data structures
6. **Result Denormalization** - Reconstruct nested structures
7. **Field Masking** - Hide sensitive fields from results
8. **Field Aliasing** - Rename fields in output
9. **Result Aggregation** - Combine multiple results
10. **Result Diffing** - Detect changes between results

## Installation

The results extension is included in the enzyme library:

```typescript
import { resultsExtension } from '@enzyme/extensions';
```

## Basic Usage

### 1. Computed Fields

Add computed properties that depend on other fields:

```typescript
import { ResultEnhancer } from '@enzyme/extensions';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

const userEnhancer = new ResultEnhancer<User>();

// Define computed field
userEnhancer.defineComputedField('fullName', {
  needs: ['firstName', 'lastName'],
  compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
  cache: true, // Enable memoization
});

// Use it
const user = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
};

const enhanced = userEnhancer.enhance(user);
console.log(enhanced.fullName); // "John Doe"
```

### 2. Result Transformations

Transform results using composable functions:

```typescript
import { transform, mapFields, pickFields, omitFields } from '@enzyme/extensions';

const product = {
  id: 1,
  name: 'Laptop',
  price: 999.99,
  internalCode: 'INT-001',
  supplierEmail: 'supplier@example.com'
};

// Pick only public fields
const publicProduct = transform(
  product,
  pickFields(['id', 'name', 'price'])
);

// Omit internal fields
const cleanProduct = transform(
  product,
  omitFields(['internalCode', 'supplierEmail'])
);

// Map field values
const formattedProduct = transform(
  product,
  mapFields({
    price: (val) => `$${Number(val).toFixed(2)}`
  })
);

// Chain transformers
const apiResponse = transform(
  product,
  omitFields(['internalCode', 'supplierEmail']),
  mapFields({
    price: (val) => `$${Number(val).toFixed(2)}`
  })
);
```

### 3. Normalization

Flatten nested data structures for efficient storage and updates:

```typescript
import { normalize, denormalize, type NormalizationSchema } from '@enzyme/extensions';

interface Post {
  id: number;
  title: string;
  author: Author;
  comments: Comment[];
}

const postSchema: NormalizationSchema<Post> = {
  entity: 'posts',
  idField: 'id',
  relations: {
    author: {
      entity: 'authors',
      idField: 'id'
    },
    comments: {
      entity: 'comments',
      idField: 'id',
      relations: {
        author: {
          entity: 'authors',
          idField: 'id'
        }
      }
    }
  },
  arrays: ['comments']
};

const nestedPost = {
  id: 1,
  title: 'My Post',
  author: { id: 1, name: 'John', email: 'john@example.com' },
  comments: [
    { id: 1, text: 'Great!', author: { id: 2, name: 'Jane', email: 'jane@example.com' } }
  ]
};

// Normalize
const normalized = normalize(nestedPost, postSchema);
// {
//   entities: {
//     posts: { 1: { id: 1, title: 'My Post', author: 1, comments: [1] } },
//     authors: {
//       1: { id: 1, name: 'John', email: 'john@example.com' },
//       2: { id: 2, name: 'Jane', email: 'jane@example.com' }
//     },
//     comments: { 1: { id: 1, text: 'Great!', author: 2 } }
//   },
//   result: 1
// }

// Denormalize back
const denormalized = denormalize(normalized, postSchema);
```

### 4. Field Masking

Protect sensitive data:

```typescript
import { mask } from '@enzyme/extensions';

const sensitiveUser = {
  id: 1,
  username: 'john_doe',
  email: 'john@example.com',
  password: 'secret123',
  ssn: '123-45-6789',
  creditCard: '4111-1111-1111-1111'
};

const maskedUser = mask(sensitiveUser, {
  remove: ['password'], // Completely remove
  redact: ['ssn', 'creditCard'], // Replace with [REDACTED]
  custom: {
    email: (email) => {
      const [local, domain] = String(email).split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
  }
});

// Result:
// {
//   id: 1,
//   username: 'john_doe',
//   email: 'jo***@example.com',
//   ssn: '[REDACTED]',
//   creditCard: '[REDACTED]'
// }
```

### 5. Field Aliasing

Rename fields for API compatibility:

```typescript
import { alias } from '@enzyme/extensions';

const dbRecord = {
  user_id: 1,
  first_name: 'John',
  last_name: 'Doe',
  created_at: '2024-01-01'
};

// Convert snake_case to camelCase
const apiRecord = alias(dbRecord, {
  user_id: 'userId',
  first_name: 'firstName',
  last_name: 'lastName',
  created_at: 'createdAt'
});

// Result: { userId: 1, firstName: 'John', lastName: 'Doe', createdAt: '2024-01-01' }
```

### 6. Result Aggregation

Combine and analyze multiple results:

```typescript
import { aggregate, aggregators } from '@enzyme/extensions';

const sales = [
  { id: 1, amount: 100, category: 'electronics' },
  { id: 2, amount: 150, category: 'electronics' },
  { id: 3, amount: 75, category: 'books' }
];

// Built-in aggregators
const totalSales = aggregate(sales, aggregators.sum('amount')); // 325
const avgSale = aggregate(sales, aggregators.avg('amount')); // 108.33
const maxSale = aggregate(sales, aggregators.max('amount')); // 150
const minSale = aggregate(sales, aggregators.min('amount')); // 75
const count = aggregate(sales, aggregators.count()); // 3

// Group by
const byCategory = aggregate(sales, aggregators.groupBy('category'));
// { electronics: [...], books: [...] }

// Custom aggregation
const categoryTotals = aggregate(sales, (items) => {
  const totals: Record<string, number> = {};
  for (const item of items) {
    if (!totals[item.category]) totals[item.category] = 0;
    totals[item.category] += item.amount;
  }
  return totals;
});
```

### 7. Result Diffing

Detect changes between results:

```typescript
import { diff, applyDiff } from '@enzyme/extensions';

const oldUser = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 30
};

const newUser = {
  id: 1,
  firstName: 'John',
  lastName: 'Smith', // Changed
  email: 'john.smith@example.com', // Changed
  age: 31 // Changed
};

const userDiff = diff(oldUser, newUser);
// {
//   changes: [
//     { op: 'replace', path: ['lastName'], oldValue: 'Doe', newValue: 'Smith' },
//     { op: 'replace', path: ['email'], oldValue: 'john@example.com', newValue: 'john.smith@example.com' },
//     { op: 'replace', path: ['age'], oldValue: 30, newValue: 31 }
//   ],
//   hasChanges: true,
//   changeCount: 3,
//   changedFields: Set(['lastName', 'email', 'age'])
// }

// Check specific field
if (userDiff.changedFields.has('email')) {
  console.log('Email changed, send verification');
}

// Apply diff to another object
const applied = applyDiff(oldUser, userDiff);
```

## React Query Integration

Integrate with React Query for automatic result enhancement:

```typescript
import { createReactQueryMiddleware, ResultEnhancer } from '@enzyme/extensions';
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();
const userEnhancer = new ResultEnhancer<User>();

userEnhancer.defineComputedField('fullName', {
  needs: ['firstName', 'lastName'],
  compute: ({ firstName, lastName }) => `${firstName} ${lastName}`
});

const middleware = createReactQueryMiddleware({
  queryClient,
  autoEnhance: true,
  enhancer: userEnhancer
});

// Use in queries
async function fetchUser(id: number) {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();

  // Auto-enhance with computed fields
  return middleware.enhanceQuery(['users', id], data);
}

// Invalidate only if changed
async function updateUser(id: number, updates: Partial<User>) {
  const response = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  const newData = await response.json();

  // Only invalidate if data actually changed
  await middleware.invalidateWithDiff(['users', id], newData);
}

// Store normalized data
middleware.setNormalizedData(['posts', postId], post, postSchema);

// Retrieve denormalized
const post = middleware.getDenormalizedData(['posts', postId], postSchema);
```

## Using with Enzyme Extension System

Integrate with enzyme's extension system:

```typescript
import { createEnzyme } from '@enzyme/core';
import { resultsExtension } from '@enzyme/extensions';

const enzyme = createEnzyme().$extends(resultsExtension);

// Define computed fields
enzyme.$defineComputedField('User', 'fullName', {
  needs: ['firstName', 'lastName'],
  compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
  cache: true
});

// Use client methods
const user = await fetchUser(1);
const enhanced = enzyme.$enhance('User', user);
const publicUser = enzyme.$transform(user, pickFields(['id', 'name', 'email']));
const safeUser = enzyme.$mask(user, { remove: ['password'], redact: ['ssn'] });

// Clear caches
enzyme.$clearCache('User'); // Clear specific model
enzyme.$clearCache(); // Clear all models

// Get cache stats
const stats = enzyme.$getCacheStats();
console.log(stats); // { User: { size: 150, hits: 1247, avgHits: 8.31 } }
```

## Advanced Patterns

### Computed Field Composition

Chain multiple computed fields and transformers:

```typescript
const employeeEnhancer = new ResultEnhancer<Employee>();

employeeEnhancer
  .defineComputedField('fullName', {
    needs: ['firstName', 'lastName'],
    compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    cache: true
  })
  .defineComputedField('tenure', {
    needs: ['startDate'],
    compute: ({ startDate }) => {
      const years = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
      return Math.floor(years);
    },
    cache: true
  })
  .addTransformer((emp) => ({
    ...emp,
    salaryTier: emp.salary < 50000 ? 'junior' : emp.salary < 100000 ? 'mid' : 'senior'
  }));
```

### Custom Cache Keys

Optimize cache performance with custom keys:

```typescript
enhancer.defineComputedField('expensiveComputation', {
  needs: ['data'],
  compute: ({ data }) => {
    // Expensive operation
    return performComplexCalculation(data);
  },
  cache: true,
  cacheKey: ({ data }) => {
    // Custom cache key for better hit rate
    return `${data.type}-${data.id}-${data.version}`;
  }
});
```

### Conditional Enhancement

Apply different enhancements based on context:

```typescript
function enhanceUser(user: User, context: 'public' | 'admin' | 'internal') {
  let result = userEnhancer.enhance(user);

  if (context === 'public') {
    result = transform(result, pickFields(['id', 'fullName', 'avatar']));
  } else if (context === 'admin') {
    result = mask(result, { redact: ['ssn', 'password'] });
  }

  return result;
}
```

## Performance Considerations

### Memoization

Enable caching for expensive computed fields:

```typescript
enhancer.defineComputedField('expensiveField', {
  needs: ['data'],
  compute: ({ data }) => expensiveOperation(data),
  cache: true // Enable memoization
});

// Monitor cache performance
const stats = enhancer.getCacheStats();
console.log(`Cache hit rate: ${(stats.hits / stats.size * 100).toFixed(2)}%`);

// Clear cache periodically
setInterval(() => enhancer.clearCache(), 5 * 60 * 1000); // Every 5 minutes
```

### Selective Enhancement

Only enhance fields when needed:

```typescript
// Don't enhance list views
const users = await fetchUsers();
// users remain plain objects

// Only enhance detail view
const user = await fetchUser(id);
const enhanced = userEnhancer.enhance(user);
```

## TypeScript Support

Full TypeScript inference for type safety:

```typescript
interface User {
  id: number;
  firstName: string;
  lastName: string;
}

const enhancer = new ResultEnhancer<User>();

// Type-safe dependencies
enhancer.defineComputedField('fullName', {
  needs: ['firstName', 'lastName'], // ✓ Valid fields
  // needs: ['invalid'], // ✗ TypeScript error
  compute: ({ firstName, lastName }) => `${firstName} ${lastName}` // ✓ Typed params
});

// Type-safe result
const enhanced = enhancer.enhance(user);
enhanced.fullName; // ✓ string (inferred)
```

## Best Practices

1. **Use Memoization** - Enable caching for expensive computations
2. **Define Dependencies** - Only include fields you actually need
3. **Clear Caches** - Periodically clear caches to prevent memory leaks
4. **Mask Sensitive Data** - Always mask sensitive fields before sending to client
5. **Normalize Complex Data** - Use normalization for deeply nested structures
6. **Monitor Performance** - Use `getCacheStats()` to track cache efficiency
7. **Type Everything** - Leverage TypeScript for type safety
8. **Test Transformations** - Write tests for computed fields and transformers

## API Reference

### ResultEnhancer

```typescript
class ResultEnhancer<T extends Record<string, unknown>> {
  defineComputedField<TDeps extends (keyof T)[], TResult>(
    name: string,
    definition: ComputedFieldDef<T, TDeps, TResult>
  ): this;

  addTransformer<R>(transformer: ResultTransformer<T, R>): this;
  enhance(result: T): T & Record<string, unknown>;
  enhanceMany(results: T[]): (T & Record<string, unknown>)[];
  clearCache(): void;
  getCacheStats(): { size: number; hits: number; avgHits: number };
}
```

### Transformation Functions

```typescript
function transform<T, R = T>(
  result: T,
  ...transformers: ResultTransformer<unknown, unknown>[]
): R;

function mapFields<T extends Record<string, unknown>>(
  mapper: Partial<Record<keyof T, (value: unknown) => unknown>>
): ResultTransformer<T>;

function pickFields<T extends Record<string, unknown>>(
  fields: (keyof T)[]
): ResultTransformer<T, Partial<T>>;

function omitFields<T extends Record<string, unknown>>(
  fields: (keyof T)[]
): ResultTransformer<T>;
```

### Normalization Functions

```typescript
function normalize<T>(data: T, schema: NormalizationSchema<T>): NormalizedData;
function denormalize<T>(normalized: NormalizedData, schema: NormalizationSchema<T>): T | T[];
```

### Security Functions

```typescript
function mask<T extends Record<string, unknown>>(result: T, config: FieldMaskConfig): T;
function maskDeep<T>(result: T, config: FieldMaskConfig): T;
function alias<T extends Record<string, unknown>>(result: T, aliases: FieldAliases): Record<string, unknown>;
```

### Aggregation Functions

```typescript
function aggregate<T, R>(results: T[], aggregator: AggregationFn<T, R>): R;

const aggregators = {
  sum: <T extends Record<string, unknown>>(field: keyof T): AggregationFn<T, number>,
  avg: <T extends Record<string, unknown>>(field: keyof T): AggregationFn<T, number>,
  min: <T extends Record<string, unknown>>(field: keyof T): AggregationFn<T, number>,
  max: <T extends Record<string, unknown>>(field: keyof T): AggregationFn<T, number>,
  count: <T>(): AggregationFn<T, number>,
  groupBy: <T extends Record<string, unknown>>(field: keyof T): AggregationFn<T, Record<string, T[]>>,
  merge: <T extends Record<string, unknown>>(): AggregationFn<T, T>
};
```

### Diff Functions

```typescript
function diff<T>(oldResult: T, newResult: T): ResultDiff;
function applyDiff<T>(result: T, diff: ResultDiff): T;
```

## License

MIT License - see LICENSE file for details
