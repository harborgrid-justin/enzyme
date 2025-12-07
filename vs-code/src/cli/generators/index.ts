export * from './generator-runner';

/**
 * Generator options interface
 */
export interface GeneratorOptions {
  name: string;
  path?: string;
  skipTests?: boolean;
  skipStories?: boolean;
  skipStyles?: boolean;
  typescript?: boolean;
  export?: 'default' | 'named';
  [key: string]: unknown;
}

/**
 *
 */
export interface GeneratorTemplate {
  type: string;
  files: GeneratorFile[];
}

/**
 *
 */
export interface GeneratorFile {
  path: string;
  content: string;
  skipIfExists?: boolean;
}

/**
 *
 */
export interface GeneratorResult {
  success: boolean;
  files: string[];
  errors: string[];
}

/**
 *
 */
export type GeneratorType =
  | 'component'
  | 'page'
  | 'hook'
  | 'service'
  | 'feature'
  | 'slice'
  | 'api'
  | 'route'
  | 'module';
