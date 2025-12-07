/**
 * @file Enzyme Configuration Generator
 * @description Automatically generates Enzyme framework configuration files
 *
 * This module handles the creation and setup of Enzyme configuration files including:
 * - enzyme.config.ts/js - Main Enzyme configuration
 * - .env.example - Environment variable template
 * - tsconfig.json - TypeScript configuration for Enzyme
 * - vite.config.ts - Vite build configuration
 * - enzyme.d.ts - TypeScript type definitions
 *
 * @module enzyme-config-generator
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { logger } from './logger';

/**
 * Configuration template type
 */
export type ConfigTemplate = 'minimal' | 'standard' | 'full' | 'enterprise';

/**
 * Configuration generation options
 */
export interface ConfigGenerationOptions {
  /** Template to use */
  template: ConfigTemplate;
  /** Use TypeScript */
  typescript: boolean;
  /** Include authentication */
  includeAuth: boolean;
  /** Include routing */
  includeRouting: boolean;
  /** Include state management */
  includeState: boolean;
  /** Include API client */
  includeApi: boolean;
  /** Target directory */
  targetDir: string;
}

/**
 * Generation result
 */
export interface GenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** Files that were created */
  filesCreated: string[];
  /** Errors that occurred */
  errors: string[];
}

/**
 * Enzyme Configuration Generator
 *
 * Automatically generates configuration files for Enzyme framework projects.
 * Ensures proper setup with best practices and type safety.
 *
 * @example
 * ```typescript
 * const generator = new EnzymeConfigGenerator();
 * const result = await generator.generateConfiguration({
 *   template: 'standard',
 *   typescript: true,
 *   includeAuth: true,
 *   includeRouting: true,
 *   includeState: true,
 *   includeApi: true,
 *   targetDir: '/path/to/project'
 * });
 * ```
 */
export class EnzymeConfigGenerator {
  /**
   * Generate Enzyme configuration files interactively
   *
   * Prompts the user for configuration options and generates files accordingly.
   *
   * @returns Generation result or null if cancelled
   */
  async generateConfigurationInteractive(): Promise<GenerationResult | null> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return null;
    }

    // Check if enzyme.config already exists
    const existingConfig = await this.checkExistingConfig(workspaceRoot);
    if (existingConfig) {
      const overwrite = await vscode.window.showWarningMessage(
        'Enzyme configuration already exists. Overwrite?',
        'Overwrite',
        'Cancel'
      );
      if (overwrite !== 'Overwrite') {
        return null;
      }
    }

    // Get configuration options through wizard
    const options = await this.runConfigWizard(workspaceRoot);
    if (!options) {
      return null;
    }

    // Generate configuration
    return this.generateConfiguration(options);
  }

  /**
   * Generate Enzyme configuration files
   *
   * Creates all necessary configuration files based on the provided options.
   *
   * @param options - Configuration generation options
   * @returns Generation result
   */
  async generateConfiguration(options: ConfigGenerationOptions): Promise<GenerationResult> {
    const result: GenerationResult = {
      success: true,
      filesCreated: [],
      errors: [],
    };

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating Enzyme configuration',
          cancellable: false,
        },
        async (progress) => {
          // Generate enzyme.config
          progress.report({ message: 'Creating enzyme.config...', increment: 20 });
          try {
            const configFile = await this.generateEnzymeConfig(options);
            result.filesCreated.push(configFile);
          } catch (error) {
            result.errors.push(`Failed to create enzyme.config: ${error}`);
          }

          // Generate .env.example
          progress.report({ message: 'Creating .env.example...', increment: 20 });
          try {
            const environmentFile = await this.generateEnvExample(options);
            result.filesCreated.push(environmentFile);
          } catch (error) {
            result.errors.push(`Failed to create .env.example: ${error}`);
          }

          // Generate TypeScript types if needed
          if (options.typescript) {
            progress.report({ message: 'Creating type definitions...', increment: 20 });
            try {
              const typesFile = await this.generateTypeDefinitions(options);
              result.filesCreated.push(typesFile);
            } catch (error) {
              result.errors.push(`Failed to create type definitions: ${error}`);
            }
          }

          // Generate Vite config
          progress.report({ message: 'Creating vite.config...', increment: 20 });
          try {
            const viteFile = await this.generateViteConfig(options);
            result.filesCreated.push(viteFile);
          } catch (error) {
            result.errors.push(`Failed to create vite.config: ${error}`);
          }

          // Generate README
          progress.report({ message: 'Creating README...', increment: 20 });
          try {
            const readmeFile = await this.generateReadme(options);
            result.filesCreated.push(readmeFile);
          } catch (error) {
            result.errors.push(`Failed to create README: ${error}`);
          }

          progress.report({ message: 'Complete', increment: 100 });
        }
      );

      result.success = result.errors.length === 0;

      // Show completion notification
      if (result.success) {
        const openConfig = await vscode.window.showInformationMessage(
          `✓ Generated ${result.filesCreated.length} configuration files`,
          'Open Config',
          'Dismiss'
        );
        if (openConfig === 'Open Config') {
          const configPath = path.join(options.targetDir, `enzyme.config.${options.typescript ? 'ts' : 'js'}`);
          const document = await vscode.workspace.openTextDocument(configPath);
          await vscode.window.showTextDocument(document);
        }
      } else {
        vscode.window.showErrorMessage(
          `Configuration generation completed with errors. Check output for details.`
        );
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Generation failed: ${error}`);
      logger.error('Configuration generation failed', error);
    }

    return result;
  }

  /**
   * Run interactive configuration wizard
   *
   * @param workspaceRoot - Workspace root directory
   * @returns Configuration options or null if cancelled
   */
  private async runConfigWizard(workspaceRoot: string): Promise<ConfigGenerationOptions | null> {
    // Template selection
    const templateChoice = await vscode.window.showQuickPick(
      [
        {
          label: 'Minimal',
          description: 'Basic Enzyme setup with essential features',
          value: 'minimal' as ConfigTemplate,
        },
        {
          label: 'Standard',
          description: 'Standard setup with routing, state, and API',
          value: 'standard' as ConfigTemplate,
        },
        {
          label: 'Full',
          description: 'Full-featured setup with all common features',
          value: 'full' as ConfigTemplate,
        },
        {
          label: 'Enterprise',
          description: 'Enterprise-grade setup with all features and best practices',
          value: 'enterprise' as ConfigTemplate,
        },
      ],
      { placeHolder: 'Select configuration template' }
    );

    if (!templateChoice) {
      return null;
    }

    // TypeScript
    const useTypeScript = await vscode.window.showQuickPick(
      [
        { label: 'TypeScript', description: 'Recommended for type safety', value: true },
        { label: 'JavaScript', value: false },
      ],
      { placeHolder: 'Choose language' }
    );

    if (useTypeScript === undefined) {
      return null;
    }

    // Feature selection based on template
    const template = templateChoice.value;
    const includeAuth = template !== 'minimal';
    const includeRouting = template !== 'minimal';
    const includeState = template !== 'minimal';
    const includeApi = template !== 'minimal';

    return {
      template,
      typescript: useTypeScript.value,
      includeAuth,
      includeRouting,
      includeState,
      includeApi,
      targetDir: workspaceRoot,
    };
  }

  /**
   * Generate enzyme.config.ts/js file
   *
   * Creates the main Enzyme configuration file with proper imports and setup
   * based on the selected features.
   *
   * @param options - Configuration options
   * @returns Path to created file
   */
  private async generateEnzymeConfig(options: ConfigGenerationOptions): Promise<string> {
    const extension = options.typescript ? 'ts' : 'js';
    const configPath = path.join(options.targetDir, `enzyme.config.${extension}`);

    let content = '';

    if (options.typescript) {
      content += `import type { EnzymeConfig } from '@missionfabric-js/enzyme';\n\n`;
    }

    content += `/**\n`;
    content += ` * Enzyme Framework Configuration\n`;
    content += ` * \n`;
    content += ` * This file configures the Enzyme framework for your application.\n`;
    content += ` * Modify settings as needed for your project requirements.\n`;
    content += ` * \n`;
    content += ` * @see https://enzyme-framework.dev/docs/configuration\n`;
    content += ` */\n`;

    content += options.typescript ? `const config: EnzymeConfig = {\n` : `export default {\n`;

    // Base configuration
    content += `  /** Application name */\n`;
    content += `  name: 'My Enzyme App',\n\n`;
    content += `  /** Application version */\n`;
    content += `  version: '1.0.0',\n\n`;
    content += `  /** Environment */\n`;
    content += `  environment: process.env.NODE_ENV || 'development',\n\n`;

    // API configuration
    if (options.includeApi) {
      content += `  /** API Configuration */\n`;
      content += `  api: {\n`;
      content += `    baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3001/api',\n`;
      content += `    timeout: 30000,\n`;
      content += `    retryCount: 3,\n`;
      content += `    retryDelay: 1000,\n`;
      content += `    headers: {\n`;
      content += `      'Content-Type': 'application/json',\n`;
      content += `    },\n`;
      content += `  },\n\n`;
    }

    // Auth configuration
    if (options.includeAuth) {
      content += `  /** Authentication Configuration */\n`;
      content += `  auth: {\n`;
      content += `    enabled: true,\n`;
      content += `    provider: 'jwt',\n`;
      content += `    tokenKey: 'auth_token',\n`;
      content += `    refreshKey: 'refresh_token',\n`;
      content += `    tokenExpiry: 3600,\n`;
      content += `    persistSession: true,\n`;
      content += `    loginPath: '/auth/login',\n`;
      content += `    logoutPath: '/auth/logout',\n`;
      content += `  },\n\n`;
    }

    // Routing configuration
    if (options.includeRouting) {
      content += `  /** Routing Configuration */\n`;
      content += `  routes: {\n`;
      content += `    basePath: '/',\n`;
      content += `    mode: 'browser',\n`;
      content += `    autoRouting: true,\n`;
      content += `  },\n\n`;
    }

    // Dev server configuration
    content += `  /** Development Server Configuration */\n`;
    content += `  devServer: {\n`;
    content += `    port: 3000,\n`;
    content += `    host: 'localhost',\n`;
    content += `    open: true,\n`;
    content += `    hmr: true,\n`;
    content += `  },\n\n`;

    // Performance configuration
    if (options.template === 'full' || options.template === 'enterprise') {
      content += `  /** Performance Configuration */\n`;
      content += `  performance: {\n`;
      content += `    lazyLoading: true,\n`;
      content += `    codesplitting: true,\n`;
      content += `    prefetch: true,\n`;
      content += `    compression: true,\n`;
      content += `  },\n`;
    }

    content += `};\n\n`;

    if (options.typescript) {
      content += `export default config;\n`;
    }

    await fs.writeFile(configPath, content, 'utf-8');
    logger.info(`Created enzyme.config.${extension}`);

    return configPath;
  }

  /**
   * Generate .env.example file
   *
   * Creates an example environment file with all necessary variables.
   *
   * @param options - Configuration options
   * @returns Path to created file
   */
  private async generateEnvExample(options: ConfigGenerationOptions): Promise<string> {
    const environmentPath = path.join(options.targetDir, '.env.example');

    let content = '# Enzyme Framework Environment Variables\n';
    content += '# Copy this file to .env and update values as needed\n\n';

    content += '# Environment\n';
    content += 'NODE_ENV=development\n\n';

    if (options.includeApi) {
      content += '# API Configuration\n';
      content += 'VITE_API_BASE_URL=http://localhost:3001/api\n';
      content += 'VITE_API_TIMEOUT=30000\n\n';
    }

    if (options.includeAuth) {
      content += '# Authentication\n';
      content += 'VITE_AUTH_PROVIDER=jwt\n';
      content += 'VITE_AUTH_TOKEN_KEY=auth_token\n\n';
    }

    content += '# Development Server\n';
    content += 'VITE_DEV_PORT=3000\n';
    content += 'VITE_DEV_HOST=localhost\n\n';

    await fs.writeFile(environmentPath, content, 'utf-8');
    logger.info('Created .env.example');

    return environmentPath;
  }

  /**
   * Generate TypeScript type definitions
   *
   * Creates enzyme.d.ts with type definitions for the project.
   *
   * @param options - Configuration options
   * @returns Path to created file
   */
  private async generateTypeDefinitions(options: ConfigGenerationOptions): Promise<string> {
    const typesPath = path.join(options.targetDir, 'enzyme.d.ts');

    let content = '/**\n';
    content += ' * Enzyme Framework Type Definitions\n';
    content += ' */\n\n';

    content += `/// <reference types="@missionfabric-js/enzyme" />\n\n`;

    content += '// Environment variables\n';
    content += 'interface ImportMetaEnv {\n';
    if (options.includeApi) {
      content += '  readonly VITE_API_BASE_URL: string;\n';
      content += '  readonly VITE_API_TIMEOUT: string;\n';
    }
    if (options.includeAuth) {
      content += '  readonly VITE_AUTH_PROVIDER: string;\n';
    }
    content += '  readonly VITE_DEV_PORT: string;\n';
    content += '}\n\n';

    content += 'interface ImportMeta {\n';
    content += '  readonly env: ImportMetaEnv;\n';
    content += '}\n';

    await fs.writeFile(typesPath, content, 'utf-8');
    logger.info('Created enzyme.d.ts');

    return typesPath;
  }

  /**
   * Generate vite.config.ts/js file
   *
   * Creates Vite configuration optimized for Enzyme.
   *
   * @param options - Configuration options
   * @returns Path to created file
   */
  private async generateViteConfig(options: ConfigGenerationOptions): Promise<string> {
    const extension = options.typescript ? 'ts' : 'js';
    const vitePath = path.join(options.targetDir, `vite.config.${extension}`);

    let content = `import { defineConfig } from 'vite';\n`;
    content += `import react from '@vitejs/plugin-react';\n`;
    content += `import path from 'path';\n\n`;

    content += `export default defineConfig({\n`;
    content += `  plugins: [react()],\n`;
    content += `  resolve: {\n`;
    content += `    alias: {\n`;
    content += `      '@': path.resolve(__dirname, './src'),\n`;
    content += `    },\n`;
    content += `  },\n`;
    content += `  server: {\n`;
    content += `    port: 3000,\n`;
    content += `    open: true,\n`;
    content += `  },\n`;
    content += `  build: {\n`;
    content += `    outDir: 'dist',\n`;
    content += `    sourcemap: true,\n`;
    content += `  },\n`;
    content += `});\n`;

    await fs.writeFile(vitePath, content, 'utf-8');
    logger.info(`Created vite.config.${extension}`);

    return vitePath;
  }

  /**
   * Generate README.md with setup instructions
   *
   * @param options - Configuration options
   * @returns Path to created file
   */
  private async generateReadme(options: ConfigGenerationOptions): Promise<string> {
    const readmePath = path.join(options.targetDir, 'ENZYME_SETUP.md');

    let content = '# Enzyme Framework Setup\n\n';
    content += 'This project is configured with the Enzyme React Framework.\n\n';

    content += '## Getting Started\n\n';
    content += '1. Install dependencies:\n';
    content += '```bash\n';
    content += 'npm install\n';
    content += '```\n\n';

    content += '2. Copy environment variables:\n';
    content += '```bash\n';
    content += 'cp .env.example .env\n';
    content += '```\n\n';

    content += '3. Start development server:\n';
    content += '```bash\n';
    content += 'npm run dev\n';
    content += '```\n\n';

    content += '## Configuration\n\n';
    content += `- Main config: \`enzyme.config.${options.typescript ? 'ts' : 'js'}\`\n`;
    content += '- Environment: `.env`\n';
    if (options.typescript) {
      content += '- Type definitions: `enzyme.d.ts`\n';
    }
    content += '\n';

    content += '## Documentation\n\n';
    content += '- [Enzyme Framework Docs](https://enzyme-framework.dev)\n';
    content += '- [API Reference](https://enzyme-framework.dev/api)\n';

    await fs.writeFile(readmePath, content, 'utf-8');
    logger.info('Created ENZYME_SETUP.md');

    return readmePath;
  }

  /**
   * Check if Enzyme configuration already exists
   *
   * @param dir - Directory to check
   * @returns Whether config exists
   */
  private async checkExistingConfig(dir: string): Promise<boolean> {
    const tsConfig = path.join(dir, 'enzyme.config.ts');
    const jsConfig = path.join(dir, 'enzyme.config.js');

    try {
      await fs.access(tsConfig);
      return true;
    } catch {}

    try {
      await fs.access(jsConfig);
      return true;
    } catch {}

    return false;
  }

  /**
   * Get workspace root directory
   *
   * @returns Workspace root path or null
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders?.[0]?.uri.fsPath ?? null;
  }
}
