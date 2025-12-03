/**
 * @fileoverview useSecurityContext Hook
 * @module @/lib/security/hooks/useSecurityContext
 *
 * React hook for accessing the global security context.
 * Provides access to security state, configuration, and actions.
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import { useContext, useCallback, useMemo } from 'react';
import type { SecurityContextValue, SecurityViolation, SecurityConfiguration } from '../types';
import { SecurityContext } from '../../contexts/SecurityContext';

/**
 * Hook for accessing the security context
 *
 * Provides access to security state, CSP nonces, CSRF tokens,
 * violation reporting, and security configuration.
 *
 * @returns Security context value
 * @throws Error if used outside SecurityProvider
 *
 * @example
 * ```tsx
 * function SecureComponent() {
 *   const {
 *     cspNonce,
 *     csrfToken,
 *     isInitialized,
 *     violations,
 *     reportViolation,
 *   } = useSecurityContext();
 *
 *   if (!isInitialized) {
 *     return <Loading />;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Security violations: {violations.length}</p>
 *       <script nonce={cspNonce}>
 *         // inline script
 *       </script>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSecurityContext(): SecurityContextValue {
  const context = useContext(SecurityContext);

  if (!context) {
    throw new Error(
      'useSecurityContext must be used within a SecurityProvider. ' +
        'Ensure your component is wrapped with <SecurityProvider>.'
    );
  }

  return context as unknown as SecurityContextValue;
}

/**
 * Hook for security state only (no actions)
 *
 * Useful when you only need to read security state.
 *
 * @example
 * ```tsx
 * function SecurityStatus() {
 *   const { isInitialized, violations } = useSecurityState();
 *
 *   return (
 *     <div>
 *       Status: {isInitialized ? 'Ready' : 'Initializing'}
 *       Violations: {violations.length}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSecurityState(): {
  cspNonce: string;
  csrfToken: string;
  isInitialized: boolean;
  secureStorageAvailable: boolean;
  violations: readonly SecurityViolation[];
  lastEventAt: number;
} {
  const context = useSecurityContext();

  return useMemo(
    () => ({
      cspNonce: context.cspNonce,
      csrfToken: context.csrfToken,
      isInitialized: context.isInitialized,
      secureStorageAvailable: context.secureStorageAvailable,
      violations: context.violations,
      lastEventAt: context.lastEventAt,
    }),
    [
      context.cspNonce,
      context.csrfToken,
      context.isInitialized,
      context.secureStorageAvailable,
      context.violations,
      context.lastEventAt,
    ]
  );
}

/**
 * Hook for security actions only
 *
 * Useful when you only need security actions without state.
 *
 * @example
 * ```tsx
 * function SecurityControls() {
 *   const {
 *     regenerateNonce,
 *     regenerateCsrfToken,
 *     clearViolations,
 *   } = useSecurityActions();
 *
 *   return (
 *     <div>
 *       <button onClick={regenerateNonce}>Regenerate Nonce</button>
 *       <button onClick={() => regenerateCsrfToken()}>
 *         Regenerate CSRF Token
 *       </button>
 *       <button onClick={clearViolations}>Clear Violations</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSecurityActions(): {
  regenerateNonce: () => string;
  regenerateCsrfToken: () => Promise<string>;
  reportViolation: (violation: Omit<SecurityViolation, 'id' | 'timestamp'>) => void;
  clearViolations: () => void;
  updateConfig: (partial: Partial<SecurityConfiguration>) => void;
} {
  const context = useSecurityContext();

  return useMemo(
    () => ({
      regenerateNonce: context.regenerateNonce,
      regenerateCsrfToken: context.regenerateCsrfToken,
      reportViolation: context.reportViolation,
      clearViolations: context.clearViolations,
      updateConfig: context.updateConfig,
    }),
    [
      context.regenerateNonce,
      context.regenerateCsrfToken,
      context.reportViolation,
      context.clearViolations,
      context.updateConfig,
    ]
  );
}

/**
 * Hook for security configuration
 *
 * @example
 * ```tsx
 * function SecuritySettings() {
 *   const config = useSecurityConfig();
 *
 *   return (
 *     <pre>{JSON.stringify(config, null, 2)}</pre>
 *   );
 * }
 * ```
 */
export function useSecurityConfig(): SecurityConfiguration {
  const context = useSecurityContext();
  return context.config;
}

/**
 * Hook for violation reporting
 *
 * @example
 * ```tsx
 * function SecureInput() {
 *   const reportViolation = useViolationReporter();
 *
 *   const handleSuspiciousInput = (input: string) => {
 *     reportViolation({
 *       type: 'xss',
 *       details: `Suspicious input detected: ${input.slice(0, 50)}`,
 *       severity: 'medium',
 *       blocked: true,
 *     });
 *   };
 *
 *   // ...
 * }
 * ```
 */
export function useViolationReporter(): (
  violation: Omit<SecurityViolation, 'id' | 'timestamp'>
) => void {
  const context = useSecurityContext();
  return context.reportViolation;
}

/**
 * Hook for monitoring violations
 *
 * @example
 * ```tsx
 * function ViolationMonitor() {
 *   const { violations, hasViolations, criticalCount } = useViolations();
 *
 *   useEffect(() => {
 *     if (criticalCount > 0) {
 *       notifySecurityTeam(violations);
 *     }
 *   }, [criticalCount, violations]);
 *
 *   return (
 *     <div>
 *       {hasViolations && (
 *         <Alert severity="warning">
 *           {violations.length} security violations detected
 *         </Alert>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useViolations(): {
  violations: readonly SecurityViolation[];
  hasViolations: boolean;
  criticalCount: number;
  highCount: number;
  clearViolations: () => void;
} {
  const context = useSecurityContext();

  const criticalCount = useMemo(
    () => context.violations.filter((v) => v.severity === 'critical').length,
    [context.violations]
  );

  const highCount = useMemo(
    () => context.violations.filter((v) => v.severity === 'high').length,
    [context.violations]
  );

  return {
    violations: context.violations,
    hasViolations: context.violations.length > 0,
    criticalCount,
    highCount,
    clearViolations: context.clearViolations,
  };
}

/**
 * Hook for security initialization status
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isReady, isSecureStorageAvailable } = useSecurityStatus();
 *
 *   if (!isReady) {
 *     return <SplashScreen />;
 *   }
 *
 *   return <MainApp />;
 * }
 * ```
 */
export function useSecurityStatus(): {
  isReady: boolean;
  isSecureStorageAvailable: boolean;
} {
  const context = useSecurityContext();

  return {
    isReady: context.isInitialized,
    isSecureStorageAvailable: context.secureStorageAvailable,
  };
}

/**
 * Hook that waits for security initialization
 *
 * Returns null until security is initialized, then returns the context.
 * Useful for conditional rendering.
 *
 * @example
 * ```tsx
 * function SecureFeature() {
 *   const security = useSecurityReady();
 *
 *   if (!security) {
 *     return <Loading message="Initializing security..." />;
 *   }
 *
 *   return <SecureContent nonce={security.cspNonce} />;
 * }
 * ```
 */
export function useSecurityReady(): SecurityContextValue | null {
  const context = useSecurityContext();

  if (!context.isInitialized) {
    return null;
  }

  return context;
}

/**
 * Hook for creating secure event handlers
 *
 * Wraps event handlers with security checks.
 *
 * @example
 * ```tsx
 * function SecureForm() {
 *   const createSecureHandler = useSecureHandler();
 *
 *   const handleSubmit = createSecureHandler(async (data: FormData) => {
 *     await submitForm(data);
 *   });
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useSecureHandler(): <T extends (...args: unknown[]) => unknown>(
  handler: T,
  options?: {
    validateCsrf?: boolean;
    reportOnError?: boolean;
  }
) => T {
  const { csrfToken, reportViolation } = useSecurityContext();

  return useCallback(
    <T extends (...args: unknown[]) => unknown>(
      handler: T,
      options: {
        validateCsrf?: boolean;
        reportOnError?: boolean;
      } = {}
    ): T => {
      const { validateCsrf = false, reportOnError = true } = options;

      return ((...args: unknown[]) => {
        try {
          // CSRF validation would typically be done server-side,
          // but we can check if the token is available
          if (validateCsrf && !csrfToken) {
            throw new Error('CSRF token not available');
          }

          return handler(...args);
        } catch (error) {
          if (reportOnError) {
            reportViolation({
              type: 'other',
              details: error instanceof Error ? error.message : 'Unknown error in secure handler',
              severity: 'medium',
              blocked: true,
            });
          }
          throw error;
        }
      }) as T;
    },
    [csrfToken, reportViolation]
  );
}
