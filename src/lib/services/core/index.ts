/**
 * @file Services Core Module
 * @description Core service layer exports including facade and HTTP client.
 *
 * @example
 * ```typescript
 * import {
 *   serviceLayer,
 *   initializeServiceLayer,
 *   httpClient,
 * } from '@/lib/services/core';
 * ```
 */

// Service Layer Facade
export {
  serviceLayer,
  initializeServiceLayer,
  getServiceLayerStatus,
  disposeServiceLayer,
  type ServiceLayerConfig,
  type ServiceLayerStatus,
  type TelemetryConfig,
  type ServiceMetric,
  type ServiceError,
} from '../service-layer-facade';

// HTTP Client
export {
  HttpClient,
  httpClient,
  HttpError,
  type HttpRequestConfig,
  type HttpResponse,
  type RequestInterceptor,
  type ResponseInterceptor,
  type ErrorInterceptor,
  type HttpClientConfig,
  type HttpErrorCategory,
  type HttpErrorSeverity,
} from '../http';

// Basic Interceptors
export {
  createAuthInterceptor,
  createRequestLoggerInterceptor,
  createResponseLoggerInterceptor,
  createErrorLoggerInterceptor,
  createRetryInterceptor,
  createTokenRefreshInterceptor,
  createCsrfInterceptor,
  createRequestIdInterceptor,
  createTimingInterceptor,
} from '../interceptors';
