/**
 * Context Hook Utilities Module
 *
 * Provides utilities for creating and using React contexts with type safety,
 * default values, and enhanced provider patterns.
 *
 * @module hooks/context
 * @example
 * ```typescript
 * const [useTheme, ThemeProvider] = createContext<Theme>({
 *   name: 'theme',
 *   defaultValue: { mode: 'light' },
 * });
 * ```
 */

import {
  Context,
  Provider,
  createContext as reactCreateContext,
  useContext,
  ReactNode,
  ComponentType,
  useMemo,
  useState,
  useCallback,
} from 'react';

/**
 * Context options configuration
 */
export interface ContextOptions<T> {
  /** Display name for the context */
  name?: string;
  /** Default value for the context */
  defaultValue?: T;
  /** Whether to throw error when context is used outside provider */
  strict?: boolean;
  /** Custom error message for strict mode */
  errorMessage?: string;
}

/**
 * Context provider props
 */
export interface ContextProviderProps<T> {
  value: T;
  children: ReactNode;
}

/**
 * Context hook result
 */
export type ContextHook<T> = () => T;

/**
 * Context provider component type
 */
export type ContextProviderComponent<T> = ComponentType<ContextProviderProps<T>>;

/**
 * Creates a type-safe context with hook and provider
 *
 * @template T - Context value type
 * @param options - Context options
 * @returns Tuple of [useContext hook, Provider component, Context object]
 *
 * @example
 * ```typescript
 * interface UserContextValue {
 *   user: User | null;
 *   login: (user: User) => void;
 *   logout: () => void;
 * }
 *
 * const [useUser, UserProvider] = createContext<UserContextValue>({
 *   name: 'User',
 *   strict: true,
 * });
 *
 * // In your app
 * function App() {
 *   const [user, setUser] = useState<User | null>(null);
 *
 *   return (
 *     <UserProvider value={{
 *       user,
 *       login: setUser,
 *       logout: () => setUser(null),
 *     }}>
 *       <YourApp />
 *     </UserProvider>
 *   );
 * }
 *
 * // In a component
 * function Profile() {
 *   const { user, logout } = useUser();
 *   // ...
 * }
 * ```
 */
export function createContext<T>(
  options: ContextOptions<T> = {}
): [ContextHook<T>, ContextProviderComponent<T>, Context<T | undefined>] {
  const {
    name = 'Context',
    defaultValue,
    strict = true,
    errorMessage,
  } = options;

  const Context = reactCreateContext<T | undefined>(defaultValue);
  Context.displayName = name;

  const useContextHook: ContextHook<T> = () => {
    const context = useContext(Context);

    if (context === undefined && strict) {
      const error = errorMessage || `use${name} must be used within a ${name}Provider`;
      throw new Error(error);
    }

    return context as T;
  };

  const ProviderComponent: ContextProviderComponent<T> = ({ value, children }) => {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  ProviderComponent.displayName = `${name}Provider`;

  return [useContextHook, ProviderComponent, Context];
}

/**
 * Creates a context with built-in state management
 *
 * @template T - State type
 * @param initialState - Initial state value
 * @param options - Context options
 * @returns Tuple of [useContext hook, Provider component]
 *
 * @example
 * ```typescript
 * const [useCounter, CounterProvider] = createStateContext(0, {
 *   name: 'Counter',
 * });
 *
 * function App() {
 *   return (
 *     <CounterProvider>
 *       <Counter />
 *     </CounterProvider>
 *   );
 * }
 *
 * function Counter() {
 *   const [count, setCount] = useCounter();
 *   return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
 * }
 * ```
 */
export function createStateContext<T>(
  initialState: T,
  options: ContextOptions<[T, (value: T | ((prev: T) => T)) => void]> = {}
): [
  ContextHook<[T, (value: T | ((prev: T) => T)) => void]>,
  ComponentType<{ children: ReactNode }>
] {
  const [useContextValue, Provider] = createContext<
    [T, (value: T | ((prev: T) => T)) => void]
  >(options);

  const StateProvider: ComponentType<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<T>(initialState);

    return <Provider value={[state, setState]}>{children}</Provider>;
  };

  StateProvider.displayName = `${options.name || 'State'}Provider`;

  return [useContextValue, StateProvider];
}

/**
 * Creates a context with memoized value
 *
 * @template T - Context value type
 * @param options - Context options
 * @returns Tuple of [useContext hook, Provider component]
 *
 * @example
 * ```typescript
 * const [useSettings, SettingsProvider] = createMemoContext<Settings>({
 *   name: 'Settings',
 * });
 *
 * function App() {
 *   const settings = useMemo(() => loadSettings(), []);
 *
 *   return (
 *     <SettingsProvider value={settings}>
 *       <YourApp />
 *     </SettingsProvider>
 *   );
 * }
 * ```
 */
export function createMemoContext<T>(
  options: ContextOptions<T> = {}
): [ContextHook<T>, ComponentType<ContextProviderProps<T>>] {
  const [useContextValue, BaseProvider] = createContext<T>(options);

  const MemoProvider: ComponentType<ContextProviderProps<T>> = ({ value, children }) => {
    const memoizedValue = useMemo(() => value, [value]);
    return <BaseProvider value={memoizedValue}>{children}</BaseProvider>;
  };

  MemoProvider.displayName = `${options.name || 'Memo'}Provider`;

  return [useContextValue, MemoProvider];
}

/**
 * Creates a context with factory pattern
 *
 * @template T - Context value type
 * @param factory - Factory function to create context value
 * @param options - Context options
 * @returns Tuple of [useContext hook, Provider component]
 *
 * @example
 * ```typescript
 * const [useApi, ApiProvider] = createFactoryContext(
 *   () => ({
 *     fetchUser: async (id: string) => fetch(`/api/users/${id}`),
 *     fetchPosts: async () => fetch('/api/posts'),
 *   }),
 *   { name: 'Api' }
 * );
 *
 * function App() {
 *   return (
 *     <ApiProvider>
 *       <YourApp />
 *     </ApiProvider>
 *   );
 * }
 * ```
 */
export function createFactoryContext<T>(
  factory: () => T,
  options: ContextOptions<T> = {}
): [ContextHook<T>, ComponentType<{ children: ReactNode }>] {
  const [useContextValue, Provider] = createContext<T>(options);

  const FactoryProvider: ComponentType<{ children: ReactNode }> = ({ children }) => {
    const value = useMemo(factory, []);
    return <Provider value={value}>{children}</Provider>;
  };

  FactoryProvider.displayName = `${options.name || 'Factory'}Provider`;

  return [useContextValue, FactoryProvider];
}

/**
 * Creates a context with selector pattern for optimized rendering
 *
 * @template T - Full context value type
 * @param options - Context options
 * @returns Context utilities including selector hook
 *
 * @example
 * ```typescript
 * interface Store {
 *   user: User;
 *   settings: Settings;
 *   theme: Theme;
 * }
 *
 * const [StoreProvider, useStoreSelector] = createSelectorContext<Store>({
 *   name: 'Store',
 * });
 *
 * function UserDisplay() {
 *   // Only re-renders when user changes
 *   const user = useStoreSelector(state => state.user);
 * }
 * ```
 */
export function createSelectorContext<T extends object>(
  options: ContextOptions<T> = {}
): [
  ComponentType<ContextProviderProps<T>>,
  <S>(selector: (state: T) => S) => S
] {
  const [useContextValue, Provider] = createContext<T>(options);

  const useSelector = <S,>(selector: (state: T) => S): S => {
    const context = useContextValue();
    return useMemo(() => selector(context), [context, selector]);
  };

  return [Provider, useSelector];
}

/**
 * Creates a context with actions pattern
 *
 * @template TState - State type
 * @template TActions - Actions type
 * @param initialState - Initial state
 * @param createActions - Function to create actions
 * @param options - Context options
 * @returns Tuple of hooks and provider
 *
 * @example
 * ```typescript
 * const [
 *   TodoProvider,
 *   useTodoState,
 *   useTodoActions
 * ] = createActionsContext(
 *   { todos: [] },
 *   (setState) => ({
 *     addTodo: (todo: Todo) => setState(s => ({ todos: [...s.todos, todo] })),
 *     removeTodo: (id: string) => setState(s => ({
 *       todos: s.todos.filter(t => t.id !== id)
 *     })),
 *   }),
 *   { name: 'Todo' }
 * );
 * ```
 */
export function createActionsContext<
  TState extends object,
  TActions extends Record<string, (...args: any[]) => any>
>(
  initialState: TState,
  createActions: (setState: (updater: (prev: TState) => TState) => void) => TActions,
  options: ContextOptions<{ state: TState; actions: TActions }> = {}
): [
  ComponentType<{ children: ReactNode }>,
  ContextHook<TState>,
  ContextHook<TActions>
] {
  const [useContextValue, Provider] = createContext<{
    state: TState;
    actions: TActions;
  }>(options);

  const ActionsProvider: ComponentType<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<TState>(initialState);
    const actions = useMemo(() => createActions(setState), []);

    const value = useMemo(
      () => ({ state, actions }),
      [state, actions]
    );

    return <Provider value={value}>{children}</Provider>;
  };

  ActionsProvider.displayName = `${options.name || 'Actions'}Provider`;

  const useStateHook = () => useContextValue().state;
  const useActionsHook = () => useContextValue().actions;

  return [ActionsProvider, useStateHook, useActionsHook];
}

/**
 * Combines multiple context providers into a single component
 *
 * @param providers - Array of provider configurations
 * @returns Combined provider component
 *
 * @example
 * ```typescript
 * const AppProvider = combineProviders([
 *   { Provider: UserProvider, value: userValue },
 *   { Provider: ThemeProvider, value: themeValue },
 *   { Provider: SettingsProvider, value: settingsValue },
 * ]);
 *
 * function App() {
 *   return (
 *     <AppProvider>
 *       <YourApp />
 *     </AppProvider>
 *   );
 * }
 * ```
 */
export function combineProviders<T extends any[]>(
  providers: {
    Provider: ComponentType<any>;
    value?: any;
  }[]
): ComponentType<{ children: ReactNode }> {
  return ({ children }) => {
    return providers.reduceRight(
      (acc, { Provider, value }) => (
        <Provider value={value}>{acc}</Provider>
      ),
      children as ReactNode
    );
  };
}

/**
 * Creates a context with localStorage persistence
 *
 * @template T - State type
 * @param key - Storage key
 * @param initialState - Initial state value
 * @param options - Context options
 * @returns Tuple of [useContext hook, Provider component]
 *
 * @example
 * ```typescript
 * const [usePreferences, PreferencesProvider] = createPersistedContext(
 *   'user-preferences',
 *   { theme: 'light', language: 'en' },
 *   { name: 'Preferences' }
 * );
 * ```
 */
export function createPersistedContext<T>(
  key: string,
  initialState: T,
  options: ContextOptions<[T, (value: T | ((prev: T) => T)) => void]> = {}
): [
  ContextHook<[T, (value: T | ((prev: T) => T)) => void]>,
  ComponentType<{ children: ReactNode }>
] {
  const [useContextValue, Provider] = createContext<
    [T, (value: T | ((prev: T) => T)) => void]
  >(options);

  const PersistedProvider: ComponentType<{ children: ReactNode }> = ({ children }) => {
    const [state, setStateInternal] = useState<T>(() => {
      if (typeof window === 'undefined') return initialState;

      try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : initialState;
      } catch {
        return initialState;
      }
    });

    const setState = useCallback(
      (value: T | ((prev: T) => T)) => {
        setStateInternal((prev) => {
          const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;

          try {
            localStorage.setItem(key, JSON.stringify(next));
          } catch (error) {
            console.error('Failed to persist state:', error);
          }

          return next;
        });
      },
      [key]
    );

    const value = useMemo(() => [state, setState] as [T, typeof setState], [state, setState]);

    return <Provider value={value}>{children}</Provider>;
  };

  PersistedProvider.displayName = `${options.name || 'Persisted'}Provider`;

  return [useContextValue, PersistedProvider];
}

/**
 * Creates a context with reducer pattern
 *
 * @template TState - State type
 * @template TAction - Action type
 * @param reducer - Reducer function
 * @param initialState - Initial state
 * @param options - Context options
 * @returns Tuple of [useContext hook, Provider component]
 *
 * @example
 * ```typescript
 * type State = { count: number };
 * type Action = { type: 'increment' } | { type: 'decrement' } | { type: 'set'; value: number };
 *
 * const [useCounter, CounterProvider] = createReducerContext(
 *   (state, action) => {
 *     switch (action.type) {
 *       case 'increment': return { count: state.count + 1 };
 *       case 'decrement': return { count: state.count - 1 };
 *       case 'set': return { count: action.value };
 *       default: return state;
 *     }
 *   },
 *   { count: 0 },
 *   { name: 'Counter' }
 * );
 * ```
 */
export function createReducerContext<TState, TAction>(
  reducer: (state: TState, action: TAction) => TState,
  initialState: TState,
  options: ContextOptions<[TState, (action: TAction) => void]> = {}
): [
  ContextHook<[TState, (action: TAction) => void]>,
  ComponentType<{ children: ReactNode }>
] {
  const [useContextValue, Provider] = createContext<
    [TState, (action: TAction) => void]
  >(options);

  const ReducerProvider: ComponentType<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = React.useReducer(reducer, initialState);
    const value = useMemo(() => [state, dispatch] as [TState, typeof dispatch], [state]);

    return <Provider value={value}>{children}</Provider>;
  };

  ReducerProvider.displayName = `${options.name || 'Reducer'}Provider`;

  return [useContextValue, ReducerProvider];
}

/**
 * Hook to use multiple contexts at once
 *
 * @param contexts - Array of context hooks
 * @returns Array of context values
 *
 * @example
 * ```typescript
 * const [user, theme, settings] = useMultipleContexts([
 *   useUser,
 *   useTheme,
 *   useSettings,
 * ]);
 * ```
 */
export function useMultipleContexts<T extends ContextHook<any>[]>(
  contexts: [...T]
): { [K in keyof T]: T[K] extends ContextHook<infer R> ? R : never } {
  return contexts.map((useContextHook) => useContextHook()) as any;
}

/**
 * Hook to conditionally use a context
 *
 * @param useContextHook - Context hook to use
 * @param condition - Whether to use the context
 * @param fallback - Fallback value when condition is false
 * @returns Context value or fallback
 *
 * @example
 * ```typescript
 * const user = useConditionalContext(useUser, isAuthenticated, null);
 * ```
 */
export function useConditionalContext<T>(
  useContextHook: ContextHook<T>,
  condition: boolean,
  fallback: T
): T {
  const context = condition ? useContextHook() : fallback;
  return context;
}

// Helper import for useReducer
import * as React from 'react';
