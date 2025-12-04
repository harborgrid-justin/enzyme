/**
 * TypeScript Configuration Template Generator
 */

import type { TemplateContext } from '../utils';

export function generateTsConfig(_context: TemplateContext): Record<string, unknown> {
  return {
    compilerOptions: {
      // Language & Environment
      target: 'ES2022',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',

      // Type Checking
      strict: true,
      noUncheckedIndexedAccess: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      forceConsistentCasingInFileNames: true,

      // Module System
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      isolatedModules: true,
      moduleDetection: 'force',

      // Emit
      noEmit: true,

      // Performance
      skipLibCheck: true,

      // Path Mapping
      baseUrl: '.',
      paths: {
        '@/*': ['src/*'],
      },

      // Type Definitions
      types: ['vite/client'],
    },
    include: ['src'],
    exclude: ['node_modules', 'dist'],
  };
}
