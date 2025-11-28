# Data Layer Module

> **Module**: `@/lib/data`
> Data validation, synchronization, normalization, and integrity for the Harbor React Library.

## Overview

The data layer module provides infrastructure for data management:

- **Validation** - Schema validation with Zod-style API
- **Synchronization** - Multi-source sync with conflict resolution
- **Normalization** - Entity normalization/denormalization
- **Integrity** - Data integrity verification and monitoring

## Key Exports

```typescript
import {
  // Validation
  createSchema,
  validate,
  useValidation,

  // Synchronization
  SyncEngine,
  createSyncEngine,
  useDataSync,

  // Normalization
  normalize,
  denormalize,
  createEntityAdapter,

  // Integrity
  IntegrityMonitor,
  useDataIntegrity,
} from '@/lib/data';
```

## Usage

### Schema Validation

```typescript
const userSchema = createSchema({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['admin', 'user', 'guest']),
});

const result = validate(userSchema, userData);
if (!result.success) {
  console.error('Validation errors:', result.errors);
}
```

### Data Synchronization

```typescript
const sync = createSyncEngine({
  sources: ['local', 'remote'],
  conflictStrategy: 'last-write-wins',
  throttleMs: 100,
});

// Start syncing
sync.start();

// Use in components
function UserList() {
  const { data, status, sync } = useDataSync('users');

  return (
    <div>
      {status === 'syncing' && <Spinner />}
      {data.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}
```

### Entity Normalization

```typescript
const adapter = createEntityAdapter<User>({
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

// Normalize nested API response
const normalized = normalize(apiResponse, [userSchema]);
```

## Related Documentation

- [API Guide](../API.md)
- [State Management](./STATE.md)
- [Performance Guide](../PERFORMANCE.md)
