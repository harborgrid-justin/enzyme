/**
 * Feature flags used by the inventory demo.
 *
 * Enzyme's `flagKeys` registry contains generic UI flags (dark mode, beta
 * features, etc). For inventory-specific surfaces we use namespaced string flags;
 * the `FeatureFlagProvider` accepts arbitrary keys via `initialFlags`.
 */
import { flags } from '@missionfabric-js/enzyme';

export const INVENTORY_FLAGS = {
  /** Auto-suggest restock orders when an item dips below reorder level. */
  AUTO_REORDER: 'inventory:auto-reorder',
  /** Show the barcode-scan helper in the item detail toolbar. */
  BARCODE_SCAN: 'inventory:barcode-scan',
  /** Allow filtering by warehouse and showing the multi-warehouse summary. */
  MULTI_WAREHOUSE: 'inventory:multi-warehouse',
  /** Show the AI-driven demand-forecast panel (beta). */
  AI_FORECASTING: 'inventory:ai-forecasting',
} as const;

export const INITIAL_FLAGS: Record<string, boolean> = {
  [flags.flagKeys.DARK_MODE]: true,
  [flags.flagKeys.BETA_FEATURES]: false,
  [flags.flagKeys.ADVANCED_SEARCH]: true,
  [INVENTORY_FLAGS.AUTO_REORDER]: true,
  [INVENTORY_FLAGS.BARCODE_SCAN]: true,
  [INVENTORY_FLAGS.MULTI_WAREHOUSE]: true,
  [INVENTORY_FLAGS.AI_FORECASTING]: false,
};
