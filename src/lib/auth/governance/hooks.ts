/**
 * @file React bindings for the governance stores.
 *
 * Thin `useSyncExternalStore` wrappers that subscribe a component to a store's
 * snapshot. The store instance is created outside React (e.g. once at module
 * scope or in a provider) and passed in; mutations are called on that instance,
 * and these hooks re-render the view when the snapshot changes.
 */

import { useSyncExternalStore } from 'react';
import type { AccessControl } from './access-control';
import type { AuditTrail } from './audit-trail';
import type { ProvisioningDirectory } from './provisioning';
import type { AccessControlSnapshot, AuditEntry, ProvisioningSnapshot } from './types';

/** Subscribe to an {@link AuditTrail}; returns the current entries (newest-first). */
export function useAuditTrail(trail: AuditTrail): readonly AuditEntry[] {
  return useSyncExternalStore(trail.subscribe, trail.getSnapshot, trail.getSnapshot);
}

/** Subscribe to an {@link AccessControl}; returns the current matrix snapshot. */
export function useAccessControl(control: AccessControl): AccessControlSnapshot {
  return useSyncExternalStore(control.subscribe, control.getSnapshot, control.getSnapshot);
}

/** Subscribe to a {@link ProvisioningDirectory}; returns the current snapshot. */
export function useProvisioningDirectory(
  directory: ProvisioningDirectory
): ProvisioningSnapshot {
  return useSyncExternalStore(
    directory.subscribe,
    directory.getSnapshot,
    directory.getSnapshot
  );
}
