/**
 * @file useApiClient Hook
 * @description React hook for accessing and configuring the API client instance
 * with context-aware configuration and request utilities.
 *
 * @example
 * ```typescript
 * import { useApiClient } from '@/lib/api';
 *
 * function UserProfile() {
 *   const { client, get, post, isConfigured } = useApiClient();
 *
 *   const fetchUser = async (id: string) => {
 *     const response = await get<User>(`/users/${id}`);
 *     return response.data;
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */

import type { Context } from 'react';
import {
  useContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { ApiClientContext as ImportedApiClientContext } from '../../contexts/ApiClientContext';
import { ApiClient, apiClient, createApiClient } from '../api-client';
import type {
  ApiClientConfig,
  ApiResponse,
  ApiError,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * API client context value
 */
export interface ApiClientContextValue {
  /** API client instance */
  client: ApiClient;
  /** Whether client is configured */
  isConfigured: boolean;
  /** Current configuration */
  config: ApiClientConfig | null;

  /** Make a GET request */
  get: <T>(url: string, options?: Partial<RequestConfig>) => Promise<ApiResponse<T>>;
  /** Make a POST request */
  post: <T, B = unknown>(url: string, body?: B, options?: Partial<RequestConfig>) => Promise<ApiResponse<T>>;
  /** Make a PUT request */
  put: <T, B = unknown>(url: string, body?: B, options?: Partial<RequestConfig>) => Promise<ApiResponse<T>>;
  /** Make a PATCH request */
  patch: <T, B = unknown>(url: string, body?: B, options?: Partial<RequestConfig>) => Promise<ApiResponse<T>>;
  /** Make a DELETE request */
  del: <T>(url: string, options?: Partial<RequestConfig>) => Promise<ApiResponse<T>>;
  /** Make a generic request */
  request: <T>(config: RequestConfig) => Promise<ApiResponse<T>>;

  /** Add request interceptor */
  addRequestInterceptor: (interceptor: RequestInterceptor) => () => void;
  /** Add response interceptor */
  addResponseInterceptor: (interceptor: ResponseInterceptor) => () => void;
  /** Add error interceptor */
  addErrorInterceptor: (interceptor: ErrorInterceptor) => () => void;

  /** Set token refresh function */
  setTokenRefresh: (fn: () => Promise<string>) => void;
  /** Cancel a specific request */
  cancelRequest: (requestId: string) => void;
  /** Cancel all pending requests */
  cancelAllRequests: () => void;

  /** Reconfigure the client */
  configure: (config: Partial<ApiClientConfig>) => void;
}

/**
 * API client provider props
 */
export interface ApiClientProviderProps {
  /** Child components */
  children: ReactNode;
  /** Initial client configuration */
  config?: ApiClientConfig;
  /** Custom client instance */
  client?: ApiClient;
  /** Token refresh function */
  onTokenRefresh?: () => Promise<string>;
  /** Global error handler */
  onError?: (error: ApiError) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Re-export the imported context for use within this module.
 * IMPORTANT: Do NOT create a new context here - use the one from contexts/ApiClientContext.
 * Creating a duplicate context would cause provider/consumer mismatches.
 */
const ApiClientContext = ImportedApiClientContext as Context<ApiClientContextValue | null>;

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

/**
 * API client provider component
 *
 * @example
 * ```typescript
 * function App() {
 *   return (
 *     <ApiClientProvider
 *       config={{
 *         baseUrl: 'https://api.example.com',
 *         timeout: 30000,
 *       }}
 *       onTokenRefresh={refreshToken}
 *       onError={(error) => toast.error(error.message)}
 *     >
 *       <Router />
 *     </ApiClientProvider>
 *   );
 * }
 * ```
 */
export function ApiClientProvider({
  children,
  config,
  client: customClient,
  onTokenRefresh,
  onError,
}: ApiClientProviderProps) {
  // Create or use provided client
  const [client] = useState<ApiClient>(() => {
    if (customClient) return customClient;
    if (config) return createApiClient(config);
    return apiClient;
  });

  const [currentConfig, setCurrentConfig] = useState<ApiClientConfig | null>(config || null);

  // Set up token refresh
  useEffect(() => {
    if (onTokenRefresh) {
      client.setTokenRefresh(onTokenRefresh);
    }
  }, [client, onTokenRefresh]);

  // Set up global error handler
  useEffect(() => {
    if (onError) {
      const removeInterceptor = client.addErrorInterceptor((error) => {
        onError(error);
        return error;
      });
      return removeInterceptor;
    }
    return undefined;
  }, [client, onError]);

  // Memoized request methods
  const get = useCallback(
    <T,>(url: string, options?: Partial<RequestConfig>) =>
      client.get<T>(url, options),
    [client]
  );

  const post = useCallback(
    <T, B = unknown>(url: string, body?: B, options?: Partial<RequestConfig>) =>
      client.post<T, B>(url, body, options),
    [client]
  );

  const put = useCallback(
    <T, B = unknown>(url: string, body?: B, options?: Partial<RequestConfig>) =>
      client.put<T, B>(url, body, options),
    [client]
  );

  const patch = useCallback(
    <T, B = unknown>(url: string, body?: B, options?: Partial<RequestConfig>) =>
      client.patch<T, B>(url, body, options),
    [client]
  );

  const del = useCallback(
    <T,>(url: string, options?: Partial<RequestConfig>) =>
      client.delete<T>(url, options),
    [client]
  );

  const request = useCallback(
    <T,>(requestConfig: RequestConfig) => client.request<T>(requestConfig),
    [client]
  );

  // Interceptor methods
  const addRequestInterceptor = useCallback(
    (interceptor: RequestInterceptor) => client.addRequestInterceptor(interceptor),
    [client]
  );

  const addResponseInterceptor = useCallback(
    (interceptor: ResponseInterceptor) => client.addResponseInterceptor(interceptor),
    [client]
  );

  const addErrorInterceptor = useCallback(
    (interceptor: ErrorInterceptor) => client.addErrorInterceptor(interceptor),
    [client]
  );

  // Token refresh setter
  const setTokenRefresh = useCallback(
    (fn: () => Promise<string>) => client.setTokenRefresh(fn),
    [client]
  );

  // Cancellation methods
  const cancelRequest = useCallback(
    (requestId: string) => client.cancelRequest(requestId),
    [client]
  );

  const cancelAllRequests = useCallback(() => client.cancelAllRequests(), [client]);

  // Configuration method
  const configure = useCallback((newConfig: Partial<ApiClientConfig>) => {
    setCurrentConfig((prev) => ({ ...prev, ...newConfig } as ApiClientConfig));
    // Note: ApiClient doesn't support runtime reconfiguration
    // This would require creating a new client instance
  }, []);

  // Build context value
  const contextValue = useMemo<ApiClientContextValue>(
    () => ({
      client,
      isConfigured: currentConfig !== null,
      config: currentConfig,
      get,
      post,
      put,
      patch,
      del,
      request,
      addRequestInterceptor,
      addResponseInterceptor,
      addErrorInterceptor,
      setTokenRefresh,
      cancelRequest,
      cancelAllRequests,
      configure,
    }),
    [
      client,
      currentConfig,
      get,
      post,
      put,
      patch,
      del,
      request,
      addRequestInterceptor,
      addResponseInterceptor,
      addErrorInterceptor,
      setTokenRefresh,
      cancelRequest,
      cancelAllRequests,
      configure,
    ]
  );

  return (
    <ApiClientContext.Provider value={contextValue}>{children}</ApiClientContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the API client and utilities
 *
 * @returns API client context with request methods and configuration
 * @throws Error if used outside ApiClientProvider
 *
 * @example
 * ```typescript
 * function UserList() {
 *   const { get, isConfigured } = useApiClient();
 *   const [users, setUsers] = useState<User[]>([]);
 *
 *   useEffect(() => {
 *     if (isConfigured) {
 *       get<User[]>('/users').then((res) => setUsers(res.data));
 *     }
 *   }, [get, isConfigured]);
 *
 *   return <ul>{users.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
 * }
 * ```
 */
export function useApiClient(): ApiClientContextValue {
  const context = useContext(ApiClientContext);

  if (!context) {
    // Return a default context using the singleton client
    // This allows useApiClient to work without a provider
    return {
      client: apiClient,
      isConfigured: true,
      config: null,
      get: (url, options) => apiClient.get(url, options),
      post: (url, body, options) => apiClient.post(url, body, options),
      put: (url, body, options) => apiClient.put(url, body, options),
      patch: (url, body, options) => apiClient.patch(url, body, options),
      del: (url, options) => apiClient.delete(url, options),
      request: (config) => apiClient.request(config),
      addRequestInterceptor: (interceptor) => apiClient.addRequestInterceptor(interceptor),
      addResponseInterceptor: (interceptor) => apiClient.addResponseInterceptor(interceptor),
      addErrorInterceptor: (interceptor) => apiClient.addErrorInterceptor(interceptor),
      setTokenRefresh: (fn) => apiClient.setTokenRefresh(fn),
      cancelRequest: (id) => apiClient.cancelRequest(id),
      cancelAllRequests: () => apiClient.cancelAllRequests(),
      configure: () => {
        console.warn('[useApiClient] configure() requires ApiClientProvider');
      },
    };
  }

  return context;
}

/**
 * Hook to get only the API client instance
 *
 * @returns API client instance
 */
export function useApiClientInstance(): ApiClient {
  const { client } = useApiClient();
  return client;
}

/**
 * Hook to check if API client is configured
 *
 * @returns Whether the client is configured
 */
export function useApiClientStatus(): { isConfigured: boolean; config: ApiClientConfig | null } {
  const { isConfigured, config } = useApiClient();
  return { isConfigured, config };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to add interceptors with automatic cleanup
 *
 * @example
 * ```typescript
 * useApiInterceptors({
 *   request: (config) => {
 *     config.headers['X-Custom-Header'] = 'value';
 *     return config;
 *   },
 *   response: (response) => {
 *     console.log('Response received:', response.status);
 *     return response;
 *   },
 * });
 * ```
 */
export function useApiInterceptors(interceptors: {
  request?: RequestInterceptor;
  response?: ResponseInterceptor;
  error?: ErrorInterceptor;
}): void {
  const { addRequestInterceptor, addResponseInterceptor, addErrorInterceptor } = useApiClient();

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    if (interceptors.request) {
      cleanups.push(addRequestInterceptor(interceptors.request));
    }
    if (interceptors.response) {
      cleanups.push(addResponseInterceptor(interceptors.response));
    }
    if (interceptors.error) {
      cleanups.push(addErrorInterceptor(interceptors.error));
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [
    interceptors.request,
    interceptors.response,
    interceptors.error,
    addRequestInterceptor,
    addResponseInterceptor,
    addErrorInterceptor,
  ]);
}
