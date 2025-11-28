/**
 * @file API Client Context
 * @description Context for API client management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * HTTP method
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request options
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

/**
 * API client context value
 */
export interface ApiClientContextValue {
  baseURL: string;
  request: <T>(method: HttpMethod, url: string, options?: RequestOptions) => Promise<T>;
  get: <T>(url: string, options?: RequestOptions) => Promise<T>;
  post: <T>(url: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  put: <T>(url: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  delete: <T>(url: string, options?: RequestOptions) => Promise<T>;
  setHeader: (key: string, value: string) => void;
  removeHeader: (key: string) => void;
}

/**
 * API client context - extracted for Fast Refresh compliance
 */
export const ApiClientContext = createContext<ApiClientContextValue | null>(null);

ApiClientContext.displayName = 'ApiClientContext';
