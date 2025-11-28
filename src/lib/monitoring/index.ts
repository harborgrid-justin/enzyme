/**
 * @file Monitoring Module Index
 * @description Central export point for monitoring functionality
 *
 * This module provides comprehensive error handling and monitoring:
 * - Error types and normalization
 * - Error reporting and context management
 * - Hierarchical error boundaries
 * - Context-aware error messages
 * - Crash analytics and session recording
 */

// =============================================================================
// ERROR TYPES
// =============================================================================
export {
  type AppError,
  type ErrorContext,
  type ErrorReport,
  type ErrorSeverity,
  type ErrorCategory,
  type NetworkErrorDetails,
  type ValidationErrorDetails,
  categorizeError,
  getSeverity,
  normalizeError,
  isRetryableError,
  getUserFriendlyMessage,
} from './errorTypes';

// =============================================================================
// ERROR REPORTER
// =============================================================================
export {
  ErrorReporter,
  initErrorReporter,
  setUserContext,
  setErrorContext,
  clearErrorContext,
  reportError,
  reportWarning,
  reportInfo,
  addBreadcrumb,
  type ErrorReporterConfig,
} from './ErrorReporter';

// =============================================================================
// ERROR BOUNDARIES
// =============================================================================
export {
  GlobalErrorBoundary,
  type GlobalErrorBoundaryProps,
} from './GlobalErrorBoundary';

export {
  QueryErrorBoundary,
  withQueryErrorBoundary,
  type QueryErrorBoundaryProps,
  type QueryErrorFallbackProps,
} from './QueryErrorBoundary';

export {
  withErrorBoundary,
  ErrorBoundary,
  type WithErrorBoundaryOptions,
} from './withErrorBoundary';

// =============================================================================
// HIERARCHICAL ERROR BOUNDARIES (NEW)
// =============================================================================
export {
  // Main component
  HierarchicalErrorBoundary,
  // Convenience components
  CriticalErrorBoundary,
  FeatureErrorBoundary,
  ComponentErrorBoundary,
  WidgetErrorBoundary,
  // HOC
  withHierarchicalErrorBoundary,
  // Hooks
  useErrorBoundary,
  useErrorBoundaryOptional,
  useErrorTrigger,
  // Types
  type ErrorBoundaryLevel,
  type RecoveryAction,
  type ErrorBoundaryContextValue,
  type HierarchicalErrorBoundaryProps,
  type ErrorFallbackProps,
} from './HierarchicalErrorBoundary';

// =============================================================================
// CONTEXT-AWARE ERROR MESSAGES (NEW)
// =============================================================================
export {
  // Main functions
  getStructuredErrorMessage,
  getToastMessage,
  getToastNotification,
  getRecoveryHint,
  getRecoveryActions,
  // Utility functions
  httpStatusToMessage,
  createContextualMessage,
  formatErrorForLogging,
  shouldShowError,
  // Types
  type ErrorMessageContext,
  type StructuredErrorMessage,
  type ToastMessage,
} from './errorMessages';

// =============================================================================
// CRASH ANALYTICS (NEW)
// =============================================================================
export {
  // Global instance
  crashAnalytics,
  // Types
  type BreadcrumbType,
  type BreadcrumbLevel,
  type Breadcrumb,
  type UserAction,
  type PerformanceMetrics,
  type DeviceInfo,
  type SessionData,
  type CrashAnalyticsConfig,
} from './CrashAnalytics';
