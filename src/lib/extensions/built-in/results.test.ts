/**
 * @file Results Extension Tests
 * @description Comprehensive test suite for the results extension
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  ResultEnhancer,
  transform,
  mapFields,
  pickFields,
  omitFields,
  normalize,
  denormalize,
  mask,
  maskDeep,
  alias,
  diff,
  applyDiff,
  aggregate,
  aggregators,
  createReactQueryMiddleware,
  resultsExtension,
  type ComputedFieldDef,
  type NormalizationSchema,
} from './results';

// ============================================================================
// Test Types
// ============================================================================

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
}

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

// ============================================================================
// Computed Fields Tests
// ============================================================================

describe('ResultEnhancer - Computed Fields', () => {
  let enhancer: ResultEnhancer<User>;

  beforeEach(() => {
    enhancer = new ResultEnhancer<User>();
  });

  it('should compute simple field from dependencies', () => {
    enhancer.defineComputedField('fullName', {
      needs: ['firstName', 'lastName'],
      compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    });

    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    const enhanced = enhancer.enhance(user);
    expect(enhanced.fullName).toBe('John Doe');
  });

  it('should compute multiple fields', () => {
    enhancer.defineComputedField('fullName', {
      needs: ['firstName', 'lastName'],
      compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    });

    enhancer.defineComputedField('initials', {
      needs: ['firstName', 'lastName'],
      compute: ({ firstName, lastName }) =>
        `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
    });

    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    const enhanced = enhancer.enhance(user);
    expect(enhanced.fullName).toBe('John Doe');
    expect(enhanced.initials).toBe('JD');
  });

  it('should skip field if dependencies are missing', () => {
    enhancer.defineComputedField('fullName', {
      needs: ['firstName', 'lastName'],
      compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    });

    const partialUser = {
      id: 1,
      firstName: 'John',
      email: 'john@example.com',
      age: 30,
    } as User;

    const enhanced = enhancer.enhance(partialUser);
    expect(enhanced.fullName).toBeUndefined();
  });

  it('should cache computed values when enabled', () => {
    const computeFn = vi.fn(({ firstName, lastName }) => `${firstName} ${lastName}`);

    enhancer.defineComputedField('fullName', {
      needs: ['firstName', 'lastName'],
      compute: computeFn,
      cache: true,
    });

    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    // First call
    enhancer.enhance(user);
    expect(computeFn).toHaveBeenCalledTimes(1);

    // Second call with same data should use cache
    enhancer.enhance(user);
    expect(computeFn).toHaveBeenCalledTimes(1); // Still 1, used cache
  });

  it('should recompute when dependencies change', () => {
    const computeFn = vi.fn(({ firstName, lastName }) => `${firstName} ${lastName}`);

    enhancer.defineComputedField('fullName', {
      needs: ['firstName', 'lastName'],
      compute: computeFn,
      cache: true,
    });

    const user1: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    const user2: User = {
      id: 1,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      age: 28,
    };

    enhancer.enhance(user1);
    expect(computeFn).toHaveBeenCalledTimes(1);

    enhancer.enhance(user2);
    expect(computeFn).toHaveBeenCalledTimes(2); // Different data, recompute
  });

  it('should enhance multiple results', () => {
    enhancer.defineComputedField('fullName', {
      needs: ['firstName', 'lastName'],
      compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    });

    const users: User[] = [
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', age: 30 },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', age: 28 },
    ];

    const enhanced = enhancer.enhanceMany(users);
    expect(enhanced[0].fullName).toBe('John Doe');
    expect(enhanced[1].fullName).toBe('Jane Smith');
  });

  it('should provide cache statistics', () => {
    enhancer.defineComputedField('fullName', {
      needs: ['firstName', 'lastName'],
      compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
      cache: true,
    });

    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    enhancer.enhance(user);
    enhancer.enhance(user); // Hit cache

    const stats = enhancer.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.hits).toBeGreaterThan(0);
  });

  it('should clear cache', () => {
    enhancer.defineComputedField('fullName', {
      needs: ['firstName', 'lastName'],
      compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
      cache: true,
    });

    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    enhancer.enhance(user);
    expect(enhancer.getCacheStats().size).toBeGreaterThan(0);

    enhancer.clearCache();
    expect(enhancer.getCacheStats().size).toBe(0);
  });
});

// ============================================================================
// Transformation Tests
// ============================================================================

describe('Result Transformations', () => {
  it('should map fields', () => {
    const user = {
      id: 1,
      firstName: 'John',
      price: 99.99,
    };

    const transformed = transform(
      user,
      mapFields({
        price: (val) => `$${Number(val).toFixed(2)}`,
      })
    );

    expect(transformed.price).toBe('$99.99');
  });

  it('should pick fields', () => {
    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    const picked = transform(user, pickFields(['id', 'firstName', 'email']));
    expect(picked).toEqual({
      id: 1,
      firstName: 'John',
      email: 'john@example.com',
    });
  });

  it('should omit fields', () => {
    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    const omitted = transform(user, omitFields(['email', 'age']));
    expect(omitted).toEqual({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('should chain multiple transformers', () => {
    interface Product {
      id: number;
      name: string;
      price: number;
      internalCode: string;
    }

    const product: Product = {
      id: 1,
      name: 'Laptop',
      price: 999.99,
      internalCode: 'INT-001',
    };

    const transformed = transform(
      product,
      omitFields(['internalCode']),
      mapFields({
        price: (val) => `$${Number(val).toFixed(2)}`,
      })
    );

    expect(transformed).toEqual({
      id: 1,
      name: 'Laptop',
      price: '$999.99',
    });
  });
});

// ============================================================================
// Normalization Tests
// ============================================================================

describe('Normalization', () => {
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

  it('should normalize nested data', () => {
    const post: Post = {
      id: 1,
      title: 'My Post',
      author: { id: 1, name: 'John', email: 'john@example.com' },
      comments: [
        { id: 1, text: 'Great!', author: { id: 2, name: 'Jane', email: 'jane@example.com' } },
      ],
    };

    const normalized = normalize(post, postSchema);

    expect(normalized.entities.posts).toBeDefined();
    expect(normalized.entities.authors).toBeDefined();
    expect(normalized.entities.comments).toBeDefined();
    expect(normalized.result).toBe(1);
  });

  it('should denormalize data back to nested structure', () => {
    const post: Post = {
      id: 1,
      title: 'My Post',
      author: { id: 1, name: 'John', email: 'john@example.com' },
      comments: [
        { id: 1, text: 'Great!', author: { id: 2, name: 'Jane', email: 'jane@example.com' } },
      ],
    };

    const normalized = normalize(post, postSchema);
    const denormalized = denormalize(normalized, postSchema) as Post;

    expect(denormalized.id).toBe(post.id);
    expect(denormalized.title).toBe(post.title);
    expect(denormalized.author.name).toBe(post.author.name);
    expect(denormalized.comments[0].text).toBe(post.comments[0].text);
  });

  it('should normalize arrays', () => {
    const posts: Post[] = [
      {
        id: 1,
        title: 'Post 1',
        author: { id: 1, name: 'John', email: 'john@example.com' },
        comments: [],
      },
      {
        id: 2,
        title: 'Post 2',
        author: { id: 1, name: 'John', email: 'john@example.com' },
        comments: [],
      },
    ];

    const normalized = normalize(posts, postSchema);
    expect(Array.isArray(normalized.result)).toBe(true);
    expect((normalized.result as number[]).length).toBe(2);
  });
});

// ============================================================================
// Field Masking Tests
// ============================================================================

describe('Field Masking', () => {
  interface SensitiveData {
    id: number;
    username: string;
    password: string;
    ssn: string;
    email: string;
  }

  it('should remove fields', () => {
    const data: SensitiveData = {
      id: 1,
      username: 'john',
      password: 'secret',
      ssn: '123-45-6789',
      email: 'john@example.com',
    };

    const masked = mask(data, {
      remove: ['password'],
    });

    expect(masked.password).toBeUndefined();
    expect(masked.username).toBe('john');
  });

  it('should redact fields', () => {
    const data: SensitiveData = {
      id: 1,
      username: 'john',
      password: 'secret',
      ssn: '123-45-6789',
      email: 'john@example.com',
    };

    const masked = mask(data, {
      redact: ['ssn'],
    });

    expect(masked.ssn).toBe('[REDACTED]');
  });

  it('should apply custom masking', () => {
    const data: SensitiveData = {
      id: 1,
      username: 'john',
      password: 'secret',
      ssn: '123-45-6789',
      email: 'john@example.com',
    };

    const masked = mask(data, {
      custom: {
        email: (email) => {
          const [local, domain] = String(email).split('@');
          return `${local.slice(0, 2)}***@${domain}`;
        },
      },
    });

    expect(masked.email).toBe('jo***@example.com');
  });

  it('should mask deeply nested data', () => {
    const nested = {
      user: {
        id: 1,
        password: 'secret',
      },
      settings: {
        apiKey: 'key123',
      },
    };

    const masked = maskDeep(nested, {
      remove: ['password', 'apiKey'],
    });

    expect((masked as typeof nested).user.password).toBeUndefined();
    expect((masked as typeof nested).settings.apiKey).toBeUndefined();
  });
});

// ============================================================================
// Field Aliasing Tests
// ============================================================================

describe('Field Aliasing', () => {
  it('should alias field names', () => {
    const dbRecord = {
      user_id: 1,
      first_name: 'John',
      last_name: 'Doe',
    };

    const aliased = alias(dbRecord, {
      user_id: 'userId',
      first_name: 'firstName',
      last_name: 'lastName',
    });

    expect(aliased.userId).toBe(1);
    expect(aliased.firstName).toBe('John');
    expect(aliased.lastName).toBe('Doe');
    expect(aliased.user_id).toBeUndefined();
  });

  it('should preserve non-aliased fields', () => {
    const record = {
      id: 1,
      name: 'John',
      email: 'john@example.com',
    };

    const aliased = alias(record, {
      name: 'fullName',
    });

    expect(aliased.id).toBe(1);
    expect(aliased.fullName).toBe('John');
    expect(aliased.email).toBe('john@example.com');
  });
});

// ============================================================================
// Aggregation Tests
// ============================================================================

describe('Result Aggregation', () => {
  interface Sale {
    id: number;
    amount: number;
    category: string;
  }

  const sales: Sale[] = [
    { id: 1, amount: 100, category: 'electronics' },
    { id: 2, amount: 150, category: 'electronics' },
    { id: 3, amount: 75, category: 'books' },
  ];

  it('should sum values', () => {
    const total = aggregate(sales, aggregators.sum('amount'));
    expect(total).toBe(325);
  });

  it('should calculate average', () => {
    const avg = aggregate(sales, aggregators.avg('amount'));
    expect(avg).toBeCloseTo(108.33, 2);
  });

  it('should find minimum', () => {
    const min = aggregate(sales, aggregators.min('amount'));
    expect(min).toBe(75);
  });

  it('should find maximum', () => {
    const max = aggregate(sales, aggregators.max('amount'));
    expect(max).toBe(150);
  });

  it('should count items', () => {
    const count = aggregate(sales, aggregators.count());
    expect(count).toBe(3);
  });

  it('should group by field', () => {
    const grouped = aggregate(sales, aggregators.groupBy('category'));
    expect(grouped.electronics.length).toBe(2);
    expect(grouped.books.length).toBe(1);
  });

  it('should merge items', () => {
    const items = [{ a: 1 }, { b: 2 }, { c: 3 }];
    const merged = aggregate(items, aggregators.merge());
    expect(merged).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should support custom aggregation', () => {
    const categoryTotals = aggregate(sales, (items) => {
      const totals: Record<string, number> = {};
      for (const item of items) {
        if (!totals[item.category]) totals[item.category] = 0;
        totals[item.category] += item.amount;
      }
      return totals;
    });

    expect(categoryTotals.electronics).toBe(250);
    expect(categoryTotals.books).toBe(75);
  });
});

// ============================================================================
// Diffing Tests
// ============================================================================

describe('Result Diffing', () => {
  it('should detect primitive changes', () => {
    const oldData = { id: 1, name: 'John', age: 30 };
    const newData = { id: 1, name: 'Jane', age: 30 };

    const result = diff(oldData, newData);

    expect(result.hasChanges).toBe(true);
    expect(result.changeCount).toBe(1);
    expect(result.changedFields.has('name')).toBe(true);
  });

  it('should detect added fields', () => {
    const oldData = { id: 1, name: 'John' };
    const newData = { id: 1, name: 'John', age: 30 };

    const result = diff(oldData, newData);

    expect(result.hasChanges).toBe(true);
    expect(result.changes[0].op).toBe('add');
  });

  it('should detect removed fields', () => {
    const oldData = { id: 1, name: 'John', age: 30 };
    const newData = { id: 1, name: 'John' };

    const result = diff(oldData, newData);

    expect(result.hasChanges).toBe(true);
    expect(result.changes[0].op).toBe('remove');
  });

  it('should detect no changes', () => {
    const oldData = { id: 1, name: 'John', age: 30 };
    const newData = { id: 1, name: 'John', age: 30 };

    const result = diff(oldData, newData);

    expect(result.hasChanges).toBe(false);
    expect(result.changeCount).toBe(0);
  });

  it('should detect nested changes', () => {
    const oldData = { id: 1, user: { name: 'John', age: 30 } };
    const newData = { id: 1, user: { name: 'Jane', age: 30 } };

    const result = diff(oldData, newData);

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields.has('user')).toBe(true);
  });

  it('should apply diff to result', () => {
    const original = { id: 1, name: 'John', age: 30 };
    const updated = { id: 1, name: 'Jane', age: 31 };

    const resultDiff = diff(original, updated);
    const applied = applyDiff(original, resultDiff);

    expect(applied.name).toBe('Jane');
    expect(applied.age).toBe(31);
  });
});

// ============================================================================
// React Query Integration Tests
// ============================================================================

describe('React Query Integration', () => {
  let queryClient: QueryClient;
  let enhancer: ResultEnhancer<User>;

  beforeEach(() => {
    queryClient = new QueryClient();
    enhancer = new ResultEnhancer<User>();

    enhancer.defineComputedField('fullName', {
      needs: ['firstName', 'lastName'],
      compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    });
  });

  it('should create middleware', () => {
    const middleware = createReactQueryMiddleware({
      queryClient,
      autoEnhance: true,
      enhancer,
    });

    expect(middleware).toBeDefined();
    expect(middleware.enhanceQuery).toBeInstanceOf(Function);
  });

  it('should enhance query data', () => {
    const middleware = createReactQueryMiddleware({
      queryClient,
      autoEnhance: true,
      enhancer,
    });

    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    const enhanced = middleware.enhanceQuery(['users', 1], user);
    expect(enhanced.fullName).toBe('John Doe');
  });

  it('should skip enhancement when disabled', () => {
    const middleware = createReactQueryMiddleware({
      queryClient,
      autoEnhance: false,
    });

    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    const result = middleware.enhanceQuery(['users', 1], user);
    expect(result.fullName).toBeUndefined();
  });
});

// ============================================================================
// Extension Client Methods Tests
// ============================================================================

describe('Results Extension Client', () => {
  it('should export client methods', () => {
    expect(resultsExtension.client.$defineComputedField).toBeInstanceOf(Function);
    expect(resultsExtension.client.$transform).toBeInstanceOf(Function);
    expect(resultsExtension.client.$normalize).toBeInstanceOf(Function);
    expect(resultsExtension.client.$denormalize).toBeInstanceOf(Function);
    expect(resultsExtension.client.$mask).toBeInstanceOf(Function);
    expect(resultsExtension.client.$diff).toBeInstanceOf(Function);
    expect(resultsExtension.client.$aggregate).toBeInstanceOf(Function);
  });

  it('should define computed field via client', () => {
    resultsExtension.client.$defineComputedField<User, ['firstName', 'lastName'], string>(
      'User',
      'fullName',
      {
        needs: ['firstName', 'lastName'],
        compute: ({ firstName, lastName }) => `${firstName} ${lastName}`,
      }
    );

    const user: User = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      age: 30,
    };

    const enhanced = resultsExtension.client.$enhance('User', user);
    expect(enhanced.fullName).toBe('John Doe');
  });
});
