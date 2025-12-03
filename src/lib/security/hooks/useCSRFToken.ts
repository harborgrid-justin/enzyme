/**
 * @fileoverview useCSRFToken Hook
 * @module @/lib/security/hooks/useCSRFToken
 *
 * React hook for CSRF token management with automatic
 * header generation and form input props.
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type React from 'react';
import type { UseCSRFTokenResult } from '../types';
import { CSRFProtection } from '../csrf-protection';

/**
 * Options for the useCSRFToken hook
 */
export interface UseCSRFTokenOptions {
  /** Auto-refresh token at this interval (ms) */
  refreshInterval?: number;
  /** Whether to auto-initialize CSRF protection */
  autoInitialize?: boolean;
}

/**
 * Hook for CSRF token management
 *
 * Provides CSRF token values, headers for fetch requests,
 * and form input props for traditional form submissions.
 *
 * @param options - Hook options
 * @returns CSRF token operations and values
 *
 * @example
 * ```tsx
 * function SecureForm() {
 *   const { token, formInputProps, headers, regenerate } = useCSRFToken();
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     const formData = new FormData(e.currentTarget);
 *
 *     await fetch('/api/submit', {
 *       method: 'POST',
 *       headers,
 *       body: formData,
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input {...formInputProps} />
 *       <input type="text" name="data" />
 *       <button type="submit">Submit</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useCSRFToken(options: UseCSRFTokenOptions = {}): UseCSRFTokenResult {
  const { refreshInterval, autoInitialize = true } = options;

  // State
  const [token, setToken] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Get configuration
  const config = CSRFProtection.getConfig();
  const { headerName } = config;
  const { fieldName } = config;

  // Initialize CSRF protection
  useEffect(() => {
    if (!autoInitialize) {
      return;
    }

    const init = (): void => {
      if (!CSRFProtection.isInitialized()) {
        CSRFProtection.initialize();
      }

      const currentToken = CSRFProtection.getToken();
      setToken(currentToken);
      setIsInitialized(true);
    };

    init();
  }, [autoInitialize]);

  // Regenerate token function
  const regenerate = useCallback(async (): Promise<string> => {
    const newToken = CSRFProtection.regenerateToken();
    setToken(newToken);
    return Promise.resolve(newToken);
  }, []);

  // Set up auto-refresh interval
  useEffect(() => {
    if (
      !isInitialized ||
      refreshInterval === undefined ||
      refreshInterval === null ||
      refreshInterval <= 0
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      void regenerate();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [isInitialized, refreshInterval, regenerate]);

  // Memoized headers object
  const headers = useMemo(
    () => ({
      [headerName]: token,
    }),
    [headerName, token]
  );

  // Memoized form input props
  const formInputProps = useMemo(
    () => ({
      type: 'hidden' as const,
      name: fieldName,
      value: token,
    }),
    [fieldName, token]
  );

  return {
    token,
    headerName,
    fieldName,
    headers,
    regenerate,
    formInputProps,
  };
}

/**
 * Hook for creating secure fetch with automatic CSRF token injection
 *
 * Note: This hook intentionally returns a raw fetch wrapper because:
 * 1. This IS the CSRF security layer that wraps fetch with token injection
 * 2. Users may need drop-in fetch replacement for existing code
 * 3. The apiClient already has CSRF protection built-in
 *
 * For new API calls, prefer using apiClient which has CSRF built-in.
 * @see {@link @/lib/api/api-client} for the recommended API client
 *
 * @example
 * ```tsx
 * function DataFetcher() {
 *   const secureFetch = useSecureFetch();
 *
 *   const submitData = async (data: object) => {
 *     const response = await secureFetch('/api/data', {
 *       method: 'POST',
 *       body: JSON.stringify(data),
 *       headers: {
 *         'Content-Type': 'application/json',
 *       },
 *     });
 *
 *     return response.json();
 *   };
 *
 *   // ...
 * }
 * ```
 */
export function useSecureFetch(): typeof fetch {
  const { headers: csrfHeaders } = useCSRFToken();

  return useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const method = init?.method?.toUpperCase() ?? 'GET';

      // Only add CSRF token for state-changing methods
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const headers = new Headers(init?.headers);

        // Add CSRF headers
        for (const [key, value] of Object.entries(csrfHeaders)) {
          if (!headers.has(key)) {
            headers.set(key, value);
          }
        }

        // Raw fetch is intentional - this hook injects CSRF tokens
        return fetch(input, {
          ...init,
          headers,
        });
      }

      // Raw fetch is intentional - this wrapper applies CSRF protection
      return fetch(input, init);
    },
    [csrfHeaders]
  );
}

/**
 * Hook for creating a secure form submission handler
 *
 * @example
 * ```tsx
 * function ContactForm() {
 *   const { handleSubmit, isSubmitting, error } = useSecureFormSubmit({
 *     action: '/api/contact',
 *     onSuccess: () => console.log('Submitted!'),
 *   });
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input name="email" type="email" />
 *       <button disabled={isSubmitting}>Send</button>
 *       {error && <p className="error">{error}</p>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useSecureFormSubmit(options: {
  action: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  onSuccess?: (response: Response) => void;
  onError?: (error: Error) => void;
}): {
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
} {
  const { action, method = 'POST', onSuccess, onError } = options;
  const { headers: csrfHeaders, formInputProps } = useCSRFToken();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setIsSubmitting(true);
      setError(null);

      try {
        const form = event.currentTarget;
        const formData = new FormData(form);

        // Ensure CSRF token is in form data
        if (!formData.has(formInputProps.name)) {
          formData.append(formInputProps.name, formInputProps.value);
        }

        // Raw fetch is intentional - this hook handles CSRF protection for forms
        const response = await fetch(action, {
          method,
          body: formData,
          headers: csrfHeaders,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        onSuccess?.(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Form submission failed';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsSubmitting(false);
      }
    },
    [action, method, csrfHeaders, formInputProps, onSuccess, onError]
  );

  return {
    handleSubmit,
    isSubmitting,
    error,
  };
}
