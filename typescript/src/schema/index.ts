/**
 * Schema validation utilities powered by Zod
 * @module @missionfabric-js/enzyme-typescript/schema
 */

// Re-export Zod for convenience
export { z } from 'zod';

// Primitive schemas
export {
  email,
  url,
  uuid,
  phone,
  dateString,
  slug,
  hexColor,
  ipAddress,
  creditCard,
  postalCode,
  username,
  password,
  jsonString,
  semver,
} from './primitives.js';

// Error handling
export {
  formatZodError,
  zodErrorToFieldErrors,
  zodErrorToNestedErrors,
  createErrorMap,
  createLocalizedErrorMap,
  getFirstError,
  hasFieldError,
  getFieldError,
  mergeZodErrors,
} from './errors.js';
export type {
  FormattedError,
  ErrorMapConfig,
  LocalizationMessages,
} from './errors.js';

// Transformations
export {
  coerceNumber,
  coerceBoolean,
  coerceDate,
  withDefault,
  withDefaults,
  trim,
  lowercase,
  uppercase,
  parseJson,
  stringifyJson,
  split,
  join,
  preprocess,
  nullToUndefined,
  emptyToUndefined,
  clamp,
  round,
} from './transform.js';

// Composition
export {
  merge,
  extend,
  pick,
  omit,
  partial,
  partialFields,
  required,
  requiredFields,
  discriminatedUnion,
  intersection,
  union,
  deepPartial,
  passthrough,
  strict,
  catchall,
  brand,
  record,
  nullable,
  optional,
} from './compose.js';

// Type inference
export type {
  Infer,
  Input,
  Output,
  ExtractShape,
  ExtractArrayElement,
  ExtractEnumValues,
  ExtractRecordKey,
  ExtractRecordValue,
  MakeRequired,
  MakeOptional,
  MakeNullable,
  DeepPartial,
  DeepRequired,
  KeysOf,
  ValuesOf,
  ArrayElement,
  Awaited,
  InferShape,
  SafeParseResult,
  SafeParseSuccess,
  SafeParseError,
  ExtractBrand,
  IsOptional,
  IsNullable,
  RequiredKeys,
  OptionalKeys,
  MergeTypes,
  DeepReadonly,
  Mutable,
} from './infer.js';

// Environment variables
export {
  createEnvSchema,
  validateEnv,
  createEnvGetter,
  envBoolean,
  envNumber,
  envEnum,
  envUrl,
  envJson,
  envList,
  createEnv,
} from './env.js';
export type {
  EnvSource,
  EnvOptions,
} from './env.js';

// Configuration
export {
  defineConfig,
  createConfig,
  mergeConfigs,
  createLayeredConfig,
  createConfigValidator,
  watchConfig,
} from './config.js';
export type {
  ConfigOptions,
  ConfigLoader,
  ConfigWithMeta,
} from './config.js';

// API schemas
export {
  apiResponse,
  paginatedResponse,
  apiError,
  paginationQuery,
  sortQuery,
  filterQuery,
  queryParams,
  createApiSchema,
  createTypedFetch,
  batchRequest,
  batchResponse,
} from './api.js';
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
} from './api.js';

// Form validation
export {
  createFormSchema,
  validateForm,
  validateField,
  createAsyncValidator,
  createDependentValidator,
  createFormState,
  createMultiStepForm,
  conditionalField,
  createFormWithValidators,
} from './form.js';
export type {
  FieldError,
  FormValidationResult,
  FieldMeta,
} from './form.js';
