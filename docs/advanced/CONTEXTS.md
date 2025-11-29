# React Context Providers and Consumers

Comprehensive guide to shared React contexts for cross-cutting concerns in @missionfabric-js/enzyme.

## Table of Contents

- [Overview](#overview)
- [Core Contexts](#core-contexts)
- [Context Providers](#context-providers)
- [Context Consumers](#context-consumers)
- [Custom Contexts](#custom-contexts)
- [Context Composition](#context-composition)
- [Performance Optimization](#performance-optimization)
- [Best Practices](#best-practices)
- [Integration Patterns](#integration-patterns)

## Overview

The contexts module provides shared React contexts used across the library for hydration, error boundaries, security, authentication, feature flags, configuration, and other cross-cutting concerns.

### Key Features

- **Hydration Context**: SSR hydration state management
- **Error Boundary Context**: Error handling and recovery
- **Security Context**: Security features and utilities
- **Auth Context**: Authentication state and methods
- **Flag Context**: Feature flag evaluation
- **Config Context**: Configuration management
- **Theme Context**: Theming and design tokens
- **Performance Context**: Performance monitoring

## Core Contexts

### Hydration Context

Manages client-side hydration state for SSR applications:

```tsx
import { HydrationContext, useHydrationContext } from '@/lib/contexts';

function HydrationAwareComponent() {
  const { isHydrated, isHydrating } = useHydrationContext();

  if (!isHydrated) {
    return <Skeleton />;
  }

  return <InteractiveContent />;
}
```

#### HydrationContext API

```typescript
interface HydrationContextValue {
  isHydrated: boolean;
  isHydrating: boolean;
  hydrationTimestamp: number | null;
  registerHydration: () => void;
}
```

### Error Boundary Context

Provides error handling capabilities:

```tsx
import { ErrorBoundaryContext, useErrorBoundaryContext } from '@/lib/contexts';

function Component() {
  const { error, resetError, reportError } = useErrorBoundaryContext();

  if (error) {
    return (
      <div>
        <h2>Error: {error.message}</h2>
        <button onClick={resetError}>Retry</button>
      </div>
    );
  }

  return <Content />;
}
```

#### ErrorBoundaryContext API

```typescript
interface ErrorBoundaryContextValue {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
  reportError: (error: Error, errorInfo?: React.ErrorInfo) => void;
}
```

### Security Context

Provides security utilities and state:

```tsx
import { SecurityContext, useSecurityContext } from '@/lib/security';

function SecureComponent() {
  const {
    csrfToken,
    cspNonce,
    sanitize,
    getSecureStorage,
  } = useSecurityContext();

  return (
    <form>
      <input type="hidden" name="_csrf" value={csrfToken} />
      {/* Form fields */}
    </form>
  );
}
```

#### SecurityContext API

```typescript
interface SecurityContextValue {
  csrfToken: string;
  cspNonce: string;
  regenerateCsrfToken: () => string;
  regenerateNonce: () => string;
  sanitize: (html: string, options?: SanitizationOptions) => string;
  validateUrl: (url: string) => boolean;
  getSecureStorage: () => SecureStorageInterface;
  reportViolation: (violation: SecurityViolation) => void;
  violations: SecurityViolation[];
  clearViolations: () => void;
}
```

### Auth Context

Manages authentication state:

```tsx
import { AuthContext, useAuth } from '@/lib/auth';

function ProfileButton() {
  const {
    isAuthenticated,
    user,
    login,
    logout,
  } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={login}>Login</button>;
  }

  return (
    <div>
      <span>Welcome, {user.name}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

#### AuthContext API

```typescript
interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}
```

### Feature Flag Context

Provides feature flag evaluation:

```tsx
import { FeatureFlagContext, useFeatureFlag } from '@/lib/flags';

function Feature() {
  const isEnabled = useFeatureFlag('new-feature');

  return isEnabled ? <NewFeature /> : <OldFeature />;
}
```

#### FeatureFlagContext API

```typescript
interface FeatureFlagContextValue {
  flags: Record<string, boolean | string>;
  isLoading: boolean;
  getFlag: (key: string, defaultValue?: boolean) => boolean;
  getAllFlags: () => Record<string, boolean | string>;
  refreshFlags: () => Promise<void>;
}
```

### Config Context

Manages application configuration:

```tsx
import { ConfigContext, useConfig } from '@/config';

function ConfigAwareComponent() {
  const [theme, setTheme] = useConfig('ui', 'theme', 'light');

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

#### ConfigContext API

```typescript
interface ConfigContextValue {
  config: ConfigMap;
  getConfig: (namespace: string, key: string, defaultValue?: any) => any;
  setConfig: (namespace: string, key: string, value: any) => void;
  subscribe: (namespace: string, key: string, callback: ConfigChangeCallback) => () => void;
}
```

## Context Providers

### Provider Setup

```tsx
import {
  HydrationProvider,
  ErrorBoundaryProvider,
  SecurityProvider,
  AuthProvider,
  FeatureFlagProvider,
  ConfigProvider,
} from '@/lib';

function App() {
  return (
    <HydrationProvider>
      <ErrorBoundaryProvider>
        <SecurityProvider>
          <ConfigProvider>
            <AuthProvider>
              <FeatureFlagProvider>
                <YourApp />
              </FeatureFlagProvider>
            </AuthProvider>
          </ConfigProvider>
        </SecurityProvider>
      </ErrorBoundaryProvider>
    </HydrationProvider>
  );
}
```

### Provider Composition

```tsx
import { compose } from '@/lib/utils';

const AppProviders = compose(
  HydrationProvider,
  ErrorBoundaryProvider,
  SecurityProvider,
  ConfigProvider,
  AuthProvider,
  FeatureFlagProvider
);

function App() {
  return (
    <AppProviders>
      <YourApp />
    </AppProviders>
  );
}
```

### Conditional Providers

```tsx
import { env } from '@/config';

function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        {env.isProd ? (
          <FeatureFlagProvider provider={remoteProvider}>
            <YourApp />
          </FeatureFlagProvider>
        ) : (
          <FeatureFlagProvider provider={localProvider}>
            <YourApp />
          </FeatureFlagProvider>
        )}
      </AuthProvider>
    </ConfigProvider>
  );
}
```

## Context Consumers

### Hook-Based Consumption

```tsx
import { useSecurityContext } from '@/lib/security';
import { useAuth } from '@/lib/auth';
import { useFeatureFlag } from '@/lib/flags';

function Component() {
  const { csrfToken } = useSecurityContext();
  const { user } = useAuth();
  const newFeature = useFeatureFlag('new-feature');

  return (
    <div>
      <p>User: {user?.name}</p>
      <p>New feature: {newFeature ? 'Yes' : 'No'}</p>
      <input type="hidden" value={csrfToken} />
    </div>
  );
}
```

### Consumer Component

```tsx
import { SecurityConsumer } from '@/lib/security';

function Component() {
  return (
    <SecurityConsumer>
      {({ csrfToken, sanitize }) => (
        <form>
          <input type="hidden" name="_csrf" value={csrfToken} />
          {/* Form content */}
        </form>
      )}
    </SecurityConsumer>
  );
}
```

### Multiple Context Consumption

```tsx
import { useAuth } from '@/lib/auth';
import { useSecurityContext } from '@/lib/security';
import { useConfig } from '@/config';

function MultiContextComponent() {
  const { user } = useAuth();
  const { csrfToken } = useSecurityContext();
  const [theme] = useConfig('ui', 'theme');

  return (
    <div className={theme}>
      <h1>Welcome, {user?.name}</h1>
      <input type="hidden" name="_csrf" value={csrfToken} />
    </div>
  );
}
```

## Custom Contexts

### Creating Custom Context

```tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [...prev, notification]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
```

### Context with Reducer

```tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

type State = {
  count: number;
  items: string[];
};

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'addItem'; payload: string };

const initialState: State = {
  count: 0,
  items: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'decrement':
      return { ...state, count: state.count - 1 };
    case 'addItem':
      return { ...state, items: [...state.items, action.payload] };
    default:
      return state;
  }
}

const StateContext = createContext<State>(initialState);
const DispatchContext = createContext<React.Dispatch<Action>>(() => {});

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState() {
  return useContext(StateContext);
}

export function useAppDispatch() {
  return useContext(DispatchContext);
}
```

## Context Composition

### Nested Providers

```tsx
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <AuthProvider>
          <FeatureFlagProvider>
            <SecurityProvider>
              {children}
            </SecurityProvider>
          </FeatureFlagProvider>
        </AuthProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}
```

### Provider Factory

```tsx
function createAppProviders(providers: React.ComponentType<any>[]) {
  return providers.reduce(
    (AccumulatedProviders, CurrentProvider) => {
      return ({ children }) => (
        <AccumulatedProviders>
          <CurrentProvider>{children}</CurrentProvider>
        </AccumulatedProviders>
      );
    },
    ({ children }) => <>{children}</>
  );
}

const AppProviders = createAppProviders([
  ConfigProvider,
  ThemeProvider,
  AuthProvider,
  FeatureFlagProvider,
  SecurityProvider,
]);
```

## Performance Optimization

### Split Contexts

```tsx
// Instead of one large context
const AppContext = createContext({ user, theme, config, flags });

// Use separate contexts
const UserContext = createContext(user);
const ThemeContext = createContext(theme);
const ConfigContext = createContext(config);
const FlagContext = createContext(flags);
```

### Memoized Values

```tsx
import { useMemo } from 'react';

function Provider({ children }) {
  const [state, setState] = useState(initialState);

  // Memoize context value
  const value = useMemo(
    () => ({
      state,
      setState,
    }),
    [state]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

### Selective Updates

```tsx
const StateContext = createContext(null);
const UpdateContext = createContext(null);

function Provider({ children }) {
  const [state, setState] = useState(initialState);

  return (
    <StateContext.Provider value={state}>
      <UpdateContext.Provider value={setState}>
        {children}
      </UpdateContext.Provider>
    </StateContext.Provider>
  );
}

// Components only re-render when they use the context that changes
function Display() {
  const state = useContext(StateContext); // Re-renders on state change
  return <div>{state.value}</div>;
}

function Control() {
  const setState = useContext(UpdateContext); // Never re-renders
  return <button onClick={() => setState({})}>Update</button>;
}
```

## Best Practices

### 1. Provide Default Values

```tsx
const Context = createContext<ContextValue>({
  // Provide sensible defaults
  isAuthenticated: false,
  user: null,
  login: async () => {},
  logout: async () => {},
});
```

### 2. Type Safety

```typescript
interface ContextValue {
  data: string;
  setData: (value: string) => void;
}

const Context = createContext<ContextValue | undefined>(undefined);

function useTypedContext() {
  const context = useContext(Context);
  if (!context) {
    throw new Error('Context must be used within Provider');
  }
  return context;
}
```

### 3. Provider Guards

```tsx
function useSecureContext() {
  const context = useContext(SecurityContext);

  if (!context) {
    throw new Error('useSecureContext must be used within SecurityProvider');
  }

  return context;
}
```

### 4. Avoid Prop Drilling

```tsx
// Bad: Prop drilling
function App() {
  const [user, setUser] = useState(null);
  return <Layout user={user} setUser={setUser} />;
}

// Good: Use context
function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  );
}
```

### 5. Minimize Context Updates

```tsx
// Bad: Frequent updates
const [state, setState] = useState({ a: 1, b: 2, c: 3 });

// Good: Batched updates
const update = useCallback(() => {
  setState((prev) => ({
    ...prev,
    a: 10,
    b: 20,
    c: 30,
  }));
}, []);
```

## Integration Patterns

### With Feature Flags

```tsx
import { useFeatureFlag } from '@/lib/flags';
import { useAuth } from '@/lib/auth';

function ConditionalFeature() {
  const { user } = useAuth();
  const isEnabled = useFeatureFlag('premium-feature');

  if (!user?.isPremium || !isEnabled) {
    return <UpgradePrompt />;
  }

  return <PremiumFeature />;
}
```

### With Security

```tsx
import { useAuth } from '@/lib/auth';
import { useSecurityContext } from '@/lib/security';

function SecureForm() {
  const { user } = useAuth();
  const { csrfToken, sanitize } = useSecurityContext();

  return (
    <form>
      <input type="hidden" name="_csrf" value={csrfToken} />
      <input name="comment" />
    </form>
  );
}
```

### With Configuration

```tsx
import { useConfig } from '@/config';
import { useAuth } from '@/lib/auth';

function ThemedApp() {
  const { user } = useAuth();
  const [theme] = useConfig('ui', 'theme', user?.preferences?.theme || 'light');

  return <div className={theme}>...</div>;
}
```

## See Also

- [Hydration Module](../hydration/README.md) - SSR hydration
- [Security Module](../security/README.md) - Security features
- [Auth Module](../auth/README.md) - Authentication
- [Feature Flags](../flags/README.md) - Feature flags
- [Configuration](../config/README.md) - App configuration
- [React Context Documentation](https://react.dev/reference/react/useContext)

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
