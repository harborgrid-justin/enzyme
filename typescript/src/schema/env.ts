/**
 * Environment variable schema validation utilities
 * @module @missionfabric-js/enzyme-typescript/schema/env
 *
 * @example
 * ```typescript
 * import { createEnvSchema, validateEnv } from '@missionfabric-js/enzyme-typescript/schema/env';
 *
 * const envSchema = createEnvSchema({
 *   NODE_ENV: z.enum(['development', 'production', 'test']),
 *   API_URL: z.string().url(),
 *   PORT: z.coerce.number().default(3000),
 * });
 *
 * const env = validateEnv(envSchema);
 * ```
 */

import { z } from 'zod';

/**
 * Environment variable source
 */
export type EnvSource = Record<string, string | undefined>;

/**
 * Options for environment validation
 */
export interface EnvOptions {
  /** Environment source (defaults to process.env) */
  source?: EnvSource;
  /** Throw error on validation failure */
  strict?: boolean;
  /** Allow extra environment variables */
  allowExtra?: boolean;
  /** Prefix for environment variables */
  prefix?: string;
}

/**
 * Create an environment variable schema
 *
 * @param shape - Schema shape for environment variables
 * @returns Zod object schema
 *
 * @example
 * ```typescript
 * const envSchema = createEnvSchema({
 *   NODE_ENV: z.enum(['development', 'production', 'test']),
 *   DATABASE_URL: z.string().url(),
 *   PORT: z.coerce.number().default(3000),
 *   API_KEY: z.string().min(32),
 * });
 * ```
 */
export function createEnvSchema<T extends z.ZodRawShape>(
  shape: T
): z.ZodObject<T> {
  return z.object(shape);
}

/**
 * Validate environment variables against a schema
 *
 * @param schema - Environment schema
 * @param options - Validation options
 * @returns Parsed and validated environment
 *
 * @example
 * ```typescript
 * const envSchema = createEnvSchema({
 *   NODE_ENV: z.enum(['development', 'production']),
 *   API_URL: z.string().url(),
 *   PORT: z.coerce.number().default(3000),
 * });
 *
 * const env = validateEnv(envSchema);
 * console.log(env.API_URL); // Validated and typed
 * ```
 */
export function validateEnv<T extends z.ZodObject<any>>(
  schema: T,
  options?: EnvOptions
): z.infer<T> {
  const source = options?.source || (typeof process !== 'undefined' ? process.env : {});
  const strict = options?.strict ?? true;
  const allowExtra = options?.allowExtra ?? true;
  const prefix = options?.prefix;

  // Filter environment variables by prefix if provided
  const filteredEnv = prefix
    ? Object.entries(source).reduce((acc, [key, value]) => {
        if (key.startsWith(prefix)) {
          const unprefixedKey = key.slice(prefix.length);
          acc[unprefixedKey] = value;
        }
        return acc;
      }, {} as EnvSource)
    : source;

  const schemaWithOptions = allowExtra ? schema.passthrough() : schema.strict();
  const result = schemaWithOptions.safeParse(filteredEnv);

  if (!result.success) {
    const errorMessage = formatEnvError(result.error, prefix);

    if (strict) {
      throw new Error(`Environment validation failed:\n${errorMessage}`);
    } else {
      console.error(`Environment validation failed:\n${errorMessage}`);
      return filteredEnv as z.infer<T>;
    }
  }

  return result.data;
}

/**
 * Create a type-safe environment variable getter
 *
 * @param schema - Environment schema
 * @param options - Validation options
 * @returns Environment getter function
 *
 * @example
 * ```typescript
 * const envSchema = createEnvSchema({
 *   DATABASE_URL: z.string().url(),
 *   REDIS_URL: z.string().url().optional(),
 * });
 *
 * const getEnv = createEnvGetter(envSchema);
 * const env = getEnv();
 *
 * // Type-safe access
 * console.log(env.DATABASE_URL); // string
 * console.log(env.REDIS_URL); // string | undefined
 * ```
 */
export function createEnvGetter<T extends z.ZodObject<any>>(
  schema: T,
  options?: EnvOptions
): () => z.infer<T> {
  let cached: z.infer<T> | null = null;

  return () => {
    if (cached === null) {
      cached = validateEnv(schema, options);
    }
    return cached;
  };
}

/**
 * Format environment validation error
 *
 * @param error - Zod validation error
 * @param prefix - Environment variable prefix
 * @returns Formatted error message
 */
function formatEnvError(error: z.ZodError, prefix?: string): string {
  return error.issues
    .map((issue) => {
      const key = prefix ? `${prefix}${issue.path[0]}` : issue.path[0];
      return `  - ${key}: ${issue.message}`;
    })
    .join('\n');
}

/**
 * Parse boolean environment variable
 *
 * @param defaultValue - Default value if not set
 * @returns Zod schema for boolean env var
 *
 * @example
 * ```typescript
 * const envSchema = createEnvSchema({
 *   ENABLE_FEATURE: envBoolean(false),
 *   DEBUG: envBoolean(),
 * });
 *
 * // Accepts: 'true', 'false', '1', '0', 'yes', 'no'
 * ```
 */
export function envBoolean(defaultValue?: boolean): z.ZodEffects<z.ZodString, boolean, string> | z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>> {
  const schema = z.string().transform((val) => {
    const normalized = val.toLowerCase().trim();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    throw new Error('Must be a boolean value (true/false, 1/0, yes/no)');
  });

  return defaultValue !== undefined ? schema.default(String(defaultValue)) : schema;
}

/**
 * Parse number environment variable
 *
 * @param options - Number parsing options
 * @returns Zod schema for number env var
 *
 * @example
 * ```typescript
 * const envSchema = createEnvSchema({
 *   PORT: envNumber({ default: 3000, min: 1024, max: 65535 }),
 *   TIMEOUT: envNumber({ default: 5000 }),
 * });
 * ```
 */
export function envNumber(options?: {
  default?: number;
  min?: number;
  max?: number;
  int?: boolean;
}): z.ZodNumber | z.ZodDefault<z.ZodNumber> {
  let schema = z.coerce.number();

  if (options?.min !== undefined) {
    schema = schema.min(options.min);
  }

  if (options?.max !== undefined) {
    schema = schema.max(options.max);
  }

  if (options?.int) {
    schema = schema.int();
  }

  return options?.default !== undefined ? schema.default(options.default) : schema;
}

/**
 * Parse enum environment variable
 *
 * @param values - Allowed enum values
 * @param defaultValue - Default value if not set
 * @returns Zod schema for enum env var
 *
 * @example
 * ```typescript
 * const envSchema = createEnvSchema({
 *   NODE_ENV: envEnum(['development', 'production', 'test'], 'development'),
 *   LOG_LEVEL: envEnum(['debug', 'info', 'warn', 'error']),
 * });
 * ```
 */
export function envEnum<T extends [string, ...string[]]>(
  values: T,
  defaultValue?: T[number]
): z.ZodEnum<T> | z.ZodDefault<z.ZodEnum<T>> {
  const schema = z.enum(values);
  return defaultValue !== undefined ? schema.default(defaultValue) : schema;
}

/**
 * Parse URL environment variable
 *
 * @param options - URL parsing options
 * @returns Zod schema for URL env var
 *
 * @example
 * ```typescript
 * const envSchema = createEnvSchema({
 *   API_URL: envUrl(),
 *   DATABASE_URL: envUrl({ required: true }),
 *   OPTIONAL_URL: envUrl({ required: false }),
 * });
 * ```
 */
export function envUrl(options?: {
  required?: boolean;
  default?: string;
}): z.ZodString | z.ZodOptional<z.ZodString> | z.ZodDefault<z.ZodString> {
  const schema = z.string().url();

  if (options?.default) {
    return schema.default(options.default);
  }

  if (options?.required === false) {
    return schema.optional();
  }

  return schema;
}

/**
 * Parse JSON environment variable
 *
 * @param schema - Optional schema to validate parsed JSON
 * @returns Zod schema for JSON env var
 *
 * @example
 * ```typescript
 * const envSchema = createEnvSchema({
 *   CONFIG: envJson(z.object({
 *     timeout: z.number(),
 *     retries: z.number(),
 *   })),
 *   FEATURES: envJson(z.array(z.string())),
 * });
 * ```
 */
export function envJson<T extends z.ZodTypeAny = z.ZodUnknown>(
  schema?: T
): z.ZodEffects<z.ZodString, z.infer<T>, string> {
  const validateSchema = schema || z.unknown();

  return z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      const result = validateSchema.safeParse(parsed);

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue(issue);
        });
        return z.NEVER;
      }

      return result.data;
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON in environment variable',
      });
      return z.NEVER;
    }
  });
}

/**
 * Parse comma-separated list environment variable
 *
 * @param options - List parsing options
 * @returns Zod schema for list env var
 *
 * @example
 * ```typescript
 * const envSchema = createEnvSchema({
 *   ALLOWED_ORIGINS: envList(),
 *   ADMIN_EMAILS: envList({ separator: ';', trim: true }),
 *   PORT_NUMBERS: envList({ itemSchema: z.coerce.number() }),
 * });
 *
 * // ALLOWED_ORIGINS="http://localhost:3000,https://example.com"
 * // => ['http://localhost:3000', 'https://example.com']
 * ```
 */
export function envList<T extends z.ZodTypeAny = z.ZodString>(options?: {
  separator?: string;
  itemSchema?: T;
  trim?: boolean;
  default?: z.infer<T>[];
}): z.ZodEffects<z.ZodString, z.infer<T>[], string> | z.ZodDefault<z.ZodEffects<z.ZodString, z.infer<T>[], string>> {
  const separator = options?.separator || ',';
  const itemSchema = (options?.itemSchema || z.string()) as T;
  const shouldTrim = options?.trim ?? true;

  const schema = z.string().transform((val, ctx) => {
    if (!val || val.trim() === '') {
      return [];
    }

    const parts = val.split(separator);
    const items = shouldTrim ? parts.map((p) => p.trim()).filter(Boolean) : parts;
    const results: z.infer<T>[] = [];

    for (let i = 0; i < items.length; i++) {
      const result = itemSchema.safeParse(items[i]);

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: [i, ...issue.path],
          });
        });
        return z.NEVER;
      }

      results.push(result.data);
    }

    return results;
  });

  return options?.default !== undefined ? schema.default(String(options.default)) : schema;
}

/**
 * Create environment variable schema with client/server separation
 *
 * @param config - Client and server environment schemas
 * @returns Environment schemas
 *
 * @example
 * ```typescript
 * const { client, server } = createEnv({
 *   client: {
 *     NEXT_PUBLIC_API_URL: z.string().url(),
 *     NEXT_PUBLIC_GA_ID: z.string(),
 *   },
 *   server: {
 *     DATABASE_URL: z.string().url(),
 *     API_SECRET: z.string().min(32),
 *   },
 * });
 *
 * // Client env is safe to expose to browser
 * // Server env should only be used server-side
 * ```
 */
export function createEnv<
  TClient extends z.ZodRawShape,
  TServer extends z.ZodRawShape
>(config: {
  client: TClient;
  server: TServer;
  runtimeEnv?: Record<string, string | undefined>;
}): {
  client: z.infer<z.ZodObject<TClient>>;
  server: z.infer<z.ZodObject<TServer>>;
} {
  const clientSchema = z.object(config.client);
  const serverSchema = z.object(config.server);

  const source = config.runtimeEnv || (typeof process !== 'undefined' ? process.env : {});

  return {
    client: clientSchema.parse(source),
    server: serverSchema.parse(source),
  };
}
