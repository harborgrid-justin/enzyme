/**
 * Documentation Utilities
 * Helper functions for generating markdown, tables, links, and TOCs
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface TableColumn {
  header: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableRow {
  [key: string]: string | number | boolean;
}

export interface TOCItem {
  title: string;
  anchor: string;
  level: number;
  children?: TOCItem[];
}

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  success: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

/**
 * Simple logger implementation
 */
export const logger: Logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`ℹ️  ${message}`, ...args);
  },
  success: (message: string, ...args: any[]) => {
    console.log(`✅ ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`⚠️  ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`❌ ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.DEBUG) {
      console.debug(`🔍 ${message}`, ...args);
    }
  },
};

/**
 * Generate markdown heading
 */
export function heading(level: number, text: string): string {
  return `${'#'.repeat(level)} ${text}\n\n`;
}

/**
 * Generate markdown paragraph
 */
export function paragraph(text: string): string {
  return `${text}\n\n`;
}

/**
 * Generate markdown code block
 */
export function codeBlock(code: string, language = 'typescript'): string {
  return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
}

/**
 * Generate inline code
 */
export function inlineCode(text: string): string {
  return `\`${text}\``;
}

/**
 * Generate markdown link
 */
export function link(text: string, url: string): string {
  return `[${text}](${url})`;
}

/**
 * Generate markdown list
 */
export function list(items: string[], ordered = false): string {
  const prefix = ordered ? '1. ' : '- ';
  return items.map((item) => `${prefix}${item}`).join('\n') + '\n\n';
}

/**
 * Generate markdown table
 */
export function table(columns: TableColumn[], rows: TableRow[]): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = columns.map((col) => col.header);
  const alignments = columns.map((col) => {
    switch (col.align) {
      case 'center':
        return ':---:';
      case 'right':
        return '---:';
      default:
        return '---';
    }
  });

  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `| ${alignments.join(' | ')} |`;

  const dataRows = rows.map((row) => {
    const cells = columns.map((col) => {
      const value = row[col.header];
      return value !== undefined && value !== null ? String(value) : '';
    });
    return `| ${cells.join(' | ')} |`;
  });

  return [headerRow, separatorRow, ...dataRows].join('\n') + '\n\n';
}

/**
 * Generate parameters table
 */
export function parametersTable(params: Array<{
  name: string;
  type: string;
  optional?: boolean;
  defaultValue?: string;
  description?: string;
}>): string {
  if (params.length === 0) {
    return '';
  }

  const columns: TableColumn[] = [
    { header: 'Parameter', align: 'left' },
    { header: 'Type', align: 'left' },
    { header: 'Required', align: 'center' },
    { header: 'Default', align: 'left' },
    { header: 'Description', align: 'left' },
  ];

  const rows = params.map((param) => ({
    Parameter: inlineCode(param.name),
    Type: inlineCode(param.type),
    Required: param.optional ? '❌' : '✅',
    Default: param.defaultValue ? inlineCode(param.defaultValue) : '-',
    Description: param.description || '-',
  }));

  return table(columns, rows);
}

/**
 * Generate properties table for interfaces
 */
export function propertiesTable(props: Array<{
  name: string;
  type: string;
  optional?: boolean;
  readonly?: boolean;
  description?: string;
}>): string {
  if (props.length === 0) {
    return '';
  }

  const columns: TableColumn[] = [
    { header: 'Property', align: 'left' },
    { header: 'Type', align: 'left' },
    { header: 'Required', align: 'center' },
    { header: 'Readonly', align: 'center' },
    { header: 'Description', align: 'left' },
  ];

  const rows = props.map((prop) => ({
    Property: inlineCode(prop.name),
    Type: inlineCode(prop.type),
    Required: prop.optional ? '❌' : '✅',
    Readonly: prop.readonly ? '✅' : '❌',
    Description: prop.description || '-',
  }));

  return table(columns, rows);
}

/**
 * Generate badges
 */
export function badge(label: string, value: string, color = 'blue'): string {
  return `![${label}](https://img.shields.io/badge/${label}-${value}-${color})`;
}

/**
 * Generate deprecation notice
 */
export function deprecationNotice(message: string): string {
  return `> **⚠️ Deprecated**: ${message}\n\n`;
}

/**
 * Generate blockquote
 */
export function blockquote(text: string): string {
  return `> ${text}\n\n`;
}

/**
 * Generate horizontal rule
 */
export function horizontalRule(): string {
  return '---\n\n';
}

/**
 * Generate table of contents
 */
export function generateTOC(items: TOCItem[]): string {
  let toc = heading(2, 'Table of Contents');

  function renderItems(items: TOCItem[], indent = 0): string {
    return items
      .map((item) => {
        const prefix = '  '.repeat(indent) + '- ';
        const line = `${prefix}${link(item.title, `#${item.anchor}`)}\n`;
        const children = item.children ? renderItems(item.children, indent + 1) : '';
        return line + children;
      })
      .join('');
  }

  toc += renderItems(items);
  toc += '\n';

  return toc;
}

/**
 * Extract TOC items from markdown content
 */
export function extractTOCFromMarkdown(content: string): TOCItem[] {
  const items: TOCItem[] = [];
  const lines = content.split('\n');
  const stack: TOCItem[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const anchor = slugify(title);

      const item: TOCItem = {
        title,
        anchor,
        level,
        children: [],
      };

      // Find parent
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        items.push(item);
      } else {
        const parent = stack[stack.length - 1];
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item);
      }

      stack.push(item);
    }
  }

  return items;
}

/**
 * Convert text to slug (anchor)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Escape markdown special characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
}

/**
 * Generate relative link between documentation files
 */
export function relativeLink(from: string, to: string, text?: string): string {
  const relativePath = path.relative(path.dirname(from), to);
  return link(text || path.basename(to, '.md'), relativePath);
}

/**
 * Create documentation directory structure
 */
export async function ensureDocsDirectory(outputDir: string): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
}

/**
 * Write documentation file
 */
export async function writeDocFile(
  filePath: string,
  content: string
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
  logger.debug(`Wrote documentation to ${filePath}`);
}

/**
 * Read file content
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file modification time
 */
export async function getModifiedTime(filePath: string): Promise<Date> {
  const stats = await fs.stat(filePath);
  return stats.mtime;
}

/**
 * Check if source is newer than target
 */
export async function isNewer(sourcePath: string, targetPath: string): Promise<boolean> {
  if (!(await fileExists(targetPath))) {
    return true;
  }

  const sourceTime = await getModifiedTime(sourcePath);
  const targetTime = await getModifiedTime(targetPath);

  return sourceTime > targetTime;
}

/**
 * Find files matching pattern
 */
export async function findFiles(
  directory: string,
  pattern: RegExp,
  exclude?: RegExp[]
): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Check exclude patterns
      if (exclude?.some((regex) => regex.test(fullPath))) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await walk(directory);
  return files;
}

/**
 * Format type for display
 */
export function formatType(type: string): string {
  // Clean up complex types for better readability
  return type
    .replace(/import\([^)]+\)\./g, '')
    .replace(/React\./g, '');
}

/**
 * Generate example code with proper formatting
 */
export function formatExample(example: string, language = 'typescript'): string {
  // Remove leading/trailing whitespace
  const trimmed = example.trim();

  // Find minimum indentation
  const lines = trimmed.split('\n');
  const minIndent = lines
    .filter((line) => line.trim().length > 0)
    .reduce((min, line) => {
      const indent = line.match(/^\s*/)?.[0].length || 0;
      return Math.min(min, indent);
    }, Infinity);

  // Remove minimum indentation from all lines
  const normalized = lines
    .map((line) => line.substring(minIndent))
    .join('\n');

  return codeBlock(normalized, language);
}

/**
 * Create cross-reference link
 */
export function crossReference(
  type: 'component' | 'hook' | 'api' | 'type',
  name: string,
  basePath = '.'
): string {
  const paths = {
    component: 'components',
    hook: 'hooks',
    api: 'api',
    type: 'types',
  };

  const relativePath = `${basePath}/${paths[type]}/${slugify(name)}.md`;
  return link(inlineCode(name), relativePath);
}

/**
 * Generate metadata frontmatter
 */
export function frontmatter(metadata: Record<string, any>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

/**
 * Generate navigation footer
 */
export function navigationFooter(
  prev?: { title: string; url: string },
  next?: { title: string; url: string }
): string {
  let nav = horizontalRule();

  if (prev || next) {
    nav += '<div style="display: flex; justify-content: space-between;">\n';

    if (prev) {
      nav += `  <div>${link(`← ${prev.title}`, prev.url)}</div>\n`;
    } else {
      nav += '  <div></div>\n';
    }

    if (next) {
      nav += `  <div>${link(`${next.title} →`, next.url)}</div>\n`;
    } else {
      nav += '  <div></div>\n';
    }

    nav += '</div>\n\n';
  }

  return nav;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Generate timestamp
 */
export function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Group items by category
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }

  return groups;
}

/**
 * Deduplicate array
 */
export function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
