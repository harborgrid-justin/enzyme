/**
 * Enzyme VS Code Extension - Enterprise Design System
 * Centralized design tokens, colors, icons, and animation definitions
 * Following VS Code UX Guidelines and Microsoft Design principles
 */

// =============================================================================
// COLOR SYSTEM
// =============================================================================

export const Colors = {
  // Primary semantic colors (use VS Code CSS variables with fallbacks)
  primary: 'var(--vscode-button-background, #0078d4)',
  primaryHover: 'var(--vscode-button-hoverBackground, #106ebe)',
  primaryActive: 'var(--vscode-button-background, #005a9e)',

  // Secondary colors
  secondary: 'var(--vscode-button-secondaryBackground, #3a3d41)',
  secondaryHover: 'var(--vscode-button-secondaryHoverBackground, #45494e)',
  secondaryForeground: 'var(--vscode-button-secondaryForeground, #ffffff)',

  // Status colors
  success: 'var(--vscode-terminal-ansiGreen, #4ec9b0)',
  successBackground: 'var(--vscode-inputValidation-infoBackground, rgba(78, 201, 176, 0.1))',
  warning: 'var(--vscode-terminal-ansiYellow, #dcdcaa)',
  warningBackground: 'var(--vscode-inputValidation-warningBackground, rgba(220, 220, 170, 0.1))',
  error: 'var(--vscode-terminal-ansiRed, #f14c4c)',
  errorBackground: 'var(--vscode-inputValidation-errorBackground, rgba(241, 76, 76, 0.1))',
  info: 'var(--vscode-terminal-ansiBlue, #3794ff)',
  infoBackground: 'var(--vscode-inputValidation-infoBackground, rgba(55, 148, 255, 0.1))',

  // Brand colors
  enzyme: '#6366f1',
  enzymeLight: '#818cf8',
  enzymeDark: '#4f46e5',

  // Text colors
  foreground: 'var(--vscode-foreground, #cccccc)',
  foregroundMuted: 'var(--vscode-descriptionForeground, #8b8b8b)',
  foregroundDisabled: 'var(--vscode-disabledForeground, #6b6b6b)',

  // Background colors
  background: 'var(--vscode-editor-background, #1e1e1e)',
  backgroundSecondary: 'var(--vscode-sideBar-background, #252526)',
  backgroundTertiary: 'var(--vscode-input-background, #3c3c3c)',

  // Border colors
  border: 'var(--vscode-panel-border, #454545)',
  borderActive: 'var(--vscode-focusBorder, #007acc)',

  // Gradient definitions
  gradientPrimary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  gradientWarning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  gradientError: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
} as const;

// =============================================================================
// ICON SYSTEM (Codicons)
// =============================================================================

export const Icons = {
  // Navigation
  home: 'codicon-home',
  back: 'codicon-arrow-left',
  forward: 'codicon-arrow-right',
  close: 'codicon-close',
  menu: 'codicon-menu',

  // Actions
  add: 'codicon-add',
  remove: 'codicon-remove',
  edit: 'codicon-edit',
  delete: 'codicon-trash',
  save: 'codicon-save',
  refresh: 'codicon-refresh',
  sync: 'codicon-sync',
  search: 'codicon-search',
  filter: 'codicon-filter',

  // Status
  check: 'codicon-check',
  checkAll: 'codicon-check-all',
  error: 'codicon-error',
  warning: 'codicon-warning',
  info: 'codicon-info',
  loading: 'codicon-loading',
  pass: 'codicon-pass',

  // Enzyme-specific
  enzyme: 'codicon-beaker',
  feature: 'codicon-extensions',
  route: 'codicon-type-hierarchy',
  component: 'codicon-symbol-class',
  store: 'codicon-database',
  api: 'codicon-globe',
  hook: 'codicon-symbol-method',

  // Tools
  settings: 'codicon-settings-gear',
  terminal: 'codicon-terminal',
  debug: 'codicon-debug',
  inspect: 'codicon-inspect',
  preview: 'codicon-open-preview',

  // Files
  file: 'codicon-file',
  folder: 'codicon-folder',
  fileCode: 'codicon-file-code',
  newFile: 'codicon-new-file',
  newFolder: 'codicon-new-folder',

  // Setup wizard
  rocket: 'codicon-rocket',
  package: 'codicon-package',
  tools: 'codicon-tools',
  wand: 'codicon-wand',
  checklist: 'codicon-checklist',
  verified: 'codicon-verified',
  sparkle: 'codicon-sparkle',

  // Performance & monitoring
  pulse: 'codicon-pulse',
  dashboard: 'codicon-dashboard',
  graph: 'codicon-graph',
  history: 'codicon-history',

  // Documents
  book: 'codicon-book',
  notebook: 'codicon-notebook',
  output: 'codicon-output',
  report: 'codicon-report',
} as const;

// =============================================================================
// SPACING SYSTEM (8px base)
// =============================================================================

export const Spacing = {
  xxs: '2px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const Typography = {
  // Font families
  fontFamily: 'var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
  fontFamilyMono: 'var(--vscode-editor-font-family, "Cascadia Code", Consolas, monospace)',

  // Font sizes
  fontSizeXs: '10px',
  fontSizeSm: '11px',
  fontSizeMd: '13px',
  fontSizeLg: '16px',
  fontSizeXl: '20px',
  fontSizeXxl: '24px',
  fontSizeHero: '32px',

  // Font weights
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',

  // Line heights
  lineHeightTight: '1.2',
  lineHeightNormal: '1.5',
  lineHeightRelaxed: '1.75',
} as const;

// =============================================================================
// ANIMATIONS
// =============================================================================

export const Animations = {
  // Durations
  durationFast: '100ms',
  durationNormal: '200ms',
  durationSlow: '300ms',
  durationVerySlow: '500ms',

  // Easings
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',

  // Common transitions
  transitionAll: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  transitionColors: 'color 200ms, background-color 200ms, border-color 200ms',
  transitionTransform: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  transitionOpacity: 'opacity 200ms ease-out',
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const Shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  glow: '0 0 20px rgba(99, 102, 241, 0.3)',
  glowSuccess: '0 0 20px rgba(16, 185, 129, 0.3)',
  glowError: '0 0 20px rgba(239, 68, 68, 0.3)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const BorderRadius = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  xxl: '16px',
  full: '9999px',
} as const;

// =============================================================================
// Z-INDEX LAYERS
// =============================================================================

export const ZIndex = {
  base: '0',
  dropdown: '100',
  sticky: '200',
  fixed: '300',
  modal: '400',
  popover: '500',
  tooltip: '600',
  toast: '700',
} as const;

// =============================================================================
// VISUAL HIERARCHY LEVELS
// =============================================================================

export const VisualHierarchy = {
  critical: {
    fontSize: Typography.fontSizeXxl,
    fontWeight: Typography.fontWeightBold,
    color: Colors.foreground,
    padding: Spacing.xl,
  },
  primary: {
    fontSize: Typography.fontSizeLg,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.foreground,
    padding: Spacing.lg,
  },
  secondary: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.fontWeightMedium,
    color: Colors.foreground,
    padding: Spacing.md,
  },
  tertiary: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightNormal,
    color: Colors.foregroundMuted,
    padding: Spacing.sm,
  },
} as const;

// =============================================================================
// COMPONENT PRESETS
// =============================================================================

export const ComponentPresets = {
  button: {
    base: `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: ${Spacing.sm};
      padding: ${Spacing.sm} ${Spacing.lg};
      border-radius: ${BorderRadius.md};
      font-size: ${Typography.fontSizeMd};
      font-weight: ${Typography.fontWeightMedium};
      cursor: pointer;
      transition: ${Animations.transitionAll};
      border: 1px solid transparent;
    `,
    primary: `
      background: ${Colors.primary};
      color: #ffffff;
      &:hover { background: ${Colors.primaryHover}; transform: translateY(-1px); }
      &:active { transform: translateY(0); }
    `,
    secondary: `
      background: ${Colors.secondary};
      color: ${Colors.secondaryForeground};
      &:hover { background: ${Colors.secondaryHover}; }
    `,
    ghost: `
      background: transparent;
      color: ${Colors.foreground};
      &:hover { background: ${Colors.backgroundTertiary}; }
    `,
  },
  card: {
    base: `
      background: ${Colors.backgroundSecondary};
      border: 1px solid ${Colors.border};
      border-radius: ${BorderRadius.lg};
      padding: ${Spacing.lg};
      transition: ${Animations.transitionAll};
    `,
    interactive: `
      cursor: pointer;
      &:hover {
        border-color: ${Colors.borderActive};
        box-shadow: ${Shadows.md};
        transform: translateY(-2px);
      }
    `,
    highlighted: `
      border-color: ${Colors.enzyme};
      box-shadow: ${Shadows.glow};
    `,
  },
  input: {
    base: `
      background: ${Colors.backgroundTertiary};
      border: 1px solid ${Colors.border};
      border-radius: ${BorderRadius.md};
      padding: ${Spacing.sm} ${Spacing.md};
      color: ${Colors.foreground};
      font-size: ${Typography.fontSizeMd};
      transition: ${Animations.transitionColors};
      &:focus {
        outline: none;
        border-color: ${Colors.borderActive};
      }
    `,
  },
} as const;

// =============================================================================
// CSS GENERATOR FUNCTIONS
// =============================================================================

/**
 * Generate CSS variables for the design system
 */
export function generateCSSVariables(): string {
  return `
    :root {
      /* Colors */
      --enzyme-color-primary: ${Colors.enzyme};
      --enzyme-color-primary-light: ${Colors.enzymeLight};
      --enzyme-color-primary-dark: ${Colors.enzymeDark};
      --enzyme-color-success: ${Colors.success};
      --enzyme-color-warning: ${Colors.warning};
      --enzyme-color-error: ${Colors.error};
      --enzyme-color-info: ${Colors.info};

      /* Spacing */
      --enzyme-spacing-xxs: ${Spacing.xxs};
      --enzyme-spacing-xs: ${Spacing.xs};
      --enzyme-spacing-sm: ${Spacing.sm};
      --enzyme-spacing-md: ${Spacing.md};
      --enzyme-spacing-lg: ${Spacing.lg};
      --enzyme-spacing-xl: ${Spacing.xl};
      --enzyme-spacing-xxl: ${Spacing.xxl};

      /* Typography */
      --enzyme-font-size-sm: ${Typography.fontSizeSm};
      --enzyme-font-size-md: ${Typography.fontSizeMd};
      --enzyme-font-size-lg: ${Typography.fontSizeLg};
      --enzyme-font-size-xl: ${Typography.fontSizeXl};

      /* Animations */
      --enzyme-duration-fast: ${Animations.durationFast};
      --enzyme-duration-normal: ${Animations.durationNormal};
      --enzyme-duration-slow: ${Animations.durationSlow};

      /* Border Radius */
      --enzyme-radius-sm: ${BorderRadius.sm};
      --enzyme-radius-md: ${BorderRadius.md};
      --enzyme-radius-lg: ${BorderRadius.lg};

      /* Shadows */
      --enzyme-shadow-sm: ${Shadows.sm};
      --enzyme-shadow-md: ${Shadows.md};
      --enzyme-shadow-lg: ${Shadows.lg};
      --enzyme-shadow-glow: ${Shadows.glow};
    }
  `;
}

/**
 * Generate animation keyframes
 */
export function generateAnimationKeyframes(): string {
  return `
    @keyframes enzyme-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes enzyme-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes enzyme-slide-in-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes enzyme-slide-in-down {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes enzyme-slide-in-left {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes enzyme-slide-in-right {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes enzyme-scale-in {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes enzyme-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    @keyframes enzyme-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes enzyme-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes enzyme-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes enzyme-progress {
      0% { width: 0%; }
      100% { width: 100%; }
    }

    @keyframes enzyme-glow-pulse {
      0%, 100% { box-shadow: 0 0 10px rgba(99, 102, 241, 0.3); }
      50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.6); }
    }

    @keyframes enzyme-checkmark {
      0% { stroke-dashoffset: 100; }
      100% { stroke-dashoffset: 0; }
    }

    @keyframes enzyme-confetti {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
    }
  `;
}
