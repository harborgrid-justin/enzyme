/**
 * @file Fast Refresh Constants
 * @description Extracted constants to make modules Fast Refresh compliant.
 *
 * Fast Refresh requirements:
 * - Contexts must be in separate files from components
 * - Default export functions must be PascalCase (components)
 * - No module-level side effects
 * - Hooks and utilities should be in separate files from components
 */

// ============================================================================
// Default Configuration Values
// ============================================================================

/**
 * Default loading configuration
 */
export const DEFAULT_LOADING_CONFIG = {
  minDisplayTime: 300,
  spinnerDelay: 200,
  skeletonDelay: 500,
  messageDelay: 2000,
  timeoutThreshold: 30000,
  announceChanges: true,
} as const;

/**
 * Default progressive enhancement capabilities
 */
export const DEFAULT_CAPABILITIES = {
  esModules: true,
  asyncAwait: true,
  webGL: false,
  webGL2: false,
  webP: false,
  avif: false,
  serviceWorker: false,
  webWorker: false,
  sharedArrayBuffer: false,
  intersectionObserver: false,
  resizeObserver: false,
  cssGrid: false,
  containerQueries: false,
  cssHas: false,
  viewTransitions: false,
  navigationAPI: false,
  popoverAPI: false,
  webAnimations: false,
  idleCallback: false,
  intl: false,
} as const;

/**
 * Default DOM context
 */
export const DEFAULT_DOM_CONTEXT = {
  viewportWidth: 0,
  viewportHeight: 0,
  scrollY: 0,
  scrollX: 0,
  colorScheme: 'light' as const,
  reducedMotion: false,
  touchEnabled: false,
  isClient: false,
};

/**
 * Default hydration state
 */
export const DEFAULT_HYDRATION_STATE = {
  isHydrated: false,
  isHydrating: false,
  hydratedComponents: new Set<string>(),
  failedComponents: new Set<string>(),
  hydrationStartTime: null,
  hydrationEndTime: null,
};

/**
 * Default security context
 */
export const DEFAULT_SECURITY_CONTEXT = {
  csrfToken: null,
  nonce: null,
  sanitizationLevel: 'strict' as const,
  allowedTags: [],
  allowedAttributes: {},
  allowedSchemes: ['https'],
};

/**
 * Default realtime context
 */
export const DEFAULT_REALTIME_CONTEXT = {
  isConnected: false,
  connectionState: 'disconnected' as const,
  lastMessageTime: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
};

/**
 * Default stream context
 */
export const DEFAULT_STREAM_CONTEXT = {
  activeStreams: new Map(),
  pendingStreams: new Set(),
  completedStreams: new Set(),
  failedStreams: new Map(),
  totalBytesReceived: 0,
  totalBytesSent: 0,
};

/**
 * Default performance metrics
 */
export const DEFAULT_PERFORMANCE_METRICS = {
  fps: 0,
  memoryUsage: 0,
  renderTime: 0,
  layoutShifts: 0,
  longTasks: 0,
  firstContentfulPaint: null,
  largestContentfulPaint: null,
  firstInputDelay: null,
  cumulativeLayoutShift: 0,
  timeToInteractive: null,
};

/**
 * Default adaptive layout breakpoints
 */
export const DEFAULT_BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Default container breakpoints
 */
export const DEFAULT_CONTAINER_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/**
 * Default spacing scale
 */
export const DEFAULT_SPACING = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
} as const;

/**
 * Default feature flags
 */
export const DEFAULT_FEATURE_FLAGS = {
  enableBetaFeatures: false,
  enableExperimentalFeatures: false,
  enableDebugMode: false,
  enableAnalytics: true,
  enableTelemetry: true,
} as const;

/**
 * Default API configuration
 */
export const DEFAULT_API_CONFIG = {
  baseURL: '',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  retryBackoff: 2,
  enableCache: true,
  cacheMaxAge: 300000, // 5 minutes
} as const;

/**
 * Default theme configuration
 */
export const DEFAULT_THEME_CONFIG = {
  colorScheme: 'light' as const,
  primaryColor: '#3b82f6',
  accentColor: '#10b981',
  errorColor: '#ef4444',
  warningColor: '#f59e0b',
  successColor: '#10b981',
  infoColor: '#3b82f6',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '16px',
  lineHeight: 1.5,
  borderRadius: '0.375rem',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
} as const;

/**
 * Default smart defaults configuration
 */
export const DEFAULT_SMART_DEFAULTS = {
  enableLearning: true,
  enableAdaptation: true,
  confidenceThreshold: 0.7,
  maxSuggestions: 5,
  maxHistorySize: 100,
  adaptationSpeed: 0.1,
} as const;

/**
 * Default error boundary configuration
 */
export const DEFAULT_ERROR_BOUNDARY_CONFIG = {
  fallbackUI: null,
  onError: null,
  onReset: null,
  resetKeys: [],
  isolationLevel: 'component' as const,
  logErrors: true,
  captureErrorInfo: true,
} as const;

/**
 * Default portal configuration
 */
export const DEFAULT_PORTAL_CONFIG = {
  container: null,
  disablePortal: false,
  keepMounted: false,
  closeOnOutsideClick: true,
  closeOnEscape: true,
} as const;

/**
 * Default scroll configuration
 */
export const DEFAULT_SCROLL_CONFIG = {
  behavior: 'smooth' as const,
  block: 'start' as const,
  inline: 'nearest' as const,
  threshold: 0.1,
  rootMargin: '0px',
} as const;

/**
 * Default animation configuration
 */
export const DEFAULT_ANIMATION_CONFIG = {
  duration: 200,
  easing: 'ease-in-out',
  delay: 0,
  iterations: 1,
  direction: 'normal' as const,
  fill: 'both' as const,
} as const;

/**
 * Default toast configuration
 */
export const DEFAULT_TOAST_CONFIG = {
  duration: 5000,
  position: 'top-right' as const,
  variant: 'info' as const,
  dismissible: true,
  autoClose: true,
  pauseOnHover: true,
} as const;

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGINATION_CONFIG = {
  page: 1,
  pageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  showFirstLast: true,
  showPrevNext: true,
  showPageNumbers: true,
  maxPageButtons: 7,
} as const;

/**
 * Default filter configuration
 */
export const DEFAULT_FILTER_CONFIG = {
  debounceMs: 300,
  caseSensitive: false,
  matchMode: 'contains' as const,
  multiSelect: false,
  clearable: true,
} as const;

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG = {
  debounceMs: 300,
  minLength: 2,
  maxResults: 50,
  highlightMatches: true,
  fuzzySearch: false,
  caseSensitive: false,
} as const;

/**
 * Default form configuration
 */
export const DEFAULT_FORM_CONFIG = {
  validateOnChange: false,
  validateOnBlur: true,
  validateOnSubmit: true,
  revalidateOnChange: true,
  submitOnEnter: false,
  resetOnSuccess: false,
} as const;

/**
 * Default grid configuration
 */
export const DEFAULT_GRID_CONFIG = {
  columns: 12,
  gap: '1rem',
  rowGap: '1rem',
  columnGap: '1rem',
  autoFlow: 'row' as const,
  alignItems: 'stretch' as const,
  justifyItems: 'stretch' as const,
} as const;

/**
 * Default flex configuration
 */
export const DEFAULT_FLEX_CONFIG = {
  direction: 'row' as const,
  wrap: 'nowrap' as const,
  alignItems: 'stretch' as const,
  justifyContent: 'flex-start' as const,
  gap: '1rem',
} as const;
