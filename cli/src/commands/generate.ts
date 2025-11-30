/**
 * Generate Command
 *
 * Handles the `enzyme generate` command for scaffolding various artifacts
 */

import { Command } from 'commander';
import { CommandContext } from '../types/index.js';
import {
  generateComponent,
  generateHook,
  generateRoute,
  generateService,
  generatePage,
  generateModule,
  generateSlice,
  type ComponentOptions,
  type HookOptions,
  type RouteOptions,
  type ServiceOptions,
  type PageOptions,
  type ModuleOptions,
  type SliceOptions,
  type GeneratorOptions,
} from '../generators/index.js';

export interface GenerateCommandOptions {
  path?: string;
  typescript?: boolean;
  test?: boolean;
  story?: boolean;
  styles?: boolean;
  export?: 'named' | 'default';
  type?: string;
  route?: string;
  lazy?: boolean;
  index?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Main generate command handler
 */
export async function generateCommand(
  type: string,
  name: string,
  options: GenerateCommandOptions = {}
): Promise<void> {
  console.log(`\n🔧 Generating ${type}: ${name}\n`);

  try {
    switch (type.toLowerCase()) {
      case 'component':
      case 'comp':
      case 'c':
        await generateComponentCommand(name, options);
        break;

      case 'hook':
      case 'h':
        await generateHookCommand(name, options);
        break;

      case 'route':
      case 'r':
        await generateRouteCommand(name, options);
        break;

      case 'service':
      case 's':
        await generateServiceCommand(name, options);
        break;

      case 'page':
      case 'p':
        await generatePageCommand(name, options);
        break;

      case 'module':
      case 'm':
        await generateModuleCommand(name, options);
        break;

      case 'slice':
      case 'store':
        await generateSliceCommand(name, options);
        break;

      default:
        throw new Error(
          `Unknown generator type: ${type}\n` +
          `Available types: component (c), hook (h), route (r), service (s), page (p), module (m), slice (store)`
        );
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Generate component
 */
async function generateComponentCommand(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  const componentOptions: ComponentOptions & GeneratorOptions = {
    name,
    path: options.path,
    withStyles: options.styles !== false,
    withTest: options.test === true,
    withStory: options.story === true,
    dryRun: options.dryRun || false,
    force: options.force || false,
  };

  await generateComponent(componentOptions);
}

/**
 * Generate hook
 */
async function generateHookCommand(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  const hookOptions: HookOptions & GeneratorOptions = {
    name,
    path: options.path,
    withTest: options.test === true,
    type: options.type as HookOptions['type'],
    dryRun: options.dryRun || false,
    force: options.force || false,
  };

  await generateHook(hookOptions);
}

/**
 * Generate route
 */
async function generateRouteCommand(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  const routeOptions: RouteOptions & GeneratorOptions = {
    path: options.route || `/${name.toLowerCase()}`,
    lazy: options.lazy !== false,
    dryRun: options.dryRun || false,
    force: options.force || false,
  };

  await generateRoute(routeOptions);
}

/**
 * Generate service
 */
async function generateServiceCommand(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  const serviceOptions: ServiceOptions & GeneratorOptions = {
    name,
    withCrud: options.type === 'crud',
    dryRun: options.dryRun || false,
    force: options.force || false,
  };

  await generateService(serviceOptions);
}

/**
 * Generate page
 */
async function generatePageCommand(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  const pageOptions: PageOptions & GeneratorOptions = {
    name,
    route: options.route,
    path: options.path,
    dryRun: options.dryRun || false,
    force: options.force || false,
  };

  await generatePage(pageOptions);
}

/**
 * Generate module
 */
async function generateModuleCommand(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  const moduleOptions: ModuleOptions & GeneratorOptions = {
    name,
    dryRun: options.dryRun || false,
    force: options.force || false,
  };

  await generateModule(moduleOptions);
}

/**
 * Generate slice (state store)
 */
async function generateSliceCommand(
  name: string,
  options: GenerateCommandOptions
): Promise<void> {
  const sliceOptions: SliceOptions & GeneratorOptions = {
    name,
    dryRun: options.dryRun || false,
    force: options.force || false,
  };

  await generateSlice(sliceOptions);
}

/**
 * Create generate command with context
 */
export function createGenerateCommand(context: CommandContext): Command {
  const generate = new Command('generate')
    .alias('g')
    .description('Generate code artifacts (components, pages, hooks, services)')
    .option('-n, --name <name>', 'Artifact name')
    .option('-d, --dir <dir>', 'Output directory')
    .option('-t, --template <template>', 'Template to use')
    .option('--no-tests', 'Skip test generation')
    .option('--no-styles', 'Skip style generation')
    .option('--story', 'Include Storybook story');

  generate
    .command('component [name]')
    .alias('c')
    .description('Generate a React component')
    .option('-d, --dir <dir>', 'Output directory')
    .option('--no-tests', 'Skip test generation')
    .option('--no-styles', 'Skip style generation')
    .option('--story', 'Include Storybook story')
    .action(async (name, options) => {
      const componentName = name || options.name;
      if (!componentName) {
        context.logger.error('Component name is required');
        process.exit(1);
      }
      await generateComponentCommand(componentName, options);
    });

  generate
    .command('page [name]')
    .alias('p')
    .description('Generate a page component')
    .option('-d, --dir <dir>', 'Output directory')
    .option('--route <route>', 'Route path')
    .action(async (name, options) => {
      const pageName = name || options.name;
      if (!pageName) {
        context.logger.error('Page name is required');
        process.exit(1);
      }
      await generatePageCommand(pageName, options);
    });

  generate
    .command('hook [name]')
    .alias('h')
    .description('Generate a custom React hook')
    .option('-d, --dir <dir>', 'Output directory')
    .option('--no-tests', 'Skip test generation')
    .option('--type <type>', 'Hook type (state, effect, context, custom)')
    .action(async (name, options) => {
      const hookName = name || options.name;
      if (!hookName) {
        context.logger.error('Hook name is required');
        process.exit(1);
      }
      await generateHookCommand(hookName, options);
    });

  generate
    .command('service [name]')
    .alias('s')
    .description('Generate a service')
    .option('-d, --dir <dir>', 'Output directory')
    .option('--no-tests', 'Skip test generation')
    .option('--type <type>', 'Service type (api, storage, auth, custom)')
    .action(async (name, options) => {
      const serviceName = name || options.name;
      if (!serviceName) {
        context.logger.error('Service name is required');
        process.exit(1);
      }
      await generateServiceCommand(serviceName, options);
    });

  generate
    .command('route [name]')
    .alias('r')
    .description('Generate a route')
    .option('-d, --dir <dir>', 'Output directory')
    .option('--route <route>', 'Route path')
    .option('--lazy', 'Use lazy loading')
    .action(async (name, options) => {
      const routeName = name || options.name;
      if (!routeName) {
        context.logger.error('Route name is required');
        process.exit(1);
      }
      await generateRouteCommand(routeName, options);
    });

  generate
    .command('module [name]')
    .alias('m')
    .description('Generate a module')
    .option('-d, --dir <dir>', 'Output directory')
    .option('--no-tests', 'Skip test generation')
    .option('--no-index', 'Skip index file generation')
    .action(async (name, options) => {
      const moduleName = name || options.name;
      if (!moduleName) {
        context.logger.error('Module name is required');
        process.exit(1);
      }
      await generateModuleCommand(moduleName, options);
    });

  generate
    .command('slice [name]')
    .alias('store')
    .description('Generate a state slice')
    .option('-d, --dir <dir>', 'Output directory')
    .option('--no-tests', 'Skip test generation')
    .action(async (name, options) => {
      const sliceName = name || options.name;
      if (!sliceName) {
        context.logger.error('Slice name is required');
        process.exit(1);
      }
      await generateSliceCommand(sliceName, options);
    });

  return generate;
}
