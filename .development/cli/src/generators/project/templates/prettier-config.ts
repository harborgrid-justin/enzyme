/**
 * Prettier Configuration Template Generator
 */

import type { TemplateContext } from '../utils';

export function generatePrettierConfig(_context: TemplateContext): Record<string, unknown> {
  return {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    plugins: ['prettier-plugin-tailwindcss'],
  };
}
