/**
 * @file Interactive prompts using Inquirer
 * @module prompts
 */

import inquirer from 'inquirer';
import {
  PromptQuestion,
  ComponentOptions,
  PageOptions,
  HookOptions,
  ServiceOptions,
  EnzymeConfig,
} from '../types/index.js';
import { exists } from '../utils/fs.js';
import { resolvePath } from '../utils/path.js';

/**
 * Prompt for component generation options
 * @param config - Enzyme configuration
 * @returns Component options
 */
export async function promptComponentOptions(config: EnzymeConfig): Promise<ComponentOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Component name:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Component name is required';
        }
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(input)) {
          return 'Component name must start with a letter and contain only letters and numbers';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'dir',
      message: 'Output directory:',
      default: config.generators?.componentPath || 'src/components',
    },
    {
      type: 'list',
      name: 'type',
      message: 'Component type:',
      choices: [
        { name: 'Functional (default)', value: 'functional' },
        { name: 'Class', value: 'class' },
      ],
      default: 'functional',
    },
    {
      type: 'confirm',
      name: 'styles',
      message: 'Include styles?',
      default: true,
    },
    {
      type: 'list',
      name: 'styleType',
      message: 'Style type:',
      choices: [
        { name: 'CSS', value: 'css' },
        { name: 'SCSS', value: 'scss' },
        { name: 'CSS Modules', value: 'css' },
        { name: 'Styled Components', value: 'styled-components' },
      ],
      default: 'css',
      when: (answers: any) => answers.styles,
    },
    {
      type: 'confirm',
      name: 'tests',
      message: 'Include tests?',
      default: config.testing?.coverage || true,
    },
    {
      type: 'confirm',
      name: 'story',
      message: 'Include Storybook story?',
      default: false,
    },
    {
      type: 'list',
      name: 'export',
      message: 'Export type:',
      choices: [
        { name: 'Named export', value: 'named' },
        { name: 'Default export', value: 'default' },
      ],
      default: 'named',
    },
    {
      type: 'confirm',
      name: 'props',
      message: 'Include props interface?',
      default: true,
    },
  ]);

  return answers;
}

/**
 * Prompt for page generation options
 * @param config - Enzyme configuration
 * @returns Page options
 */
export async function promptPageOptions(config: EnzymeConfig): Promise<PageOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Page name:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Page name is required';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'dir',
      message: 'Output directory:',
      default: config.generators?.routePath || 'src/pages',
    },
    {
      type: 'confirm',
      name: 'route',
      message: 'Include route configuration?',
      default: config.features?.routing || true,
    },
    {
      type: 'input',
      name: 'path',
      message: 'Route path:',
      default: (answers: any) => `/${answers.name.toLowerCase()}`,
      when: (answers: any) => answers.route,
    },
    {
      type: 'confirm',
      name: 'layout',
      message: 'Include layout?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'seo',
      message: 'Include SEO meta tags?',
      default: true,
    },
  ]);

  return answers;
}

/**
 * Prompt for hook generation options
 * @param config - Enzyme configuration
 * @returns Hook options
 */
export async function promptHookOptions(config: EnzymeConfig): Promise<HookOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Hook name (without "use" prefix):',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Hook name is required';
        }
        if (input.toLowerCase().startsWith('use')) {
          return 'Hook name should not include the "use" prefix';
        }
        return true;
      },
      filter: (input: string) => {
        // Auto-add 'use' prefix
        return input.charAt(0).toUpperCase() + input.slice(1);
      },
    },
    {
      type: 'input',
      name: 'dir',
      message: 'Output directory:',
      default: config.generators?.hookPath || 'src/hooks',
    },
    {
      type: 'list',
      name: 'type',
      message: 'Hook type:',
      choices: [
        { name: 'State hook', value: 'state' },
        { name: 'Effect hook', value: 'effect' },
        { name: 'Context hook', value: 'context' },
        { name: 'Custom hook', value: 'custom' },
      ],
      default: 'custom',
    },
    {
      type: 'confirm',
      name: 'tests',
      message: 'Include tests?',
      default: config.testing?.coverage || true,
    },
  ]);

  return {
    name: `use${answers.name}`,
    dir: answers.dir,
    type: answers.type,
    tests: answers.tests,
  };
}

/**
 * Prompt for service generation options
 * @param config - Enzyme configuration
 * @returns Service options
 */
export async function promptServiceOptions(config: EnzymeConfig): Promise<ServiceOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Service name:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Service name is required';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'dir',
      message: 'Output directory:',
      default: 'src/services',
    },
    {
      type: 'list',
      name: 'type',
      message: 'Service type:',
      choices: [
        { name: 'API Service', value: 'api' },
        { name: 'Storage Service', value: 'storage' },
        { name: 'Auth Service', value: 'auth' },
        { name: 'Custom Service', value: 'custom' },
      ],
      default: 'api',
    },
    {
      type: 'confirm',
      name: 'tests',
      message: 'Include tests?',
      default: config.testing?.coverage || true,
    },
  ]);

  return answers;
}

/**
 * Prompt for new project options
 * @returns Project options
 */
export async function promptNewProject(): Promise<{
  name: string;
  directory: string;
  template: string;
  features: string[];
  packageManager: 'npm' | 'yarn' | 'pnpm';
  git: boolean;
  install: boolean;
}> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Project name is required';
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Project name must contain only lowercase letters, numbers, and hyphens';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'directory',
      message: 'Directory:',
      default: (answers: any) => `./${answers.name}`,
      validate: async (input: string) => {
        const path = resolvePath(input);
        const pathExists = await exists(path);
        if (pathExists) {
          return 'Directory already exists. Please choose a different location.';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'template',
      message: 'Template:',
      choices: [
        { name: 'Basic - Minimal setup', value: 'basic' },
        { name: 'Standard - Recommended setup', value: 'standard' },
        { name: 'Advanced - Full-featured setup', value: 'advanced' },
        { name: 'Custom - Choose features', value: 'custom' },
      ],
      default: 'standard',
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features:',
      choices: [
        { name: 'Authentication', value: 'auth', checked: false },
        { name: 'State Management', value: 'state', checked: true },
        { name: 'Routing', value: 'routing', checked: true },
        { name: 'Realtime/WebSocket', value: 'realtime', checked: false },
        { name: 'Monitoring', value: 'monitoring', checked: false },
        { name: 'Theming', value: 'theme', checked: false },
        { name: 'Testing (Vitest)', value: 'testing', checked: true },
        { name: 'Storybook', value: 'storybook', checked: false },
        { name: 'ESLint + Prettier', value: 'linting', checked: true },
      ],
      when: (answers: any) => answers.template === 'custom',
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: [
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'pnpm', value: 'pnpm' },
      ],
      default: 'npm',
    },
    {
      type: 'confirm',
      name: 'git',
      message: 'Initialize git repository?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'install',
      message: 'Install dependencies?',
      default: true,
    },
  ]);

  // Set default features based on template
  if (answers.template !== 'custom') {
    const featureMap: Record<string, string[]> = {
      basic: ['routing'],
      standard: ['routing', 'state', 'testing', 'linting'],
      advanced: ['routing', 'state', 'auth', 'testing', 'linting', 'storybook', 'monitoring'],
    };
    answers.features = featureMap[answers.template] || [];
  }

  return answers;
}

/**
 * Prompt for confirmation
 * @param message - Confirmation message
 * @param defaultValue - Default value
 * @returns True if confirmed
 */
export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);

  return answer.confirmed;
}

/**
 * Prompt for text input
 * @param message - Prompt message
 * @param defaultValue - Default value
 * @param validate - Validation function
 * @returns User input
 */
export async function input(
  message: string,
  defaultValue?: string,
  validate?: (input: string) => boolean | string
): Promise<string> {
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue,
      validate,
    },
  ]);

  return answer.value;
}

/**
 * Prompt for selection from list
 * @param message - Prompt message
 * @param choices - List of choices
 * @param defaultValue - Default value
 * @returns Selected value
 */
export async function select(
  message: string,
  choices: Array<string | { name: string; value: unknown }>,
  defaultValue?: unknown
): Promise<unknown> {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message,
      choices,
      default: defaultValue,
    },
  ]);

  return answer.value;
}

/**
 * Prompt for multiple selections
 * @param message - Prompt message
 * @param choices - List of choices
 * @param defaultValues - Default selected values
 * @returns Selected values
 */
export async function multiSelect(
  message: string,
  choices: Array<string | { name: string; value: unknown; checked?: boolean }>,
  defaultValues?: unknown[]
): Promise<unknown[]> {
  const answer = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'values',
      message,
      choices,
      default: defaultValues,
    },
  ]);

  return answer.values;
}

/**
 * Prompt for password input
 * @param message - Prompt message
 * @param validate - Validation function
 * @returns Password value
 */
export async function password(
  message: string,
  validate?: (input: string) => boolean | string
): Promise<string> {
  const answer = await inquirer.prompt([
    {
      type: 'password',
      name: 'value',
      message,
      validate,
    },
  ]);

  return answer.value;
}

/**
 * Prompt with custom questions
 * @param questions - Array of prompt questions
 * @returns Answers object
 */
export async function prompt(questions: PromptQuestion[]): Promise<Record<string, unknown>> {
  return inquirer.prompt(questions as any);
}

/**
 * Prompt for destructive operation confirmation
 * @param message - Warning message
 * @param details - Additional details
 * @returns True if confirmed
 */
export async function confirmDestructive(message: string, details?: string[]): Promise<boolean> {
  console.log('\x1b[33m%s\x1b[0m', `\n⚠️  WARNING: ${message}\n`);

  if (details && details.length > 0) {
    console.log('This will:');
    details.forEach((detail) => {
      console.log(`  • ${detail}`);
    });
    console.log();
  }

  return confirm('Are you sure you want to continue?', false);
}
