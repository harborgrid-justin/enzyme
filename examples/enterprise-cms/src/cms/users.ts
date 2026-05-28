/**
 * Canned demo identities for the CMS "log in as…" switcher.
 *
 * Each `user` satisfies enzyme's `auth.User` shape and carries an explicit
 * `permissions` array so RBAC gating (`useAuth().hasPermission`) is fully
 * deterministic without a real backend. NOTE: client-side RBAC here is UX only
 * — a real deployment must enforce these on the server.
 *
 * CMS roles map onto enzyme's fixed `auth.Role` union as follows:
 *   admin   -> 'admin'    (publish, manage settings)
 *   editor  -> 'manager'  (create, update, send to review)
 *   reviewer-> 'user'     (read, update review feedback)
 *   viewer  -> 'guest'    (read-only)
 */
import type { auth } from '@missionfabric-js/enzyme';
import { CMS_PERMISSIONS } from './types';

export interface DemoIdentity {
  key: 'admin' | 'editor' | 'reviewer' | 'viewer';
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
    key: 'admin',
    label: 'Ada (Admin)',
    blurb: 'Full access — create, publish, manage settings',
    password: 'demo',
    user: makeUser('u-admin', 'Ada', 'Lovelace', ['admin'], [
      CMS_PERMISSIONS.READ,
      CMS_PERMISSIONS.CREATE,
      CMS_PERMISSIONS.UPDATE,
      CMS_PERMISSIONS.PUBLISH,
      CMS_PERMISSIONS.ARCHIVE,
      CMS_PERMISSIONS.MANAGE_SETTINGS,
    ]),
  },
  {
    key: 'editor',
    label: 'Grace (Editor)',
    blurb: 'Author — create, update, send for review',
    password: 'demo',
    user: makeUser('u-editor', 'Grace', 'Hopper', ['manager'], [
      CMS_PERMISSIONS.READ,
      CMS_PERMISSIONS.CREATE,
      CMS_PERMISSIONS.UPDATE,
    ]),
  },
  {
    key: 'reviewer',
    label: 'Katherine (Reviewer)',
    blurb: 'Reviewer — read + update review state',
    password: 'demo',
    user: makeUser('u-reviewer', 'Katherine', 'Johnson', ['user'], [
      CMS_PERMISSIONS.READ,
      CMS_PERMISSIONS.UPDATE,
    ]),
  },
  {
    key: 'viewer',
    label: 'Vera (Viewer)',
    blurb: 'Read-only — no edits, no workflow actions',
    password: 'demo',
    user: makeUser('u-viewer', 'Vera', 'Rubin', ['guest'], [CMS_PERMISSIONS.READ]),
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
