/**
 * Canned demo identities for the inventory "log in as…" switcher.
 *
 * Each `user` satisfies enzyme's `auth.User` shape and carries an explicit
 * `permissions` array so RBAC gating (`useAuth().hasPermission`) is fully
 * deterministic without a real backend. NOTE: client-side RBAC here is UX only
 * — a real deployment must enforce these on the server.
 *
 * Inventory roles map onto enzyme's fixed `auth.Role` union as follows:
 *   manager  -> 'admin'    (full control, settings, discontinue)
 *   buyer    -> 'manager'  (create, update, place restock orders)
 *   picker   -> 'user'     (read, adjust stock on the floor)
 *   auditor  -> 'guest'    (read-only)
 */
import type { auth } from '@missionfabric-js/enzyme';
import { INVENTORY_PERMISSIONS } from './types';

export interface DemoIdentity {
  key: 'manager' | 'buyer' | 'picker' | 'auditor';
  label: string;
  blurb: string;
  password: string;
  user: auth.User;
}

const now = new Date().toISOString();

function makeUser(
  id: string,
  firstName: string,
  lastName: string,
  roles: auth.Role[],
  permissions: string[]
): auth.User {
  return {
    id,
    email: `${firstName.toLowerCase()}@enzyme.example`,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    roles,
    permissions,
    createdAt: now,
    updatedAt: now,
  };
}

export const DEMO_IDENTITIES: DemoIdentity[] = [
  {
    key: 'manager',
    label: 'Mira (Warehouse Manager)',
    blurb: 'Full access — create SKUs, place orders, discontinue items',
    password: 'demo',
    user: makeUser('u-manager', 'Mira', 'Okafor', ['admin'], [
      INVENTORY_PERMISSIONS.READ,
      INVENTORY_PERMISSIONS.ADJUST_STOCK,
      INVENTORY_PERMISSIONS.CREATE,
      INVENTORY_PERMISSIONS.UPDATE,
      INVENTORY_PERMISSIONS.ORDER,
      INVENTORY_PERMISSIONS.DISCONTINUE,
      INVENTORY_PERMISSIONS.MANAGE_SETTINGS,
    ]),
  },
  {
    key: 'buyer',
    label: 'Bao (Buyer)',
    blurb: 'Procurement — update items and place restock orders',
    password: 'demo',
    user: makeUser('u-buyer', 'Bao', 'Tran', ['manager'], [
      INVENTORY_PERMISSIONS.READ,
      INVENTORY_PERMISSIONS.UPDATE,
      INVENTORY_PERMISSIONS.ORDER,
      INVENTORY_PERMISSIONS.ADJUST_STOCK,
    ]),
  },
  {
    key: 'picker',
    label: 'Priya (Floor Picker)',
    blurb: 'Floor ops — adjust stock counts; no procurement',
    password: 'demo',
    user: makeUser('u-picker', 'Priya', 'Singh', ['user'], [
      INVENTORY_PERMISSIONS.READ,
      INVENTORY_PERMISSIONS.ADJUST_STOCK,
    ]),
  },
  {
    key: 'auditor',
    label: 'Arlo (Auditor)',
    blurb: 'Read-only — compliance audit; no edits',
    password: 'demo',
    user: makeUser('u-auditor', 'Arlo', 'Reyes', ['guest'], [
      INVENTORY_PERMISSIONS.READ,
    ]),
  },
];

export function findIdentityByEmail(email: string): DemoIdentity | undefined {
  return DEMO_IDENTITIES.find((d) => d.user.email === email);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}
