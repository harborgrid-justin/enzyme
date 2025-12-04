/**
 * @file Configuration Validation
 * @description Zod-based configuration validation with helpful error messages
 *
 * Patterns implemented:
 * - Prisma: Schema-based validation with descriptive errors
 * - axios: Configuration merging strategies
 * - webpack: Configuration validation with suggestions
 */

import { z } from 'zod';
import { createConfigError, generateSuggestions } from '../errors/index.js';

// ============================================================================
// Configuration Schemas
// ============================================================================

/**
 * Generator configuration schema
 */
const generatorConfigSchema = z.object({
  /** Default output directory for generators */
  outputDir: z.string().min(1, 'Output directory cannot be empty').optional(),
  /** Include tests by default */
  withTests: z.boolean().default(true),
  /** Include Storybook stories by default */
  withStory: z.boolean().default(false),
  /** Include styles by default */
  withStyles: z.boolean().default(true),
  /** Default template to use */
  template: z.string().optional(),
}).strict();

/**
 * Feature flags schema
 */
const featuresSchema = z.object({
  /** Enable authentication scaffolding */
  auth: z.boolean().default(false),
  /** Enable state management */
  state: z.boolean().default(true),
  /** Enable routing */
  routing: z.boolean().default(true),
  /** Enable real-time features */
  realtime: z.boolean().default(false),
  /** Enable monitoring */
  monitoring: z.boolean().default(false),
  /** Enable theming */
  theme: z.boolean().default(false),
  /** Enable feature flags */
  flags: z.boolean().default(false),
}).passthrough();

/**
 * Paths configuration schema
 */
const pathsSchema = z.object({
  /** Source directory */
  src: z.string().default('src'),
  /** Components directory */
  components: z.string().default('src/components'),
  /** Pages directory */
  pages: z.string().default('src/pages'),
  /** Hooks directory */
  hooks: z.string().default('src/hooks'),
  /** Services directory */
  services: z.string().default('src/services'),
  /** Stores/slices directory */
  stores: z.string().default('src/stores'),
  /** Tests directory */
  tests: z.string().default('src/__tests__'),
  /** Assets directory */
  assets: z.string().default('src/assets'),
}).passthrough();

/**
 * TypeScript configuration schema
 */
const typescriptConfigSchema = z.object({
  /** Enable strict mode */
  strict: z.boolean().default(true),
  /** Path aliases */
  aliases: z.record(z.string()).default({ '@': './src' }),
}).passthrough();

/**
 * Code style configuration schema
 */
const styleConfigSchema = z.object({
  /** Component naming convention */
  componentNaming: z.enum(['PascalCase', 'kebab-case']).default('PascalCase'),
  /** File naming convention */
  fileNaming: z.enum(['PascalCase', 'kebab-case', 'camelCase']).default('PascalCase'),
  /** Quote style */
  quotes: z.enum(['single', 'double']).default('single'),
  /** Semicolons */
  semicolons: z.boolean().default(true),
  /** Tab width */
  tabWidth: z.number().int().min(1).max(8).default(2),
  /** Use tabs instead of spaces */
  useTabs: z.boolean().default(false),
  /** Trailing commas */
  trailingComma: z.enum(['none', 'es5', 'all']).default('es5'),
}).passthrough();

/**
 * Plugin configuration schema
 */
const pluginSchema = z.union([
  z.string(), // Plugin name/path
  z.tuple([z.string(), z.record(z.unknown())]), // [name, options]
]);

/**
 * Extension configuration schema
 */
const extensionSchema = z.object({
  name: z.string().min(1, 'Extension name is required'),
  version: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

/**
 * Main Enzyme configuration schema
 */
export const enzymeConfigSchema = z.object({
  /** Schema version for migrations */
  $schema: z.string().optional(),

  /** Project name */
  projectName: z.string()
    .min(1, 'Project name cannot be empty')
    .max(100, 'Project name is too long (max 100 characters)')
    .regex(/^[a-zA-Z][a-zA-Z0-9-_]*$/, {
      message: 'Project name must start with a letter and contain only letters, numbers, hyphens, and underscores',
    })
    .optional(),

  /** Project description */
  description: z.string().max(500).optional(),

  /** Project version */
  version: z.string().regex(/^\d+\.\d+\.\d+(-\w+)?$/, {
    message: 'Version must follow semver format (e.g., 1.0.0, 1.0.0-beta)',
  }).optional(),

  /** TypeScript enabled */
  typescript: z.boolean().default(true),

  /** TypeScript configuration */
  typescriptConfig: typescriptConfigSchema.optional(),

  /** Feature flags */
  features: featuresSchema.default({}),

  /** Directory paths */
  paths: pathsSchema.default({}),

  /** Generator defaults */
  generators: generatorConfigSchema.optional(),

  /** Code style settings */
  style: styleConfigSchema.optional(),

  /** Plugins to load */
  plugins: z.array(pluginSchema).default([]),

  /** Extensions to load */
  extensions: z.array(z.union([z.string(), extensionSchema])).default([]),

  /** Environment-specific overrides */
  env: z.record(z.record(z.unknown())).optional(),

  /** Custom properties (allow extension) */
}).passthrough();

/**
 * Inferred Enzyme configuration type
 */
export type EnzymeConfig = z.infer<typeof enzymeConfigSchema>;

/**
 * Partial configuration for merging
 */
export type PartialEnzymeConfig = z.input<typeof enzymeConfigSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validation result with detailed errors
 */
export interface ValidationResult {
  success: boolean;
  data?: EnzymeConfig;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  received?: unknown;
  expected?: string;
}

/**
 * Validate configuration with helpful error messages
 */
export function validateConfig(config: unknown): ValidationResult {
  try {
    const result = enzymeConfigSchema.safeParse(config);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      path: err.path.join('.') || 'root',
      message: err.message,
      code: err.code,
      received: (err as any).received,
      expected: (err as any).expected,
    }));

    return {
      success: false,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      errors: [{
        path: 'root',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        code: 'unknown',
      }],
    };
  }
}

/**
 * Validate and throw on error
 */
export function validateConfigOrThrow(config: unknown): EnzymeConfig {
  const result = validateConfig(config);

  if (!result.success) {
    const errorMessages = result.errors!.map(e => `  • ${e.path}: ${e.message}`).join('\n');
    throw createConfigError(
      `Configuration validation failed:\n${errorMessages}`,
      {
        code: 'CFG_INVALID_CONFIG',
        context: { errors: result.errors },
        suggestions: generateSuggestions('CFG_INVALID_CONFIG'),
      }
    );
  }

  return result.data!;
}

/**
 * Validate a specific config field
 */
export function validateField<T extends keyof EnzymeConfig>(
  field: T,
  value: unknown
): { valid: boolean; error?: string } {
  const fieldSchemas: Record<string, z.ZodType> = {
    projectName: enzymeConfigSchema.shape.projectName,
    version: enzymeConfigSchema.shape.version,
    typescript: enzymeConfigSchema.shape.typescript,
    features: featuresSchema,
    paths: pathsSchema,
    generators: generatorConfigSchema,
    style: styleConfigSchema,
    plugins: enzymeConfigSchema.shape.plugins,
    extensions: enzymeConfigSchema.shape.extensions,
  };

  const schema = fieldSchemas[field];
  if (!schema) {
    return { valid: true }; // Unknown fields pass through
  }

  const result = schema.safeParse(value);
  return {
    valid: result.success,
    error: result.success ? undefined : result.error.errors[0]?.message,
  };
}

// ============================================================================
// Configuration Merging (axios pattern)
// ============================================================================

/**
 * Deep merge strategy
 */
export type MergeStrategy = 'replace' | 'merge' | 'concat';

export interface MergeOptions {
  arrayStrategy?: MergeStrategy;
  objectStrategy?: MergeStrategy;
}

/**
 * Deep merge configuration objects
 */
export function mergeConfig(
  defaults: PartialEnzymeConfig,
  overrides: PartialEnzymeConfig,
  options: MergeOptions = {}
): PartialEnzymeConfig {
  const { arrayStrategy = 'replace', objectStrategy = 'merge' } = options;

  const result = { ...defaults };

  for (const [key, value] of Object.entries(overrides)) {
    const defaultValue = (defaults as any)[key];

    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      if (arrayStrategy === 'concat' && Array.isArray(defaultValue)) {
        (result as any)[key] = [...defaultValue, ...value];
      } else if (arrayStrategy === 'merge' && Array.isArray(defaultValue)) {
        // Merge arrays by index
        (result as any)[key] = value.map((item, index) =>
          typeof item === 'object' && item !== null && defaultValue[index]
            ? mergeConfig(defaultValue[index] as any, item as any, options)
            : item
        );
      } else {
        (result as any)[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      if (objectStrategy === 'merge' && typeof defaultValue === 'object' && defaultValue !== null) {
        (result as any)[key] = mergeConfig(defaultValue as any, value as any, options);
      } else {
        (result as any)[key] = value;
      }
    } else {
      (result as any)[key] = value;
    }
  }

  return result;
}

/**
 * Merge with environment-specific config
 */
export function mergeWithEnv(
  config: PartialEnzymeConfig,
  environment: string
): PartialEnzymeConfig {
  const envConfig = config.env?.[environment];

  if (!envConfig) {
    return config;
  }

  return mergeConfig(config, envConfig as PartialEnzymeConfig, {
    objectStrategy: 'merge',
    arrayStrategy: 'concat',
  });
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default Enzyme configuration
 */
export const DEFAULT_CONFIG: EnzymeConfig = {
  typescript: true,
  features: {
    auth: false,
    state: true,
    routing: true,
    realtime: false,
    monitoring: false,
    theme: false,
    flags: false,
  },
  paths: {
    src: 'src',
    components: 'src/components',
    pages: 'src/pages',
    hooks: 'src/hooks',
    services: 'src/services',
    stores: 'src/stores',
    tests: 'src/__tests__',
    assets: 'src/assets',
  },
  plugins: [],
  extensions: [],
};

/**
 * Create a configuration with defaults
 */
export function createConfig(overrides: PartialEnzymeConfig = {}): EnzymeConfig {
  const merged = mergeConfig(DEFAULT_CONFIG, overrides);
  return validateConfigOrThrow(merged);
}

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Get configuration path for a generator type
 */
export function getGeneratorPath(config: EnzymeConfig, type: string): string {
  const pathMap: Record<string, keyof typeof config.paths> = {
    component: 'components',
    page: 'pages',
    hook: 'hooks',
    service: 'services',
    slice: 'stores',
    store: 'stores',
  };

  const pathKey = pathMap[type] ?? 'src';
  return config.paths[pathKey] ?? config.paths.src;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(config: EnzymeConfig, feature: string): boolean {
  return config.features[feature as keyof typeof config.features] ?? false;
}

/**
 * Get enabled features
 */
export function getEnabledFeatures(config: EnzymeConfig): string[] {
  return Object.entries(config.features)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name);
}

// ============================================================================
// Configuration File Detection
// ============================================================================

/**
 * Supported configuration file names
 */
export const CONFIG_FILE_NAMES = [
  'enzyme.config.json',
  'enzyme.config.js',
  'enzyme.config.mjs',
  'enzyme.config.ts',
  '.enzymerc',
  '.enzymerc.json',
  '.enzymerc.yaml',
  '.enzymerc.yml',
];

/**
 * Get configuration file priority (lower = higher priority)
 */
export function getConfigFilePriority(filename: string): number {
  const index = CONFIG_FILE_NAMES.indexOf(filename);
  return index === -1 ? CONFIG_FILE_NAMES.length : index;
}
