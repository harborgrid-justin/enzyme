/**
 * @file DI Context
 * @description Context for dependency injection (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Service contract
 */
export interface ServiceContract<T> {
  id: symbol;
  name: string;
}

/**
 * Service registration
 */
export interface ServiceRegistration<T> {
  contract: ServiceContract<T>;
  factory: () => T;
  singleton?: boolean;
  tags?: string[];
}

/**
 * Feature DI container
 */
export interface FeatureDIContainer {
  register: <T>(registration: ServiceRegistration<T>) => void;
  resolve: <T>(contract: ServiceContract<T>) => T;
  tryResolve: <T>(contract: ServiceContract<T>) => T | undefined;
  has: <T>(contract: ServiceContract<T>) => boolean;
  resolveByTag: <T>(tag: string) => T[];
  clear: () => void;
}

/**
 * DI context - extracted for Fast Refresh compliance
 */
export const DIContext = createContext<FeatureDIContainer | null>(null);

DIContext.displayName = 'DIContext';
