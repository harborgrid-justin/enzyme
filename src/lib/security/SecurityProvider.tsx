/**
 * @fileoverview Security Provider Component
 * @module @/lib/security/SecurityProvider
 *
 * Global security context provider for the Harbor React Framework.
 * Initializes and manages all security subsystems including CSP,
 * CSRF protection, XSS prevention, and secure storage.
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SecurityContext } from '../contexts/SecurityContext';
import type {
  SecurityContextValue,
  SecurityContextState,
  SecurityViolation,
  SecurityConfiguration,
  SecurityEvent,
  SecurityEventType,
  SecureStorageInterface,
} from './types';
import { securityConfig } from '@/config/security.config';
import { CSPManager } from './csp-manager';
import { CSRFProtection } from './csrf-protection';
import {
  initSecureStorage,
  getSecureStorage,
  isSecureStorageAvailable,
  generateEncryptionKey,
} from './secure-storage';

// ============================================================================
// Context
// ============================================================================

/**
 * Security context for React components
 */
// ============================================================================
// Types
// ============================================================================

/**
 * Security Provider props
 */
export interface SecurityProviderProps {
  /** Child components */
  children: ReactNode;
  /** Override default configuration */
  config?: Partial<SecurityConfiguration>;
  /** Encryption key for secure storage (auto-generated if not provided) */
  encryptionKey?: string;
  /** Callback when security is initialized */
  onInitialized?: () => void;
  /** Callback for security events */
  onSecurityEvent?: (event: SecurityEvent) => void;
  /** Callback for security violations */
  onViolation?: (violation: SecurityViolation) => void;
  /** Skip initialization (for testing) */
  skipInitialization?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique violation ID
 */
function generateViolationId(): string {
  return `viol_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get or generate encryption key
 */
function getEncryptionKey(providedKey?: string): string {
  if (providedKey) {
    return providedKey;
  }

  // Try to get from sessionStorage
  const storedKey = sessionStorage.getItem('__security_key__');
  if (storedKey) {
    return storedKey;
  }

  // Generate new key
  const newKey = generateEncryptionKey();
  sessionStorage.setItem('__security_key__', newKey);
  return newKey;
}

// ============================================================================
// Security Provider Component
// ============================================================================

/**
 * Security Provider component
 *
 * Provides global security context to the application including:
 * - CSP nonce management
 * - CSRF token management
 * - Secure storage access
 * - Violation tracking and reporting
 *
 * @example
 * ```tsx
 * // Basic usage
 * function App() {
 *   return (
 *     <SecurityProvider>
 *       <MainApp />
 *     </SecurityProvider>
 *   );
 * }
 *
 * // With configuration
 * function App() {
 *   return (
 *     <SecurityProvider
 *       config={{
 *         reportToServer: true,
 *         reportEndpoint: '/api/security/report',
 *       }}
 *       onViolation={(v) => analytics.track('security_violation', v)}
 *     >
 *       <MainApp />
 *     </SecurityProvider>
 *   );
 * }
 * ```
 */
export function SecurityProvider({
  children,
  config: configOverride,
  encryptionKey: providedEncryptionKey,
  onInitialized,
  onSecurityEvent,
  onViolation,
  skipInitialization = false,
}: SecurityProviderProps): React.ReactElement {
  // Merge configuration
  const config = useMemo<SecurityConfiguration>(
    () => ({
      ...securityConfig,
      ...configOverride,
      csp: {
        ...securityConfig.csp,
        ...configOverride?.csp,
      },
      csrf: {
        ...securityConfig.csrf,
        ...configOverride?.csrf,
      },
      storage: {
        ...securityConfig.storage,
        ...configOverride?.storage,
      },
    }),
    [configOverride]
  );

  // State
  const [state, setState] = useState<SecurityContextState>({
    cspNonce: '',
    isInitialized: false,
    csrfToken: '',
    secureStorageAvailable: false,
    config,
    violations: [],
    lastEventAt: Date.now(),
  });

  // Refs
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const eventCallbackRef = useRef(onSecurityEvent);
  const violationCallbackRef = useRef(onViolation);

  // Keep callbacks updated
  useEffect(() => {
    eventCallbackRef.current = onSecurityEvent;
    violationCallbackRef.current = onViolation;
  }, [onSecurityEvent, onViolation]);

  // Emit security event
  const emitEvent = useCallback((type: SecurityEventType, payload: unknown) => {
    const event: SecurityEvent = {
      type,
      payload,
      timestamp: Date.now(),
      source: 'SecurityProvider',
    };

    eventCallbackRef.current?.(event);

    setState((prev) => ({
      ...prev,
      lastEventAt: event.timestamp,
    }));
  }, []);

  // ==========================================================================
  // Initialization
  // ==========================================================================

  useEffect(() => {
    if (skipInitialization || initializingRef.current) {
      return;
    }

    initializingRef.current = true;

    const initialize = async (): Promise<void> => {
      try {
        // Initialize CSP Manager
        CSPManager.initialize();
        const nonce = CSPManager.getCurrentNonce();

        // Initialize CSRF Protection
        await CSRFProtection.initialize();
        const csrfToken = await CSRFProtection.getToken();

        // Initialize Secure Storage
        let storageAvailable = false;
        if (isSecureStorageAvailable()) {
          try {
            const encryptionKey = getEncryptionKey(providedEncryptionKey);
            initSecureStorage(encryptionKey);
            storageAvailable = true;
          } catch (error) {
            console.warn('[Security] Secure storage initialization failed:', error);
          }
        }

        if (!mountedRef.current) return;

        setState((prev) => ({
          ...prev,
          cspNonce: nonce,
          csrfToken,
          secureStorageAvailable: storageAvailable,
          isInitialized: true,
        }));

        emitEvent('initialization-complete', {
          cspEnabled: true,
          csrfEnabled: true,
          secureStorageEnabled: storageAvailable,
        });

        onInitialized?.();
      } catch (error) {
        console.error('[Security] Initialization error:', error);

        if (!mountedRef.current) return;

        // Partial initialization with what succeeded
        setState((prev) => ({
          ...prev,
          isInitialized: true,
        }));
      }
    };

    void initialize();

    return () => {
      mountedRef.current = false;
    };
  }, [skipInitialization, providedEncryptionKey, emitEvent, onInitialized]);

  // ==========================================================================
  // CSP Violation Listener
  // ==========================================================================

  useEffect(() => {
    if (!config.csp.reportViolations) {
      return;
    }

    const removeHandler = CSPManager.addViolationHandler((violation) => {
      const securityViolation: SecurityViolation = {
        id: generateViolationId(),
        type: 'csp',
        details: `${violation.violatedDirective}: ${violation.blockedUri}`,
        timestamp: Date.now(),
        severity: 'high',
        blocked: violation.disposition === 'enforce',
        source: violation.sourceFile,
      };

      handleViolation(securityViolation);
    });

    return removeHandler;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.csp.reportViolations]);

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Handle a security violation
   */
  const handleViolation = useCallback(
    (violation: SecurityViolation) => {
      setState((prev) => {
        const violations = [...prev.violations, violation];

        // Trim to max history
        while (violations.length > config.maxViolationHistory) {
          violations.shift();
        }

        return { ...prev, violations };
      });

      // Notify callback
      violationCallbackRef.current?.(violation);

      // Log if enabled
      if (config.enableLogging) {
        console.warn('[Security] Violation detected:', violation);
      }

      // Report to server if enabled
      // Note: Raw fetch is intentional - security reporting must be independent
      // and use keepalive for reliability when page is unloading
      if (config.reportToServer && config.reportEndpoint) {
        void fetch(config.reportEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(violation),
          keepalive: true,
        }).catch((error) => {
          console.error('[Security] Failed to report violation:', error);
        });
      }
    },
    [config.maxViolationHistory, config.enableLogging, config.reportToServer, config.reportEndpoint]
  );

  /**
   * Regenerate CSP nonce
   */
  const regenerateNonce = useCallback((): string => {
    const nonceObj = CSPManager.regenerateNonce();
    const newNonce = nonceObj.value;

    setState((prev) => ({ ...prev, cspNonce: newNonce }));
    emitEvent('nonce-regenerated', { nonce: newNonce });

    return newNonce;
  }, [emitEvent]);

  /**
   * Regenerate CSRF token
   */
  const regenerateCsrfToken = useCallback(async (): Promise<string> => {
    const newToken = await CSRFProtection.regenerateToken();

    setState((prev) => ({ ...prev, csrfToken: newToken }));
    emitEvent('token-rotated', { tokenType: 'csrf' });

    return newToken;
  }, [emitEvent]);

  /**
   * Report a security violation
   */
  const reportViolation = useCallback(
    (violation: Omit<SecurityViolation, 'id' | 'timestamp'>) => {
      const fullViolation: SecurityViolation = {
        ...violation,
        id: generateViolationId(),
        timestamp: Date.now(),
      };

      handleViolation(fullViolation);
    },
    [handleViolation]
  );

  /**
   * Clear violation history
   */
  const clearViolations = useCallback(() => {
    setState((prev) => ({ ...prev, violations: [] }));
  }, []);

  /**
   * Get secure storage instance
   */
  const getSecureStorageInstance = useCallback((): SecureStorageInterface => {
    if (!state.secureStorageAvailable) {
      throw new Error('Secure storage is not available');
    }
    return getSecureStorage();
  }, [state.secureStorageAvailable]);

  /**
   * Update security configuration
   */
  const updateConfig = useCallback(
    (partial: Partial<SecurityConfiguration>) => {
      setState((prev) => ({
        ...prev,
        config: {
          ...prev.config,
          ...partial,
        },
      }));

      emitEvent('config-updated', partial);
    },
    [emitEvent]
  );

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const contextValue = useMemo<SecurityContextValue>(
    () => ({
      ...state,
      regenerateNonce,
      regenerateCsrfToken,
      reportViolation,
      clearViolations,
      getSecureStorage: getSecureStorageInstance,
      updateConfig,
    }),
    [
      state,
      regenerateNonce,
      regenerateCsrfToken,
      reportViolation,
      clearViolations,
      getSecureStorageInstance,
      updateConfig,
    ]
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

// ============================================================================
// Higher-Order Component
// ============================================================================

/**
 * Higher-order component that provides security context
 *
 * @example
 * ```tsx
 * const SecureApp = withSecurityProvider(App);
 *
 * // Or with config
 * const SecureApp = withSecurityProvider(App, {
 *   config: { reportToServer: true },
 * });
 * ```
 */
export function withSecurityProvider<P extends object>(
  Component: React.ComponentType<P>,
  providerProps?: Omit<SecurityProviderProps, 'children'>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <SecurityProvider {...providerProps}>
      <Component {...props} />
    </SecurityProvider>
  );

  WrappedComponent.displayName = `withSecurityProvider(${
    Component.displayName ?? Component.name ?? 'Component'
  })`;

  return WrappedComponent;
}

// ============================================================================
// Render Props Component
// ============================================================================

/**
 * Render props component for security context
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SecurityConsumer>
 *       {(security) => (
 *         <div>
 *           <p>CSRF Token: {security.csrfToken}</p>
 *           <p>CSP Nonce: {security.cspNonce}</p>
 *         </div>
 *       )}
 *     </SecurityConsumer>
 *   );
 * }
 * ```
 */
export function SecurityConsumer({
  children,
}: {
  children: (security: SecurityContextValue) => ReactNode;
}): React.ReactElement | null {
  return (
    <SecurityContext.Consumer>
      {(context) => {
        if (!context) {
          throw new Error(
            'SecurityConsumer must be used within a SecurityProvider'
          );
        }
        return <>{children(context)}</>;
      }}
    </SecurityContext.Consumer>
  );
}

// ============================================================================
// Exports
// ============================================================================
