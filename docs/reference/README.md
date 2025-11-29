# Quick Reference Guide Hub

Welcome to the @missionfabric-js/enzyme Quick Reference Hub. This section provides fast, searchable lookup for all exports, hooks, components, functions, and types.

## 📚 Reference Documentation

### [ALL_EXPORTS.md](./ALL_EXPORTS.md)
Complete alphabetical list of **all exports** from @missionfabric-js/enzyme with:
- Export name
- Module (import path)
- Type (function/component/hook/type/constant)
- One-line description
- Link to detailed documentation

**Best for:** Finding anything quickly, discovering what's available

### [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md)
Comprehensive list of **all React hooks** with:
- Hook signature
- Brief description
- Import path
- Common use cases

**Best for:** Finding the right hook for your needs, understanding hook APIs

### [COMPONENTS_QUICK_REF.md](./COMPONENTS_QUICK_REF.md)
Comprehensive list of **all React components** with:
- Component name
- Key props
- Brief description
- Import path

**Best for:** Building UIs, finding pre-built components

### [FUNCTIONS_QUICK_REF.md](./FUNCTIONS_QUICK_REF.md)
Comprehensive list of **all utility functions** with:
- Function signature
- Brief description
- Import path
- Return type

**Best for:** Data manipulation, utilities, helpers

### [TYPES_QUICK_REF.md](./TYPES_QUICK_REF.md)
Complete TypeScript type reference with:
- Type/interface definitions
- Properties
- Module location
- Usage examples

**Best for:** TypeScript development, type safety

## 🔍 How to Use This Reference

### Quick Search Tips

1. **Know the name?** → Check [ALL_EXPORTS.md](./ALL_EXPORTS.md) alphabetically
2. **Need a hook?** → Check [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md) by category
3. **Need a component?** → Check [COMPONENTS_QUICK_REF.md](./COMPONENTS_QUICK_REF.md)
4. **Need a utility?** → Check [FUNCTIONS_QUICK_REF.md](./FUNCTIONS_QUICK_REF.md)
5. **Need types?** → Check [TYPES_QUICK_REF.md](./TYPES_QUICK_REF.md)

### Browser Search (Ctrl+F / Cmd+F)

All reference files are designed for text search:
- Use `Ctrl+F` or `Cmd+F` in your browser/editor
- Search by: name, module, category, or keyword
- All exports are listed alphabetically for easy scanning

### Common Tasks

#### I want to...

**Add authentication**
- → [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md#authentication) - `useAuth`, `useHasRole`, `useHasPermission`
- → [COMPONENTS_QUICK_REF.md](./COMPONENTS_QUICK_REF.md#authentication) - `AuthProvider`, `RequireAuth`, `RequireRole`

**Fetch data from an API**
- → [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md#api) - `useApiRequest`, `useApiMutation`
- → [FUNCTIONS_QUICK_REF.md](./FUNCTIONS_QUICK_REF.md#api) - `apiClient`, `get`, `post`

**Manage application state**
- → [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md#state) - `useStore`, `useGlobalStore`
- → [FUNCTIONS_QUICK_REF.md](./FUNCTIONS_QUICK_REF.md#state) - `createAppStore`, `createSlice`

**Add feature flags**
- → [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md#flags) - `useFeatureFlag`, `useFeatureFlags`
- → [COMPONENTS_QUICK_REF.md](./COMPONENTS_QUICK_REF.md#flags) - `FlagGate`, `FeatureFlagProvider`

**Monitor performance**
- → [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md#performance) - `usePerformanceObservatory`, `useRenderMetrics`
- → [FUNCTIONS_QUICK_REF.md](./FUNCTIONS_QUICK_REF.md#performance) - `initPerformanceMonitoring`

**Handle errors**
- → [COMPONENTS_QUICK_REF.md](./COMPONENTS_QUICK_REF.md#monitoring) - `ErrorBoundary`, `GlobalErrorBoundary`
- → [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md#error-handling) - `useErrorBoundary`, `useAsyncWithRecovery`

**Build forms with validation**
- → [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md#data-validation) - `useFormValidation`, `useDataValidation`
- → [FUNCTIONS_QUICK_REF.md](./FUNCTIONS_QUICK_REF.md#data-validation) - `v`, `rules`

**Real-time data / WebSockets**
- → [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md#realtime) - `useRealtimeStream`, `useRealtimeConnection`
- → [FUNCTIONS_QUICK_REF.md](./FUNCTIONS_QUICK_REF.md#realtime) - `createWebSocketClient`, `createSSEClient`

## 📖 Related Documentation

- **[Getting Started](../GETTING_STARTED.md)** - Installation and setup guide
- **[Architecture](../ARCHITECTURE.md)** - System design and structure
- **[API Documentation](../API_DOCUMENTATION.md)** - Detailed API reference
- **[Glossary](../appendix/GLOSSARY.md)** - Technical terms explained
- **[Patterns](../appendix/PATTERNS.md)** - Common usage patterns
- **[Troubleshooting](../appendix/TROUBLESHOOTING.md)** - Common issues and solutions

## 💡 Navigation Tips

### By Module

If you know which module you need:
- **API** → `/api` - HTTP client, requests, responses
- **Auth** → `/auth` - Authentication, authorization, RBAC
- **Config** → `/config` - Configuration management
- **Data** → `/data` - Validation, sync, normalization
- **Feature** → `/feature` - Feature module system
- **Flags** → `/flags` - Feature flags
- **Hooks** → `/hooks` - Custom React hooks
- **Performance** → `/performance` - Web vitals, monitoring
- **Routing** → `/routing` - Type-safe routing
- **State** → `/state` - State management
- **UI** → `/ui` - UI components
- **And many more...**

### By Category

- **React Components** → [COMPONENTS_QUICK_REF.md](./COMPONENTS_QUICK_REF.md)
- **React Hooks** → [HOOKS_QUICK_REF.md](./HOOKS_QUICK_REF.md)
- **Utility Functions** → [FUNCTIONS_QUICK_REF.md](./FUNCTIONS_QUICK_REF.md)
- **TypeScript Types** → [TYPES_QUICK_REF.md](./TYPES_QUICK_REF.md)

## 🎯 Quick Start Examples

### Authentication Flow
```typescript
import { AuthProvider, useAuth } from '@missionfabric-js/enzyme';

function App() {
  return (
    <AuthProvider>
      <LoginButton />
    </AuthProvider>
  );
}

function LoginButton() {
  const { login, isAuthenticated, user } = useAuth();
  // ... implementation
}
```

### API Data Fetching
```typescript
import { useApiRequest } from '@missionfabric-js/enzyme';

function UserProfile({ userId }) {
  const { data, isLoading, error } = useApiRequest({
    url: `/users/${userId}`,
    queryKey: ['users', userId],
  });
  // ... implementation
}
```

### Feature Flags
```typescript
import { useFeatureFlag, FlagGate } from '@missionfabric-js/enzyme';

function Dashboard() {
  const isNewDashboard = useFeatureFlag('new-dashboard');

  return (
    <FlagGate flagKey="analytics">
      <AnalyticsPanel />
    </FlagGate>
  );
}
```

## 📞 Need More Help?

- Check [FAQ](../FAQ.md) for common questions
- See [Troubleshooting](../appendix/TROUBLESHOOTING.md) for common issues
- Review [Examples](../GETTING_STARTED.md#examples) for code samples
- Read [Architecture](../ARCHITECTURE.md) for system design

---

**Last Updated:** 2025-11-29
**Version:** 1.0.5
