/**
 * @file Design Tokens & Utility Classes
 * @description Centralized design system to ensure consistency across the application.
 *
 * This module provides:
 * - Semantic color tokens (background, text, border, status)
 * - Typography scale
 * - Spacing system
 * - Layout patterns
 * - Component variants (buttons, cards, badges)
 * - Animation utilities
 * - Z-index scale
 * - Breakpoint system
 * - Accessibility utilities
 *
 * USAGE:
 * ```tsx
 * import { COLORS, SPACING, STATUS_BADGES, combineTokens } from '@/config';
 *
 * // Use individual tokens
 * <div className={STATUS_BADGES.success}>Active</div>
 * <div className={COLORS.background.primary}>Card</div>
 *
 * // Combine multiple tokens
 * <div className={combineTokens(LAYOUTS.flex.center, SPACING.padding.md, COLORS.background.primary)}>
 *   Content
 * </div>
 * ```
 *
 * GUIDELINES:
 * - Always use tokens instead of hardcoded values
 * - Use combineTokens() for multiple class combinations
 * - Prefer semantic tokens (success, error) over raw colors
 */

/**
 * Color System
 * Semantic color tokens for consistent theming
 */
export const COLORS = {
  // Background colors
  background: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    tertiary: 'bg-gray-100 dark:bg-gray-700',
    muted: 'bg-gray-50 dark:bg-gray-800/50',
    elevated: 'bg-white dark:bg-gray-800 shadow-sm',
  },

  // Text colors
  text: {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-700 dark:text-gray-300',
    tertiary: 'text-gray-600 dark:text-gray-400',
    muted: 'text-gray-500 dark:text-gray-500',
    inverse: 'text-white dark:text-gray-900',
  },

  // Border colors
  border: {
    primary: 'border-gray-200 dark:border-gray-700',
    secondary: 'border-gray-300 dark:border-gray-600',
    focus: 'border-primary-500 dark:border-primary-400',
    error: 'border-red-300 dark:border-red-700',
  },

  // Brand colors
  brand: {
    primary: 'bg-primary-600 text-white',
    primaryHover: 'hover:bg-primary-700',
    primaryLight: 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200',
    primaryOutline: 'border border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400',
  },

  // Semantic colors
  success: {
    solid: 'bg-green-600 text-white',
    light: 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-600 dark:text-green-400',
  },

  warning: {
    solid: 'bg-yellow-600 text-white',
    light: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-600 dark:text-yellow-400',
  },

  error: {
    solid: 'bg-red-600 text-white',
    light: 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-600 dark:text-red-400',
  },

  info: {
    solid: 'bg-blue-600 text-white',
    light: 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-600 dark:text-blue-400',
  },
} as const;

/**
 * Status Badge Variants
 * Consistent styling for status indicators across the app
 */
export const STATUS_BADGES = {
  success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  error: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  info: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  neutral: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  primary: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',

  // Entity-specific status badges
  entity: {
    active: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    inactive: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    pending: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    archived: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
} as const;

/**
 * Icon Container Variants
 * Consistent styling for icon wrappers
 */
export const ICON_CONTAINERS = {
  primary: 'h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center',
  success: 'h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center',
  warning: 'h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center',
  error: 'h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center',
  info: 'h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center',
  neutral: 'h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center',

  // Sizes
  sm: 'h-8 w-8 rounded-full flex items-center justify-center',
  md: 'h-12 w-12 rounded-full flex items-center justify-center',
  lg: 'h-16 w-16 rounded-full flex items-center justify-center',
} as const;

/**
 * Spacing System
 * Standardized spacing values
 */
export const SPACING = {
  // Padding
  padding: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },

  // Margin
  margin: {
    xs: 'm-2',
    sm: 'm-3',
    md: 'm-4',
    lg: 'm-6',
    xl: 'm-8',
  },

  // Gap
  gap: {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },

  // Space between
  space: {
    xs: 'space-y-2',
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  },
} as const;

/**
 * Layout Patterns
 * Common layout combinations
 */
export const LAYOUTS = {
  // Flexbox patterns
  flex: {
    center: 'flex items-center justify-center',
    centerStart: 'flex items-center justify-start',
    centerEnd: 'flex items-center justify-end',
    centerBetween: 'flex items-center justify-between',
    startBetween: 'flex items-start justify-between',
    column: 'flex flex-col',
    columnCenter: 'flex flex-col items-center justify-center',
  },

  // Grid patterns
  grid: {
    cols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
  },

  // Container patterns
  container: {
    default: 'container mx-auto px-4',
    narrow: 'max-w-2xl mx-auto px-4',
    wide: 'max-w-7xl mx-auto px-4',
  },
} as const;

/**
 * Card Variants
 * Reusable card styling patterns
 */
export const CARDS = {
  default: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
  elevated: 'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700',
  interactive: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer',
  flat: 'bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
} as const;

/**
 * Input States
 * Consistent form input styling
 */
export const INPUT_STATES = {
  default: 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500',
  error: 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500',
  success: 'border-green-300 dark:border-green-600 focus:border-green-500 focus:ring-green-500',
  disabled: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60',
} as const;

/**
 * Button Variants
 * Extended from Button component for consistency
 */
export const BUTTON_VARIANTS = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
  ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
} as const;

export const BUTTON_SIZES = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
  icon: 'h-10 w-10 p-0',
} as const;

/**
 * Typography Scale
 * Consistent text sizing and styling
 */
export const TYPOGRAPHY = {
  // Headings
  h1: 'text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100',
  h2: 'text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100',
  h3: 'text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100',
  h4: 'text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100',
  h5: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
  h6: 'text-base font-semibold text-gray-900 dark:text-gray-100',

  // Body text
  body: {
    large: 'text-lg text-gray-700 dark:text-gray-300',
    default: 'text-base text-gray-700 dark:text-gray-300',
    small: 'text-sm text-gray-600 dark:text-gray-400',
    xs: 'text-xs text-gray-500 dark:text-gray-500',
  },

  // Special text
  lead: 'text-xl text-gray-600 dark:text-gray-400',
  muted: 'text-sm text-gray-500 dark:text-gray-500',
  label: 'text-sm font-medium text-gray-700 dark:text-gray-300',
  code: 'font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded',
} as const;

/**
 * Animation Utilities
 * Consistent animation patterns
 */
export const ANIMATIONS = {
  transition: {
    default: 'transition-all duration-200 ease-in-out',
    fast: 'transition-all duration-100 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
  },
  
  hover: {
    scale: 'hover:scale-105 transition-transform duration-200',
    lift: 'hover:-translate-y-1 transition-transform duration-200',
    glow: 'hover:shadow-lg transition-shadow duration-200',
  },

  loading: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
} as const;

/**
 * Accessibility Utilities
 * WCAG-compliant interactive elements
 */
export const A11Y = {
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500',
  srOnly: 'sr-only',
  notSrOnly: 'not-sr-only',
} as const;

/**
 * Shadow Utilities
 * Consistent elevation system
 */
export const SHADOWS = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  default: 'shadow',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
} as const;

/**
 * Z-Index Scale
 * Layering system to manage stacking contexts
 */
export const Z_INDEX = {
  /** Below base content (e.g., background patterns) */
  below: '-z-10',
  /** Base content level */
  base: 'z-0',
  /** Slightly elevated (e.g., cards on hover) */
  raised: 'z-10',
  /** Sticky elements (e.g., table headers) */
  sticky: 'z-20',
  /** Fixed navigation (e.g., sidebar, navbar) */
  navigation: 'z-30',
  /** Dropdowns and popovers */
  dropdown: 'z-40',
  /** Modal backdrops */
  modalBackdrop: 'z-50',
  /** Modal content */
  modal: 'z-50',
  /** Tooltips */
  tooltip: 'z-[60]',
  /** Toast notifications */
  toast: 'z-[70]',
  /** Maximum - overlays everything */
  max: 'z-[100]',
} as const;

/**
 * Breakpoint System
 * Responsive design breakpoints (matches Tailwind defaults)
 */
export const BREAKPOINTS = {
  /** Extra small (mobile) */
  xs: '480px',
  /** Small (large mobile) */
  sm: '640px',
  /** Medium (tablet) */
  md: '768px',
  /** Large (laptop) */
  lg: '1024px',
  /** Extra large (desktop) */
  xl: '1280px',
  /** 2X Extra large (wide screens) */
  '2xl': '1536px',
} as const;

/**
 * Responsive class prefixes
 */
export const RESPONSIVE = {
  /** Mobile-first breakpoint classes */
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:',
} as const;

/**
 * Gradient Backgrounds
 * Commonly used gradient patterns
 */
export const GRADIENTS = {
  /** Primary brand gradient */
  primary: 'bg-gradient-to-r from-primary-600 to-primary-400',
  /** Secondary brand gradient */
  secondary: 'bg-gradient-to-r from-gray-700 to-gray-500',
  /** Success gradient */
  success: 'bg-gradient-to-r from-green-600 to-emerald-400',
  /** Warning gradient */
  warning: 'bg-gradient-to-r from-yellow-500 to-orange-400',
  /** Error/danger gradient */
  danger: 'bg-gradient-to-r from-red-600 to-rose-400',
  /** Info gradient */
  info: 'bg-gradient-to-r from-blue-600 to-cyan-400',
  /** Subtle background gradient */
  subtle: 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800',
  /** Card highlight gradient */
  highlight: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900',
  /** Hero section gradient */
  hero: 'bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900',
  /** Mesh gradient effect */
  mesh: 'bg-[radial-gradient(at_top_left,_var(--tw-gradient-stops))] from-primary-100 via-white to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800',
} as const;

/**
 * Border Radius Scale
 * Consistent rounding values
 */
export const RADIUS = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  default: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
} as const;

/**
 * Opacity Scale
 * Consistent opacity values
 */
export const OPACITY = {
  0: 'opacity-0',
  5: 'opacity-5',
  10: 'opacity-10',
  20: 'opacity-20',
  25: 'opacity-25',
  30: 'opacity-30',
  40: 'opacity-40',
  50: 'opacity-50',
  60: 'opacity-60',
  70: 'opacity-70',
  75: 'opacity-75',
  80: 'opacity-80',
  90: 'opacity-90',
  95: 'opacity-95',
  100: 'opacity-100',
} as const;

/**
 * Container Widths
 * Max-width constraints for content containers
 */
export const CONTAINER_WIDTHS = {
  /** Prose/article content (65ch) */
  prose: 'max-w-prose',
  /** Extra small container */
  xs: 'max-w-xs',
  /** Small container */
  sm: 'max-w-sm',
  /** Medium container */
  md: 'max-w-md',
  /** Large container */
  lg: 'max-w-lg',
  /** Extra large container */
  xl: 'max-w-xl',
  /** 2XL container */
  '2xl': 'max-w-2xl',
  /** 3XL container */
  '3xl': 'max-w-3xl',
  /** 4XL container */
  '4xl': 'max-w-4xl',
  /** 5XL container */
  '5xl': 'max-w-5xl',
  /** 6XL container */
  '6xl': 'max-w-6xl',
  /** 7XL container */
  '7xl': 'max-w-7xl',
  /** Full width */
  full: 'max-w-full',
  /** Screen width */
  screen: 'max-w-screen-xl',
} as const;

/**
 * Aspect Ratios
 * Common aspect ratio patterns
 */
export const ASPECT_RATIOS = {
  auto: 'aspect-auto',
  square: 'aspect-square',
  video: 'aspect-video',
  /** 4:3 ratio */
  '4/3': 'aspect-[4/3]',
  /** 3:2 ratio */
  '3/2': 'aspect-[3/2]',
  /** 16:10 ratio */
  '16/10': 'aspect-[16/10]',
  /** Portrait */
  portrait: 'aspect-[3/4]',
} as const;

/**
 * Skeleton Loading Patterns
 * Placeholder content while loading
 */
export const SKELETON = {
  /** Base skeleton styles */
  base: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
  /** Text line skeleton */
  text: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4',
  /** Heading skeleton */
  heading: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-3/4',
  /** Avatar skeleton */
  avatar: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full h-10 w-10',
  /** Button skeleton */
  button: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-10 w-24',
  /** Card skeleton */
  card: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48',
  /** Image skeleton */
  image: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg aspect-video',
} as const;

/**
 * Divider Styles
 * Horizontal and vertical separators
 */
export const DIVIDERS = {
  /** Horizontal light divider */
  horizontal: 'border-t border-gray-200 dark:border-gray-700',
  /** Horizontal dark divider */
  horizontalDark: 'border-t border-gray-300 dark:border-gray-600',
  /** Vertical light divider */
  vertical: 'border-l border-gray-200 dark:border-gray-700 h-full',
  /** Vertical dark divider */
  verticalDark: 'border-l border-gray-300 dark:border-gray-600 h-full',
  /** Dashed horizontal */
  dashed: 'border-t border-dashed border-gray-200 dark:border-gray-700',
  /** With text (use with content) */
  withText: 'flex items-center gap-4 before:flex-1 before:border-t before:border-gray-200 dark:before:border-gray-700 after:flex-1 after:border-t after:border-gray-200 dark:after:border-gray-700',
} as const;

/**
 * Scroll Styles
 * Custom scrollbar styling
 */
export const SCROLLBAR = {
  /** Hide scrollbar but keep scroll functionality */
  hidden: 'scrollbar-hide',
  /** Thin scrollbar */
  thin: 'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent',
  /** Default scrollbar */
  default: 'scrollbar scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800',
} as const;

/**
 * Focus Ring Styles
 * Consistent focus indicators for accessibility
 */
export const FOCUS_RING = {
  /** Default focus ring */
  default: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  /** Focus ring without offset */
  noOffset: 'focus:outline-none focus:ring-2 focus:ring-primary-500',
  /** Focus visible only */
  visible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  /** Error state focus */
  error: 'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
  /** Within (for focus-within) */
  within: 'focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500',
} as const;

/**
 * Truncation Styles
 * Text overflow handling
 */
export const TRUNCATE = {
  /** Single line truncation */
  single: 'truncate',
  /** Two line clamp */
  twoLines: 'line-clamp-2',
  /** Three line clamp */
  threeLines: 'line-clamp-3',
  /** Four line clamp */
  fourLines: 'line-clamp-4',
} as const;

/**
 * Print Styles
 * Classes for print media
 */
export const PRINT = {
  /** Hide on print */
  hide: 'print:hidden',
  /** Show only on print */
  only: 'hidden print:block',
  /** Remove background on print */
  noBg: 'print:bg-transparent',
  /** Force black text on print */
  blackText: 'print:text-black',
} as const;

/**
 * State Variants
 * Interactive state styling
 */
export const STATES = {
  /** Disabled state */
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  /** Loading state */
  loading: 'opacity-70 pointer-events-none cursor-wait',
  /** Selected state */
  selected: 'ring-2 ring-primary-500 ring-offset-2',
  /** Active/pressed state */
  active: 'active:scale-95 transition-transform',
  /** Error state */
  error: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
} as const;

/**
 * Helper function to combine design tokens
 *
 * @param tokens - Variable number of token strings to combine
 * @returns Combined class string
 *
 * @example
 * ```tsx
 * combineTokens(LAYOUTS.flex.center, SPACING.padding.md, COLORS.background.primary)
 * // Returns: 'flex items-center justify-center p-4 bg-white dark:bg-gray-900'
 * ```
 */
export const combineTokens = (...tokens: (string | undefined | null | false)[]): string =>
  tokens.filter(Boolean).join(' ');

/**
 * Conditional token helper
 *
 * @param condition - Boolean condition
 * @param trueToken - Token to use if condition is true
 * @param falseToken - Token to use if condition is false (optional)
 * @returns Token string based on condition
 *
 * @example
 * ```tsx
 * conditionalToken(isActive, STATUS_BADGES.success, STATUS_BADGES.neutral)
 * ```
 */
export const conditionalToken = (
  condition: boolean,
  trueToken: string,
  falseToken?: string
): string => (condition ? trueToken : falseToken ?? '');

/**
 * Status to badge mapping helper
 *
 * @param status - Status string
 * @returns Appropriate badge class
 *
 * @example
 * ```tsx
 * <span className={getStatusBadge('active')}>Active</span>
 * ```
 */
export const getStatusBadge = (
  status: 'active' | 'inactive' | 'pending' | 'archived' | 'success' | 'warning' | 'error' | 'info' | string
): string => {
  const statusMap: Record<string, string> = {
    active: STATUS_BADGES.success,
    inactive: STATUS_BADGES.neutral,
    pending: STATUS_BADGES.warning,
    archived: STATUS_BADGES.error,
    success: STATUS_BADGES.success,
    warning: STATUS_BADGES.warning,
    error: STATUS_BADGES.error,
    info: STATUS_BADGES.info,
  };

  return statusMap[status] ?? STATUS_BADGES.neutral;
};
