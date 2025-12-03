/**
 * @file useConfigValidation Hook
 * @description Hook for accessing configuration validation status and errors.
 *
 * @module config/hooks/useConfigValidation
 */

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import type { ConfigNamespace, ConfigValidationError, ConfigValidationWarning } from '../types';
import { useConfigContext, type ConfigValidationStatus } from '../ConfigProvider';

// =============================================================================
// Types
// =============================================================================

/**
 * Validation summary for display
 */
export interface ValidationSummary {
  /** Overall validation status */
  isValid: boolean;
  /** Total error count */
  errorCount: number;
  /** Total warning count */
  warningCount: number;
  /** Errors grouped by namespace */
  errorsByNamespace: Record<string, ConfigValidationError[]>;
  /** Warnings grouped by namespace */
  warningsByNamespace: Record<string, ConfigValidationWarning[]>;
  /** Last validation timestamp */
  validatedAt: string;
}

/**
 * Return type for useConfigValidation hook
 */
export interface UseConfigValidationResult {
  /** Full validation status */
  status: ConfigValidationStatus;
  /** Validation summary */
  summary: ValidationSummary;
  /** Whether config is valid */
  isValid: boolean;
  /** All errors */
  errors: ConfigValidationError[];
  /** All warnings */
  warnings: ConfigValidationWarning[];
  /** Refresh validation */
  refresh: () => void;
  /** Check if namespace is valid */
  isNamespaceValid: (namespace: ConfigNamespace) => boolean;
  /** Get errors for namespace */
  getNamespaceErrors: (namespace: ConfigNamespace) => ConfigValidationError[];
  /** Get warnings for namespace */
  getNamespaceWarnings: (namespace: ConfigNamespace) => ConfigValidationWarning[];
}

// =============================================================================
// useConfigValidation Hook
// =============================================================================

/**
 * Hook for accessing configuration validation status
 *
 * Provides access to validation results including errors and warnings
 * across all configuration namespaces.
 *
 * @returns Validation status and utilities
 *
 * @example
 * ```tsx
 * function ConfigStatus() {
 *   const { isValid, summary, errors } = useConfigValidation();
 *
 *   if (isValid) {
 *     return <Badge color="green">Configuration Valid</Badge>;
 *   }
 *
 *   return (
 *     <div>
 *       <Badge color="red">{summary.errorCount} Errors</Badge>
 *       <ul>
 *         {errors.map((err, i) => (
 *           <li key={i}>{err.path}: {err.message}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useConfigValidation(): UseConfigValidationResult {
  const { getValidationStatus, isInitialized } = useConfigContext();
  const [status, setStatus] = useState<ConfigValidationStatus>(() => getValidationStatus());

  // Refresh validation
  const refresh = useCallback(() => {
    setStatus(getValidationStatus());
  }, [getValidationStatus]);

  // Update on initialization
  const initializedRef = useRef(false);
  useEffect(() => {
    if (isInitialized && !initializedRef.current) {
      // Use queueMicrotask to avoid setState during render
      queueMicrotask(() => {
        initializedRef.current = true;
        setStatus(getValidationStatus());
      });
    }
  }, [isInitialized, getValidationStatus]);

  // Compute summary
  const summary = useMemo<ValidationSummary>(() => {
    const errorsByNamespace: Record<string, ConfigValidationError[]> = {};
    const warningsByNamespace: Record<string, ConfigValidationWarning[]> = {};

    Object.entries(status.namespaces).forEach(([ns, nsStatus]) => {
      if (nsStatus.errors.length > 0) {
        errorsByNamespace[ns] = nsStatus.errors;
      }
      if (nsStatus.warnings.length > 0) {
        warningsByNamespace[ns] = nsStatus.warnings;
      }
    });

    return {
      isValid: status.valid,
      errorCount: status.errorCount,
      warningCount: status.warningCount,
      errorsByNamespace,
      warningsByNamespace,
      validatedAt: status.validatedAt,
    };
  }, [status]);

  // Compute all errors
  const errors = useMemo<ConfigValidationError[]>(() => {
    return Object.values(status.namespaces).flatMap((ns) => ns.errors);
  }, [status]);

  // Compute all warnings
  const warnings = useMemo<ConfigValidationWarning[]>(() => {
    return Object.values(status.namespaces).flatMap((ns) => ns.warnings);
  }, [status]);

  // Check namespace validity
  const isNamespaceValid = useCallback(
    (namespace: ConfigNamespace): boolean => {
      const nsStatus = status.namespaces[namespace as string];
      return nsStatus?.valid ?? true;
    },
    [status]
  );

  // Get namespace errors
  const getNamespaceErrors = useCallback(
    (namespace: ConfigNamespace): ConfigValidationError[] => {
      return status.namespaces[namespace as string]?.errors ?? [];
    },
    [status]
  );

  // Get namespace warnings
  const getNamespaceWarnings = useCallback(
    (namespace: ConfigNamespace): ConfigValidationWarning[] => {
      return status.namespaces[namespace as string]?.warnings ?? [];
    },
    [status]
  );

  return {
    status,
    summary,
    isValid: status.valid,
    errors,
    warnings,
    refresh,
    isNamespaceValid,
    getNamespaceErrors,
    getNamespaceWarnings,
  };
}

// =============================================================================
// useNamespaceValidation Hook
// =============================================================================

/**
 * Return type for useNamespaceValidation hook
 */
export interface UseNamespaceValidationResult {
  /** Whether namespace is valid */
  isValid: boolean;
  /** Namespace errors */
  errors: ConfigValidationError[];
  /** Namespace warnings */
  warnings: ConfigValidationWarning[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Refresh validation */
  refresh: () => void;
}

/**
 * Hook for validating a specific namespace
 *
 * @param namespace - Configuration namespace to validate
 * @returns Namespace validation result
 *
 * @example
 * ```tsx
 * function StreamingConfigForm() {
 *   const { isValid, errors } = useNamespaceValidation(
 *     CONFIG_NAMESPACES.STREAMING
 *   );
 *
 *   return (
 *     <form>
 *       {!isValid && (
 *         <div className="error-banner">
 *           {errors.map((err) => (
 *             <p key={err.path}>{err.message}</p>
 *           ))}
 *         </div>
 *       )}
 *       // Form fields here
 *     </form>
 *   );
 * }
 * ```
 */
export function useNamespaceValidation(namespace: ConfigNamespace): UseNamespaceValidationResult {
  const { isNamespaceValid, getNamespaceErrors, getNamespaceWarnings, refresh } =
    useConfigValidation();

  const errors = getNamespaceErrors(namespace);
  const warnings = getNamespaceWarnings(namespace);

  return {
    isValid: isNamespaceValid(namespace),
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
    refresh,
  };
}

// =============================================================================
// useValidationErrors Hook
// =============================================================================

/**
 * Hook for getting validation errors with filtering
 *
 * @param filter - Optional filter function
 * @returns Filtered validation errors
 *
 * @example
 * ```tsx
 * function CriticalErrors() {
 *   const errors = useValidationErrors(
 *     (err) => err.code === 'REQUIRED_FIELD' || err.code === 'INVALID_TYPE'
 *   );
 *
 *   return (
 *     <div>
 *       <h3>Critical Configuration Errors</h3>
 *       <ul>
 *         {errors.map((err, i) => (
 *           <li key={i} className="text-red-500">
 *             {err.path}: {err.message}
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useValidationErrors(
  filter?: (error: ConfigValidationError) => boolean
): ConfigValidationError[] {
  const { errors } = useConfigValidation();

  return useMemo(() => {
    if (!filter) return errors;
    return errors.filter(filter);
  }, [errors, filter]);
}

// =============================================================================
// useValidationWarnings Hook
// =============================================================================

/**
 * Hook for getting validation warnings with filtering
 *
 * @param filter - Optional filter function
 * @returns Filtered validation warnings
 *
 * @example
 * ```tsx
 * function DeprecationWarnings() {
 *   const warnings = useValidationWarnings(
 *     (warn) => warn.code === 'DEPRECATED_FIELD'
 *   );
 *
 *   if (warnings.length === 0) return null;
 *
 *   return (
 *     <div className="bg-yellow-100 p-4">
 *       <h3>Deprecation Warnings</h3>
 *       {warnings.map((warn, i) => (
 *         <p key={i}>
 *           {warn.path}: {warn.message}
 *           {warn.suggestion && <em> - {warn.suggestion}</em>}
 *         </p>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useValidationWarnings(
  filter?: (warning: ConfigValidationWarning) => boolean
): ConfigValidationWarning[] {
  const { warnings } = useConfigValidation();

  return useMemo(() => {
    if (!filter) return warnings;
    return warnings.filter(filter);
  }, [warnings, filter]);
}

// =============================================================================
// useConfigHealthCheck Hook
// =============================================================================

/**
 * Health check status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Return type for useConfigHealthCheck hook
 */
export interface UseConfigHealthCheckResult {
  /** Overall health status */
  status: HealthStatus;
  /** Detailed health information */
  details: {
    validation: HealthStatus;
    dynamic: HealthStatus;
    sync: HealthStatus;
  };
  /** Last check timestamp */
  lastChecked: string;
  /** Run health check */
  check: () => void;
}

/**
 * Hook for configuration health check
 *
 * Provides a high-level health status of the configuration system.
 *
 * @returns Health check status
 *
 * @example
 * ```tsx
 * function ConfigHealth() {
 *   const { status, details, check } = useConfigHealthCheck();
 *
 *   const statusColor = {
 *     healthy: 'green',
 *     degraded: 'yellow',
 *     unhealthy: 'red',
 *     unknown: 'gray',
 *   }[status];
 *
 *   return (
 *     <div>
 *       <StatusIndicator color={statusColor} />
 *       <span>Config: {status}</span>
 *       <button onClick={check}>Recheck</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useConfigHealthCheck(): UseConfigHealthCheckResult {
  const { isValid, refresh: refreshValidation } = useConfigValidation();
  const { isInitialized, dynamicState } = useConfigContext();
  const [lastChecked, setLastChecked] = useState<string>(new Date().toISOString());

  // Compute individual health statuses
  const validationStatus: HealthStatus = useMemo(() => {
    if (!isInitialized) return 'unknown';
    return isValid ? 'healthy' : 'unhealthy';
  }, [isInitialized, isValid]);

  const dynamicStatus: HealthStatus = useMemo(() => {
    if (!isInitialized) return 'unknown';
    return 'healthy';
  }, [isInitialized]);

  const syncStatus: HealthStatus = useMemo(() => {
    switch (dynamicState.connectionStatus) {
      case 'connected':
        return 'healthy';
      case 'connecting':
        return 'degraded';
      case 'disconnected':
        return 'degraded';
      case 'error':
        return 'unhealthy';
      default:
        return 'unknown';
    }
  }, [dynamicState.connectionStatus]);

  // Compute overall status
  const overallStatus: HealthStatus = useMemo(() => {
    const statuses = [validationStatus, dynamicStatus, syncStatus];

    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    if (statuses.includes('unknown')) return 'unknown';
    return 'healthy';
  }, [validationStatus, dynamicStatus, syncStatus]);

  // Run health check
  const check = useCallback(() => {
    refreshValidation();
    setLastChecked(new Date().toISOString());
  }, [refreshValidation]);

  return {
    status: overallStatus,
    details: {
      validation: validationStatus,
      dynamic: dynamicStatus,
      sync: syncStatus,
    },
    lastChecked,
    check,
  };
}

export default useConfigValidation;
