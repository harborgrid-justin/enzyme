/**
 * Documentation Generator
 * Main entry point for the enzyme documentation generation system
 */

import { Command } from 'commander';
import { generateAllDocs } from './api-docs';
import { generateComponentDocs } from './component-docs';
import { generateHooksDocs } from './hooks-docs';
import { generateRouteDocs } from './route-docs';
import { startDocServer } from './server';
import { logger } from './utils';

export interface DocsGeneratorOptions {
  output?: string;
  format?: 'markdown' | 'html' | 'json';
  watch?: boolean;
  verbose?: boolean;
  incremental?: boolean;
}

export interface DocsConfig {
  projectRoot: string;
  srcDir: string;
  outputDir: string;
  format: 'markdown' | 'html' | 'json';
  incremental: boolean;
  exclude?: string[];
  include?: string[];
}

/**
 * Create documentation command structure
 */
export function createDocsCommand(): Command {
  const docs = new Command('docs')
    .description('Generate comprehensive documentation from code')
    .option('-o, --output <path>', 'Output directory', './docs')
    .option('-f, --format <format>', 'Output format (markdown, html, json)', 'markdown')
    .option('-w, --watch', 'Watch for changes and regenerate', false)
    .option('-v, --verbose', 'Verbose logging', false)
    .option('-i, --incremental', 'Only regenerate changed files', false);

  // Generate all documentation
  docs
    .command('generate')
    .description('Generate all documentation')
    .option('-o, --output <path>', 'Output directory', './docs')
    .option('-f, --format <format>', 'Output format', 'markdown')
    .option('-i, --incremental', 'Incremental generation', false)
    .action(async (options: DocsGeneratorOptions) => {
      try {
        logger.info('Generating all documentation...');

        const config: DocsConfig = {
          projectRoot: process.cwd(),
          srcDir: './src',
          outputDir: options.output || './docs',
          format: options.format || 'markdown',
          incremental: options.incremental || false,
        };

        await generateAllDocumentation(config);

        logger.success('Documentation generated successfully!');
      } catch (error) {
        logger.error('Failed to generate documentation:', error);
        process.exit(1);
      }
    });

  // Generate API documentation
  docs
    .command('api')
    .description('Generate API documentation')
    .option('-o, --output <path>', 'Output directory', './docs/api')
    .option('-f, --format <format>', 'Output format', 'markdown')
    .action(async (options: DocsGeneratorOptions) => {
      try {
        logger.info('Generating API documentation...');

        const config: DocsConfig = {
          projectRoot: process.cwd(),
          srcDir: './src',
          outputDir: options.output || './docs/api',
          format: options.format || 'markdown',
          incremental: false,
        };

        await generateAllDocs(config);

        logger.success('API documentation generated!');
      } catch (error) {
        logger.error('Failed to generate API documentation:', error);
        process.exit(1);
      }
    });

  // Generate component documentation
  docs
    .command('components')
    .description('Generate component documentation')
    .option('-o, --output <path>', 'Output directory', './docs/components')
    .action(async (options: DocsGeneratorOptions) => {
      try {
        logger.info('Generating component documentation...');

        const config: DocsConfig = {
          projectRoot: process.cwd(),
          srcDir: './src',
          outputDir: options.output || './docs/components',
          format: 'markdown',
          incremental: false,
        };

        await generateComponentDocs(config);

        logger.success('Component documentation generated!');
      } catch (error) {
        logger.error('Failed to generate component documentation:', error);
        process.exit(1);
      }
    });

  // Generate hooks documentation
  docs
    .command('hooks')
    .description('Generate hooks reference documentation')
    .option('-o, --output <path>', 'Output directory', './docs/hooks')
    .action(async (options: DocsGeneratorOptions) => {
      try {
        logger.info('Generating hooks documentation...');

        const config: DocsConfig = {
          projectRoot: process.cwd(),
          srcDir: './src',
          outputDir: options.output || './docs/hooks',
          format: 'markdown',
          incremental: false,
        };

        await generateHooksDocs(config);

        logger.success('Hooks documentation generated!');
      } catch (error) {
        logger.error('Failed to generate hooks documentation:', error);
        process.exit(1);
      }
    });

  // Generate route documentation
  docs
    .command('routes')
    .description('Generate route documentation')
    .option('-o, --output <path>', 'Output directory', './docs/routes')
    .action(async (options: DocsGeneratorOptions) => {
      try {
        logger.info('Generating route documentation...');

        const config: DocsConfig = {
          projectRoot: process.cwd(),
          srcDir: './src',
          outputDir: options.output || './docs/routes',
          format: 'markdown',
          incremental: false,
        };

        await generateRouteDocs(config);

        logger.success('Route documentation generated!');
      } catch (error) {
        logger.error('Failed to generate route documentation:', error);
        process.exit(1);
      }
    });

  // Serve documentation locally
  docs
    .command('serve')
    .description('Serve documentation locally with hot reload')
    .option('-p, --port <port>', 'Port to serve on', '3000')
    .option('-d, --dir <directory>', 'Documentation directory', './docs')
    .option('--no-watch', 'Disable file watching')
    .action(async (options) => {
      try {
        logger.info(`Starting documentation server on port ${options.port}...`);

        await startDocServer({
          port: parseInt(options.port, 10),
          directory: options.dir,
          watch: options.watch !== false,
        });
      } catch (error) {
        logger.error('Failed to start documentation server:', error);
        process.exit(1);
      }
    });

  return docs;
}

/**
 * Generate all documentation types
 */
async function generateAllDocumentation(config: DocsConfig): Promise<void> {
  // Generate API docs
  await generateAllDocs({
    ...config,
    outputDir: `${config.outputDir}/api`,
  });

  // Generate component docs
  await generateComponentDocs({
    ...config,
    outputDir: `${config.outputDir}/components`,
  });

  // Generate hooks docs
  await generateHooksDocs({
    ...config,
    outputDir: `${config.outputDir}/hooks`,
  });

  // Generate route docs
  await generateRouteDocs({
    ...config,
    outputDir: `${config.outputDir}/routes`,
  });
}

export default createDocsCommand;
