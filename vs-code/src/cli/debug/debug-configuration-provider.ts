import * as vscode from 'vscode';
import * as path from 'path';

export class EnzymeDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  /**
   * Provide debug configurations
   */
  async provideDebugConfigurations(
    folder: vscode.WorkspaceFolder | undefined
  ): Promise<vscode.DebugConfiguration[]> {
    return [
      this.createChromeConfig(),
      this.createNodeConfig(),
      this.createCompoundConfig(),
      this.createTestConfig(),
    ];
  }

  /**
   * Resolve debug configuration
   */
  async resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): Promise<vscode.DebugConfiguration | null> {
    // If launch.json is empty, provide default config
    if (!config.type && !config.request && !config.name) {
      const configs = await this.provideDebugConfigurations(folder);
      return configs[0];
    }

    // Resolve variables in config
    if (config.type === 'enzyme') {
      return this.resolveEnzymeConfig(folder, config);
    }

    return config;
  }

  /**
   * Create Chrome debugging configuration
   */
  private createChromeConfig(): vscode.DebugConfiguration {
    return {
      type: 'chrome',
      request: 'launch',
      name: 'Enzyme: Debug in Chrome',
      url: 'http://localhost:3000',
      webRoot: '${workspaceFolder}/src',
      sourceMapPathOverrides: {
        'webpack:///src/*': '${webspaceFolder}/src/*',
        'webpack:///./*': '${webspaceFolder}/*',
        'webpack:///./~/*': '${webspaceFolder}/node_modules/*',
      },
      preLaunchTask: 'enzyme: dev',
      runtimeArgs: ['--disable-web-security', '--user-data-dir'],
    };
  }

  /**
   * Create Node.js debugging configuration (for SSR)
   */
  private createNodeConfig(): vscode.DebugConfiguration {
    return {
      type: 'node',
      request: 'launch',
      name: 'Enzyme: Debug SSR',
      program: '${workspaceFolder}/node_modules/.bin/enzyme',
      args: ['dev', '--ssr'],
      cwd: '${workspaceFolder}',
      env: {
        NODE_ENV: 'development',
        DEBUG: 'enzyme:*',
      },
      sourceMaps: true,
      protocol: 'inspector',
      console: 'integratedTerminal',
      outFiles: ['${workspaceFolder}/dist/**/*.js'],
    };
  }

  /**
   * Create compound configuration (Chrome + Node)
   */
  private createCompoundConfig(): vscode.DebugConfiguration {
    return {
      name: 'Enzyme: Debug Full Stack',
      configurations: ['Enzyme: Debug in Chrome', 'Enzyme: Debug SSR'],
      stopAll: true,
    };
  }

  /**
   * Create test debugging configuration
   */
  private createTestConfig(): vscode.DebugConfiguration {
    return {
      type: 'node',
      request: 'launch',
      name: 'Enzyme: Debug Tests',
      program: '${workspaceFolder}/node_modules/.bin/jest',
      args: ['--runInBand', '--no-cache', '--watchAll=false'],
      cwd: '${workspaceFolder}',
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
   */
  private resolveEnzymeConfig(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration
  ): vscode.DebugConfiguration {
    const workspaceRoot = folder?.uri.fsPath || '';

    // Set default values
    if (!config.url) {
      config.url = 'http://localhost:3000';
    }

    if (!config.webRoot) {
      config.webRoot = path.join(workspaceRoot, 'src');
    }

    if (!config.cwd) {
      config.cwd = workspaceRoot;
    }

    // Add Enzyme environment variables
    config.env = {
      ...config.env,
      ENZYME_ENV: 'development',
      ENZYME_DEBUG: 'true',
    };

    return config;
  }
}

/**
 * Register debug configurations in package.json
 */
export function getDebugConfigurationContribution() {
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
                default: 'http://localhost:3000',
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
            request: 'launch',
            name: 'Enzyme: Debug in Chrome',
            url: 'http://localhost:3000',
            webRoot: '${workspaceFolder}/src',
          },
        ],
        configurationSnippets: [
          {
            label: 'Enzyme: Debug in Chrome',
            description: 'Debug Enzyme app in Chrome',
            body: {
              type: 'chrome',
              request: 'launch',
              name: 'Enzyme: Debug in Chrome',
              url: 'http://localhost:3000',
              webRoot: '^"\\${workspaceFolder}/src"',
            },
          },
          {
            label: 'Enzyme: Debug SSR',
            description: 'Debug Enzyme server-side rendering',
            body: {
              type: 'node',
              request: 'launch',
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
