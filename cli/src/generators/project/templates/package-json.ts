/**
 * Package.json Template Generator
 */

import { resolveDependencies, sortPackageJson, type TemplateContext } from '../utils';

export function generatePackageJson(context: TemplateContext): Record<string, any> {
  const { projectName, features } = context;
  const { dependencies, devDependencies } = resolveDependencies(features);

  const packageJson = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
      typecheck: 'tsc --noEmit',
      lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
      'lint:fix': 'eslint . --ext ts,tsx --fix',
      format: 'prettier --write "src/**/*.{ts,tsx,css,json}"',
      'format:check': 'prettier --check "src/**/*.{ts,tsx,css,json}"',
    },
    dependencies,
    devDependencies,
  };

  return sortPackageJson(packageJson);
}
