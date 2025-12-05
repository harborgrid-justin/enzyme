/**
 * Configuration schema builder with defaults and validation
 * @module @missionfabric-js/enzyme-typescript/schema/config
 *
 * @example
 * ```typescript
 * import { createConfig, defineConfig } from '@missionfabric-js/enzyme-typescript/schema/config';
 *
 * const config = defineConfig({
 *   schema: {
 *     api: {
 *       url: z.string().url(),
 *       timeout: z.number().default(5000),
 *     },
 *   },
 * });
 * ```
 */

import { z } from 'zod';

/**
 * Configuration options
 */
export interface ConfigOptions<T extends z.ZodRawShape> {
  /** Configuration schema */
  schema: T;
  /** Default values */
  defaults?: Partial<z.infer<z.ZodObject<T>>>;
  /** Validate on access */
  validateOnAccess?: boolean;
  /** Allow unknown keys */
  allowUnknown?: boolean;
}

/**
 * Configuration loader function
 */
export type ConfigLoader<T> = () => T | Promise<T>;

/**
 * Configuration with metadata
 */
export interface ConfigWithMeta<T> {
  /** Configuration data */
  data: T;
  /** Schema used for validation */
  schema: z.ZodObject<any>;
  /** Validation errors if any */
  errors?: z.ZodError;
  /** Whether configuration is valid */
  isValid: boolean;
}

/**
 * Define a configuration schema with defaults
 *
 * @param options - Configuration options
 * @returns Configuration validator
 *
 * @example
 * ```typescript
 * const appConfig = defineConfig({
 *   schema: {
 *     app: z.object({
 *       name: z.string(),
 *       version: z.string(),
 *       env: z.enum(['development', 'production']),
 *     }),
 *     api: z.object({
 *       url: z.string().url(),
 *       timeout: z.number(),
 *     }),
 *   },
 *   defaults: {
 *     app: {
 *       env: 'development',
 *     },
 *     api: {
 *       timeout: 5000,
 *     },
 *   },
 * });
 *
 * const config = appConfig.parse({
 *   app: { name: 'MyApp', version: '1.0.0' },
 *   api: { url: 'https://api.example.com' },
 * });
 * ```
 */
export function defineConfig<T extends z.ZodRawShape>(
  options: ConfigOptions<T>
): {
  schema: z.ZodObject<T>;
  parse: (data: unknown) => z.infer<z.ZodObject<T>>;
  safeParse: (data: unknown) => z.SafeParseReturnType<unknown, z.infer<z.ZodObject<T>>>;
  parseAsync: (data: unknown) => Promise<z.infer<z.ZodObject<T>>>;
  safeParseAsync: (data: unknown) => Promise<z.SafeParseReturnType<unknown, z.infer<z.ZodObject<T>>>>;
} {
  let schema = z.object(options.schema);

  // Apply defaults
  if (options.defaults) {
    const shapeWithDefaults = {} as T;
    for (const key in options.schema) {
      const field = options.schema[key];
      if (key in options.defaults) {
        shapeWithDefaults[key] = field.default(options.defaults[key as keyof typeof options.defaults]) as T[typeof key];
      } else {
        shapeWithDefaults[key] = field;
      }
    }
    schema = z.object(shapeWithDefaults);
  }

  // Handle unknown keys
  if (options.allowUnknown) {
    schema = schema.passthrough() as z.ZodObject<T>;
  }

  return {
    schema,
    parse: (data) => schema.parse(data),
    safeParse: (data) => schema.safeParse(data),
    parseAsync: (data) => schema.parseAsync(data),
    safeParseAsync: (data) => schema.safeParseAsync(data),
  };
}

/**
 * Create a configuration manager
 *
 * @param schema - Configuration schema
 * @param loader - Configuration loader function
 * @returns Configuration manager
 *
 * @example
 * ```typescript
 * const configSchema = z.object({
 *   database: z.object({
 *     host: z.string(),
 *     port: z.number(),
 *   }),
 *   cache: z.object({
 *     ttl: z.number().default(3600),
 *   }),
 * });
 *
 * const configManager = createConfig(configSchema, () => ({
 *   database: {
 *     host: process.env.DB_HOST,
 *     port: parseInt(process.env.DB_PORT),
 *   },
 * }));
 *
 * const config = await configManager.load();
 * console.log(config.database.host);
 * ```
 */
export function createConfig<T extends z.ZodObject<any>>(
  schema: T,
  loader: ConfigLoader<Partial<z.infer<T>>>
): {
  load: () => Promise<z.infer<T>>;
  loadSync: () => z.infer<T>;
  validate: (data: unknown) => ConfigWithMeta<z.infer<T>>;
  schema: T;
} {
  let cachedConfig: z.infer<T> | null = null;

  return {
    async load() {
      if (cachedConfig) {
        return cachedConfig;
      }

      const data = await Promise.resolve(loader());
      cachedConfig = schema.parse(data);
      return cachedConfig;
    },

    loadSync() {
      if (cachedConfig) {
        return cachedConfig;
      }

      const data = loader();
      if (data instanceof Promise) {
        throw new Error('Cannot use loadSync with async loader');
      }

      cachedConfig = schema.parse(data);
      return cachedConfig;
    },

    validate(data) {
      const result = schema.safeParse(data);

      if (result.success) {
        return {
          data: result.data,
          schema,
          isValid: true,
        };
      }

      return {
        data: data as z.infer<T>,
        schema,
        errors: result.error,
        isValid: false,
      };
    },

    schema,
  };
}

/**
 * Merge multiple configurations with validation
 *
 * @param schema - Configuration schema
 * @param configs - Array of configurations to merge
 * @returns Merged configuration
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   api: z.object({
 *     url: z.string(),
 *     timeout: z.number(),
 *   }),
 * });
 *
 * const defaultConfig = { api: { timeout: 5000 } };
 * const userConfig = { api: { url: 'https://api.example.com' } };
 *
 * const merged = mergeConfigs(schema, [defaultConfig, userConfig]);
 * // { api: { url: 'https://api.example.com', timeout: 5000 } }
 * ```
 */
export function mergeConfigs<T extends z.ZodObject<any>>(
  schema: T,
  configs: Array<Partial<z.infer<T>>>
): z.infer<T> {
  const merged = configs.reduce((acc, config) => {
    return deepMerge(acc, config);
  }, {} as Partial<z.infer<T>>);

  return schema.parse(merged);
}

/**
 * Deep merge utility for objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const targetValue = result[key];
    const sourceValue = source[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue as any);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Create a layered configuration system
 *
 * @param schema - Configuration schema
 * @param layers - Configuration layers (merged in order)
 * @returns Layered configuration
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   api: z.object({
 *     url: z.string(),
 *     timeout: z.number(),
 *   }),
 * });
 *
 * const config = createLayeredConfig(schema, [
 *   { name: 'defaults', data: { api: { timeout: 5000 } } },
 *   { name: 'env', data: { api: { url: process.env.API_URL } } },
 *   { name: 'user', data: loadUserConfig() },
 * ]);
 * ```
 */
export function createLayeredConfig<T extends z.ZodObject<any>>(
  schema: T,
  layers: Array<{ name: string; data: Partial<z.infer<T>> | ConfigLoader<Partial<z.infer<T>>> }>
): {
  load: () => Promise<z.infer<T>>;
  getLayers: () => Promise<Array<{ name: string; data: Partial<z.infer<T>> }>>;
} {
  return {
    async load() {
      const loadedLayers = await Promise.all(
        layers.map(async (layer) => {
          const data = typeof layer.data === 'function' ? await Promise.resolve(layer.data()) : layer.data;
          return data;
        })
      );

      return mergeConfigs(schema, loadedLayers);
    },

    async getLayers() {
      return await Promise.all(
        layers.map(async (layer) => ({
          name: layer.name,
          data: typeof layer.data === 'function' ? await Promise.resolve(layer.data()) : layer.data,
        }))
      );
    },
  };
}

/**
 * Create a configuration validator with custom error messages
 *
 * @param schema - Configuration schema
 * @param errorMessages - Custom error messages
 * @returns Configuration validator
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   api: z.object({
 *     url: z.string().url(),
 *     key: z.string().min(32),
 *   }),
 * });
 *
 * const validator = createConfigValidator(schema, {
 *   'api.url': 'Please provide a valid API URL',
 *   'api.key': 'API key must be at least 32 characters',
 * });
 *
 * const result = validator.validate(config);
 * ```
 */
export function createConfigValidator<T extends z.ZodObject<any>>(
  schema: T,
  errorMessages?: Record<string, string>
): {
  validate: (data: unknown) => ConfigWithMeta<z.infer<T>>;
  parse: (data: unknown) => z.infer<T>;
} {
  return {
    validate(data) {
      const result = schema.safeParse(data);

      if (result.success) {
        return {
          data: result.data,
          schema,
          isValid: true,
        };
      }

      // Apply custom error messages
      if (errorMessages) {
        result.error.issues.forEach((issue) => {
          const path = issue.path.join('.');
          if (errorMessages[path]) {
            issue.message = errorMessages[path];
          }
        });
      }

      return {
        data: data as z.infer<T>,
        schema,
        errors: result.error,
        isValid: false,
      };
    },

    parse(data) {
      const result = this.validate(data);
      if (!result.isValid && result.errors) {
        throw result.errors;
      }
      return result.data;
    },
  };
}

/**
 * Watch configuration for changes
 *
 * @param schema - Configuration schema
 * @param loader - Configuration loader
 * @param onChange - Change callback
 * @returns Configuration watcher
 *
 * @example
 * ```typescript
 * const watcher = watchConfig(
 *   configSchema,
 *   () => loadConfig(),
 *   (newConfig, oldConfig) => {
 *     console.log('Config changed:', { newConfig, oldConfig });
 *   }
 * );
 *
 * // Start watching
 * await watcher.start();
 *
 * // Stop watching
 * watcher.stop();
 * ```
 */
export function watchConfig<T extends z.ZodObject<any>>(
  schema: T,
  loader: ConfigLoader<Partial<z.infer<T>>>,
  onChange: (newConfig: z.infer<T>, oldConfig: z.infer<T> | null) => void
): {
  start: (interval?: number) => Promise<void>;
  stop: () => void;
  getCurrentConfig: () => z.infer<T> | null;
} {
  let intervalId: NodeJS.Timeout | null = null;
  let currentConfig: z.infer<T> | null = null;

  return {
    async start(interval = 5000) {
      // Load initial config
      const initialData = await Promise.resolve(loader());
      currentConfig = schema.parse(initialData);

      // Start watching
      intervalId = setInterval(async () => {
        try {
          const newData = await Promise.resolve(loader());
          const newConfig = schema.parse(newData);

          // Check if config changed
          if (JSON.stringify(newConfig) !== JSON.stringify(currentConfig)) {
            const oldConfig = currentConfig;
            currentConfig = newConfig;
            onChange(newConfig, oldConfig);
          }
        } catch (error) {
          console.error('Config reload error:', error);
        }
      }, interval);
    },

    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    getCurrentConfig() {
      return currentConfig;
    },
  };
}
