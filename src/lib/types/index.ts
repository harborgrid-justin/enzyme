/**
 * @file Types Module Barrel Export
 * @description Central export point for type definitions
 * @module @/lib/types
 */

// Re-export all type definitions
export * from './dom';

// Export a dummy type to prevent empty chunk
export type LibTypesModule = 'types';
