/**
 * @file Zero-Config Auto-Setup System
 * @description PhD-level automatic configuration and initialization system that
 * detects environment, capabilities, and user preferences to configure the library
 * with zero configuration required.
 *
 * Features:
 * - Single-line initialization
 * - Automatic environment detection (dev/staging/prod)
 * - Intelligent provider composition
 * - Auto-configuration based on context
 * - Performance monitoring auto-start
 * - Accessibility auto-enhancement
 */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import type React from 'react';
import { type ComponentType, createElement, type ReactNode } from 'react';
import { isDev, isTest } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Environment type
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Detected environment info
 */
export interface EnvironmentInfo {
  /** Environment type */
  type: Environment;
  /** Base URL */
  baseUrl: string;
  /** Is SSR */
  isSSR: boolean;
  /** Is browser */
  isBrowser: boolean;
  /** Debug mode enabled */
  debugMode: boolean;
  /** API endpoint */
  apiEndpoint: string | null;
  /** Version */
  version: string | null;
}

/**
 * Feature flags for auto-setup
 */
export interface AutoSetupFeatures {
  /** Enable performance monitoring */
  performance?: boolean;
  /** Enable error tracking */
  errorTracking?: boolean;
  /** Enable analytics */
  analytics?: boolean;
  /** Enable accessibility enhancements */
  accessibility?: boolean;
  /** Enable real-time features */
  realtime?: boolean;
  /** Enable offline support */
  offline?: boolean;
  /** Enable theming */
  theming?: boolean;
  /** Enable hydration system */
  hydration?: boolean;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider component */
  Provider: ComponentType<{ children: ReactNode }>;
  /** Provider props */
  props?: Record<string, unknown>;
  /** Priority (higher = outer) */
  priority?: number;
  /** Enabled condition */
  enabled?: boolean | (() => boolean);
}

/**
 * Auto-setup configuration
 */
export interface AutoSetupConfig {
  /** Features to enable */
  features?: AutoSetupFeatures;
  /** Custom providers */
  providers?: ProviderConfig[];
  /** Override environment detection */
  environment?: Environment;
  /** Enable debug logging */
  debug?: boolean;
  /** Analytics endpoint */
  analyticsEndpoint?: string;
  /** Error reporting endpoint */
  errorEndpoint?: string;
  /** Custom initialization */
  onInit?: (env: EnvironmentInfo) => void | Promise<void>;
  /** Custom cleanup */
  onCleanup?: () => void;
}

/**
 * Auto-setup result
 */
export interface AutoSetupResult {
  /** Environment info */
  environment: EnvironmentInfo;
  /** Active features */
  features: AutoSetupFeatures;
  /** Composed provider */
  Provider: ComponentType<{ children: ReactNode }>;
  /** Cleanup function */
  cleanup: () => void;
  /** Re-initialize */
  reinit: () => Promise<void>;
}

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Detect current environment
 */
export function detectEnvironment(): EnvironmentInfo {
  const isBrowser = typeof window !== 'undefined';
  const isSSR = !isBrowser;

  let type: Environment = 'production';
  let debugMode = false;
  let baseUrl = '';
  let apiEndpoint: string | null = null;
  let version: string | null = null;

  if (isBrowser) {
    const {hostname} = window.location;
    baseUrl = window.location.origin;

    // Detect environment from hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      type = 'development';
      debugMode = true;
    } else if (hostname.includes('staging') || hostname.includes('stage')) {
      type = 'staging';
      debugMode = true;
    } else if (hostname.includes('test') || hostname.includes('preview')) {
      type = 'test';
      debugMode = true;
    }

    // Check for environment meta tags
    const envMeta = document.querySelector('meta[name="environment"]');
    if (envMeta) {
      type = envMeta.getAttribute('content') as Environment;
    }

    // Check for debug mode
    const debugMeta = document.querySelector('meta[name="debug"]');
    if (debugMeta) {
      debugMode = debugMeta.getAttribute('content') === 'true';
    }

    // Check for API endpoint
    const apiMeta = document.querySelector('meta[name="api-endpoint"]');
    if (apiMeta) {
      apiEndpoint = apiMeta.getAttribute('content');
    }

    // Check for version
    const versionMeta = document.querySelector('meta[name="version"]');
    if (versionMeta) {
      version = versionMeta.getAttribute('content');
    }

    // Check URL params for debug override
    const params = new URLSearchParams(window.location.search);
    if (params.has('debug')) {
      debugMode = params.get('debug') !== 'false';
    }
  }

  // Check environment using centralized helpers
  if (isDev()) {
    type = 'development';
    debugMode = true;
  } else if (isTest()) {
    type = 'test';
  }

  // Check import.meta.env for additional config if available
  if (typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL !== '') {
    apiEndpoint = import.meta.env.VITE_API_URL;
  }

  if (typeof import.meta.env.VITE_APP_VERSION === 'string' && import.meta.env.VITE_APP_VERSION !== '') {
    version = import.meta.env.VITE_APP_VERSION;
  }

  return {
    type,
    baseUrl,
    isSSR,
    isBrowser,
    debugMode,
    apiEndpoint,
    version,
  };
}

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Detect available features based on environment
 */
export function detectAvailableFeatures(env: EnvironmentInfo): AutoSetupFeatures {


  return {
    performance: true,
    errorTracking: true,
    analytics: env.type === 'production',
    accessibility: true,
    realtime: env.isBrowser,
    offline: env.isBrowser && 'serviceWorker' in navigator,
    theming: env.isBrowser,
    hydration: env.isSSR || (env.isBrowser && document.querySelector('[data-ssr]') !== null),
  };
}

// ============================================================================
// Provider Composition
// ============================================================================

/**
 * Compose multiple providers into a single provider
 */
export function composeProviders(
  providers: ProviderConfig[]
): ComponentType<{ children: ReactNode }> {
  // Filter enabled providers and sort by priority
  const activeProviders = providers
    .filter((p) => {

      return typeof p.enabled === 'function' ? p.enabled() : p.enabled ?? true;
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  // Create composed provider
  return function ComposedProvider({ children }: { children: ReactNode }) {
    return activeProviders.reduceRight((acc, { Provider, props }) => {
      return createElement(Provider, { ...props, children: acc });
    }, children as React.ReactElement);
  };
}

// ============================================================================
// Auto Setup Class
// ============================================================================

/**
 * Auto-setup manager
 */
export class AutoSetup {
  private static instance: AutoSetup;
  private config: AutoSetupConfig;
  private readonly environment: EnvironmentInfo;
  private readonly features: AutoSetupFeatures;
  private providers: ProviderConfig[] = [];
  private cleanupFns: Array<() => void> = [];
  private isInitialized = false;

  constructor(config: AutoSetupConfig = {}) {
    this.config = config;
    this.environment = config.environment
      ? { ...detectEnvironment(), type: config.environment }
      : detectEnvironment();
    this.features = {
      ...detectAvailableFeatures(this.environment),
      ...config.features,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: AutoSetupConfig): AutoSetup {
    if (!AutoSetup.instance) {
      AutoSetup.instance = new AutoSetup(config);
    }
    return AutoSetup.instance;
  }

  /**
   * Reset singleton
   */
  static reset(): void {
    if (AutoSetup.instance) {
      AutoSetup.instance.cleanup();
      // Type-safe null assignment for singleton reset
      (AutoSetup as unknown as { instance: AutoSetup | null }).instance = null;
    }
  }

  /**
   * Initialize the auto-setup
   */
  async init(): Promise<AutoSetupResult> {
    if (this.isInitialized) {
      return this.getResult();
    }

    this.log('Initializing auto-setup...');
    this.log('Environment:', this.environment);
    this.log('Features:', this.features);

    // Initialize features
    await this.initializeFeatures();

    // Add custom providers
    if (this.config.providers) {
      this.providers.push(...this.config.providers);
    }

    // Call custom init
    if (this.config.onInit) {
      await this.config.onInit(this.environment);
    }

    this.isInitialized = true;
    this.log('Auto-setup complete');

    return this.getResult();
  }

  /**
   * Cleanup all initialized features
   */
  cleanup(): void {
    this.cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch {
        // Ignore cleanup errors
      }
    });
    this.cleanupFns = [];

    if (this.config.onCleanup) {
      this.config.onCleanup();
    }

    this.isInitialized = false;
  }

  /**
   * Re-initialize
   */
  async reinit(): Promise<void> {
    this.cleanup();
    await this.init();
  }

  /**
   * Add a provider
   */
  addProvider(config: ProviderConfig): void {
    this.providers.push(config);
  }

  /**
   * Get environment info
   */
  getEnvironment(): EnvironmentInfo {
    return { ...this.environment };
  }

  /**
   * Get active features
   */
  getFeatures(): AutoSetupFeatures {
    return { ...this.features };
  }

  /**
   * Initialize features
   */
  private async initializeFeatures(): Promise<void> {
    if (this.environment.isSSR) return;

    // Performance monitoring
    if (this.features.performance) {
      try {
        const { initPerformanceMonitoring } = await import('../performance');
        const cleanup = await initPerformanceMonitoring({
          debug: this.config.debug ?? this.environment.debugMode,
          reportToAnalytics: this.environment.type === 'production',
        });
        this.cleanupFns.push(cleanup);
        this.log('Performance monitoring initialized');
      } catch {
        this.log('Performance monitoring not available');
      }
    }

    // Accessibility
    if (this.features.accessibility) {
      try {
        const { initAnnouncer, installSkipLinks } = await import('./accessibility-enhancer');
        initAnnouncer();
        installSkipLinks();
        this.log('Accessibility enhancements initialized');
      } catch {
        this.log('Accessibility enhancer not available');
      }
    }

    // Theming
    if (this.features.theming) {
      try {
        const { getResponsiveManager } = await import('./responsive-optimizer');
        getResponsiveManager();
        this.log('Responsive manager initialized');
      } catch {
        this.log('Responsive manager not available');
      }
    }
  }

  /**
   * Get the result
   */
  private getResult(): AutoSetupResult {
    return {
      environment: this.environment,
      features: this.features,
      Provider: composeProviders(this.providers),
      cleanup: () => this.cleanup(),
      reinit: async () => this.reinit(),
    };
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug || this.environment.debugMode) {
      console.info(`[AutoSetup] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Quick Setup Functions
// ============================================================================

/**
 * One-line initialization
 */
export async function autoSetup(config?: AutoSetupConfig): Promise<AutoSetupResult> {
  return AutoSetup.getInstance(config).init();
}

/**
 * Get the auto-setup instance
 */
export function getAutoSetup(config?: AutoSetupConfig): AutoSetup {
  return AutoSetup.getInstance(config);
}

/**
 * Reset auto-setup
 */
export function resetAutoSetup(): void {
  AutoSetup.reset();
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * Hook for accessing auto-setup state
 */
export function useAutoSetup(): {
  environment: EnvironmentInfo;
  features: AutoSetupFeatures;
  isInitialized: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  isSSR: boolean;
} {
  const setup = AutoSetup.getInstance();
  const env = setup.getEnvironment();
  const features = setup.getFeatures();

  return {
    environment: env,
    features,
    isInitialized: true,
    isDevelopment: env.type === 'development',
    isProduction: env.type === 'production',
    isSSR: env.isSSR,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  AutoSetup,
  autoSetup,
  getAutoSetup,
  resetAutoSetup,
  detectEnvironment,
  detectAvailableFeatures,
  composeProviders,
  useAutoSetup,
};
