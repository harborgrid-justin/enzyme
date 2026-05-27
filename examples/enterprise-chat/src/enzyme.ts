/**
 * Curated re-export of the enzyme modules this example uses.
 *
 * Importing the framework's full barrel (`src/index.ts`) would also pull the
 * `ui` module, whose `VirtualizedDataTable` imports `FixedSizeList` from
 * react-window — an export removed in the installed react-window v2, which breaks
 * the app bundle. Re-exporting only the modules we use keeps the example
 * self-contained and buildable, and improves tree-shaking.
 */
export * as auth from '@/lib/auth';
export * as api from '@/lib/api';
export * as realtime from '@/lib/realtime';
export * as state from '@/lib/state';
export * as flags from '@/lib/flags';
export * as theme from '@/lib/theme';
export * as monitoring from '@/lib/monitoring';
export * as performance from '@/lib/performance';
export * as security from '@/lib/security';
