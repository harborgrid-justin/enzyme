/**
 * Feature flags used by the CMS demo.
 *
 * Enzyme's `flagKeys` registry contains generic UI flags (dark mode, beta
 * features, etc). For CMS-specific surfaces we use namespaced string flags;
 * the `FeatureFlagProvider` accepts arbitrary keys via `initialFlags`.
 */
import { flags } from '@missionfabric-js/enzyme';

export const CMS_FLAGS = {
  /** Show scheduled-publishing controls in the entry detail. */
  SCHEDULED_PUBLISHING: 'cms:scheduled-publishing',
  /** Render the live editor preview panel. */
  LIVE_PREVIEW: 'cms:live-preview',
  /** Show the governance / audit stream panel. */
  GOVERNANCE_MODE: 'cms:governance-mode',
  /** Show the AI-assist beta panel. */
  AI_ASSIST: 'cms:ai-assist',
} as const;

export const INITIAL_FLAGS: Record<string, boolean> = {
  [flags.flagKeys.DARK_MODE]: true,
  [flags.flagKeys.BETA_FEATURES]: false,
  [flags.flagKeys.ADVANCED_SEARCH]: true,
  [CMS_FLAGS.SCHEDULED_PUBLISHING]: true,
  [CMS_FLAGS.LIVE_PREVIEW]: true,
  [CMS_FLAGS.GOVERNANCE_MODE]: true,
  [CMS_FLAGS.AI_ASSIST]: false,
};
