/**
 * @file HTTP Interceptors
 * @description Common HTTP interceptors for auth, logging, and error handling
 */

import {
  type ErrorInterceptor,
  httpClient,
  type HttpError,
  type HttpResponse,
  type RecoveryErrorInterceptor,
  type RequestInterceptor,
  type ResponseInterceptor,
} from './http';

/**
 * Auth token getter function
 */
type TokenGetter = () => string | null | Promise<string | null>;

/**
 * Token refresh function
 */
type TokenRefresher = () => Promise<string | null>;

/**
 * Create authentication interceptor
 */
export function createAuthInterceptor(
  getToken: TokenGetter,
  headerName: string = 'Authorization',
  tokenPrefix: string = 'Bearer'
): RequestInterceptor {
  return async (config) => {
    if (config.skipAuth === true) {
      return config;
    }

    const token = await getToken();

    if (token !== null && token !== undefined) {
      return {
        ...config,
        headers: {
          ...config.headers,
          [headerName]: `${tokenPrefix} ${token}`,
        },
      };
    }

    return config;
  };
}

/**
 * Create request logging interceptor
 */
export function createRequestLoggerInterceptor(
  logger?: (message: string, data?: unknown) => void
): RequestInterceptor {
  const log =
    logger ??
    ((_msg: string, _data?: unknown): void => {
      /* noop by default */
    });
  return (config) => {
    log(`[HTTP] ${config.method ?? 'GET'} ${config.url}`, {
      params: config.params,
      body: config.body,
    });
    return config;
  };
}

/**
 * Create response logging interceptor
 */
export function createResponseLoggerInterceptor(
  logger?: (message: string, data?: unknown) => void
): ResponseInterceptor {
  const log =
    logger ??
    ((_msg: string, _data?: unknown): void => {
      /* noop by default */
    });
  return (response) => {
    log(`[HTTP] ${response.status} ${response.config.method ?? 'GET'} ${response.config.url}`, {
      data: response.data,
    });
    return response;
  };
}

/**
 * Create error logging interceptor
 */
export function createErrorLoggerInterceptor(
  logger: (message: string, error?: unknown) => void = console.error
): ErrorInterceptor {
  return (error) => {
    logger(`[HTTP Error] ${error.status} ${error.config.method ?? 'GET'} ${error.config.url}`, {
      status: error.status,
      data: error.data,
      message: error.message,
    });
    return error;
  };
}

/**
 * Create retry interceptor
 *
 * @remarks
 * This interceptor returns a RecoveryErrorInterceptor that can return either
 * an HttpError (to continue error propagation) or an HttpResponse (when retry succeeds).
 */
export function createRetryInterceptor(
  maxRetries: number = 3,
  retryDelay: number = 1000,
  retryCondition: (error: HttpError) => boolean = (error) =>
    error.status >= 500 || error.status === 0
): RecoveryErrorInterceptor {
  const retryCount = new Map<string, number>();

  return async (error): Promise<HttpError | HttpResponse> => {
    const requestKey = `${error.config.method ?? 'GET'}_${error.config.url}`;
    const currentRetry = retryCount.get(requestKey) ?? 0;

    if (currentRetry < maxRetries && retryCondition(error)) {
      retryCount.set(requestKey, currentRetry + 1);

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, currentRetry)));

      // Retry the request
      try {
        const response = await httpClient.request(error.config);
        retryCount.delete(requestKey);
        // Return successful response - recovery succeeded
        return response;
      } catch (retryError) {
        const currentCount = retryCount.get(requestKey) ?? 0;
        if (currentCount >= maxRetries) {
          retryCount.delete(requestKey);
        }
        throw retryError;
      }
    }

    retryCount.delete(requestKey);
    return error;
  };
}

/**
 * Create token refresh interceptor
 *
 * @remarks
 * This interceptor returns a RecoveryErrorInterceptor that can return either
 * an HttpError (to continue error propagation) or an HttpResponse (when token refresh and retry succeeds).
 */
export function createTokenRefreshInterceptor(
  refreshToken: TokenRefresher,
  onRefreshFailed: () => void
): RecoveryErrorInterceptor {
  let isRefreshing = false;
  let refreshPromise: Promise<string | null> | null = null;

  return async (error): Promise<HttpError | HttpResponse> => {
    // Only handle 401 errors
    if (error.status !== 401 || error.config.skipAuth === true) {
      return error;
    }

    // If already refreshing, wait for the refresh to complete
    if (isRefreshing && refreshPromise !== null) {
      try {
        const newToken = await refreshPromise;
        if (newToken !== null && newToken !== '') {
          // Retry with new token - recovery succeeded

          return await httpClient.request({
            ...error.config,
            headers: {
              ...error.config.headers,
              Authorization: `Bearer ${newToken}`,
            },
          });
        }
      } catch {
        // Refresh failed, propagate original error
        return error;
      }
    }

    // Start token refresh
    isRefreshing = true;
    refreshPromise = refreshToken();

    try {
      const newToken = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (newToken !== null && newToken !== '') {
        // Retry with new token - recovery succeeded

        return await httpClient.request({
          ...error.config,
          headers: {
            ...error.config.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
      }

      // Refresh returned no token
      onRefreshFailed();
      return error;
    } catch {
      isRefreshing = false;
      refreshPromise = null;
      onRefreshFailed();
      return error;
    }
  };
}

/**
 * Create CSRF token interceptor
 */
export function createCsrfInterceptor(
  getCsrfToken: () => string | null,
  headerName: string = 'X-CSRF-Token'
): RequestInterceptor {
  return (config) => {
    const method = config.method ?? 'GET';

    // Only add CSRF token for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const token = getCsrfToken();
      if (token !== null && token !== '') {
        return {
          ...config,
          headers: {
            ...config.headers,
            [headerName]: token,
          },
        };
      }
    }

    return config;
  };
}

/**
 * Create request ID interceptor
 */
export function createRequestIdInterceptor(
  headerName: string = 'X-Request-ID'
): RequestInterceptor {
  return (config) => {
    const requestId = crypto.randomUUID();
    return {
      ...config,
      headers: {
        ...config.headers,
        [headerName]: requestId,
      },
      meta: {
        ...config.meta,
        requestId,
      },
    };
  };
}

/**
 * Create timing interceptor
 */
export function createTimingInterceptor(onTiming: (url: string, duration: number) => void): {
  request: RequestInterceptor;
  response: ResponseInterceptor;
} {
  const timings = new Map<string, number>();

  return {
    request: (config) => {
      const key = `${config.method ?? 'GET'}_${config.url}_${Date.now()}`;
      timings.set(key, performance.now());
      return {
        ...config,
        meta: { ...config.meta, timingKey: key },
      };
    },
    response: (response) => {
      const key = response.config.meta?.timingKey as string | undefined;
      if (key !== undefined && key !== '') {
        const startTime = timings.get(key);
        if (startTime !== undefined) {
          const duration = performance.now() - startTime;
          timings.delete(key);
          onTiming(response.config.url, duration);
        }
      }
      return response;
    },
  };
}
