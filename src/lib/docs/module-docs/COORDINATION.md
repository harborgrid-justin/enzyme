# Coordination Module

> **Module**: `@/lib/coordination`
> Cross-library coordination, event buses, and dependency injection for the Harbor React Library.

## Overview

The coordination module provides infrastructure for communication between library modules:

- **Event Bus** - Type-safe priority event dispatch
- **Dependency Injection** - IoC container with lifecycle management
- **Lifecycle Manager** - Phased initialization with topological sort
- **State Coordinator** - Cross-library state synchronization
- **Provider Orchestrator** - Automated provider nesting

## Key Exports

```typescript
import {
  // Event System
  EventBus,
  createEventBus,

  // Dependency Injection
  DependencyInjector,
  createContainer,

  // Lifecycle
  LifecycleManager,

  // State
  StateCoordinator,

  // Providers
  ProviderOrchestrator,
  CoordinationProvider,
} from '@/lib/coordination';
```

## Usage

### Event Bus

```typescript
const bus = createEventBus();

// Subscribe to events
bus.on('user:login', (data) => {
  console.log('User logged in:', data.userId);
});

// Emit events with priority
bus.emit('user:login', { userId: '123' }, { priority: 'high' });
```

### Dependency Injection

```typescript
const container = createContainer();

// Register services
container.register('logger', LoggerService);
container.register('api', ApiService, { singleton: true });

// Resolve dependencies
const api = container.resolve('api');
```

### Provider Orchestrator

```typescript
<CoordinationProvider>
  <ProviderOrchestrator
    providers={[
      { component: AuthProvider, priority: 1 },
      { component: ThemeProvider, priority: 2 },
      { component: QueryProvider, priority: 3 },
    ]}
  >
    <App />
  </ProviderOrchestrator>
</CoordinationProvider>
```

## Related Documentation

- [Architecture Guide](../ARCHITECTURE.md)
- [State Management](./STATE.md)
- [Performance Guide](../PERFORMANCE.md)
