/**
 * @file Configuration Completion Provider
 * @description Provides IntelliSense completions for enzyme.config.ts files
 */

import * as vscode from 'vscode';

// =============================================================================
// Completion Data
// =============================================================================

/**
 * Configuration property definition
 */
interface ConfigProperty {
  name: string;
  type: string;
  description: string;
  default?: string;
  enum?: string[];
  deprecated?: boolean;
  since?: string;
}

const CONFIG_PROPERTIES: Record<string, ConfigProperty[]> = {
  root: [
    { name: 'name', type: 'string', description: 'Application name', default: '"Enzyme App"' },
    { name: 'version', type: 'string', description: 'Application version (semver)', default: '"1.0.0"' },
    { name: 'description', type: 'string', description: 'Application description' },
    { name: 'environment', type: 'Environment', description: 'Runtime environment', enum: ['development', 'staging', 'production', 'test'], default: 'development' },
    { name: 'routes', type: 'RoutesConfig', description: 'Route configuration' },
    { name: 'auth', type: 'AuthConfig', description: 'Authentication configuration' },
    { name: 'api', type: 'ApiConfig', description: 'API configuration' },
    { name: 'features', type: 'FeatureFlagsConfig', description: 'Feature flags configuration' },
    { name: 'devServer', type: 'DevServerConfig', description: 'Development server configuration' },
    { name: 'build', type: 'BuildConfig', description: 'Build configuration' },
    { name: 'performance', type: 'PerformanceConfig', description: 'Performance optimization settings' },
    { name: 'monitoring', type: 'MonitoringConfig', description: 'Monitoring and analytics configuration' },
    { name: 'logging', type: 'LoggingConfig', description: 'Logging configuration' },
    { name: 'plugins', type: 'PluginConfig[]', description: 'Plugin configurations' },
    { name: 'experimental', type: 'Record<string, boolean>', description: 'Experimental features' },
  ],
  routes: [
    { name: 'basePath', type: 'string', description: 'Base path for all routes', default: '"/"' },
    { name: 'routes', type: 'RouteConfig[]', description: 'Route definitions' },
    { name: 'notFound', type: 'string', description: 'Component path for 404 page' },
    { name: 'error', type: 'string', description: 'Component path for error page' },
  ],
  route: [
    { name: 'path', type: 'string', description: 'Route path pattern' },
    { name: 'component', type: 'string', description: 'Component file path' },
    { name: 'lazy', type: 'boolean', description: 'Enable lazy loading', default: 'false' },
    { name: 'guards', type: 'RouteGuard[]', description: 'Route guards' },
    { name: 'metadata', type: 'RouteMetadata', description: 'Route metadata' },
    { name: 'children', type: 'RouteConfig[]', description: 'Child routes' },
    { name: 'redirect', type: 'string', description: 'Redirect path' },
    { name: 'caseSensitive', type: 'boolean', description: 'Case-sensitive matching', default: 'false' },
    { name: 'index', type: 'boolean', description: 'Index route', default: 'false' },
  ],
  auth: [
    { name: 'enabled', type: 'boolean', description: 'Enable authentication', default: 'true' },
    { name: 'provider', type: 'AuthProvider', description: 'Auth provider type', enum: ['jwt', 'oauth', 'custom'], default: 'jwt' },
    { name: 'tokenKey', type: 'string', description: 'Token storage key', default: '"auth_token"' },
    { name: 'refreshKey', type: 'string', description: 'Refresh token key', default: '"refresh_token"' },
    { name: 'tokenExpiry', type: 'number', description: 'Token expiry in seconds', default: '3600' },
    { name: 'refreshInterval', type: 'number', description: 'Refresh interval in seconds', default: '300' },
    { name: 'loginPath', type: 'string', description: 'Login page path', default: '"/auth/login"' },
    { name: 'logoutPath', type: 'string', description: 'Logout endpoint', default: '"/auth/logout"' },
    { name: 'persistSession', type: 'boolean', description: 'Persist session in storage', default: 'true' },
    { name: 'secureCookies', type: 'boolean', description: 'Use secure cookies', default: 'true' },
  ],
  api: [
    { name: 'baseUrl', type: 'string', description: 'API base URL' },
    { name: 'timeout', type: 'number', description: 'Request timeout in ms', default: '30000' },
    { name: 'retryCount', type: 'number', description: 'Number of retries (0-5)', default: '3' },
    { name: 'retryDelay', type: 'number', description: 'Retry delay in ms', default: '1000' },
    { name: 'headers', type: 'Record<string, string>', description: 'Default headers' },
    { name: 'endpoints', type: 'Record<string, ApiEndpoint>', description: 'API endpoints' },
    { name: 'mockEnabled', type: 'boolean', description: 'Enable API mocking', default: 'false' },
    { name: 'mockDelay', type: 'number', description: 'Mock response delay', default: '500' },
  ],
  devServer: [
    { name: 'port', type: 'number', description: 'Server port (1024-65535)', default: '3000' },
    { name: 'host', type: 'string', description: 'Server host', default: '"localhost"' },
    { name: 'open', type: 'boolean', description: 'Open browser on start', default: 'true' },
    { name: 'https', type: 'boolean', description: 'Enable HTTPS', default: 'false' },
    { name: 'hmr', type: 'boolean', description: 'Enable hot module replacement', default: 'true' },
    { name: 'cors', type: 'boolean', description: 'Enable CORS', default: 'true' },
    { name: 'proxy', type: 'Record<string, ProxyConfig>', description: 'Proxy configuration' },
  ],
  build: [
    { name: 'outDir', type: 'string', description: 'Output directory', default: '"dist"' },
    { name: 'assetsDir', type: 'string', description: 'Assets directory', default: '"assets"' },
    { name: 'sourcemap', type: 'boolean | "inline" | "hidden"', description: 'Generate source maps', default: 'true' },
    { name: 'minify', type: 'boolean | "terser" | "esbuild"', description: 'Minification strategy', default: '"esbuild"' },
    { name: 'target', type: 'string', description: 'Build target', default: '"es2020"' },
    { name: 'polyfills', type: 'boolean', description: 'Include polyfills', default: 'true' },
    { name: 'cssCodeSplit', type: 'boolean', description: 'Split CSS by chunk', default: 'true' },
  ],
  features: [
    { name: 'enabled', type: 'boolean', description: 'Enable feature flags', default: 'true' },
    { name: 'source', type: 'FlagSource', description: 'Flag source', enum: ['local', 'remote', 'hybrid'], default: 'local' },
    { name: 'remoteUrl', type: 'string', description: 'Remote flag service URL' },
    { name: 'pollInterval', type: 'number', description: 'Poll interval in ms', default: '60000' },
    { name: 'flags', type: 'FeatureFlag[]', description: 'Feature flag definitions' },
    { name: 'localOverrides', type: 'Record<string, boolean>', description: 'Local flag overrides' },
  ],
  performance: [
    { name: 'lazyLoading', type: 'boolean', description: 'Enable lazy loading', default: 'true' },
    { name: 'codesplitting', type: 'boolean', description: 'Enable code splitting', default: 'true' },
    { name: 'prefetch', type: 'boolean', description: 'Prefetch resources', default: 'true' },
    { name: 'preload', type: 'boolean', description: 'Preload critical resources', default: 'false' },
    { name: 'compression', type: 'boolean', description: 'Enable compression', default: 'true' },
    { name: 'bundleAnalysis', type: 'boolean', description: 'Generate bundle analysis', default: 'false' },
    { name: 'sourceMaps', type: 'boolean', description: 'Enable source maps', default: 'true' },
    { name: 'minify', type: 'boolean', description: 'Minify output', default: 'true' },
  ],
  monitoring: [
    { name: 'enabled', type: 'boolean', description: 'Enable monitoring', default: 'false' },
    { name: 'sentry', type: 'SentryConfig', description: 'Sentry configuration' },
    { name: 'analytics', type: 'AnalyticsConfig', description: 'Analytics configuration' },
    { name: 'performanceMonitoring', type: 'boolean', description: 'Enable performance monitoring', default: 'true' },
    { name: 'errorReporting', type: 'boolean', description: 'Enable error reporting', default: 'true' },
  ],
};

// =============================================================================
// Completion Provider
// =============================================================================

/**
 * Config completion provider
 */
export class ConfigCompletionProvider implements vscode.CompletionItemProvider {
  /**
   * Provide completion items
   * @param document
   * @param position
   * @param token
   * @param _token
   * @param context
   */
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    // Determine context (what object we're in)
    const contextType = this.getContextType(document, position);

    // Get properties for this context
    const properties = CONFIG_PROPERTIES[contextType] || CONFIG_PROPERTIES['root'];

    // Create completion items
    const items = properties?.map((property) => this.createCompletionItem(property, context)) || [];

    return new vscode.CompletionList(items, false);
  }

  /**
   * Create completion item from property
   * @param prop
   * @param property
   * @param context
   * @param _context
   */
  private createCompletionItem(
    property: ConfigProperty,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem {
    const item = new vscode.CompletionItem(property.name, vscode.CompletionItemKind.Property);

    item.detail = property.type;
    item.documentation = new vscode.MarkdownString(this.buildDocumentation(property));

    // Insert text with snippet
    if (property.enum) {
      item.insertText = new vscode.SnippetString(`${property.name}: \${1|${property.enum.join(',')}|}`);
    } else if (property.type.includes('[]')) {
      item.insertText = new vscode.SnippetString(`${property.name}: [$1]`);
    } else if (property.type.includes('Record') || property.type.includes('Config')) {
      item.insertText = new vscode.SnippetString(`${property.name}: {\n  $1\n}`);
    } else if (property.type === 'string') {
      const defaultValue = property.default || '""';
      item.insertText = new vscode.SnippetString(`${property.name}: ${defaultValue}`);
    } else {
      const defaultValue = property.default || '';
      item.insertText = new vscode.SnippetString(`${property.name}: ${defaultValue || '$1'}`);
    }

    if (property.deprecated) {
      item.tags = [vscode.CompletionItemTag.Deprecated];
    }

    item.sortText = property.name;

    return item;
  }

  /**
   * Build documentation for property
   * @param prop
   * @param property
   */
  private buildDocumentation(property: ConfigProperty): string {
    let document = property.description;

    if (property.default) {
      document += `\n\n**Default:** \`${property.default}\``;
    }

    if (property.enum) {
      document += `\n\n**Valid values:** ${property.enum.map(v => `\`${v}\``).join(', ')}`;
    }

    if (property.since) {
      document += `\n\n*Since version ${property.since}*`;
    }

    if (property.deprecated) {
      document += `\n\n⚠️ **Deprecated**`;
    }

    return document;
  }

  /**
   * Get context type from cursor position
   * @param document
   * @param position
   */
  private getContextType(document: vscode.TextDocument, position: vscode.Position): string {
    const text = document.getText(new vscode.Range(0, 0, position.line, position.character));

    // Simple context detection
    if (text.includes('routes:') && !this.isInsideOtherObject(text, 'routes')) {
      if (/routes:\s*{\s*routes:\s*\[/.exec(text)) {
        return 'route';
      }
      return 'routes';
    }

    if (text.includes('auth:') && !this.isInsideOtherObject(text, 'auth')) {
      return 'auth';
    }

    if (text.includes('api:') && !this.isInsideOtherObject(text, 'api')) {
      return 'api';
    }

    if (text.includes('devServer:') && !this.isInsideOtherObject(text, 'devServer')) {
      return 'devServer';
    }

    if (text.includes('build:') && !this.isInsideOtherObject(text, 'build')) {
      return 'build';
    }

    if (text.includes('features:') && !this.isInsideOtherObject(text, 'features')) {
      return 'features';
    }

    if (text.includes('performance:') && !this.isInsideOtherObject(text, 'performance')) {
      return 'performance';
    }

    if (text.includes('monitoring:') && !this.isInsideOtherObject(text, 'monitoring')) {
      return 'monitoring';
    }

    return 'root';
  }

  /**
   * Check if we're inside a different object
   * @param text
   * @param currentKey
   */
  private isInsideOtherObject(text: string, currentKey: string): boolean {
    const keyIndex = text.lastIndexOf(`${currentKey}:`);
    if (keyIndex === -1) {return true;}

    const textAfterKey = text.slice(Math.max(0, keyIndex));
    const openBraces = (textAfterKey.match(/{/g) || []).length;
    const closeBraces = (textAfterKey.match(/}/g) || []).length;

    return closeBraces >= openBraces;
  }
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register completion provider
 */
export function registerConfigCompletionProvider(): vscode.Disposable {
  const selector: vscode.DocumentSelector = [
    { language: 'typescript', pattern: '**/enzyme.config.ts' },
    { language: 'javascript', pattern: '**/enzyme.config.js' },
    { language: 'json', pattern: '**/enzyme.config.json' },
  ];

  return vscode.languages.registerCompletionItemProvider(
    selector,
    new ConfigCompletionProvider(),
    '.', // Trigger on dot
    ':'  // Trigger on colon
  );
}
