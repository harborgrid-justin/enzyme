# @missionfabric-js/enzyme-typescript

Enterprise-grade TypeScript utilities for the Enzyme React framework.

## Installation

```bash
npm install @missionfabric-js/enzyme-typescript
```

## Features

This package provides 10 comprehensive modules with 53,000+ lines of production-ready TypeScript utilities:

### Core (`/core`)
Fundamental utilities including Result/Option types, pipelines, guards, and resource disposal.

```typescript
import { Result, Option, pipe, guard } from '@missionfabric-js/enzyme-typescript/core';

const result = Result.ok(42).map(x => x * 2);
const option = Option.from(maybeValue).getOrElse(defaultValue);
```

### Types (`/types`)
Advanced TypeScript type utilities for branded types, deep transformations, and type-safe paths.

```typescript
import type { Brand, DeepPartial, Path, PathValue } from '@missionfabric-js/enzyme-typescript/types';

type UserId = Brand<string, 'UserId'>;
type PartialConfig = DeepPartial<Config>;
```

### Schema (`/schema`)
Zod-based validation utilities for forms, APIs, and configuration.

```typescript
import { email, uuid, createFormSchema, validateEnv } from '@missionfabric-js/enzyme-typescript/schema';

const userSchema = createFormSchema({
  email: email(),
  id: uuid(),
});
```

### Config (`/config`)
Configuration management with multi-source loading, validation, and hot reloading.

```typescript
import { ConfigLoader, ConfigProvider } from '@missionfabric-js/enzyme-typescript/config';

const config = await new ConfigLoader({ sources: [...] }).load();
```

### Generators (`/generators`)
Code generation utilities for components, hooks, and API clients.

```typescript
import { ComponentGenerator, HookGenerator } from '@missionfabric-js/enzyme-typescript/generators';

const component = new ComponentGenerator().generateFunctional({ name: 'Button' });
```

### Hooks (`/hooks`)
Hook factory and composition utilities for React.

```typescript
import { createHook, composeHooks, useEnhancedState } from '@missionfabric-js/enzyme-typescript/hooks';

const useMyHook = createHook((props) => { ... }, { name: 'useMyHook' });
```

### State (`/state`)
State management utilities with slices, selectors, and middleware.

```typescript
import { createStore, createSlice, createSelector } from '@missionfabric-js/enzyme-typescript/state';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: { increment: (state) => { state.value += 1; } }
});
```

### API (`/api`)
HTTP client utilities with retry, caching, and rate limiting.

```typescript
import { createClient, withRetry, ResponseCache } from '@missionfabric-js/enzyme-typescript/api';

const client = createClient({ baseURL: 'https://api.example.com' });
const response = await client.get('/users').json();
```

### Testing (`/testing`)
Testing utilities including factories, mocks, and assertions.

```typescript
import { defineFactory, createMock, assertEquals } from '@missionfabric-js/enzyme-typescript/testing';

const userFactory = defineFactory({ id: () => randomUUID(), name: 'Test' });
const users = userFactory.buildList(5);
```

### Utils (`/utils`)
General utility functions for strings, objects, arrays, and more.

```typescript
import { camelCase, deepClone, debounce, formatDate } from '@missionfabric-js/enzyme-typescript/utils';

const text = camelCase('hello-world'); // 'helloWorld'
```

## Requirements

- Node.js >= 20.0.0
- TypeScript >= 5.0.0

## License

MIT
