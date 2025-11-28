/**
 * @file Configuration Validation System
 * @description Comprehensive Zod-based validation for all configuration schemas.
 *
 * This module provides:
 * - Zod schemas for all configuration domains
 * - Runtime validation with detailed error messages
 * - Type inference from schemas
 * - Schema documentation generation
 * - Validation utilities and helpers
 *
 * @module config/config-validation
 */

import { z } from 'zod';
import type {
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
  ConfigErrorCode,
  ConfigWarningCode as _ConfigWarningCode,
  ConfigSchema,
  ConfigEnvironment as _ConfigEnvironment,
} from './types';

// =============================================================================
// Base Schema Builders
// =============================================================================

/**
 * Create a duration schema (milliseconds) with validation
 */
function duration(options: { min?: number; max?: number; default?: number } = {}): z.ZodDefault<z.ZodNumber> | z.ZodNumber {
  let schema: z.ZodNumber = z.number().int().positive();
  if (options.min !== undefined) schema = schema.min(options.min);
  if (options.max !== undefined) schema = schema.max(options.max);
  if (options.default !== undefined) return schema.default(options.default);
  return schema;
}

/**
 * Create a percentage schema (0-100)
 */
function percentage(defaultValue?: number): z.ZodNumber | z.ZodDefault<z.ZodNumber> {
  const schema = z.number().min(0).max(100);
  return defaultValue !== undefined ? schema.default(defaultValue) : schema;
}

/**
 * Create a priority level schema
 */
const priorityLevel = z.enum(['critical', 'high', 'normal', 'low']);
export type PriorityLevel = z.infer<typeof priorityLevel>;

/**
 * Create an environment schema
 */
const _environment = z.enum(['development', 'staging', 'production', 'test']);
export type Environment = z.infer<typeof _environment>;

// =============================================================================
// Streaming Configuration Schema
// =============================================================================

/**
 * Stream boundary configuration schema
 */
export const streamBoundarySchema = z.object({
  /** Unique identifier for the stream boundary */
  id: z.string().min(1),
  /** Priority level for streaming */
  priority: priorityLevel.default('normal'),
  /** Defer streaming by this many milliseconds */
  deferMs: duration({ min: 0, max: 30000, default: 0 }),
  /** Enable progressive rendering */
  progressive: z.boolean().default(true),
  /** Chunk size for streaming (bytes) */
  chunkSize: z.number().int().min(1024).max(1048576).default(16384),
});

/**
 * Streaming engine configuration schema
 */
export const streamingConfigSchema = z.object({
  /** Enable streaming */
  enabled: z.boolean().default(true),
  /** Default stream priority */
  defaultPriority: priorityLevel.default('normal'),
  /** Buffer configuration */
  buffer: z.object({
    /** Initial buffer size (bytes) */
    initialSize: z.number().int().min(1024).default(65536),
    /** Maximum buffer size (bytes) */
    maxSize: z.number().int().min(65536).default(1048576),
    /** High water mark for back-pressure */
    highWaterMark: z.number().int().min(1024).default(32768),
    /** Low water mark for resuming */
    lowWaterMark: z.number().int().min(512).default(8192),
  }).optional(),
  /** Timing configuration */
  timing: z.object({
    /** Flush interval (ms) */
    flushInterval: duration({ min: 10, max: 1000, default: 50 }),
    /** Maximum time to wait before forcing flush (ms) */
    maxFlushDelay: duration({ min: 50, max: 5000, default: 200 }),
    /** Shell render timeout (ms) */
    shellTimeout: duration({ min: 100, max: 10000, default: 3000 }),
    /** Content render timeout (ms) */
    contentTimeout: duration({ min: 1000, max: 60000, default: 30000 }),
  }).default({ flushInterval: 50, maxFlushDelay: 200, shellTimeout: 3000, contentTimeout: 30000 }),
  /** Error handling */
  errorHandling: z.object({
    /** Fallback on stream error */
    fallbackToSSR: z.boolean().default(true),
    /** Retry failed chunks */
    retryFailedChunks: z.boolean().default(true),
    /** Maximum retry attempts */
    maxRetries: z.number().int().min(0).max(5).default(2),
    /** Show error boundaries on failure */
    showErrorBoundary: z.boolean().default(true),
  }).optional(),
  /** Performance optimizations */
  performance: z.object({
    /** Enable compression */
    compression: z.boolean().default(true),
    /** Compression level (1-9) */
    compressionLevel: z.number().int().min(1).max(9).default(6),
    /** Enable caching */
    caching: z.boolean().default(true),
    /** Cache TTL (ms) */
    cacheTTL: duration({ min: 0, max: 3600000, default: 300000 }),
  }).default({ compression: true, compressionLevel: 6, caching: true, cacheTTL: 300000 }),
});

export type StreamingConfig = z.infer<typeof streamingConfigSchema>;

// =============================================================================
// Hydration Configuration Schema
// =============================================================================

/**
 * Hydration trigger schema
 */
const hydrationTrigger = z.enum([
  'immediate',
  'visible',
  'idle',
  'interaction',
  'manual',
  'hover',
  'focus',
]);
export type HydrationTrigger = z.infer<typeof hydrationTrigger>;

/**
 * Hydration priority configuration
 */
export const hydrationPrioritySchema = z.object({
  /** Priority level (1-5, 1 is highest) */
  level: z.number().int().min(1).max(5).default(3),
  /** What triggers hydration */
  trigger: hydrationTrigger.default('visible'),
  /** Timeout before forcing hydration (ms) */
  timeout: duration({ min: 0, max: 60000, default: 10000 }).optional(),
  /** Intersection Observer threshold */
  threshold: z.number().min(0).max(1).default(0.1),
  /** Root margin for Intersection Observer */
  rootMargin: z.string().default('100px'),
});

/**
 * Hydration scheduler configuration
 */
export const hydrationConfigSchema = z.object({
  /** Enable selective hydration */
  enabled: z.boolean().default(true),
  /** Default hydration priority */
  defaultPriority: hydrationPrioritySchema.default({ level: 3, trigger: 'visible', threshold: 0.1, rootMargin: '100px' }),
  /** Scheduler configuration */
  scheduler: z.object({
    /** Maximum concurrent hydration tasks */
    maxConcurrent: z.number().int().min(1).max(10).default(3),
    /** Batch size for processing */
    batchSize: z.number().int().min(1).max(50).default(10),
    /** Yield interval for main thread (ms) */
    yieldInterval: duration({ min: 1, max: 100, default: 16 }),
    /** Use requestIdleCallback */
    useIdleCallback: z.boolean().default(true),
    /** Idle callback timeout (ms) */
    idleTimeout: duration({ min: 50, max: 5000, default: 1000 }),
  }).default({ maxConcurrent: 3, batchSize: 10, yieldInterval: 16, useIdleCallback: true, idleTimeout: 1000 }),
  /** Visibility detection */
  visibility: z.object({
    /** Use Intersection Observer */
    useIntersectionObserver: z.boolean().default(true),
    /** Default threshold */
    defaultThreshold: z.number().min(0).max(1).default(0.1),
    /** Default root margin */
    defaultRootMargin: z.string().default('50px'),
  }).default({ useIntersectionObserver: true, defaultThreshold: 0.1, defaultRootMargin: '50px' }),
  /** Interaction handling */
  interaction: z.object({
    /** Events that trigger hydration */
    triggerEvents: z.array(z.string()).default(['click', 'focus', 'touchstart', 'mouseenter']),
    /** Capture phase for events */
    useCapture: z.boolean().default(true),
    /** Hydrate on hover */
    hydrateOnHover: z.boolean().default(true),
    /** Hover delay before hydration (ms) */
    hoverDelay: duration({ min: 0, max: 1000, default: 100 }),
  }).default({ triggerEvents: ['click', 'focus', 'touchstart', 'mouseenter'], useCapture: true, hydrateOnHover: true, hoverDelay: 100 }),
  /** Performance metrics */
  metrics: z.object({
    /** Track hydration timing */
    trackTiming: z.boolean().default(true),
    /** Report to performance API */
    reportToPerformanceAPI: z.boolean().default(true),
    /** Custom metric name prefix */
    metricPrefix: z.string().default('hydration'),
  }).default({ trackTiming: true, reportToPerformanceAPI: true, metricPrefix: 'hydration' }),
});

export type HydrationConfig = z.infer<typeof hydrationConfigSchema>;

// =============================================================================
// Layout Configuration Schema
// =============================================================================

/**
 * Layout mode schema
 */
const _layoutMode = z.enum(['grid', 'flex', 'block', 'inline', 'masonry', 'auto']);
export type LayoutMode = z.infer<typeof _layoutMode>;

/**
 * Morph transition schema
 */
export const morphTransitionSchema = z.object({
  /** Transition duration (ms) */
  duration: duration({ min: 0, max: 2000, default: 300 }),
  /** Easing function */
  easing: z.string().default('cubic-bezier(0.4, 0, 0.2, 1)'),
  /** Enable hardware acceleration */
  useGPU: z.boolean().default(true),
  /** Reduce motion for accessibility */
  respectReducedMotion: z.boolean().default(true),
}).default({ duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', useGPU: true, respectReducedMotion: true });

/**
 * Layout system configuration
 */
export const layoutsConfigSchema = z.object({
  /** Enable adaptive layouts */
  adaptive: z.object({
    enabled: z.boolean().default(true),
    /** Use ResizeObserver for content-aware layouts */
    useResizeObserver: z.boolean().default(true),
    /** Debounce resize events (ms) */
    resizeDebounce: duration({ min: 0, max: 500, default: 100 }),
    /** Breakpoints for responsive layouts */
    breakpoints: z.object({
      xs: z.number().int().default(0),
      sm: z.number().int().default(640),
      md: z.number().int().default(768),
      lg: z.number().int().default(1024),
      xl: z.number().int().default(1280),
      '2xl': z.number().int().default(1536),
    }).default({ xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }),
  }).default({ enabled: true, useResizeObserver: true, resizeDebounce: 100, breakpoints: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } }),
  /** Morphing layouts */
  morphing: z.object({
    enabled: z.boolean().default(true),
    /** Default transition configuration */
    transition: morphTransitionSchema.default({ duration: 300, easing: 'ease-out', useGPU: true, respectReducedMotion: true }),
    /** Enable layout animations */
    animate: z.boolean().default(true),
    /** Use FLIP technique */
    useFLIP: z.boolean().default(true),
  }).default({ enabled: true, transition: { duration: 300, easing: 'ease-out', useGPU: true, respectReducedMotion: true }, animate: true, useFLIP: true }),
  /** CLS (Cumulative Layout Shift) prevention */
  clsGuard: z.object({
    enabled: z.boolean().default(true),
    /** Reserve space for async content */
    reserveSpace: z.boolean().default(true),
    /** Default aspect ratio for images */
    defaultAspectRatio: z.number().positive().default(1.5),
    /** Skeleton loading */
    useSkeleton: z.boolean().default(true),
  }).default({ enabled: true, reserveSpace: true, defaultAspectRatio: 1.5, useSkeleton: true }),
  /** Context-aware layouts */
  context: z.object({
    enabled: z.boolean().default(true),
    /** Track DOM ancestry */
    trackAncestry: z.boolean().default(true),
    /** Bridge portal context */
    bridgePortals: z.boolean().default(true),
    /** Max ancestry depth to track */
    maxDepth: z.number().int().min(1).max(20).default(10),
  }).default({ enabled: true, trackAncestry: true, bridgePortals: true, maxDepth: 10 }),
});

export type LayoutsConfig = z.infer<typeof layoutsConfigSchema>;

// =============================================================================
// Virtual DOM Configuration Schema
// =============================================================================

/**
 * Virtual DOM module configuration
 */
export const vdomConfigSchema = z.object({
  /** Enable virtual modular DOM */
  enabled: z.boolean().default(true),
  /** Module partitioning */
  partitioning: z.object({
    /** Enable automatic partitioning */
    auto: z.boolean().default(true),
    /** Maximum module size (nodes) */
    maxModuleSize: z.number().int().min(10).max(10000).default(1000),
    /** Module boundary detection threshold */
    boundaryThreshold: z.number().min(0).max(1).default(0.7),
  }).default({ auto: true, maxModuleSize: 1000, boundaryThreshold: 0.7 }),
  /** Memory management */
  memory: z.object({
    /** Enable DOM pooling */
    usePooling: z.boolean().default(true),
    /** Pool size */
    poolSize: z.number().int().min(10).max(1000).default(100),
    /** GC interval (ms) */
    gcInterval: duration({ min: 1000, max: 60000, default: 10000 }),
    /** Memory limit (MB) */
    memoryLimit: z.number().int().min(10).max(500).default(100),
  }).default({ usePooling: true, poolSize: 100, gcInterval: 10000, memoryLimit: 100 }),
  /** Reconciliation */
  reconciliation: z.object({
    /** Batch DOM updates */
    batchUpdates: z.boolean().default(true),
    /** Maximum batch size */
    maxBatchSize: z.number().int().min(1).max(100).default(50),
    /** Use requestAnimationFrame */
    useRAF: z.boolean().default(true),
    /** Diff algorithm */
    diffAlgorithm: z.enum(['simple', 'keyed', 'lis']).default('lis'),
  }).default({ batchUpdates: true, maxBatchSize: 50, useRAF: true, diffAlgorithm: 'lis' }),
  /** Module boundaries */
  boundaries: z.object({
    /** Enable sandboxing */
    sandbox: z.boolean().default(false),
    /** Enable CSP integration */
    cspIntegration: z.boolean().default(true),
    /** XSS prevention */
    xssPrevention: z.boolean().default(true),
  }).default({ sandbox: false, cspIntegration: true, xssPrevention: true }),
});

export type VDOMConfig = z.infer<typeof vdomConfigSchema>;

// =============================================================================
// Performance Configuration Schema
// =============================================================================

/**
 * Performance monitoring configuration
 */
export const performanceConfigSchema = z.object({
  /** Enable performance monitoring */
  enabled: z.boolean().default(true),
  /** Core Web Vitals tracking */
  webVitals: z.object({
    enabled: z.boolean().default(true),
    /** Track LCP */
    trackLCP: z.boolean().default(true),
    /** Track FID/INP */
    trackINP: z.boolean().default(true),
    /** Track CLS */
    trackCLS: z.boolean().default(true),
    /** Track TTFB */
    trackTTFB: z.boolean().default(true),
    /** Track FCP */
    trackFCP: z.boolean().default(true),
    /** Reporting threshold */
    reportingThreshold: z.number().min(0).max(1).default(1),
  }).default({ enabled: true, trackLCP: true, trackINP: true, trackCLS: true, trackTTFB: true, trackFCP: true, reportingThreshold: 1 }),
  /** Targets for performance metrics */
  targets: z.object({
    /** LCP target (ms) */
    lcp: duration({ min: 0, max: 10000, default: 2500 }),
    /** INP target (ms) */
    inp: duration({ min: 0, max: 1000, default: 200 }),
    /** CLS target */
    cls: z.number().min(0).max(1).default(0.1),
    /** TTFB target (ms) */
    ttfb: duration({ min: 0, max: 2000, default: 800 }),
    /** FCP target (ms) */
    fcp: duration({ min: 0, max: 5000, default: 1800 }),
    /** Bundle size target (KB) */
    bundleSize: z.number().int().min(0).default(150),
  }).default({ lcp: 2500, inp: 200, cls: 0.1, ttfb: 800, fcp: 1800, bundleSize: 150 }),
  /** Resource hints */
  resourceHints: z.object({
    /** Enable preconnect */
    preconnect: z.boolean().default(true),
    /** Enable prefetch */
    prefetch: z.boolean().default(true),
    /** Enable preload */
    preload: z.boolean().default(true),
    /** Enable modulepreload */
    modulepreload: z.boolean().default(true),
  }).default({ preconnect: true, prefetch: true, preload: true, modulepreload: true }),
  /** Code splitting */
  codeSplitting: z.object({
    /** Enable route-based splitting */
    routeBased: z.boolean().default(true),
    /** Enable component-based splitting */
    componentBased: z.boolean().default(true),
    /** Prefetch on hover */
    prefetchOnHover: z.boolean().default(true),
    /** Hover delay (ms) */
    hoverDelay: duration({ min: 0, max: 500, default: 100 }),
  }).default({ routeBased: true, componentBased: true, prefetchOnHover: true, hoverDelay: 100 }),
  /** Image optimization */
  images: z.object({
    /** Enable lazy loading */
    lazyLoad: z.boolean().default(true),
    /** Enable native lazy loading */
    useNativeLazy: z.boolean().default(true),
    /** Enable LQIP (Low Quality Image Placeholder) */
    useLQIP: z.boolean().default(true),
    /** Enable responsive images */
    responsive: z.boolean().default(true),
    /** Default quality */
    quality: percentage(80),
  }).default({ lazyLoad: true, useNativeLazy: true, useLQIP: true, responsive: true, quality: 80 }),
  /** Caching strategy */
  caching: z.object({
    /** Enable service worker */
    serviceWorker: z.boolean().default(true),
    /** Cache strategy */
    strategy: z.enum(['cache-first', 'network-first', 'stale-while-revalidate']).default('stale-while-revalidate'),
    /** Cache TTL (ms) */
    ttl: duration({ min: 0, max: 86400000, default: 3600000 }),
  }).default({ serviceWorker: true, strategy: 'stale-while-revalidate', ttl: 3600000 }),
});

export type PerformanceConfig = z.infer<typeof performanceConfigSchema>;

// =============================================================================
// Security Configuration Schema
// =============================================================================

/**
 * Content Security Policy configuration
 */
const cspDirectiveSchema = z.union([
  z.string(),
  z.array(z.string()),
]);

/**
 * Security configuration schema
 */
export const securityConfigSchema = z.object({
  /** Enable security features */
  enabled: z.boolean().default(true),
  /** Content Security Policy */
  csp: z.object({
    enabled: z.boolean().default(true),
    /** Report-only mode */
    reportOnly: z.boolean().default(false),
    /** Report URI */
    reportUri: z.string().url().optional(),
    /** Directives */
    directives: z.object({
      'default-src': cspDirectiveSchema.optional(),
      'script-src': cspDirectiveSchema.optional(),
      'style-src': cspDirectiveSchema.optional(),
      'img-src': cspDirectiveSchema.optional(),
      'connect-src': cspDirectiveSchema.optional(),
      'font-src': cspDirectiveSchema.optional(),
      'object-src': cspDirectiveSchema.optional(),
      'media-src': cspDirectiveSchema.optional(),
      'frame-src': cspDirectiveSchema.optional(),
      'worker-src': cspDirectiveSchema.optional(),
      'manifest-src': cspDirectiveSchema.optional(),
    }).default({
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'"],
    }),
    /** Use nonces for scripts */
    useNonce: z.boolean().default(true),
    /** Nonce length */
    nonceLength: z.number().int().min(16).max(64).default(32),
  }).default({ enabled: true, reportOnly: false, directives: { 'default-src': ["'self'"], 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:', 'https:'], 'connect-src': ["'self'"] }, useNonce: true, nonceLength: 32 }),
  /** XSS prevention */
  xss: z.object({
    enabled: z.boolean().default(true),
    /** Sanitize user input */
    sanitizeInput: z.boolean().default(true),
    /** Escape HTML output */
    escapeOutput: z.boolean().default(true),
    /** Allowed HTML tags */
    allowedTags: z.array(z.string()).default([
      'a', 'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    ]),
    /** Allowed attributes */
    allowedAttributes: z.record(z.string(), z.array(z.string())).default({
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
    }),
  }).default({ enabled: true, sanitizeInput: true, escapeOutput: true, allowedTags: ['a', 'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'], allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height'] } }),
  /** CSRF protection */
  csrf: z.object({
    enabled: z.boolean().default(true),
    /** Token header name */
    headerName: z.string().default('X-CSRF-Token'),
    /** Token cookie name */
    cookieName: z.string().default('csrf_token'),
    /** Token expiry (ms) */
    tokenExpiry: duration({ min: 300000, max: 86400000, default: 3600000 }),
  }).default({ enabled: true, headerName: 'X-CSRF-Token', cookieName: 'csrf_token', tokenExpiry: 3600000 }),
  /** Rate limiting */
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    /** Maximum requests per window */
    maxRequests: z.number().int().min(1).default(100),
    /** Window size (ms) */
    windowMs: duration({ min: 1000, max: 3600000, default: 60000 }),
    /** Retry-After header */
    retryAfter: z.boolean().default(true),
  }).default({ enabled: true, maxRequests: 100, windowMs: 60000, retryAfter: true }),
  /** Secure headers */
  headers: z.object({
    /** X-Frame-Options */
    frameOptions: z.enum(['DENY', 'SAMEORIGIN', 'ALLOW-FROM']).default('DENY'),
    /** X-Content-Type-Options */
    contentTypeOptions: z.literal('nosniff').default('nosniff'),
    /** X-XSS-Protection */
    xssProtection: z.string().default('1; mode=block'),
    /** Referrer-Policy */
    referrerPolicy: z.enum([
      'no-referrer',
      'no-referrer-when-downgrade',
      'origin',
      'origin-when-cross-origin',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
      'unsafe-url',
    ]).default('strict-origin-when-cross-origin'),
    /** Permissions-Policy */
    permissionsPolicy: z.record(z.string(), z.string()).default({
      camera: '()',
      microphone: '()',
      geolocation: '()',
    }),
  }).default({ frameOptions: 'DENY', contentTypeOptions: 'nosniff', xssProtection: '1; mode=block', referrerPolicy: 'strict-origin-when-cross-origin', permissionsPolicy: { camera: '()', microphone: '()', geolocation: '()' } }),
  /** Subresource integrity */
  sri: z.object({
    enabled: z.boolean().default(true),
    /** Hash algorithm */
    algorithm: z.enum(['sha256', 'sha384', 'sha512']).default('sha384'),
  }).default({ enabled: true, algorithm: 'sha384' }),
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

// =============================================================================
// Master Configuration Schema
// =============================================================================

/**
 * Complete application configuration schema
 */
export const masterConfigSchema = z.object({
  /** Streaming configuration */
  streaming: streamingConfigSchema.optional(),
  /** Hydration configuration */
  hydration: hydrationConfigSchema.optional(),
  /** Layout configuration */
  layouts: layoutsConfigSchema.optional(),
  /** Virtual DOM configuration */
  vdom: vdomConfigSchema.optional(),
  /** Performance configuration */
  performance: performanceConfigSchema.optional(),
  /** Security configuration */
  security: securityConfigSchema.optional(),
});

export type MasterConfig = z.infer<typeof masterConfigSchema>;

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Create a ConfigSchema wrapper from a Zod schema
 *
 * @param schema - Zod schema
 * @param options - Schema options
 * @returns ConfigSchema wrapper
 */
export function createConfigSchema<T extends z.ZodTypeAny>(
  schema: T,
  options: {
    version?: number;
    description?: string;
    defaults?: z.infer<T>;
  } = {}
): ConfigSchema<T> {
  return {
    schema,
    version: options.version ?? 1,
    description: options.description,
    defaults: options.defaults,
  };
}

/**
 * Validate configuration against a schema
 *
 * @param schema - ConfigSchema to validate against
 * @param data - Data to validate
 * @param namespace - Namespace for error reporting
 * @returns Validation result
 */
export function validateConfig<T extends z.ZodTypeAny>(
  schema: ConfigSchema<T>,
  data: unknown,
  namespace: string = 'config'
): ConfigValidationResult<z.infer<T>> {
  const startTime = performance.now();

  const result = schema.schema.safeParse(data);
  const durationMs = performance.now() - startTime;

  if (result.success) {
    return {
      success: true,
      data: result.data,
      warnings: [],
      meta: {
        namespace,
        version: schema.version,
        validatedAt: new Date().toISOString(),
        durationMs,
      },
    };
  }

  const errors: ConfigValidationError[] = result.error.issues.map((err) => ({
    path: err.path.join('.') || namespace,
    message: err.message,
    code: mapZodErrorToCode(err.code),
    expected: getExpectedFromError(err),
    received: getReceivedFromError(err),
  }));

  return {
    success: false,
    errors,
    warnings: [],
    meta: {
      namespace,
      version: schema.version,
      validatedAt: new Date().toISOString(),
      durationMs,
    },
  };
}

/**
 * Validate and parse configuration, throwing on error
 *
 * @param schema - ConfigSchema to validate against
 * @param data - Data to validate
 * @param namespace - Namespace for error reporting
 * @returns Validated data
 * @throws Error if validation fails
 */
export function validateConfigOrThrow<T extends z.ZodTypeAny>(
  schema: ConfigSchema<T>,
  data: unknown,
  namespace: string = 'config'
): z.infer<T> {
  const result = validateConfig(schema, data, namespace);

  if (!result.success) {
    const errorMessage = formatValidationErrors(result.errors ?? []);
    throw new Error(`Configuration validation failed for "${namespace}":\n${errorMessage}`);
  }

  if (result.data == null) {
    throw new Error(`Validation succeeded but no data returned for "${namespace}"`);
  }
  return result.data;
}

/**
 * Map Zod error codes to our error codes
 */
function mapZodErrorToCode(zodCode: string): ConfigErrorCode {
  const codeMap: Record<string, ConfigErrorCode> = {
    invalid_type: 'INVALID_TYPE',
    invalid_literal: 'INVALID_TYPE',
    custom: 'SCHEMA_MISMATCH',
    invalid_union: 'INVALID_TYPE',
    invalid_union_discriminator: 'INVALID_TYPE',
    invalid_enum_value: 'INVALID_ENUM',
    unrecognized_keys: 'SCHEMA_MISMATCH',
    invalid_arguments: 'INVALID_FORMAT',
    invalid_return_type: 'INVALID_TYPE',
    invalid_date: 'INVALID_FORMAT',
    invalid_string: 'INVALID_FORMAT',
    too_small: 'OUT_OF_RANGE',
    too_big: 'OUT_OF_RANGE',
    invalid_intersection_types: 'SCHEMA_MISMATCH',
    not_multiple_of: 'OUT_OF_RANGE',
    not_finite: 'INVALID_TYPE',
  };

  return codeMap[zodCode] ?? 'SCHEMA_MISMATCH';
}

/**
 * Extract expected type/value from Zod error
 */
function getExpectedFromError(error: z.ZodIssue): string | undefined {
  if ('expected' in error && error.expected) {
    return String(error.expected);
  }
  return undefined;
}

/**
 * Extract received value from Zod error (sanitized)
 */
function getReceivedFromError(error: z.ZodIssue): string | undefined {
  if ('received' in error && error.received !== undefined) {
    const {received} = error;
    if (typeof received === 'string') {
      if (received.length > 50) {
        return `${received.slice(0, 50)  }...`;
      }
      return received;
    }
    if (typeof received === 'number' || typeof received === 'boolean') {
      return String(received);
    }
    return typeof received;
  }
  return undefined;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ConfigValidationError[]): string {
  return errors
    .map((err) => {
      let message = `  - ${err.path}: ${err.message}`;
      if (err.expected != null) {
        message += ` (expected: ${err.expected})`;
      }
      if (err.received != null) {
        message += ` (received: ${err.received})`;
      }
      return message;
    })
    .join('\n');
}

/**
 * Format validation warnings for display
 */
export function formatValidationWarnings(warnings: ConfigValidationWarning[]): string {
  return warnings
    .map((warn) => {
      let message = `  - ${warn.path}: ${warn.message}`;
      if (warn.suggestion != null) {
        message += ` Suggestion: ${warn.suggestion}`;
      }
      return message;
    })
    .join('\n');
}

// =============================================================================
// Schema Documentation
// =============================================================================

/**
 * Generate documentation for a schema
 *
 * @param schema - Zod schema
 * @param name - Schema name
 * @returns Markdown documentation
 */
export function generateSchemaDocumentation(
  schema: z.ZodTypeAny,
  name: string
): string {
  const lines: string[] = [
    `## ${name}`,
    '',
    '| Property | Type | Default | Description |',
    '|----------|------|---------|-------------|',
  ];

  // Extract schema shape for objects
  if (schema instanceof z.ZodObject) {
    const {shape} = schema;
    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodTypeAny;
      const typeName = getTypeName(zodValue);
      const defaultValue = getDefaultValue(zodValue);
      const description = getDescription(zodValue);
      lines.push(`| \`${key}\` | ${typeName} | ${defaultValue} | ${description} |`);
    }
  }

  return lines.join('\n');
}

/**
 * Get human-readable type name from Zod schema
 */
function getTypeName(schema: z.ZodTypeAny): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const typeName = (schema._def as any).typeName as string;

  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodEnum':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return (schema as any).options.join(' \\| ');
    case 'ZodObject':
      return 'object';
    case 'ZodArray':
      return 'array';
    case 'ZodDefault':
      return getTypeName((schema as z.ZodDefault<z.ZodTypeAny>)._def.innerType);
    case 'ZodOptional':
      return `${getTypeName((schema as z.ZodOptional<z.ZodTypeAny>)._def.innerType)  }?`;
    default:
      return String(typeName).replace('Zod', '').toLowerCase();
  }
}

/**
 * Get default value from Zod schema
 */
function getDefaultValue(schema: z.ZodTypeAny): string {
  if (schema instanceof z.ZodDefault) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    const defaultValue = (schema._def.defaultValue as () => any)();
     
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      return '`{...}`';
    }
    return `\`${JSON.stringify(defaultValue)}\``;
  }
  return '-';
}

/**
 * Get description from Zod schema
 */
function getDescription(schema: z.ZodTypeAny): string {
  if (schema.description != null && schema.description !== '') {
    return schema.description;
  }
  return '-';
}

// =============================================================================
// Pre-configured Schemas
// =============================================================================

/**
 * Pre-configured streaming configuration schema
 */
export const STREAMING_CONFIG_SCHEMA = createConfigSchema(streamingConfigSchema, {
  version: 1,
  description: 'HTML streaming engine configuration',
  defaults: streamingConfigSchema.parse({}),
});

/**
 * Pre-configured hydration configuration schema
 */
export const HYDRATION_CONFIG_SCHEMA = createConfigSchema(hydrationConfigSchema, {
  version: 1,
  description: 'Auto-prioritized hydration system configuration',
  defaults: hydrationConfigSchema.parse({}),
});

/**
 * Pre-configured layouts configuration schema
 */
export const LAYOUTS_CONFIG_SCHEMA = createConfigSchema(layoutsConfigSchema, {
  version: 1,
  description: 'Adaptive and morphing layouts configuration',
  defaults: layoutsConfigSchema.parse({}),
});

/**
 * Pre-configured VDOM configuration schema
 */
export const VDOM_CONFIG_SCHEMA = createConfigSchema(vdomConfigSchema, {
  version: 1,
  description: 'Virtual modular DOM system configuration',
  defaults: vdomConfigSchema.parse({}),
});

/**
 * Pre-configured performance configuration schema
 */
export const PERFORMANCE_CONFIG_SCHEMA = createConfigSchema(performanceConfigSchema, {
  version: 1,
  description: 'Performance optimization configuration',
  defaults: performanceConfigSchema.parse({}),
});

/**
 * Pre-configured security configuration schema
 */
export const SECURITY_CONFIG_SCHEMA = createConfigSchema(securityConfigSchema, {
  version: 1,
  description: 'Security hardening configuration',
  defaults: securityConfigSchema.parse({}),
});

/**
 * Pre-configured master configuration schema
 */
export const MASTER_CONFIG_SCHEMA = createConfigSchema(masterConfigSchema, {
  version: 1,
  description: 'Complete application configuration',
  defaults: masterConfigSchema.parse({}),
});
