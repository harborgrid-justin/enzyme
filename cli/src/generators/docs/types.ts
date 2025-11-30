/**
 * Type definitions for documentation generator
 */

export interface GeneratorConfig {
  projectRoot: string;
  srcDir: string;
  outputDir: string;
  format: 'markdown' | 'html' | 'json';
  incremental: boolean;
  exclude?: string[];
  include?: string[];
  verbose?: boolean;
}

export interface DocumentationOptions {
  generateTOC?: boolean;
  includeSidebar?: boolean;
  includeSearch?: boolean;
  includeExamples?: boolean;
  customTemplates?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface ParseOptions {
  includePrivate?: boolean;
  includeInternal?: boolean;
  followImports?: boolean;
  maxDepth?: number;
}

export interface TemplateData {
  title: string;
  description?: string;
  category?: string;
  generated: string;
  version?: string;
  [key: string]: any;
}

export interface DocumentMetadata {
  title: string;
  path: string;
  category: string;
  type: 'api' | 'component' | 'hook' | 'route' | 'guide';
  tags: string[];
  lastModified: Date;
  author?: string;
}

export interface CodeExample {
  language: string;
  code: string;
  title?: string;
  description?: string;
}

export interface CrossReference {
  type: 'component' | 'hook' | 'api' | 'type';
  name: string;
  path: string;
}

export interface NavigationItem {
  title: string;
  path: string;
  children?: NavigationItem[];
  icon?: string;
  badge?: string;
}

export interface SearchOptions {
  maxResults?: number;
  fuzzy?: boolean;
  caseSensitive?: boolean;
  includeContent?: boolean;
}

export interface MarkdownOptions {
  gfm?: boolean;
  breaks?: boolean;
  highlight?: (code: string, lang: string) => string;
}

export interface HTMLOptions {
  template?: string;
  css?: string[];
  js?: string[];
  minify?: boolean;
}

export interface JSONOptions {
  pretty?: boolean;
  includeMetadata?: boolean;
  includeSource?: boolean;
}

export interface ServerConfig {
  port: number;
  host?: string;
  directory: string;
  watch: boolean;
  cors?: boolean;
  compression?: boolean;
}

export interface WatchOptions {
  ignored?: string[];
  debounce?: number;
  persistent?: boolean;
}

export interface BuildResult {
  success: boolean;
  filesGenerated: number;
  errors: Error[];
  warnings: string[];
  duration: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  file: string;
  line: number;
  message: string;
}

export interface TemplateContext {
  data: TemplateData;
  helpers: TemplateHelpers;
  partials: Record<string, string>;
}

export interface TemplateHelpers {
  slug: (text: string) => string;
  join: (array: any[], separator: string) => string;
  add: (a: number, b: number) => number;
  capitalize: (text: string) => string;
  formatDate: (date: Date) => string;
  [key: string]: (...args: any[]) => any;
}

export interface PluginAPI {
  registerGenerator: (name: string, generator: Generator) => void;
  registerTemplate: (name: string, template: string) => void;
  registerHelper: (name: string, helper: Function) => void;
  onBeforeGenerate: (hook: (config: GeneratorConfig) => void) => void;
  onAfterGenerate: (hook: (result: BuildResult) => void) => void;
}

export interface Generator {
  name: string;
  generate: (config: GeneratorConfig) => Promise<BuildResult>;
}

export interface Plugin {
  name: string;
  version: string;
  init: (api: PluginAPI) => void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level: LogLevel;
  colors?: boolean;
  timestamp?: boolean;
}
