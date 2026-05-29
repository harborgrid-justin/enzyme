/**
 * Embed / handoff exporters (feature #20).
 *
 * Wraps a page body into a framework component so a prototype can graduate
 * into a real codebase — the gap Claude Design leaves open ("generates pages,
 * not reusable components"). Produces React, Vue, a native Web Component, or a
 * Storybook story.
 */
import type { DesignPage, ExportFormat } from '../types';

function pascalCase(value: string): string {
  return value
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('') || 'Component';
}

export function exportPage(page: DesignPage, format: ExportFormat): { filename: string; code: string } {
  const name = pascalCase(page.name);
  switch (format) {
    case 'react':
      return {
        filename: `${name}.tsx`,
        code: `export function ${name}(): JSX.Element {\n  return (\n    <div dangerouslySetInnerHTML={{ __html: ${backtick(page.body)} }} />\n  );\n}\n`,
      };
    case 'vue':
      return {
        filename: `${name}.vue`,
        code: `<template>\n  <div v-html="markup" />\n</template>\n\n<script setup lang="ts">\nconst markup = ${backtick(page.body)};\n</script>\n`,
      };
    case 'web-component':
      return {
        filename: `${kebab(name)}.ts`,
        code: `class ${name}Element extends HTMLElement {\n  connectedCallback() {\n    this.innerHTML = ${backtick(page.body)};\n  }\n}\ncustomElements.define('${kebab(name)}', ${name}Element);\n`,
      };
    case 'storybook':
      return {
        filename: `${name}.stories.tsx`,
        code: `import { ${name} } from './${name}';\n\nexport default { title: 'Prototypes/${name}', component: ${name} };\nexport const Default = {};\n`,
      };
  }
}

function backtick(body: string): string {
  return '`' + body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
}

function kebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
