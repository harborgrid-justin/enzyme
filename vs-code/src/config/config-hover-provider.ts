/**
 * @file Configuration Hover Provider
 * @description Provides hover information for enzyme.config.ts properties
 */

import * as vscode from 'vscode';

// =============================================================================
// Hover Data
// =============================================================================

/**
 *
 */
interface PropertyHoverInfo {
  name: string;
  type: string;
  description: string;
  default?: string;
  validValues?: string[];
  examples?: string[];
  deprecated?: boolean;
  deprecationMessage?: string;
  since?: string;
  links?: Array<{ text: string; url: string }>;
}

const HOVER_INFO: Record<string, PropertyHoverInfo> = {
  // Root level
  name: {
    name: 'name',
    type: 'string',
    description: 'The name of your Enzyme application',
    default: '"Enzyme App"',
    examples: ['"My App"', '"Enterprise Dashboard"'],
  },
  version: {
    name: 'version',
    type: 'string',
    description: 'Application version following semantic versioning (semver)',
    default: '"1.0.0"',
    examples: ['"1.0.0"', '"2.1.3-beta"'],
    links: [{ text: 'Semantic Versioning', url: 'https://semver.org' }],
  },
  environment: {
    name: 'environment',
    type: '"development" | "staging" | "production" | "test"',
    description: 'The runtime environment for your application',
    default: '"development"',
    validValues: ['development', 'staging', 'production', 'test'],
    examples: ['"production"', '"development"'],
  },

  // Routes
  'routes.basePath': {
    name: 'basePath',
    type: 'string',
    description: 'Base path prefix for all routes in the application',
    default: '"/"',
    examples: ['"/app"', '"/v1"'],
  },
  'routes.routes': {
    name: 'routes',
    type: 'RouteConfig[]',
    description: 'Array of route definitions for your application',
    examples: ['[{ path: "/", component: "./pages/Home" }]'],
  },
  'route.path': {
    name: 'path',
    type: 'string',
    description: 'URL path pattern for the route. Supports dynamic segments with :param',
    examples: ['"/users"', '"/users/:id"', '"/posts/:postId/comments/:commentId"'],
  },
  'route.component': {
    name: 'component',
    type: 'string',
    description: 'File path to the component to render for this route',
    examples: ['"./pages/Users"', '"./features/auth/Login"'],
  },
  'route.lazy': {
    name: 'lazy',
    type: 'boolean',
    description: 'Enable lazy loading for this route component to improve initial load performance',
    default: 'false',
  },

  // Auth
  'auth.enabled': {
    name: 'enabled',
    type: 'boolean',
    description: 'Enable or disable authentication for the entire application',
    default: 'true',
  },
  'auth.provider': {
    name: 'provider',
    type: '"jwt" | "oauth" | "custom"',
    description: 'Authentication provider type',
    default: '"jwt"',
    validValues: ['jwt', 'oauth', 'custom'],
  },
  'auth.tokenKey': {
    name: 'tokenKey',
    type: 'string',
    description: 'Storage key for the authentication token',
    default: '"auth_token"',
  },
  'auth.tokenExpiry': {
    name: 'tokenExpiry',
    type: 'number',
    description: 'Token expiration time in seconds',
    default: '3600',
    examples: ['3600 // 1 hour', '86400 // 24 hours'],
  },

  // API
  'api.baseUrl': {
    name: 'baseUrl',
    type: 'string',
    description: 'Base URL for all API requests',
    examples: ['"https://api.example.com"', '"http://localhost:8000/api"'],
  },
  'api.timeout': {
    name: 'timeout',
    type: 'number',
    description: 'Request timeout in milliseconds',
    default: '30000',
    examples: ['30000 // 30 seconds', '60000 // 1 minute'],
  },
  'api.retryCount': {
    name: 'retryCount',
    type: 'number',
    description: 'Number of retry attempts for failed requests (0-5)',
    default: '3',
    validValues: ['0', '1', '2', '3', '4', '5'],
  },
  'api.headers': {
    name: 'headers',
    type: 'Record<string, string>',
    description: 'Default headers to include in all API requests',
    examples: ['{ "X-API-Key": "abc123" }', '{ "Content-Type": "application/json" }'],
  },

  // Dev Server
  'devServer.port': {
    name: 'port',
    type: 'number',
    description: 'Port number for the development server (1024-65535)',
    default: '3000',
    validValues: ['3000', '4000', '5000', '8080'],
  },
  'devServer.host': {
    name: 'host',
    type: 'string',
    description: 'Host address for the development server',
    default: '"localhost"',
    examples: ['"localhost"', '"0.0.0.0"'],
  },
  'devServer.open': {
    name: 'open',
    type: 'boolean',
    description: 'Automatically open the application in browser on server start',
    default: 'true',
  },
  'devServer.hmr': {
    name: 'hmr',
    type: 'boolean',
    description: 'Enable Hot Module Replacement for faster development',
    default: 'true',
  },

  // Build
  'build.outDir': {
    name: 'outDir',
    type: 'string',
    description: 'Output directory for production build',
    default: '"dist"',
    examples: ['"dist"', '"build"', '"public"'],
  },
  'build.sourcemap': {
    name: 'sourcemap',
    type: 'boolean | "inline" | "hidden"',
    description: 'Generate source maps for debugging. Use "hidden" for production',
    default: 'true',
    validValues: ['true', 'false', '"inline"', '"hidden"'],
  },
  'build.minify': {
    name: 'minify',
    type: 'boolean | "terser" | "esbuild"',
    description: 'Minification strategy for production builds',
    default: '"esbuild"',
    validValues: ['true', 'false', '"terser"', '"esbuild"'],
  },

  // Features
  'features.enabled': {
    name: 'enabled',
    type: 'boolean',
    description: 'Enable the feature flags system',
    default: 'true',
  },
  'features.source': {
    name: 'source',
    type: '"local" | "remote" | "hybrid"',
    description: 'Source for feature flag values',
    default: '"local"',
    validValues: ['local', 'remote', 'hybrid'],
  },
  'features.remoteUrl': {
    name: 'remoteUrl',
    type: 'string',
    description: 'URL for remote feature flag service',
    examples: ['"https://flags.example.com"'],
  },

  // Performance
  'performance.lazyLoading': {
    name: 'lazyLoading',
    type: 'boolean',
    description: 'Enable lazy loading for routes and components',
    default: 'true',
  },
  'performance.codesplitting': {
    name: 'codesplitting',
    type: 'boolean',
    description: 'Enable automatic code splitting for better load performance',
    default: 'true',
  },
  'performance.prefetch': {
    name: 'prefetch',
    type: 'boolean',
    description: 'Prefetch route chunks on link hover',
    default: 'true',
  },

  // Monitoring
  'monitoring.enabled': {
    name: 'enabled',
    type: 'boolean',
    description: 'Enable application monitoring',
    default: 'false',
  },
  'monitoring.sentry.dsn': {
    name: 'dsn',
    type: 'string',
    description: 'Sentry DSN for error reporting',
    examples: ['"https://xxx@xxx.ingest.sentry.io/xxx"'],
    links: [{ text: 'Sentry Documentation', url: 'https://docs.sentry.io' }],
  },
  'monitoring.performanceMonitoring': {
    name: 'performanceMonitoring',
    type: 'boolean',
    description: 'Enable performance monitoring and metrics collection',
    default: 'true',
  },
};

// =============================================================================
// Hover Provider
// =============================================================================

/**
 * Config hover provider
 */
export class ConfigHoverProvider implements vscode.HoverProvider {
  /**
   * Provide hover information
   * @param document
   * @param position
   * @param token
   */
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) {
      return null;
    }

    const word = document.getText(range);
    const context = this.getPropertyContext(document, position);
    const fullPath = context ? `${context}.${word}` : word;

    // Try full path first, then just the word
    const info = HOVER_INFO[fullPath] || HOVER_INFO[word];
    if (!info) {
      return null;
    }

    const markdown = this.buildHoverMarkdown(info);
    return new vscode.Hover(markdown, range);
  }

  /**
   * Build hover markdown
   * @param info
   */
  private buildHoverMarkdown(info: PropertyHoverInfo): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    // Header with name and type
    md.appendMarkdown(`### \`${info.name}\`: \`${info.type}\`\n\n`);

    // Deprecated warning
    if (info.deprecated) {
      md.appendMarkdown(`⚠️ **Deprecated**\n\n`);
      if (info.deprecationMessage) {
        md.appendMarkdown(`${info.deprecationMessage}\n\n`);
      }
    }

    // Description
    md.appendMarkdown(`${info.description}\n\n`);

    // Default value
    if (info.default) {
      md.appendMarkdown(`**Default:** \`${info.default}\`\n\n`);
    }

    // Valid values
    if (info.validValues && info.validValues.length > 0) {
      md.appendMarkdown(`**Valid values:**\n\n`);
      info.validValues.forEach((value) => {
        md.appendMarkdown(`- \`${value}\`\n`);
      });
      md.appendMarkdown('\n');
    }

    // Examples
    if (info.examples && info.examples.length > 0) {
      md.appendMarkdown(`**Examples:**\n\n`);
      info.examples.forEach((example) => {
        md.appendCodeblock(example, 'typescript');
      });
    }

    // Version info
    if (info.since) {
      md.appendMarkdown(`*Since version ${info.since}*\n\n`);
    }

    // Links
    if (info.links && info.links.length > 0) {
      md.appendMarkdown(`**Learn more:**\n\n`);
      info.links.forEach((link) => {
        md.appendMarkdown(`- [${link.text}](${link.url})\n`);
      });
    }

    return md;
  }

  /**
   * Get property context (e.g., "api" for "api.baseUrl")
   * @param document
   * @param position
   */
  private getPropertyContext(document: vscode.TextDocument, position: vscode.Position): string | null {
    const text = document.getText(new vscode.Range(0, 0, position.line, position.character));

    // Find the current object context
    const contexts = ['routes', 'auth', 'api', 'devServer', 'build', 'features', 'performance', 'monitoring'];

    for (const context of contexts) {
      const regex = new RegExp(`${context}:\\s*{[^}]*$`, 's');
      if (regex.test(text)) {
        return context;
      }
    }

    // Check for nested route context
    if (/routes:\s*{\s*routes:\s*\[[^\]]*$/s.exec(text)) {
      return 'route';
    }

    return null;
  }
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register hover provider
 */
export function registerConfigHoverProvider(): vscode.Disposable {
  const selector: vscode.DocumentSelector = [
    { language: 'typescript', pattern: '**/enzyme.config.ts' },
    { language: 'javascript', pattern: '**/enzyme.config.js' },
  ];

  return vscode.languages.registerHoverProvider(
    selector,
    new ConfigHoverProvider()
  );
}
