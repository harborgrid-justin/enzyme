/**
 * Core constants for the Enzyme VS Code Extension
 * This file contains all the constant values used throughout the extension
 */

/**
 * Extension Identifiers
 */
export const EXTENSION_ID = 'enzyme-vscode';
export const EXTENSION_NAME = 'Enzyme Framework';
export const EXTENSION_PUBLISHER = 'missionfabric';
export const EXTENSION_FULL_ID = `${EXTENSION_PUBLISHER}.${EXTENSION_ID}`;

/**
 * Command Identifiers
 */
export enum COMMANDS {
  // Initialization
  INIT = 'enzyme.init',

  // Generation Commands
  GENERATE_COMPONENT = 'enzyme.generate.component',
  GENERATE_FEATURE = 'enzyme.generate.feature',
  GENERATE_ROUTE = 'enzyme.generate.route',
  GENERATE_STORE = 'enzyme.generate.store',
  GENERATE_HOOK = 'enzyme.generate.hook',
  GENERATE_API_CLIENT = 'enzyme.generate.apiClient',
  GENERATE_TEST = 'enzyme.generate.test',

  // Analysis Commands
  ANALYZE_PERFORMANCE = 'enzyme.analyze.performance',
  ANALYZE_SECURITY = 'enzyme.analyze.security',
  ANALYZE_DEPENDENCIES = 'enzyme.analyze.dependencies',

  // Refactoring Commands
  REFACTOR_CONVERT_TO_ENZYME = 'enzyme.refactor.convertToEnzyme',
  REFACTOR_OPTIMIZE_IMPORTS = 'enzyme.refactor.optimizeImports',

  // Validation Commands
  VALIDATE_CONFIG = 'enzyme.validate.config',
  VALIDATE_ROUTES = 'enzyme.validate.routes',
  VALIDATE_FEATURES = 'enzyme.validate.features',

  // Explorer Commands
  EXPLORER_REFRESH = 'enzyme.explorer.refresh',
  EXPLORER_OPEN_FILE = 'enzyme.explorer.openFile',

  // Documentation Commands
  DOCS_OPEN = 'enzyme.docs.open',
  SNIPPETS_SHOW = 'enzyme.snippets.show',

  // Migration Commands
  MIGRATION_ANALYZE = 'enzyme.migration.analyze',

  // Debug & Utility Commands
  TELEMETRY_TOGGLE = 'enzyme.telemetry.toggle',
  DEBUG_SHOW_LOGS = 'enzyme.debug.showLogs',
  WORKSPACE_DETECT = 'enzyme.workspace.detect',
}

/**
 * View Identifiers
 */
export enum VIEWS {
  FEATURES = 'enzyme.views.features',
  ROUTES = 'enzyme.views.routes',
  COMPONENTS = 'enzyme.views.components',
  STORES = 'enzyme.views.stores',
  API = 'enzyme.views.api',
  PERFORMANCE = 'enzyme.views.performance',
}

/**
 * View Container Identifiers
 */
export const VIEW_CONTAINER_ID = 'enzyme-explorer';

/**
 * Configuration Keys
 */
export enum CONFIG_KEYS {
  // Telemetry
  TELEMETRY_ENABLED = 'enzyme.telemetry.enabled',

  // Logging
  LOGGING_LEVEL = 'enzyme.logging.level',

  // Generator
  GENERATOR_COMPONENT_STYLE = 'enzyme.generator.componentStyle',
  GENERATOR_TEST_FRAMEWORK = 'enzyme.generator.testFramework',
  GENERATOR_CSS_FRAMEWORK = 'enzyme.generator.cssFramework',

  // Validation
  VALIDATION_ON_SAVE = 'enzyme.validation.onSave',
  VALIDATION_STRICT = 'enzyme.validation.strict',

  // Performance
  PERFORMANCE_MONITORING_ENABLED = 'enzyme.performance.monitoring.enabled',

  // Security
  SECURITY_SCANNING_ENABLED = 'enzyme.security.scanning.enabled',

  // Imports
  IMPORTS_AUTO_OPTIMIZE = 'enzyme.imports.autoOptimize',

  // Snippets
  SNIPPETS_ENABLED = 'enzyme.snippets.enabled',

  // Code Actions
  CODE_ACTIONS_ENABLED = 'enzyme.codeActions.enabled',

  // Explorer
  EXPLORER_AUTO_REFRESH = 'enzyme.explorer.autoRefresh',

  // Format
  FORMAT_ON_SAVE = 'enzyme.format.onSave',
}

/**
 * File Patterns
 */
export const FILE_PATTERNS = {
  // Enzyme Configuration
  ENZYME_CONFIG: '**/enzyme.config.{ts,js}',
  ENZYME_CONFIG_TS: 'enzyme.config.ts',
  ENZYME_CONFIG_JS: 'enzyme.config.js',

  // Enzyme Directory
  ENZYME_DIR: '**/.enzyme/**',

  // TypeScript/React Files
  TYPESCRIPT: '**/*.ts',
  TYPESCRIPT_REACT: '**/*.tsx',
  TYPESCRIPT_ALL: '**/*.{ts,tsx}',

  // Component Files
  COMPONENTS: '**/components/**/*.{ts,tsx}',
  PAGES: '**/pages/**/*.{ts,tsx}',

  // Feature Files
  FEATURES: '**/features/**/*',
  FEATURE_CONFIG: '**/features/**/feature.config.{ts,js}',

  // Route Files
  ROUTES: '**/routes/**/*.{ts,tsx}',

  // Store Files
  STORES: '**/stores/**/*.{ts,tsx}',
  ZUSTAND_STORES: '**/*Store.{ts,tsx}',

  // API Files
  API_CLIENTS: '**/api/**/*.{ts,tsx}',

  // Test Files
  TESTS: '**/*.{test,spec}.{ts,tsx}',
  VITEST_CONFIG: '**/vitest.config.{ts,js}',
  JEST_CONFIG: '**/jest.config.{ts,js}',

  // Package Files
  PACKAGE_JSON: '**/package.json',
  TSCONFIG: '**/tsconfig.json',
};

/**
 * Enzyme Framework Patterns
 */
export const ENZYME_PATTERNS = {
  // Hook Patterns
  USE_AUTH: /useAuth\s*\(/,
  USE_ROUTE: /useRoute\s*\(/,
  USE_FEATURE: /useFeature\s*\(/,

  // Store Patterns
  CREATE_STORE: /createStore\s*</,
  USE_STORE: /use\w+Store\s*\(/,

  // API Patterns
  CREATE_API_CLIENT: /createApiClient\s*</,
  USE_API: /use\w+Api\s*\(/,

  // Route Patterns
  ROUTE_COMPONENT: /export\s+default\s+function\s+\w+Route/,
  ROUTE_LOADER: /export\s+(const|function)\s+loader\s*=/,

  // Feature Patterns
  FEATURE_CONFIG: /export\s+default\s+{[\s\S]*?id:\s*['"`][\w-]+['"`]/,
  FEATURE_ROUTES: /routes:\s*\[/,
};

/**
 * Icon Paths (relative to extension root)
 */
export const ICONS = {
  ENZYME: 'resources/enzyme-icon.svg',
  FEATURE: 'resources/icons/feature.svg',
  ROUTE: 'resources/icons/route.svg',
  COMPONENT: 'resources/icons/component.svg',
  STORE: 'resources/icons/store.svg',
  API: 'resources/icons/api.svg',
  PERFORMANCE: 'resources/icons/performance.svg',
};

/**
 * Output Channel Names
 */
export const OUTPUT_CHANNELS = {
  MAIN: 'Enzyme',
  ANALYZER: 'Enzyme Analyzer',
  GENERATOR: 'Enzyme Generator',
  VALIDATOR: 'Enzyme Validator',
};

/**
 * Context Keys (for when clauses)
 */
export const CONTEXT_KEYS = {
  IS_ENZYME_PROJECT: 'enzyme:isEnzymeProject',
  HAS_FEATURES: 'enzyme:hasFeatures',
  HAS_ROUTES: 'enzyme:hasRoutes',
  IS_TYPESCRIPT: 'enzyme:isTypeScript',
};

/**
 * Status Bar Priorities
 */
export const STATUS_BAR_PRIORITY = {
  HIGH: 100,
  MEDIUM: 50,
  LOW: 10,
};

/**
 * Diagnostic Severities
 */
export enum DIAGNOSTIC_SEVERITY {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  HINT = 'hint',
}

/**
 * Telemetry Event Names
 */
export enum TELEMETRY_EVENTS {
  EXTENSION_ACTIVATED = 'extension.activated',
  EXTENSION_DEACTIVATED = 'extension.deactivated',
  COMMAND_EXECUTED = 'command.executed',
  GENERATOR_USED = 'generator.used',
  ANALYZER_RUN = 'analyzer.run',
  ERROR_OCCURRED = 'error.occurred',
}

/**
 * Default Values
 */
export const DEFAULTS = {
  COMPONENT_STYLE: 'function',
  TEST_FRAMEWORK: 'vitest',
  CSS_FRAMEWORK: 'tailwind',
  LOG_LEVEL: 'info',
  PERFORMANCE_THRESHOLD: 100,
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  NO_ENZYME_PROJECT: 'No Enzyme project detected in workspace',
  INVALID_CONFIG: 'Invalid Enzyme configuration',
  INVALID_ROUTE: 'Invalid route configuration',
  INVALID_FEATURE: 'Invalid feature configuration',
  GENERATION_FAILED: 'Failed to generate file',
  ANALYSIS_FAILED: 'Analysis failed',
  VALIDATION_FAILED: 'Validation failed',
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  COMPONENT_GENERATED: 'Component generated successfully',
  FEATURE_GENERATED: 'Feature generated successfully',
  ROUTE_GENERATED: 'Route generated successfully',
  STORE_GENERATED: 'Store generated successfully',
  TEST_GENERATED: 'Test generated successfully',
  VALIDATION_PASSED: 'Validation passed',
};

/**
 * URLs
 */
export const URLS = {
  DOCUMENTATION: 'https://enzyme-framework.dev',
  GITHUB: 'https://github.com/harborgrid/enzyme',
  ISSUES: 'https://github.com/harborgrid/enzyme/issues',
  MARKETPLACE: 'https://marketplace.visualstudio.com/items?itemName=missionfabric.enzyme-vscode',
};

/**
 * File Templates Directory
 */
export const TEMPLATES_DIR = 'templates';

/**
 * Cache Keys
 */
export enum CACHE_KEYS {
  WORKSPACE_STATE = 'enzyme.workspace.state',
  FEATURES_CACHE = 'enzyme.features.cache',
  ROUTES_CACHE = 'enzyme.routes.cache',
  FIRST_ACTIVATION = 'enzyme.firstActivation',
  TELEMETRY_CONSENT = 'enzyme.telemetry.consent',
}

/**
 * Language IDs
 */
export const LANGUAGE_IDS = {
  TYPESCRIPT: 'typescript',
  TYPESCRIPTREACT: 'typescriptreact',
  JAVASCRIPT: 'javascript',
  JAVASCRIPTREACT: 'javascriptreact',
  ENZYME_CONFIG: 'enzyme-config',
};

/**
 * Webview Panel Types
 */
export enum WEBVIEW_PANELS {
  STATE_INSPECTOR = 'enzyme.stateInspector',
  ROUTE_VISUALIZER = 'enzyme.routeVisualizer',
  PERFORMANCE_DASHBOARD = 'enzyme.performanceDashboard',
  FEATURE_OVERVIEW = 'enzyme.featureOverview',
}

/**
 * Timeout Values (in milliseconds)
 */
export const TIMEOUTS = {
  FILE_WATCHER_DEBOUNCE: 500,
  VALIDATION_DEBOUNCE: 1000,
  AUTO_SAVE_DELAY: 2000,
  ANALYSIS_TIMEOUT: 30000,
};

/**
 * Performance Thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  COMPONENT_RENDER_WARNING: 16, // ms (one frame at 60fps)
  COMPONENT_RENDER_ERROR: 50, // ms
  BUNDLE_SIZE_WARNING: 250 * 1024, // 250 KB
  BUNDLE_SIZE_ERROR: 500 * 1024, // 500 KB
};
