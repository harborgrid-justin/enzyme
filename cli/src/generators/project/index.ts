/**
 * Enzyme Project Generator
 *
 * Creates production-ready enzyme projects with configurable templates and features.
 *
 * Command: enzyme new <project-name> [options]
 *
 * @module cli/generators/project
 */

import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { renderTemplate, writeFile, copyTemplate } from './utils';
import { generatePackageJson } from './templates/package-json';
import { generateTsConfig } from './templates/tsconfig';
import { generateViteConfig } from './templates/vite-config';
import { generateTailwindConfig } from './templates/tailwind-config';
import { generateEslintConfig } from './templates/eslint-config';
import { generatePrettierConfig } from './templates/prettier-config';
import { generateEnvExample } from './templates/env-example';
import { generateMainTsx } from './templates/main-tsx';
import { generateAppTsx } from './templates/app-tsx';
import { generateRoutes } from './templates/routes';
import { generateProviders } from './templates/providers';
import { generateConfig } from './templates/config';
import { generateReadme } from './templates/readme';

/**
 * Template types supported by the generator
 */
export type TemplateType = 'minimal' | 'standard' | 'enterprise' | 'full';

/**
 * Package manager options
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

/**
 * Available features that can be enabled
 */
export type Feature =
  | 'auth'
  | 'state'
  | 'routing'
  | 'realtime'
  | 'monitoring'
  | 'theme';

/**
 * Project generator options
 */
export interface ProjectGeneratorOptions {
  /** Project name */
  projectName: string;
  /** Template to use */
  template: TemplateType;
  /** Package manager to use */
  packageManager: PackageManager;
  /** Initialize git repository */
  git: boolean;
  /** Run package install after generation */
  install: boolean;
  /** Use TypeScript (always true for enzyme) */
  typescript: boolean;
  /** Additional features to enable */
  features: Feature[];
  /** Output directory (defaults to cwd) */
  outputDir?: string;
}

/**
 * Template configuration based on type
 */
const TEMPLATE_FEATURES: Record<TemplateType, Feature[]> = {
  minimal: ['theme'],
  standard: ['routing', 'state', 'theme'],
  enterprise: ['auth', 'routing', 'state', 'theme', 'monitoring', 'realtime'],
  full: ['auth', 'routing', 'state', 'theme', 'monitoring', 'realtime'],
};

/**
 * Validates project name according to npm naming conventions
 */
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  // Check for empty name
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Project name cannot be empty' };
  }

  // npm package name rules
  const npmNameRegex = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

  if (!npmNameRegex.test(name)) {
    return {
      valid: false,
      error: 'Project name must be a valid npm package name (lowercase, no spaces, can contain hyphens)'
    };
  }

  // Check length
  if (name.length > 214) {
    return { valid: false, error: 'Project name must be less than 214 characters' };
  }

  // Reserved names
  const reserved = ['node_modules', 'favicon.ico', 'package.json'];
  if (reserved.includes(name)) {
    return { valid: false, error: `Project name "${name}" is reserved` };
  }

  return { valid: true };
}

/**
 * Detects package manager from lock files in current directory
 */
export function detectPackageManager(): PackageManager {
  if (existsSync('bun.lockb')) return 'bun';
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  return 'npm';
}

/**
 * Gets the install command for a package manager
 */
export function getInstallCommand(packageManager: PackageManager): string {
  const commands = {
    npm: 'npm install',
    yarn: 'yarn',
    pnpm: 'pnpm install',
    bun: 'bun install',
  };
  return commands[packageManager];
}

/**
 * Gets the run command for a package manager
 */
export function getRunCommand(packageManager: PackageManager): string {
  const commands = {
    npm: 'npm run',
    yarn: 'yarn',
    pnpm: 'pnpm',
    bun: 'bun',
  };
  return commands[packageManager];
}

/**
 * Merges template features with user-specified features
 */
export function resolveFeatures(template: TemplateType, userFeatures: Feature[]): Feature[] {
  const templateFeatures = TEMPLATE_FEATURES[template];
  const allFeatures = new Set([...templateFeatures, ...userFeatures]);
  return Array.from(allFeatures);
}

/**
 * Main project generator function
 */
export async function generateProject(options: ProjectGeneratorOptions): Promise<void> {
  const {
    projectName,
    template,
    packageManager,
    git,
    install,
    features: userFeatures,
    outputDir = process.cwd(),
  } = options;

  // Validate project name
  const validation = validateProjectName(projectName);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Resolve features based on template and user selections
  const features = resolveFeatures(template, userFeatures);

  // Determine project directory
  const projectDir = resolve(outputDir, projectName);

  // Check if directory already exists
  if (existsSync(projectDir)) {
    throw new Error(`Directory "${projectName}" already exists`);
  }

  // Create project directory
  await mkdir(projectDir, { recursive: true });

  console.log(`Creating enzyme project "${projectName}" with ${template} template...`);
  console.log(`Features: ${features.join(', ')}`);

  // Generate template context
  const context = {
    projectName,
    template,
    features,
    hasAuth: features.includes('auth'),
    hasState: features.includes('state'),
    hasRouting: features.includes('routing'),
    hasRealtime: features.includes('realtime'),
    hasMonitoring: features.includes('monitoring'),
    hasTheme: features.includes('theme'),
    packageManager,
  };

  // Create directory structure
  await createDirectoryStructure(projectDir, features);

  // Generate configuration files
  console.log('Generating configuration files...');
  await generateConfigFiles(projectDir, context);

  // Generate source files
  console.log('Generating source files...');
  await generateSourceFiles(projectDir, context);

  // Generate template-specific files
  console.log(`Generating ${template} template files...`);
  await generateTemplateFiles(projectDir, template, context);

  // Initialize git repository
  if (git) {
    console.log('Initializing git repository...');
    await initGitRepo(projectDir);
  }

  // Run package install
  if (install) {
    console.log(`Installing dependencies with ${packageManager}...`);
    await runInstall(projectDir, packageManager);
  }

  // Print success message with next steps
  printSuccessMessage(projectName, packageManager, install);
}

/**
 * Creates the directory structure for the project
 */
async function createDirectoryStructure(projectDir: string, features: Feature[]): Promise<void> {
  const dirs = [
    'src',
    'src/routes',
    'src/components',
    'src/assets',
    'public',
  ];

  // Add feature-specific directories
  if (features.includes('auth')) {
    dirs.push('src/lib/auth');
  }
  if (features.includes('state')) {
    dirs.push('src/store');
  }
  if (features.includes('routing')) {
    dirs.push('src/routes');
  }
  if (features.includes('monitoring')) {
    dirs.push('src/lib/monitoring');
  }
  if (features.includes('realtime')) {
    dirs.push('src/lib/realtime');
  }

  dirs.push('src/config', 'src/providers');

  for (const dir of dirs) {
    await mkdir(join(projectDir, dir), { recursive: true });
  }
}

/**
 * Generates all configuration files
 */
async function generateConfigFiles(projectDir: string, context: any): Promise<void> {
  // package.json
  const packageJson = generatePackageJson(context);
  await writeFile(join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // tsconfig.json
  const tsConfig = generateTsConfig(context);
  await writeFile(join(projectDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

  // vite.config.ts
  const viteConfig = generateViteConfig(context);
  await writeFile(join(projectDir, 'vite.config.ts'), viteConfig);

  // tailwind.config.ts
  const tailwindConfig = generateTailwindConfig(context);
  await writeFile(join(projectDir, 'tailwind.config.ts'), tailwindConfig);

  // eslint.config.js
  const eslintConfig = generateEslintConfig(context);
  await writeFile(join(projectDir, 'eslint.config.js'), eslintConfig);

  // .prettierrc
  const prettierConfig = generatePrettierConfig(context);
  await writeFile(join(projectDir, '.prettierrc'), JSON.stringify(prettierConfig, null, 2));

  // .env.example
  const envExample = generateEnvExample(context);
  await writeFile(join(projectDir, '.env.example'), envExample);

  // .gitignore
  await writeFile(join(projectDir, '.gitignore'), getGitignore());

  // postcss.config.js
  await writeFile(join(projectDir, 'postcss.config.js'), getPostcssConfig());

  // index.html
  await writeFile(join(projectDir, 'index.html'), getIndexHtml(context.projectName));

  // README.md
  const readme = generateReadme(context);
  await writeFile(join(projectDir, 'README.md'), readme);
}

/**
 * Generates source files
 */
async function generateSourceFiles(projectDir: string, context: any): Promise<void> {
  // src/main.tsx
  const mainTsx = generateMainTsx(context);
  await writeFile(join(projectDir, 'src/main.tsx'), mainTsx);

  // src/App.tsx
  const appTsx = generateAppTsx(context);
  await writeFile(join(projectDir, 'src/App.tsx'), appTsx);

  // src/index.css
  await writeFile(join(projectDir, 'src/index.css'), getIndexCss());

  // src/vite-env.d.ts
  await writeFile(join(projectDir, 'src/vite-env.d.ts'), getViteEnvDts());

  // Generate providers
  if (context.features.length > 0) {
    const providers = generateProviders(context);
    await writeFile(join(projectDir, 'src/providers/index.tsx'), providers);
  }

  // Generate config
  const config = generateConfig(context);
  await writeFile(join(projectDir, 'src/config/index.ts'), config);
}

/**
 * Generates template-specific files
 */
async function generateTemplateFiles(projectDir: string, template: TemplateType, context: any): Promise<void> {
  const routes = generateRoutes(template, context);

  // Write routes
  for (const [path, content] of Object.entries(routes)) {
    await writeFile(join(projectDir, path), content);
  }
}

/**
 * Initializes a git repository
 */
async function initGitRepo(projectDir: string): Promise<void> {
  const { execSync } = await import('child_process');
  execSync('git init', { cwd: projectDir, stdio: 'ignore' });
  execSync('git add -A', { cwd: projectDir, stdio: 'ignore' });
  execSync('git commit -m "Initial commit from enzyme generator"', { cwd: projectDir, stdio: 'ignore' });
}

/**
 * Runs package install
 */
async function runInstall(projectDir: string, packageManager: PackageManager): Promise<void> {
  const { execSync } = await import('child_process');
  const command = getInstallCommand(packageManager);
  execSync(command, { cwd: projectDir, stdio: 'inherit' });
}

/**
 * Prints success message with next steps
 */
function printSuccessMessage(projectName: string, packageManager: PackageManager, installed: boolean): void {
  const runCmd = getRunCommand(packageManager);

  console.log('\n✅ Success! Created enzyme project:', projectName);
  console.log('\nNext steps:');
  console.log(`  cd ${projectName}`);

  if (!installed) {
    console.log(`  ${getInstallCommand(packageManager)}`);
  }

  console.log(`  ${runCmd} dev`);
  console.log('\nHappy coding! 🚀');
}

/**
 * Returns .gitignore content
 */
function getGitignore(): string {
  return `# Dependencies
node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/dist
/build

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor
.vscode/*
!.vscode/extensions.json
.idea
*.swp
*.swo
*~

# Cache
.eslintcache
.cache
.parcel-cache

# Build info
.tsbuildinfo
`;
}

/**
 * Returns postcss.config.js content
 */
function getPostcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

/**
 * Returns index.html content
 */
function getIndexHtml(projectName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

/**
 * Returns index.css content
 */
function getIndexCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  display: flex;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
}
`;
}

/**
 * Returns vite-env.d.ts content
 */
function getViteEnvDts(): string {
  return `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`;
}
