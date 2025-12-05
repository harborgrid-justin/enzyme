/**
 * Project Scaffolding Utilities
 *
 * Generates complete project structures, features, and boilerplate code
 * for various project types and frameworks.
 *
 * @example
 * ```typescript
 * const scaffolder = new ProjectScaffolder();
 * await scaffolder.generateProject({
 *   type: 'react-app',
 *   name: 'my-app',
 *   features: ['routing', 'state-management']
 * });
 * ```
 *
 * @module generators/scaffold
 */

import { FileGenerator, FileTemplate } from './file';
import { ComponentGenerator } from './component';
import { HookGenerator } from './hook';
import { TestGenerator } from './test';
import { TypeGenerator } from './types';

/**
 * Project type
 */
export type ProjectType =
  | 'react-app'
  | 'react-library'
  | 'node-api'
  | 'express-api'
  | 'cli'
  | 'monorepo'
  | 'component-library';

/**
 * Feature flag
 */
export type FeatureFlag =
  | 'routing'
  | 'state-management'
  | 'api-client'
  | 'authentication'
  | 'testing'
  | 'storybook'
  | 'eslint'
  | 'prettier'
  | 'husky'
  | 'ci-cd'
  | 'docker';

/**
 * Project configuration
 */
export interface ProjectConfig {
  /**
   * Project type
   */
  type: ProjectType;

  /**
   * Project name
   */
  name: string;

  /**
   * Project description
   */
  description?: string;

  /**
   * Output directory
   */
  outputDir?: string;

  /**
   * Features to include
   */
  features?: FeatureFlag[];

  /**
   * TypeScript
   */
  typescript?: boolean;

  /**
   * Package manager
   */
  packageManager?: 'npm' | 'yarn' | 'pnpm';

  /**
   * Git initialization
   */
  git?: boolean;

  /**
   * License
   */
  license?: string;

  /**
   * Author
   */
  author?: string;
}

/**
 * Feature scaffold configuration
 */
export interface FeatureConfig {
  /**
   * Feature name
   */
  name: string;

  /**
   * Feature type
   */
  type: 'page' | 'component' | 'service' | 'store' | 'hook' | 'util';

  /**
   * Output directory
   */
  outputDir: string;

  /**
   * Include tests
   */
  tests?: boolean;

  /**
   * Include storybook
   */
  storybook?: boolean;

  /**
   * Additional options
   */
  options?: Record<string, unknown>;
}

/**
 * Scaffold result
 */
export interface ScaffoldResult {
  /**
   * Success status
   */
  success: boolean;

  /**
   * Created files
   */
  files: string[];

  /**
   * Errors
   */
  errors?: string[];

  /**
   * Next steps
   */
  nextSteps?: string[];
}

/**
 * Project scaffolder for generating complete project structures
 *
 * @example
 * ```typescript
 * const scaffolder = new ProjectScaffolder('/path/to/workspace');
 *
 * // Generate new React app
 * await scaffolder.generateProject({
 *   type: 'react-app',
 *   name: 'my-awesome-app',
 *   features: ['routing', 'state-management', 'testing'],
 *   typescript: true
 * });
 *
 * // Generate feature
 * await scaffolder.generateFeature({
 *   name: 'UserProfile',
 *   type: 'component',
 *   outputDir: 'src/components',
 *   tests: true,
 *   storybook: true
 * });
 *
 * // Generate page
 * await scaffolder.generatePage('Dashboard', 'src/pages');
 * ```
 */
export class ProjectScaffolder {
  private fileGenerator: FileGenerator;
  private componentGenerator: ComponentGenerator;
  private hookGenerator: HookGenerator;
  private testGenerator: TestGenerator;
  private typeGenerator: TypeGenerator;

  constructor(private workspaceDir: string = process.cwd()) {
    this.fileGenerator = new FileGenerator(workspaceDir);
    this.componentGenerator = new ComponentGenerator();
    this.hookGenerator = new HookGenerator();
    this.testGenerator = new TestGenerator();
    this.typeGenerator = new TypeGenerator();
  }

  /**
   * Generate a complete project
   *
   * @param config - Project configuration
   * @returns Scaffold result
   *
   * @example
   * ```typescript
   * const result = await scaffolder.generateProject({
   *   type: 'react-app',
   *   name: 'my-app',
   *   features: ['routing', 'state-management'],
   *   typescript: true,
   *   packageManager: 'pnpm'
   * });
   * ```
   */
  async generateProject(config: ProjectConfig): Promise<ScaffoldResult> {
    const {
      type,
      name,
      description = '',
      outputDir = name,
      features = [],
      typescript = true,
      packageManager = 'npm',
      git = true,
      license = 'MIT',
      author = '',
    } = config;

    const files: string[] = [];
    const errors: string[] = [];

    try {
      // Generate base structure
      const baseFiles = await this.generateBaseStructure(type, outputDir, typescript);
      files.push(...baseFiles);

      // Generate package.json
      const packageJson = await this.generatePackageJson({
        name,
        description,
        type,
        features,
        typescript,
        packageManager,
        license,
        author,
      });
      await this.fileGenerator.create(`${outputDir}/package.json`, packageJson);
      files.push('package.json');

      // Generate README
      const readme = this.generateReadme(name, description, type);
      await this.fileGenerator.create(`${outputDir}/README.md`, readme);
      files.push('README.md');

      // Generate .gitignore
      if (git) {
        const gitignore = this.generateGitignore(type);
        await this.fileGenerator.create(`${outputDir}/.gitignore`, gitignore);
        files.push('.gitignore');
      }

      // Generate TypeScript config
      if (typescript) {
        const tsconfig = this.generateTsConfig(type);
        await this.fileGenerator.create(`${outputDir}/tsconfig.json`, tsconfig);
        files.push('tsconfig.json');
      }

      // Generate feature-specific files
      for (const feature of features) {
        const featureFiles = await this.generateFeatureFiles(feature, outputDir, type);
        files.push(...featureFiles);
      }

      const nextSteps = this.generateNextSteps(name, packageManager, features);

      return {
        success: true,
        files,
        nextSteps,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        files,
        errors,
      };
    }
  }

  /**
   * Generate a feature (component, page, service, etc.)
   *
   * @param config - Feature configuration
   * @returns Scaffold result
   *
   * @example
   * ```typescript
   * await scaffolder.generateFeature({
   *   name: 'TodoList',
   *   type: 'component',
   *   outputDir: 'src/components',
   *   tests: true
   * });
   * ```
   */
  async generateFeature(config: FeatureConfig): Promise<ScaffoldResult> {
    const { name, type, outputDir, tests = true, storybook = false } = config;
    const files: string[] = [];
    const errors: string[] = [];

    try {
      switch (type) {
        case 'component':
          await this.generateComponentFeature(name, outputDir, tests, storybook);
          files.push(`${outputDir}/${name}.tsx`, `${outputDir}/index.ts`);
          if (tests) files.push(`${outputDir}/${name}.test.tsx`);
          if (storybook) files.push(`${outputDir}/${name}.stories.tsx`);
          break;

        case 'hook':
          await this.generateHookFeature(name, outputDir, tests);
          files.push(`${outputDir}/${name}.ts`);
          if (tests) files.push(`${outputDir}/${name}.test.ts`);
          break;

        case 'service':
          await this.generateServiceFeature(name, outputDir, tests);
          files.push(`${outputDir}/${name}.ts`);
          if (tests) files.push(`${outputDir}/${name}.test.ts`);
          break;

        case 'page':
          await this.generatePageFeature(name, outputDir, tests);
          files.push(`${outputDir}/${name}.tsx`);
          if (tests) files.push(`${outputDir}/${name}.test.tsx`);
          break;

        case 'store':
          await this.generateStoreFeature(name, outputDir, tests);
          files.push(`${outputDir}/${name}.ts`);
          if (tests) files.push(`${outputDir}/${name}.test.ts`);
          break;

        case 'util':
          await this.generateUtilFeature(name, outputDir, tests);
          files.push(`${outputDir}/${name}.ts`);
          if (tests) files.push(`${outputDir}/${name}.test.ts`);
          break;
      }

      return {
        success: true,
        files,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        files,
        errors,
      };
    }
  }

  /**
   * Generate a page
   *
   * @param name - Page name
   * @param outputDir - Output directory
   * @returns File paths
   */
  async generatePage(name: string, outputDir: string): Promise<string[]> {
    await this.generatePageFeature(name, outputDir, true);
    return [`${outputDir}/${name}.tsx`, `${outputDir}/${name}.test.tsx`];
  }

  /**
   * Generate a component
   *
   * @param name - Component name
   * @param outputDir - Output directory
   * @returns File paths
   */
  async generateComponent(name: string, outputDir: string): Promise<string[]> {
    await this.generateComponentFeature(name, outputDir, true, false);
    return [`${outputDir}/${name}.tsx`, `${outputDir}/${name}.test.tsx`, `${outputDir}/index.ts`];
  }

  /**
   * Generate base project structure
   */
  private async generateBaseStructure(
    type: ProjectType,
    outputDir: string,
    typescript: boolean
  ): Promise<string[]> {
    const ext = typescript ? 'ts' : 'js';
    const jsxExt = typescript ? 'tsx' : 'jsx';
    const files: string[] = [];

    // Create directory structure based on project type
    switch (type) {
      case 'react-app':
        await this.fileGenerator.ensureDir(`${outputDir}/src`);
        await this.fileGenerator.ensureDir(`${outputDir}/src/components`);
        await this.fileGenerator.ensureDir(`${outputDir}/src/pages`);
        await this.fileGenerator.ensureDir(`${outputDir}/src/hooks`);
        await this.fileGenerator.ensureDir(`${outputDir}/src/utils`);
        await this.fileGenerator.ensureDir(`${outputDir}/public`);

        // Generate main App component
        const appCode = this.componentGenerator.generateFunctional({
          name: 'App',
          body: '  return (\n    <div className="App">\n      <h1>Welcome to Your App</h1>\n    </div>\n  );',
        });
        await this.fileGenerator.create(`${outputDir}/src/App.${jsxExt}`, appCode);
        files.push(`src/App.${jsxExt}`);

        // Generate index
        await this.fileGenerator.create(
          `${outputDir}/src/index.${jsxExt}`,
          `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport { App } from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root')!);\nroot.render(<App />);`
        );
        files.push(`src/index.${jsxExt}`);
        break;

      case 'node-api':
      case 'express-api':
        await this.fileGenerator.ensureDir(`${outputDir}/src`);
        await this.fileGenerator.ensureDir(`${outputDir}/src/routes`);
        await this.fileGenerator.ensureDir(`${outputDir}/src/controllers`);
        await this.fileGenerator.ensureDir(`${outputDir}/src/services`);
        await this.fileGenerator.ensureDir(`${outputDir}/src/models`);

        // Generate main server file
        await this.fileGenerator.create(
          `${outputDir}/src/index.${ext}`,
          `import express from 'express';\n\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.use(express.json());\n\napp.get('/', (req, res) => {\n  res.json({ message: 'API is running' });\n});\n\napp.listen(PORT, () => {\n  console.log(\`Server running on port \${PORT}\`);\n});`
        );
        files.push(`src/index.${ext}`);
        break;

      case 'react-library':
      case 'component-library':
        await this.fileGenerator.ensureDir(`${outputDir}/src`);
        await this.fileGenerator.ensureDir(`${outputDir}/src/components`);

        await this.fileGenerator.create(
          `${outputDir}/src/index.${ext}`,
          `export * from './components';`
        );
        files.push(`src/index.${ext}`);
        break;
    }

    return files;
  }

  /**
   * Generate package.json
   */
  private async generatePackageJson(options: {
    name: string;
    description: string;
    type: ProjectType;
    features: FeatureFlag[];
    typescript: boolean;
    packageManager: string;
    license: string;
    author: string;
  }): Promise<string> {
    const { name, description, type, features, typescript, license, author } = options;

    const packageJson: Record<string, unknown> = {
      name,
      version: '0.1.0',
      description,
      main: 'dist/index.js',
      scripts: this.generateScripts(type, features, typescript),
      dependencies: this.generateDependencies(type, features),
      devDependencies: this.generateDevDependencies(type, features, typescript),
      license,
      author,
    };

    if (typescript) {
      packageJson.types = 'dist/index.d.ts';
    }

    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Generate scripts for package.json
   */
  private generateScripts(
    type: ProjectType,
    features: FeatureFlag[],
    typescript: boolean
  ): Record<string, string> {
    const scripts: Record<string, string> = {};

    if (typescript) {
      scripts.build = 'tsc';
    }

    if (features.includes('testing')) {
      scripts.test = 'jest';
      scripts['test:watch'] = 'jest --watch';
      scripts['test:coverage'] = 'jest --coverage';
    }

    if (type === 'react-app') {
      scripts.start = 'react-scripts start';
      scripts.build = 'react-scripts build';
    } else if (type === 'node-api' || type === 'express-api') {
      scripts.start = typescript ? 'ts-node src/index.ts' : 'node src/index.js';
      scripts.dev = typescript ? 'ts-node-dev src/index.ts' : 'nodemon src/index.js';
    }

    if (features.includes('eslint')) {
      scripts.lint = 'eslint src';
      scripts['lint:fix'] = 'eslint src --fix';
    }

    if (features.includes('prettier')) {
      scripts.format = 'prettier --write "src/**/*.{ts,tsx,js,jsx}"';
    }

    return scripts;
  }

  /**
   * Generate dependencies
   */
  private generateDependencies(type: ProjectType, features: FeatureFlag[]): Record<string, string> {
    const deps: Record<string, string> = {};

    if (type === 'react-app' || type === 'react-library' || type === 'component-library') {
      deps.react = '^18.0.0';
      deps['react-dom'] = '^18.0.0';
    }

    if (features.includes('routing')) {
      deps['react-router-dom'] = '^6.0.0';
    }

    if (features.includes('state-management')) {
      deps.zustand = '^4.0.0'; // or redux, jotai, etc.
    }

    if (type === 'express-api') {
      deps.express = '^4.18.0';
    }

    return deps;
  }

  /**
   * Generate dev dependencies
   */
  private generateDevDependencies(
    type: ProjectType,
    features: FeatureFlag[],
    typescript: boolean
  ): Record<string, string> {
    const devDeps: Record<string, string> = {};

    if (typescript) {
      devDeps.typescript = '^5.0.0';
      if (type === 'react-app' || type === 'react-library') {
        devDeps['@types/react'] = '^18.0.0';
        devDeps['@types/react-dom'] = '^18.0.0';
      }
    }

    if (features.includes('testing')) {
      devDeps.jest = '^29.0.0';
      if (typescript) {
        devDeps['ts-jest'] = '^29.0.0';
        devDeps['@types/jest'] = '^29.0.0';
      }
      if (type === 'react-app' || type === 'react-library') {
        devDeps['@testing-library/react'] = '^14.0.0';
        devDeps['@testing-library/jest-dom'] = '^6.0.0';
      }
    }

    if (features.includes('eslint')) {
      devDeps.eslint = '^8.0.0';
    }

    if (features.includes('prettier')) {
      devDeps.prettier = '^3.0.0';
    }

    return devDeps;
  }

  /**
   * Generate README.md
   */
  private generateReadme(name: string, description: string, type: ProjectType): string {
    return `# ${name}

${description}

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`

## Project Type

${type}

## License

MIT
`;
  }

  /**
   * Generate .gitignore
   */
  private generateGitignore(type: ProjectType): string {
    const common = `node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
coverage/`;

    if (type === 'react-app') {
      return `${common}
.eslintcache`;
    }

    return common;
  }

  /**
   * Generate tsconfig.json
   */
  private generateTsConfig(type: ProjectType): string {
    const config: Record<string, unknown> = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        outDir: './dist',
        declaration: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.test.tsx'],
    };

    if (type === 'react-app' || type === 'react-library' || type === 'component-library') {
      config.compilerOptions = {
        ...config.compilerOptions,
        jsx: 'react-jsx',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      };
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * Generate feature-specific files
   */
  private async generateFeatureFiles(
    feature: FeatureFlag,
    outputDir: string,
    type: ProjectType
  ): Promise<string[]> {
    // Implementation would generate files based on feature flag
    // For brevity, returning empty array
    return [];
  }

  /**
   * Generate component feature
   */
  private async generateComponentFeature(
    name: string,
    outputDir: string,
    tests: boolean,
    storybook: boolean
  ): Promise<void> {
    const componentCode = this.componentGenerator.generateFunctional({ name });
    await this.fileGenerator.create(`${outputDir}/${name}.tsx`, componentCode);

    const indexCode = `export { ${name} } from './${name}';`;
    await this.fileGenerator.create(`${outputDir}/index.ts`, indexCode);

    if (tests) {
      const testCode = this.testGenerator.generateComponentTest({ component: name });
      await this.fileGenerator.create(`${outputDir}/${name}.test.tsx`, testCode);
    }

    if (storybook) {
      const storyCode = `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${name}';

const meta: Meta<typeof ${name}> = {
  component: ${name},
};

export default meta;
type Story = StoryObj<typeof ${name}>;

export const Default: Story = {};`;
      await this.fileGenerator.create(`${outputDir}/${name}.stories.tsx`, storyCode);
    }
  }

  /**
   * Generate hook feature
   */
  private async generateHookFeature(name: string, outputDir: string, tests: boolean): Promise<void> {
    const hookCode = this.hookGenerator.generateHook({
      name,
      returnType: 'void',
      body: '  // Hook implementation',
      returnStatement: 'undefined',
    });
    await this.fileGenerator.create(`${outputDir}/${name}.ts`, hookCode);

    if (tests) {
      const testCode = `import { renderHook } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('works', () => {
    const { result } = renderHook(() => ${name}());
    expect(result.current).toBeDefined();
  });
});`;
      await this.fileGenerator.create(`${outputDir}/${name}.test.ts`, testCode);
    }
  }

  /**
   * Generate service feature
   */
  private async generateServiceFeature(name: string, outputDir: string, tests: boolean): Promise<void> {
    const serviceCode = `export class ${name} {
  constructor() {}

  async fetch(): Promise<void> {
    // Service implementation
  }
}`;
    await this.fileGenerator.create(`${outputDir}/${name}.ts`, serviceCode);

    if (tests) {
      const testCode = this.testGenerator.generateFunctionTest({
        functionName: name,
        importPath: `./${name}`,
      });
      await this.fileGenerator.create(`${outputDir}/${name}.test.ts`, testCode);
    }
  }

  /**
   * Generate page feature
   */
  private async generatePageFeature(name: string, outputDir: string, tests: boolean): Promise<void> {
    const pageCode = this.componentGenerator.generateFunctional({
      name: `${name}Page`,
      body: `  return (
    <div>
      <h1>${name}</h1>
    </div>
  );`,
    });
    await this.fileGenerator.create(`${outputDir}/${name}.tsx`, pageCode);

    if (tests) {
      const testCode = this.testGenerator.generateComponentTest({ component: `${name}Page` });
      await this.fileGenerator.create(`${outputDir}/${name}.test.tsx`, testCode);
    }
  }

  /**
   * Generate store feature
   */
  private async generateStoreFeature(name: string, outputDir: string, tests: boolean): Promise<void> {
    const storeCode = `import { create } from 'zustand';

interface ${name}State {
  // State properties
}

export const use${name} = create<${name}State>((set) => ({
  // Initial state
}));`;
    await this.fileGenerator.create(`${outputDir}/${name}.ts`, storeCode);
  }

  /**
   * Generate util feature
   */
  private async generateUtilFeature(name: string, outputDir: string, tests: boolean): Promise<void> {
    const utilCode = `export function ${name}() {
  // Utility implementation
}`;
    await this.fileGenerator.create(`${outputDir}/${name}.ts`, utilCode);

    if (tests) {
      const testCode = this.testGenerator.generateFunctionTest({
        functionName: name,
        importPath: `./${name}`,
      });
      await this.fileGenerator.create(`${outputDir}/${name}.test.ts`, testCode);
    }
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(
    name: string,
    packageManager: string,
    features: FeatureFlag[]
  ): string[] {
    const steps = [
      `cd ${name}`,
      `${packageManager} install`,
      `${packageManager} start`,
    ];

    if (features.includes('testing')) {
      steps.push(`${packageManager} test`);
    }

    return steps;
  }
}

/**
 * Quick function to scaffold a React component
 *
 * @param name - Component name
 * @param outputDir - Output directory
 * @returns Created file paths
 *
 * @example
 * ```typescript
 * const files = await scaffoldComponent('Button', 'src/components');
 * ```
 */
export async function scaffoldComponent(name: string, outputDir: string): Promise<string[]> {
  const scaffolder = new ProjectScaffolder();
  return scaffolder.generateComponent(name, outputDir);
}

/**
 * Quick function to scaffold a page
 *
 * @param name - Page name
 * @param outputDir - Output directory
 * @returns Created file paths
 *
 * @example
 * ```typescript
 * const files = await scaffoldPage('Dashboard', 'src/pages');
 * ```
 */
export async function scaffoldPage(name: string, outputDir: string): Promise<string[]> {
  const scaffolder = new ProjectScaffolder();
  return scaffolder.generatePage(name, outputDir);
}
