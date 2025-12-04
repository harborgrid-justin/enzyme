/**
 * Configuration Schema
 *
 * Defines the complete configuration schema for Enzyme CLI using Zod.
 * Provides type-safe configuration validation and defaults.
 */

import { z } from 'zod';

/**
 * Feature flags schema
 */
export const FeaturesSchema = z.object({
  auth: z.boolean().default(false).describe('Enable authentication feature'),
  state: z.boolean().default(true).describe('Enable state management'),
  routing: z.boolean().default(true).describe('Enable routing'),
  realtime: z.boolean().default(false).describe('Enable realtime subscriptions'),
  monitoring: z.boolean().default(false).describe('Enable monitoring and observability'),
  theme: z.boolean().default(false).describe('Enable theming support'),
});

/**
 * Generator settings schema
 */
export const GeneratorsSchema = z.object({
  componentPath: z.string().default('src/components').describe('Path for generated components'),
  routePath: z.string().default('src/routes').describe('Path for generated routes'),
  hookPath: z.string().default('src/hooks').describe('Path for generated hooks'),
  testSuffix: z.enum(['.test', '.spec']).default('.test').describe('Test file suffix'),
  storyPath: z.string().default('src/stories').describe('Path for Storybook stories'),
});

/**
 * Code style schema
 */
export const StyleSchema = z.object({
  quotes: z.enum(['single', 'double']).default('single').describe('Quote style preference'),
  semicolons: z.boolean().default(true).describe('Use semicolons'),
  tabWidth: z.number().int().min(2).max(8).default(2).describe('Tab width for indentation'),
  useTabs: z.boolean().default(false).describe('Use tabs instead of spaces'),
  trailingComma: z.enum(['none', 'es5', 'all']).default('es5').describe('Trailing comma style'),
  arrowParens: z.enum(['avoid', 'always']).default('always').describe('Arrow function parentheses'),
});

/**
 * Plugin configuration schema
 */
export const PluginsSchema = z.array(z.string()).default([]).describe('Enzyme CLI plugins');

/**
 * TypeScript configuration schema
 */
export const TypeScriptSchema = z.object({
  strict: z.boolean().default(true).describe('Enable strict mode'),
  skipLibCheck: z.boolean().default(true).describe('Skip type checking of declaration files'),
  exactOptionalPropertyTypes: z.boolean().default(true).describe('Enable exact optional property types'),
});

/**
 * Build configuration schema
 */
export const BuildSchema = z.object({
  target: z.enum(['es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'esnext']).default('es2020'),
  minify: z.boolean().default(true).describe('Minify production builds'),
  sourcemap: z.boolean().default(true).describe('Generate source maps'),
  analyze: z.boolean().default(false).describe('Analyze bundle size'),
});

/**
 * Testing configuration schema
 */
export const TestingSchema = z.object({
  framework: z.enum(['vitest', 'jest']).default('vitest').describe('Testing framework'),
  coverage: z.boolean().default(true).describe('Enable coverage reporting'),
  coverageThreshold: z.object({
    statements: z.number().min(0).max(100).default(80),
    branches: z.number().min(0).max(100).default(80),
    functions: z.number().min(0).max(100).default(80),
    lines: z.number().min(0).max(100).default(80),
  }).default({}),
});

/**
 * Linting configuration schema
 */
export const LintingSchema = z.object({
  enabled: z.boolean().default(true).describe('Enable linting'),
  autoFix: z.boolean().default(false).describe('Auto-fix issues on save'),
  rules: z.record(z.union([z.string(), z.number(), z.array(z.any())])).default({}),
});

/**
 * Git configuration schema
 */
export const GitSchema = z.object({
  enabled: z.boolean().default(true).describe('Enable git integration'),
  autoCommit: z.boolean().default(false).describe('Auto-commit generated files'),
  commitMessage: z.string().optional().describe('Commit message template'),
});

/**
 * Main Enzyme configuration schema
 */
export const EnzymeConfigSchema = z.object({
  // Project metadata
  projectName: z.string().min(1).describe('Project name'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0').describe('Project version'),
  description: z.string().optional().describe('Project description'),

  // Paths
  srcDir: z.string().default('src').describe('Source directory'),
  outDir: z.string().default('dist').describe('Output directory'),
  publicDir: z.string().default('public').describe('Public assets directory'),

  // Feature flags
  features: FeaturesSchema,

  // Generator settings
  generators: GeneratorsSchema,

  // Code style
  style: StyleSchema,

  // TypeScript
  typescript: TypeScriptSchema.optional(),

  // Build
  build: BuildSchema.optional(),

  // Testing
  testing: TestingSchema.optional(),

  // Linting
  linting: LintingSchema.optional(),

  // Git integration
  git: GitSchema.optional(),

  // Template directories
  templateDirs: z.array(z.string()).optional().describe('Custom template directories'),

  // Plugins
  plugins: PluginsSchema,

  // Custom metadata
  metadata: z.record(z.any()).optional().describe('Custom metadata'),
});

/**
 * Partial config schema for updates
 */
export const PartialEnzymeConfigSchema = EnzymeConfigSchema.partial();

/**
 * Configuration file format schema
 */
export const ConfigFileSchema = z.object({
  $schema: z.string().optional(),
  enzyme: EnzymeConfigSchema,
});

/**
 * TypeScript types derived from schemas
 */
export type Features = z.infer<typeof FeaturesSchema>;
export type Generators = z.infer<typeof GeneratorsSchema>;
export type Style = z.infer<typeof StyleSchema>;
export type TypeScriptConfig = z.infer<typeof TypeScriptSchema>;
export type BuildConfig = z.infer<typeof BuildSchema>;
export type TestingConfig = z.infer<typeof TestingSchema>;
export type LintingConfig = z.infer<typeof LintingSchema>;
export type GitConfig = z.infer<typeof GitSchema>;
export type EnzymeConfig = z.infer<typeof EnzymeConfigSchema>;
export type PartialEnzymeConfig = z.infer<typeof PartialEnzymeConfigSchema>;
export type ConfigFile = z.infer<typeof ConfigFileSchema>;

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: EnzymeConfig = {
  projectName: 'my-enzyme-app',
  version: '1.0.0',
  srcDir: 'src',
  outDir: 'dist',
  publicDir: 'public',
  features: {
    auth: false,
    state: true,
    routing: true,
    realtime: false,
    monitoring: false,
    theme: false,
  },
  generators: {
    componentPath: 'src/components',
    routePath: 'src/routes',
    hookPath: 'src/hooks',
    testSuffix: '.test',
    storyPath: 'src/stories',
  },
  style: {
    quotes: 'single',
    semicolons: true,
    tabWidth: 2,
    useTabs: false,
    trailingComma: 'es5',
    arrowParens: 'always',
  },
  plugins: [],
};

/**
 * Environment variable prefix
 */
export const ENV_PREFIX = 'ENZYME_';

/**
 * Configuration file names (in order of precedence)
 */
export const CONFIG_FILE_NAMES = [
  'enzyme.config.js',
  'enzyme.config.mjs',
  'enzyme.config.cjs',
  '.enzymerc.json',
  '.enzymerc.yaml',
  '.enzymerc.yml',
] as const;

/**
 * Validation error formatter
 */
export function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `  - ${path}: ${issue.message}`;
  });

  return `Configuration validation failed:\n${issues.join('\n')}`;
}

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): { success: true; data: EnzymeConfig } | { success: false; error: string } {
  const result = EnzymeConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: formatValidationError(result.error) };
}

/**
 * Merge configurations with precedence
 */
export function mergeConfigs(...configs: Partial<EnzymeConfig>[]): EnzymeConfig {
  const merged: any = { ...DEFAULT_CONFIG };

  for (const config of configs) {
    if (!config) continue;

    // Merge top-level properties
    for (const [key, value] of Object.entries(config)) {
      if (value === undefined) continue;

      // Deep merge objects
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }
  }

  return merged as EnzymeConfig;
}
