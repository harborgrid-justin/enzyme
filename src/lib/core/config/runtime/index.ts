/**
 * @fileoverview Runtime configuration exports.
 *
 * @module core/config/runtime
 */

export {
  RuntimeConfigManager,
  getRuntimeConfigManager,
  setRuntimeConfig,
  applyRuntimeOverlay,
  rollbackConfig,
  startConfigPolling,
  stopConfigPolling,
} from './RuntimeConfigManager';
