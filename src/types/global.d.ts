/**
 * @file Global Type Declarations
 * @description Ambient declarations and module augmentations
 */

/// <reference types="vite/client" />

/**
 * Vite environment variables
 */
 
interface _ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_FEATURE_FLAGS_URL: string;
  readonly VITE_WS_URL: string;
}

/**
 * Window extensions
 */
declare global {
  interface Window {
    /** Application configuration */
    __APP_CONFIG__?: {
      apiBaseUrl: string;
      featureFlags: Record<string, boolean>;
      version: string;
    };
    
    /** Debug utilities (development only) */
    __DEBUG__?: {
      store: unknown;
      queryClient: unknown;
      router: unknown;
    };
  }
}

/**
 * CSS modules
 */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

/**
 * Image imports
 */
declare module '*.svg' {
  import type { FunctionComponent, SVGProps } from 'react';
  export const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.ico' {
  const src: string;
  export default src;
}

/**
 * JSON imports
 */
declare module '*.json' {
  const value: unknown;
  export default value;
}

/**
 * Web Worker imports
 */
declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

/**
 * Raw file imports
 */
declare module '*?raw' {
  const content: string;
  export default content;
}

/**
 * URL imports
 */
declare module '*?url' {
  const url: string;
  export default url;
}

export {};
