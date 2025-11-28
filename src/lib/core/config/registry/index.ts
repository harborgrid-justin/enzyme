/**
 * @fileoverview Registry exports for the centralized configuration system.
 *
 * @module core/config/registry
 */

export {
  ConfigRegistry,
  getConfigRegistry,
  getLibConfig,
  getLibConfigValue,
  setLibConfigValue,
  subscribeToLibConfig,
  LIB_CONFIG,
} from './ConfigRegistry';

export {
  EndpointRegistry,
  getEndpointRegistry,
  registerEndpoint,
  getEndpoint,
  buildEndpointUrl,
  isEndpointHealthy,
} from './EndpointRegistry';
