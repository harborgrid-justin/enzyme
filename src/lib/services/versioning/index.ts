/**
 * @file Services Versioning Module
 * @description API versioning exports with migration support.
 *
 * @example
 * ```typescript
 * import {
 *   VersionedApiClient,
 *   createVersionedApi,
 *   VersioningStrategy,
 * } from '@/lib/services/versioning';
 * ```
 */

// API Versioning
export {
  VersionedApiClient,
  createVersionedApi,
  VersioningStrategy,
  parseVersion,
  versionToNumber,
  compareVersions,
  isVersionInRange,
  getLatestVersion,
  createFieldRenamingTransformer,
  createEndpointMappingTransformer,
  composeTransformers,
  VersionNotSupportedError,
  VersionDeprecatedError,
  exampleVersionedApi,
  type ApiVersion,
  type VersionDeprecation,
  type VersionTransformer,
  type VersionConfig,
  type VersionNegotiationResult,
  type VersionedApiClientConfig,
} from '../api-versioning';
