import * as path from 'node:path';
import type * as vscode from 'vscode';

// Constants for debug configuration types
const REQUEST_TYPE_LAUNCH = 'launch';
const WORKSPACE_FOLDER_VAR = '${workspaceFolder}';
const WORKSPACE_FOLDER_SRC = '${workspaceFolder}/src';
const WEBSPACE_FOLDER_VAR = '${webspaceFolder}'; // Note: intentionally 'webspace' for webpack config
const DEFAULT_APP_URL = 'http://localhost:3000';
const DEBUG_CONFIG_NAME_CHROME = 'Enzyme: Debug in Chrome';

/**
 *
 */
export class EnzymeDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  /**
   * Provide debug configurations
   * @param _folder
   * @returns Promise resolving to array of debug configurations
   */
  async provideDebugConfigurations(
    _folder: vscode.WorkspaceFolder | undefined
  ): Promise<vscode.DebugConfiguration[]> {
    return Promise.resolve([
      this.createChromeConfig(),
      this.createNodeConfig(),
      this.createCompoundConfig(),
      this.createTestConfig(),
    ]);
  }

  /**
   * Resolve debug configuration
   * @param folder
   * @param config
   * @param _token
   * @returns Resolved debug configuration or null
   */
  async resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    _token?: vscode.CancellationToken
  ): Promise<vscode.DebugConfiguration | null> {
    // If launch.json is empty, provide default config
    if (!config.type && !config.request && !config.name) {
      const configs = await this.provideDebugConfigurations(folder);
      return configs[0] ?? null;
    }

    // Resolve variables in config
    if (config.type === 'enzyme') {
      return this.resolveEnzymeConfig(folder, config);
    }

    return config;
  }

  /**
   * Create Chrome debugging configuration
   * @returns Chrome debug configuration
   */
  private createChromeConfig(): vscode.DebugConfiguration {
    return {
      type: 'chrome',
      request: REQUEST_TYPE_LAUNCH,
      name: DEBUG_CONFIG_NAME_CHROME,
      url: DEFAULT_APP_URL,
      webRoot: WORKSPACE_FOLDER_SRC,
      sourceMapPathOverrides: {
        'webpack:///src/*': `${WEBSPACE_FOLDER_VAR}/src/*`,
        'webpack:///./*': `${WEBSPACE_FOLDER_VAR}/*`,
        'webpack:///./~/*': `${WEBSPACE_FOLDER_VAR}/node_modules/*`,
      },
      preLaunchTask: 'enzyme: dev',
      runtimeArgs: ['--disable-web-security', '--user-data-dir'],
    };
  }

  /**
   * Create Node.js debugging configuration (for SSR)
   * @returns Node.js debug configuration
   */
  private createNodeConfig(): vscode.DebugConfiguration {
    return {
      type: 'node',
      request: REQUEST_TYPE_LAUNCH,
      name: 'Enzyme: Debug SSR',
      program: `${WORKSPACE_FOLDER_VAR}/node_modules/.bin/enzyme`,
      args: ['dev', '--ssr'],
      cwd: WORKSPACE_FOLDER_VAR,
      env: {
        NODE_ENV: 'development',
        DEBUG: 'enzyme:*',
      },
      sourceMaps: true,
      protocol: 'inspector',
      console: 'integratedTerminal',
      outFiles: [`${WORKSPACE_FOLDER_VAR}/dist/**/*.js`],
    };
  }

  /**
   * Create compound configuration (Chrome + Node)
   * @returns Compound debug configuration
   */
  private createCompoundConfig(): vscode.DebugConfiguration {
    return {
      type: 'compound',
      request: REQUEST_TYPE_LAUNCH,
      name: 'Enzyme: Debug Full Stack',
      configurations: [DEBUG_CONFIG_NAME_CHROME, 'Enzyme: Debug SSR'],
      stopAll: true,
    };
  }

  /**
   * Create test debugging configuration
   * @returns Test debug configuration
   */
  private createTestConfig(): vscode.DebugConfiguration {
    return {
      type: 'node',
      request: REQUEST_TYPE_LAUNCH,
      name: 'Enzyme: Debug Tests',
      program: `${WORKSPACE_FOLDER_VAR}/node_modules/.bin/jest`,
      args: ['--runInBand', '--no-cache', '--watchAll=false'],
      cwd: WORKSPACE_FOLDER_VAR,
      console: 'integratedTerminal',
      internalConsoleOptions: 'neverOpen',
      sourceMaps: true,
      env: {
        NODE_ENV: 'test',
      },
    };
  }

  /**
   * Resolve Enzyme-specific configuration
   * @param folder
   * @param config
   * @returns Resolved debug configuration
   */
  private resolveEnzymeConfig(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration
  ): vscode.DebugConfiguration {
    const workspaceRoot = folder?.uri.fsPath ?? '';

    // Set default values
    config['url'] ??= DEFAULT_APP_URL;
    config['webRoot'] ??= path.join(workspaceRoot, 'src');
    config['cwd'] ??= workspaceRoot;

    // Add Enzyme environment variables
    config['env'] = {
      ...(config['env'] as Record<string, string> | undefined),
      ENZYME_ENV: 'development',
      ENZYME_DEBUG: 'true',
    };

    return config;
  }
}

/**
 * Debug configuration contribution for package.json
 */
interface DebugConfigurationContribution {
  debuggers: Array<{
    type: string;
    label: string;
    configurationAttributes: Record<string, unknown>;
    initialConfigurations: vscode.DebugConfiguration[];
    configurationSnippets: Array<{
      label: string;
      description: string;
      body: vscode.DebugConfiguration;
    }>;
  }>;
}

/**
 * Register debug configurations in package.json
 * @returns Debug configuration contribution for package.json
 */
export function getDebugConfigurationContribution(): DebugConfigurationContribution {
  return {
    debuggers: [
      {
        type: 'enzyme',
        label: 'Enzyme Debug',
        configurationAttributes: {
          launch: {
            required: ['name'],
            properties: {
              url: {
                type: 'string',
                description: 'Application URL',
                default: DEFAULT_APP_URL,
              },
              webRoot: {
                type: 'string',
                description: 'Web root directory',
                default: '${workspaceFolder}/src',
              },
              env: {
                type: 'object',
                description: 'Environment variables',
                default: {},
              },
            },
          },
        },
        initialConfigurations: [
          {
            type: 'chrome',
            request: REQUEST_TYPE_LAUNCH,
            name: DEBUG_CONFIG_NAME_CHROME,
            url: DEFAULT_APP_URL,
            webRoot: WORKSPACE_FOLDER_SRC,
          },
        ],
        configurationSnippets: [
          {
            label: DEBUG_CONFIG_NAME_CHROME,
            description: 'Debug Enzyme app in Chrome',
            body: {
              type: 'chrome',
              request: REQUEST_TYPE_LAUNCH,
              name: DEBUG_CONFIG_NAME_CHROME,
              url: DEFAULT_APP_URL,
              webRoot: '^"\\${workspaceFolder}/src"',
            },
          },
          {
            label: 'Enzyme: Debug SSR',
            description: 'Debug Enzyme server-side rendering',
            body: {
              type: 'node',
              request: REQUEST_TYPE_LAUNCH,
              name: 'Enzyme: Debug SSR',
              program: '^"\\${workspaceFolder}/node_modules/.bin/enzyme"',
              args: ['dev', '--ssr'],
            },
          },
        ],
      },
    ],
  };
}