/**
 * @file API Interceptors
 * @description Collection of request/response interceptors for the API client.
 *
 * @module api/interceptors
 */

export {
  createCsrfInterceptor,
  defaultCsrfInterceptor,
  xsrfInterceptor,
  railsCsrfInterceptor,
  setCsrfToken,
  clearCsrfToken,
  getCsrfToken,
  type CsrfInterceptorConfig,
} from './csrf-interceptor';
