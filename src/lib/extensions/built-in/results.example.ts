/**
 * @file Results Extension Examples
 * @description Comprehensive examples demonstrating the results extension features
 */

import { QueryClient } from '@tanstack/react-query';
import {
  resultsExtension,
  ResultEnhancer,
  transform,
  mapFields,
  pickFields,
  omitFields,
  normalize,
  denormalize,
  mask,
  alias,
  diff,
  aggregate,
  aggregators,
  createReactQueryMiddleware,
  type ComputedFieldDef,
  type NormalizationSchema,
} from './results';

// ============================================================================
// Example 1: Computed Fields with Dependencies
// ============================================================================

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  createdAt: string;
}

// Define computed fields for User model
const userEnhancer = new ResultEnhancer<User>();

// 1. Simple computed field: fullName
userEnhancer.defineComputedField('fullName', {
  needs: ['firstName', 'lastName'],
  compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
  cache: true, // Enable memoization
});

// 2. Computed field with complex logic: accountAge
userEnhancer.defineComputedField('accountAge', {
  needs: ['createdAt'],
  compute: ({ createdAt }) => {
    const created = new Date(createdAt);
    const now = new Date();
    const ageMs = now.getTime() - created.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    return {
      days: ageDays,
      years: Math.floor(ageDays / 365),
      isNew: ageDays < 30,
    };
  },
  cache: true,
});

// 3. Computed field: initials
userEnhancer.defineComputedField('initials', {
  needs: ['firstName', 'lastName'],
  compute: ({ firstName, lastName }) =>
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
});

// Use the enhancer
const rawUser: User = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 30,
  createdAt: '2024-01-01T00:00:00Z',
};

const enhancedUser = userEnhancer.enhance(rawUser);
console.log(enhancedUser.fullName); // "John Doe"
console.log(enhancedUser.initials); // "JD"
console.log(enhancedUser.accountAge); // { days: 337, years: 0, isNew: false }

// ============================================================================
// Example 2: Result Transformations
// ============================================================================

interface Product {
  id: number;
  name: string;
  price: number;
  internalCode: string;
  supplierEmail: string;
}

const product: Product = {
  id: 1,
  name: 'Laptop',
  price: 999.99,
  internalCode: 'INT-001',
  supplierEmail: 'supplier@example.com',
};

// Transform 1: Map fields
const withFormattedPrice = transform(
  product,
  mapFields<Product>({
    price: (val) => `$${Number(val).toFixed(2)}`,
  })
);

// Transform 2: Pick specific fields (public API)
const publicProduct = transform(product, pickFields<Product>(['id', 'name', 'price']));

// Transform 3: Omit internal fields
const cleanProduct = transform(product, omitFields<Product>(['internalCode', 'supplierEmail']));

// Chain multiple transformers
const apiResponse = transform(
  product,
  omitFields<Product>(['internalCode', 'supplierEmail']),
  mapFields({
    price: (val) => `$${Number(val).toFixed(2)}`,
  })
);

// ============================================================================
// Example 3: Normalization and Denormalization
// ============================================================================

interface Post {
  id: number;
  title: string;
  author: Author;
  comments: Comment[];
}

interface Author {
  id: number;
  name: string;
  email: string;
}

interface Comment {
  id: number;
  text: string;
  author: Author;
}

// Define normalization schema
const postSchema: NormalizationSchema<Post> = {
  entity: 'posts',
  idField: 'id',
  relations: {
    author: {
      entity: 'authors',
      idField: 'id',
    },
    comments: {
      entity: 'comments',
      idField: 'id',
      relations: {
        author: {
          entity: 'authors',
          idField: 'id',
        },
      },
    },
  },
  arrays: ['comments'],
};

const nestedPost: Post = {
  id: 1,
  title: 'My Post',
  author: { id: 1, name: 'John', email: 'john@example.com' },
  comments: [
    { id: 1, text: 'Great!', author: { id: 2, name: 'Jane', email: 'jane@example.com' } },
    { id: 2, text: 'Thanks!', author: { id: 1, name: 'John', email: 'john@example.com' } },
  ],
};

// Normalize: flatten nested structure
const normalized = normalize(nestedPost, postSchema);
console.log(normalized);
// {
//   entities: {
//     posts: { 1: { id: 1, title: 'My Post', author: 1, comments: [1, 2] } },
//     authors: {
//       1: { id: 1, name: 'John', email: 'john@example.com' },
//       2: { id: 2, name: 'Jane', email: 'jane@example.com' }
//     },
//     comments: {
//       1: { id: 1, text: 'Great!', author: 2 },
//       2: { id: 2, text: 'Thanks!', author: 1 }
//     }
//   },
//   result: 1
// }

// Denormalize: reconstruct nested structure
const denormalizedPost = denormalize(normalized, postSchema);
console.log(denormalizedPost); // Original nested structure

// ============================================================================
// Example 4: Field Masking (Security)
// ============================================================================

interface SensitiveUser {
  id: number;
  username: string;
  email: string;
  password: string;
  ssn: string;
  creditCard: string;
  apiKey: string;
}

const sensitiveUser: SensitiveUser = {
  id: 1,
  username: 'john_doe',
  email: 'john@example.com',
  password: 'secret123',
  ssn: '123-45-6789',
  creditCard: '4111-1111-1111-1111',
  apiKey: 'sk_live_abc123',
};

// Mask sensitive fields
const maskedUser = mask(sensitiveUser, {
  remove: ['password', 'apiKey'], // Completely remove
  redact: ['ssn', 'creditCard'], // Replace with [REDACTED]
  custom: {
    email: (email) => {
      // Show first 2 chars and domain
      const [local, domain] = String(email).split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    },
  },
});

console.log(maskedUser);
// {
//   id: 1,
//   username: 'john_doe',
//   email: 'jo***@example.com',
//   ssn: '[REDACTED]',
//   creditCard: '[REDACTED]'
// }

// ============================================================================
// Example 5: Field Aliasing
// ============================================================================

interface DatabaseRecord {
  user_id: number;
  first_name: string;
  last_name: string;
  created_at: string;
}

const dbRecord: DatabaseRecord = {
  user_id: 1,
  first_name: 'John',
  last_name: 'Doe',
  created_at: '2024-01-01',
};

// Convert snake_case to camelCase
const apiRecord = alias(dbRecord, {
  user_id: 'userId',
  first_name: 'firstName',
  last_name: 'lastName',
  created_at: 'createdAt',
});

console.log(apiRecord);
// { userId: 1, firstName: 'John', lastName: 'Doe', createdAt: '2024-01-01' }

// ============================================================================
// Example 6: Result Aggregation
// ============================================================================

interface Sale {
  id: number;
  amount: number;
  category: string;
  date: string;
}

const sales: Sale[] = [
  { id: 1, amount: 100, category: 'electronics', date: '2024-01-01' },
  { id: 2, amount: 150, category: 'electronics', date: '2024-01-02' },
  { id: 3, amount: 75, category: 'books', date: '2024-01-01' },
  { id: 4, amount: 200, category: 'electronics', date: '2024-01-03' },
];

// Sum total sales
const totalSales = aggregate(sales, aggregators.sum('amount'));
console.log(totalSales); // 525

// Average sale amount
const avgSale = aggregate(sales, aggregators.avg('amount'));
console.log(avgSale); // 131.25

// Group by category
const byCategory = aggregate(sales, aggregators.groupBy('category'));
console.log(byCategory);
// {
//   electronics: [sale1, sale2, sale4],
//   books: [sale3]
// }

// Custom aggregation
const categoryTotals = aggregate(sales, (items) => {
  const totals: Record<string, number> = {};
  for (const item of items) {
    if (!totals[item.category]) totals[item.category] = 0;
    totals[item.category] += item.amount;
  }
  return totals;
});
console.log(categoryTotals); // { electronics: 450, books: 75 }

// ============================================================================
// Example 7: Result Diffing
// ============================================================================

const oldUser: User = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 30,
  createdAt: '2024-01-01',
};

const newUser: User = {
  id: 1,
  firstName: 'John',
  lastName: 'Smith', // Changed
  email: 'john.smith@example.com', // Changed
  age: 31, // Changed
  createdAt: '2024-01-01',
};

// Compute diff
const userDiff = diff(oldUser, newUser);
console.log(userDiff);
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

// Check if specific field changed
if (userDiff.changedFields.has('email')) {
  console.log('Email was updated, send verification');
}

// ============================================================================
// Example 8: React Query Integration
// ============================================================================

const queryClient = new QueryClient();

// Create middleware
const reactQueryMiddleware = createReactQueryMiddleware({
  queryClient,
  autoEnhance: true,
  enhancer: userEnhancer,
});

// Example usage in a query
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();

  // Enhance automatically
  return reactQueryMiddleware.enhanceQuery(['users', id], data);
}

// Invalidate with diff detection (only invalidate if actually changed)
async function updateUser(id: number, updates: Partial<User>): Promise<void> {
  const response = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  const newData = await response.json();

  // Only invalidate if data actually changed
  await reactQueryMiddleware.invalidateWithDiff(['users', id], newData);
}

// Store normalized data in React Query cache
function setNormalizedPost(post: Post): void {
  reactQueryMiddleware.setNormalizedData(['posts', post.id], post, postSchema);
}

// Retrieve and denormalize
function getDenormalizedPost(postId: number): Post | undefined {
  return reactQueryMiddleware.getDenormalizedData(['posts', postId], postSchema) as Post;
}

// ============================================================================
// Example 9: Using with Enzyme Extension System
// ============================================================================

// In your enzyme app setup:
// import { resultsExtension } from '@enzyme/extensions';
//
// const enzyme = createEnzyme().$extends(resultsExtension);
//
// // Now you can use result methods:
// enzyme.$defineComputedField('User', 'fullName', {
//   needs: ['firstName', 'lastName'],
//   compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
//   cache: true,
// });
//
// // Enhance results
// const user = await fetchUser(1);
// const enhanced = enzyme.$enhance('User', user);
//
// // Transform
// const publicUser = enzyme.$transform(user, pickFields(['id', 'name', 'email']));
//
// // Mask sensitive data
// const safeUser = enzyme.$mask(user, {
//   remove: ['password'],
//   redact: ['ssn'],
// });

// ============================================================================
// Example 10: Advanced Pattern - Computed Field Composition
// ============================================================================

interface Employee extends User {
  salary: number;
  department: string;
  startDate: string;
}

const employeeEnhancer = new ResultEnhancer<Employee>();

// Define multiple related computed fields
employeeEnhancer
  .defineComputedField('fullName', {
    needs: ['firstName', 'lastName'],
    compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    cache: true,
  })
  .defineComputedField('tenure', {
    needs: ['startDate'],
    compute: ({ startDate }) => {
      const start = new Date(startDate);
      const now = new Date();
      const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return Math.floor(years);
    },
    cache: true,
  })
  .defineComputedField('displayInfo', {
    needs: ['firstName', 'lastName', 'department'],
    compute: ({ firstName, lastName, department }) => ({
      name: `${firstName} ${lastName}`,
      title: `${firstName} ${lastName} - ${department}`,
      badge: `${firstName.charAt(0)}${lastName.charAt(0)} (${department})`,
    }),
    cache: true,
  })
  .addTransformer((emp) => ({
    ...emp,
    // Add computed field: salary tier
    salaryTier: emp.salary < 50000 ? 'junior' : emp.salary < 100000 ? 'mid' : 'senior',
  }));

const employee: Employee = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@company.com',
  age: 28,
  createdAt: '2024-01-01',
  salary: 75000,
  department: 'Engineering',
  startDate: '2022-06-15',
};

const enhancedEmployee = employeeEnhancer.enhance(employee);
console.log(enhancedEmployee);
// {
//   ...original fields...,
//   fullName: 'Jane Smith',
//   tenure: 2,
//   displayInfo: {
//     name: 'Jane Smith',
//     title: 'Jane Smith - Engineering',
//     badge: 'JS (Engineering)'
//   },
//   salaryTier: 'mid'
// }

// ============================================================================
// Example 11: Performance Monitoring
// ============================================================================

// Check cache performance
const cacheStats = userEnhancer.getCacheStats();
console.log(cacheStats);
// { size: 150, hits: 1247, avgHits: 8.31 }

// Clear cache when needed
userEnhancer.clearCache();

// Using enzyme extension client methods:
// const allStats = enzyme.$getCacheStats();
// enzyme.$clearCache('User'); // Clear specific model
// enzyme.$clearCache(); // Clear all models

export {
  // Export examples for documentation
  userEnhancer,
  employeeEnhancer,
  postSchema,
};
