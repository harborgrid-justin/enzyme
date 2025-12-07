/**
 * @file Built-in Extensions
 * @description Ready-to-use extensions for the Enzyme framework
 *
 * These extensions provide enterprise-grade functionality out of the box:
 * - Performance monitoring and optimization
 * - Analytics and telemetry
 * - Error tracking and reporting
 * - Logging and debugging
 * - State persistence
 * - And more...
 */

// Export performance extension
export { performanceExtension } from './performance';
export type {
  PerformanceExtensionConfig,
  RenderTiming,
  OperationTiming,
  TimelineMarker,
  AggregatedMetrics,
  NetworkQuality,
  BundleInfo,
  PerformanceReport,
} from './performance';

// Export logging extension
export { loggingExtension } from './logging';
export {
  initializeLogger,
  getLogger,
  createLogger,
  useLogger,
  // Formatters
  jsonFormatter,
  humanFormatter,
  consoleFormatter,
  compactFormatter,
  // Transports
  consoleTransport,
  localStorageTransport,
  createRemoteTransport,
  // Enums
  LogLevel,
  LOG_LEVEL_MAP,
} from './logging';
export type {
  Logger,
  LoggerConfig,
  LogEntry,
  LogLevelName,
  LogContext,
  LogTransport,
  LogFilter,
  LogFormatter,
  Breadcrumb,
  OperationCategory,
  OperationInfo,
  PerformanceMetrics as LoggingPerformanceMetrics,
} from './logging';

// Future extensions can be exported here
// export { analyticsExtension } from './analytics';
// export { errorTrackingExtension } from './error-tracking';
// export { statePersistenceExtension } from './state-persistence';

// Export the results extension
export {
  resultsExtension,
  ResultEnhancer,
  transform,
  mapFields,
  pickFields,
  omitFields,
  normalize,
  denormalize,
  mask,
  maskDeep,
  alias,
  diff,
  applyDiff,
  aggregate,
  aggregators,
  createReactQueryMiddleware,
} from './results.js';
export type {
  ComputedFieldDef,
  ResultTransformer,
  NormalizationSchema,
  NormalizedData,
  FieldMaskConfig,
  FieldAliases,
  DiffOperation,
  ResultDiff,
  AggregationFn,
  ReactQueryIntegrationOptions,
  ResultsExtension,
  EnzymeClientWithResults,
} from './results.js';

// Export the validation extension
export { validationExtension } from './validation';
export type {
  ValidationResult,
  FormattedValidationError,
  CustomValidator,
  ValidationContext,
  FieldState,
  FormValidationOptions,
  StateValidationConfig,
} from './validation';
export {
  validate,
  validateWithSchema,
  validateApiResponse,
  validateStateChange,
  formatZodErrors,
  formatErrorsForForm,
  getFieldError,
  groupErrorsByField,
  useFormValidation,
  useFieldValidation,
  createAsyncValidator,
  createUniquenessValidator,
  schemaRegistry,
  customValidatorRegistry,
  validationCache,
  commonSchemas,
} from './validation';

// Export the git extension
export { gitExtension } from './git.js';
export type {
  GitStatus,
  BranchInfo,
  GitCommit,
  ChangedFile,
  FileDiff,
  DiffHunk,
  DiffLine,
  CommitOptions,
  GitHookType,
  GitHookHandler,
  GitHookContext,
  BranchProtectionRule,
} from './git.js';

// ============================================================================
// Formatting Extension
// ============================================================================

// Export formatting extension
export { formattingExtension, fmt } from './formatting.js';
export {
  // String case converters
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  toScreamingSnakeCase,
  toCase,
  // Number formatting
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatDecimal,
  formatBytes,
  // Date formatting
  formatDate,
  formatRelativeTime,
  // Pluralization
  pluralize,
  singularize,
  // Truncation
  truncate,
  truncateWords,
  // Sanitization
  escapeHtml,
  unescapeHtml,
  stripHtml,
  encodeUrl,
  decodeUrl,
  escapeSql,
  escapeRegex,
  // Code formatting
  formatJson,
  compactJson,
  highlightCode,
  // i18n
  setDefaultLocale,
  getDefaultLocale,
  setDefaultTimezone,
  getDefaultTimezone,
  formatLocalized,
  // Formatter registry
  formatterRegistry,
  format,
} from './formatting.js';
export type {
  FormatOptions,
  NumberFormatOptions,
  CurrencyFormatOptions,
  DateFormatOptions,
  TruncateOptions,
  PluralizeOptions,
  SanitizeOptions,
  FormatterFunction,
  FormatterRegistry,
} from './formatting.js';

// ============================================================================
// Dry Run Extension
// ============================================================================

// Export dry run extension
export {
  dryRunExtension,
  DryRunProvider,
  DryRunBanner,
  useDryRun,
  globalDryRunManager,
  DryRunStateManager,
} from './dry-run';
export type {
  DryRunConfig,
  OperationChange,
  ImpactAnalysis,
  ConflictDetection,
  DiffResult,
  BatchPreview,
  DryRunStats,
  OperationType,
  ImpactSeverity,
  ConflictType,
  ChangeStatus,
} from './dry-run';

// ============================================================================
// Error Handling Extension
// ============================================================================

// Export errors extension
export { errorsExtension, default as errors } from './errors.js';
export {
  // Error classes
  EnzymeError,
  AuthError,
  ApiError,
  StateError,
  ConfigError,
  ValidationError,
  RenderError,
  PerformanceError,
  AggregateError,
  // Error utilities
  isEnzymeError,
  isRetryableError,
  formatError,
  serializeError,
  deserializeError,
  retryWithBackoff,
  executeWithRecovery,
  findSimilarErrorCodes,
  registerTranslations,
  getTranslatedMessage,
  createLocalizedError,
  // Error registry
  ERROR_CODE_REGISTRY,
} from './errors.js';
export type {
  ErrorCodeDefinition,
  ErrorContext,
  ErrorDomain,
  ErrorSeverity,
  RetryConfig,
  RecoveryStrategy,
  SerializedError,
  TranslationFunction,
  LocaleConfig,
} from './errors.js';
