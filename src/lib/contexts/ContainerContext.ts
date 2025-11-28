/**
 * @file Container Context
 * @description Context for container query support (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Container breakpoints
 */
export interface ContainerBreakpoints {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

/**
 * Container context value
 */
export interface ContainerContextValue {
  containerWidth: number;
  containerHeight: number;
  breakpoints: ContainerBreakpoints;
  sizeCategory?: keyof ContainerBreakpoints | 'xs';
  matchesQuery: (query: keyof ContainerBreakpoints | number) => boolean;
  isAbove: (query: keyof ContainerBreakpoints | number) => boolean;
  isBelow: (query: keyof ContainerBreakpoints | number) => boolean;
}

/**
 * Container context - extracted for Fast Refresh compliance
 */
export const ContainerContext = createContext<ContainerContextValue | null>(null);

ContainerContext.displayName = 'ContainerContext';
