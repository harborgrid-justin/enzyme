/**
 * @file Configuration Templates
 * @description Predefined configuration templates for different use cases
 */

import type { EnzymeConfigSchema } from '../config-schema';

// =============================================================================
// Template Types
// =============================================================================

/**
 * Configuration template
 */
export interface ConfigTemplate {
  name: string;
  description: string;
  category: 'starter' | 'feature' | 'environment' | 'full';
  config: Partial<EnzymeConfigSchema>;
}

// =============================================================================
// Starter Templates
// =============================================================================

/**
 * Minimal configuration template
 */
export const minimalTemplate: ConfigTemplate = {
  name: 'Minimal',
  description: 'Minimal Enzyme configuration with essential settings',
  category: 'starter',
  config: {
    name: 'My Enzyme App',
    version: '1.0.0',
    environment: 'development',

    api: {
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
      mockEnabled: false,
      mockDelay: 0,
    },

    devServer: {
      port: 3000,
      host: 'localhost',
      open: true,
      hmr: true,
      https: false,
      cors: false,
    },
  },
};

/**
 * Standard configuration template
 */
export const standardTemplate: ConfigTemplate = {
  name: 'Standard',
  description: 'Standard configuration with common features',
  category: 'starter',
  config: {
    name: 'My Enzyme App',
    version: '1.0.0',
    description: 'A modern React application built with Enzyme',
    environment: 'development',

    api: {
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
      },
      mockEnabled: false,
      mockDelay: 0,
    },

    auth: {
      enabled: true,
      provider: 'jwt',
      tokenKey: 'auth_token',
      refreshKey: 'refresh_token',
      tokenExpiry: 3600,
      refreshInterval: 300,
      loginPath: '/auth/login',
      logoutPath: '/auth/logout',
      persistSession: true,
      redirectAfterLogin: '/',
      redirectAfterLogout: '/login',
      secureCookies: true,
    },

    routes: {
      basePath: '/',
      routes: [
        {
          path: '/',
          component: './pages/Home',
        },
        {
          path: '/about',
          component: './pages/About',
        },
      ],
    },

    devServer: {
      port: 3000,
      host: 'localhost',
      open: true,
      hmr: true,
      cors: true,
      https: false,
    },

    performance: {
      lazyLoading: true,
      codesplitting: true,
      prefetch: true,
      compression: true,
      preload: false,
      bundleAnalysis: false,
      sourceMaps: true,
      minify: true,
    },
  },
};

/**
 * Full-featured configuration template
 */
export const fullTemplate: ConfigTemplate = {
  name: 'Full-Featured',
  description: 'Complete configuration with all features enabled',
  category: 'full',
  config: {
    name: 'My Enzyme App',
    version: '1.0.0',
    description: 'A modern React application built with Enzyme',
    environment: 'development',

    api: {
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
      },
      mockEnabled: false,
      mockDelay: 500,
    },

    auth: {
      enabled: true,
      provider: 'jwt',
      tokenKey: 'auth_token',
      refreshKey: 'refresh_token',
      tokenExpiry: 3600,
      refreshInterval: 300,
      loginPath: '/auth/login',
      logoutPath: '/auth/logout',
      redirectAfterLogin: '/',
      redirectAfterLogout: '/auth/login',
      persistSession: true,
      secureCookies: true,
    },

    routes: {
      basePath: '/',
      routes: [
        {
          path: '/',
          component: './pages/Home',
          metadata: {
            title: 'Home',
            description: 'Welcome to our application',
          },
        },
        {
          path: '/dashboard',
          component: './pages/Dashboard',
          lazy: true,
          guards: [
            {
              type: 'auth',
              redirect: '/auth/login',
            },
          ],
          metadata: {
            title: 'Dashboard',
          },
        },
      ],
      notFound: './pages/NotFound',
      error: './pages/Error',
    },

    features: {
      enabled: true,
      source: 'local',
      pollInterval: 60000,
      flags: [],
    },

    devServer: {
      port: 3000,
      host: 'localhost',
      open: true,
      https: false,
      hmr: true,
      cors: true,
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      minify: 'esbuild',
      target: 'es2020',
      polyfills: true,
      cssCodeSplit: true,
    },

    performance: {
      lazyLoading: true,
      codesplitting: true,
      prefetch: true,
      preload: false,
      compression: true,
      bundleAnalysis: false,
      sourceMaps: true,
      minify: true,
    },

    monitoring: {
      enabled: false,
      performanceMonitoring: true,
      errorReporting: true,
    },

    logging: {
      level: 'info',
      format: 'pretty',
      outputs: ['console'],
    },
  },
};

// =============================================================================
// Feature-Specific Templates
// =============================================================================

/**
 * Authentication-focused template
 */
export const authTemplate: ConfigTemplate = {
  name: 'Authentication',
  description: 'Configuration focused on authentication features',
  category: 'feature',
  config: {
    name: 'My Enzyme App',
    version: '1.0.0',
    environment: 'development',

    auth: {
      enabled: true,
      provider: 'oauth',
      tokenKey: 'auth_token',
      refreshKey: 'refresh_token',
      tokenExpiry: 3600,
      refreshInterval: 300,
      loginPath: '/auth/login',
      logoutPath: '/auth/logout',
      redirectAfterLogin: '/dashboard',
      redirectAfterLogout: '/auth/login',
      persistSession: true,
      secureCookies: true,
      oauth: {
        google: {
          clientId: 'YOUR_GOOGLE_CLIENT_ID',
          redirectUri: 'http://localhost:3000/auth/callback',
          scopes: ['openid', 'profile', 'email'],
        },
      },
    },

    routes: {
      basePath: '/',
      routes: [
        {
          path: '/auth/login',
          component: './pages/auth/Login',
        },
        {
          path: '/auth/register',
          component: './pages/auth/Register',
        },
        {
          path: '/auth/callback',
          component: './pages/auth/Callback',
        },
        {
          path: '/dashboard',
          component: './pages/Dashboard',
          guards: [
            {
              type: 'auth',
              redirect: '/auth/login',
            },
          ],
        },
      ],
    },
  },
};

/**
 * API-heavy application template
 */
export const apiTemplate: ConfigTemplate = {
  name: 'API-Heavy',
  description: 'Configuration optimized for API-heavy applications',
  category: 'feature',
  config: {
    name: 'My Enzyme App',
    version: '1.0.0',
    environment: 'development',

    api: {
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
      },
      endpoints: {
        users: {
          url: '/users',
          method: 'GET',
          cache: true,
        },
        posts: {
          url: '/posts',
          method: 'GET',
          cache: true,
        },
        createPost: {
          url: '/posts',
          method: 'POST',
        },
      },
      mockEnabled: true,
      mockDelay: 500,
    },

    performance: {
      lazyLoading: true,
      codesplitting: true,
      prefetch: true,
      preload: false,
      compression: false,
      bundleAnalysis: false,
      sourceMaps: true,
      minify: false,
    },
  },
};

/**
 * Feature flags template
 */
export const featureFlagsTemplate: ConfigTemplate = {
  name: 'Feature Flags',
  description: 'Configuration with feature flags system',
  category: 'feature',
  config: {
    name: 'My Enzyme App',
    version: '1.0.0',
    environment: 'development',

    features: {
      enabled: true,
      source: 'hybrid',
      remoteUrl: 'https://flags.example.com',
      pollInterval: 60000,
      flags: [
        {
          key: 'new-dashboard',
          enabled: false,
          description: 'New dashboard redesign',
          rolloutPercentage: 10,
        },
        {
          key: 'dark-mode',
          enabled: true,
          description: 'Dark mode theme',
        },
        {
          key: 'analytics',
          enabled: true,
          description: 'Analytics integration',
        },
      ],
      localOverrides: {},
    },
  },
};

// =============================================================================
// Environment-Specific Templates
// =============================================================================

/**
 * Development environment template
 */
export const developmentTemplate: ConfigTemplate = {
  name: 'Development',
  description: 'Optimized for development environment',
  category: 'environment',
  config: {
    name: 'My Enzyme App',
    version: '1.0.0',
    environment: 'development',

    devServer: {
      port: 3000,
      host: 'localhost',
      open: true,
      hmr: true,
      cors: true,
      https: false,
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      minify: false,
      target: 'es2020',
      polyfills: true,
      cssCodeSplit: true,
    },

    logging: {
      level: 'debug',
      format: 'pretty',
      outputs: ['console'],
    },

    monitoring: {
      enabled: false,
      performanceMonitoring: false,
      errorReporting: false,
    },
  },
};

/**
 * Production environment template
 */
export const productionTemplate: ConfigTemplate = {
  name: 'Production',
  description: 'Optimized for production environment',
  category: 'environment',
  config: {
    name: 'My Enzyme App',
    version: '1.0.0',
    environment: 'production',

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: 'hidden',
      minify: 'esbuild',
      target: 'es2020',
      polyfills: true,
      cssCodeSplit: true,
    },

    performance: {
      lazyLoading: true,
      codesplitting: true,
      prefetch: true,
      preload: true,
      compression: true,
      bundleAnalysis: false,
      sourceMaps: false,
      minify: true,
    },

    monitoring: {
      enabled: true,
      sentry: {
        dsn: 'YOUR_SENTRY_DSN',
        environment: 'production',
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.1,
      },
      performanceMonitoring: true,
      errorReporting: true,
    },

    logging: {
      level: 'error',
      format: 'json',
      outputs: ['console', 'remote'],
    },
  },
};

/**
 * Staging environment template
 */
export const stagingTemplate: ConfigTemplate = {
  name: 'Staging',
  description: 'Optimized for staging environment',
  category: 'environment',
  config: {
    name: 'My Enzyme App',
    version: '1.0.0',
    environment: 'staging',

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      minify: 'esbuild',
      target: 'es2020',
      polyfills: true,
      cssCodeSplit: true,
    },

    monitoring: {
      enabled: true,
      sentry: {
        dsn: 'YOUR_SENTRY_DSN',
        environment: 'staging',
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
      },
      performanceMonitoring: true,
      errorReporting: true,
    },

    logging: {
      level: 'info',
      format: 'json',
      outputs: ['console'],
    },
  },
};

// =============================================================================
// Template Registry
// =============================================================================

/**
 * All available templates
 */
export const configTemplates: ConfigTemplate[] = [
  minimalTemplate,
  standardTemplate,
  fullTemplate,
  authTemplate,
  apiTemplate,
  featureFlagsTemplate,
  developmentTemplate,
  productionTemplate,
  stagingTemplate,
];

/**
 * Get template by name
 */
export function getTemplate(name: string): ConfigTemplate | undefined {
  return configTemplates.find((t) => t.name === name);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: ConfigTemplate['category']
): ConfigTemplate[] {
  return configTemplates.filter((t) => t.category === category);
}

/**
 * Generate config file content from template
 */
export function generateConfigFromTemplate(template: ConfigTemplate): string {
  return `import { defineConfig } from '@missionfabric-js/enzyme';

/**
 * ${template.description}
 *
 * @see https://enzyme.dev/docs/configuration
 */
export default defineConfig(${JSON.stringify(template.config, null, 2)});
`;
}

/**
 * Merge template with existing config
 */
export function mergeTemplate(
  existingConfig: Partial<EnzymeConfigSchema>,
  template: ConfigTemplate
): Partial<EnzymeConfigSchema> {
  return {
    ...template.config,
    ...existingConfig,
  };
}
