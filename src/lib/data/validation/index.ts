/**
 * @file Validation Module Index
 * @description Exports for the data validation library including schema validation,
 * runtime type checking, and form validation utilities.
 */

// Schema Validator
export {
  // Types
  type Schema,
  type ValidationIssue,
  type ValidationResult,
  type AsyncValidationResult,
  type ParseOptions,
  type SchemaOutput,
  type Infer,
  type InferObject,

  // Base Schema
  BaseSchema,

  // Schema Classes
  StringSchema,
  NumberSchema,
  BooleanSchema,
  DateSchema,
  ArraySchema,
  ObjectSchema,
  EnumSchema,
  LiteralSchema,
  UnionSchema,
  RecordSchema,
  UnknownSchema,

  // Error
  SchemaValidationError,
  ValidationError,

  // Factory
  v,
} from './schema-validator';

// Runtime Checker
export {
  // Types
  type Brand,
  type Unbrand,
  type TypeGuard,
  type TypeAssertion,
  type CheckResult,

  // Branded types
  brand,

  // Primitive guards
  isString,
  isNumber,
  isBoolean,
  isBigInt,
  isSymbol,
  isUndefined,
  isNull,
  isNullish,
  isDefined,
  isFunction,

  // Object guards
  isObject,
  isPlainObject,
  isArray,
  isArrayOf,
  isDate,
  isRegExp,
  isMap,
  isSet,
  isPromise,
  isError,

  // Number refinements
  isInteger,
  isPositive,
  isNegative,
  isNonNegative,
  isFinite,
  isInRange,

  // String refinements
  isNonEmptyString,
  isStringMatching,
  isEmail,
  isURL,
  isUUID,
  isISODateString,
  isJSONString,

  // Object shape
  hasKey,
  hasKeys,
  hasKeyOfType,
  isShapeOf,

  // Union and literal
  isOneOf,
  isLiteral,
  isUnion,
  isIntersection,

  // Assertions
  AssertionError,
  createAssertion,
  assertString,
  assertNumber,
  assertBoolean,
  assertObject,
  assertArray,
  assertDefined,
  assertType,
  assert,

  // Narrowing
  narrow,
  narrowOrDefault,
  narrowAndTransform,
  safeGet,
  safeGetPath,

  // Check utilities
  check,
  checkWithError,
  checkAll,

  // Guard factories
  createGuard,
  refine,
  optional,
  nullable,
  record,
  tuple,

  // Namespaces
  is,
  assertIs,
} from './runtime-checker';

// Form Validator
export {
  // Types
  type FieldRule,
  type FieldConfig,
  type FormConfig,
  type FieldError,
  type FieldState,
  type FormState,
  type ValidationMode,
  type FormValidatorOptions,
  type FormValidator,

  // Rules
  required,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  email,
  url,
  matches,
  custom,
  asyncRule,
  schema,
  when,
  rules,

  // Factory
  createFormValidator,

  // Hooks
  useFormValidation,
  useField,
} from './form-validator';
