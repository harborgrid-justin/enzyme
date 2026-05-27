/**
 * Canned demo identities for the "log in as…" switcher.
 *
 * Each `user` satisfies enzyme's `auth.User` shape and carries an explicit
 * `permissions` array so RBAC gating (`useHasPermission` / `RequirePermission`)
 * is fully deterministic without a real backend. NOTE: client-side RBAC here is
 * UX only — a real deployment must enforce these on the server.
 */
import type { auth } from '@missionfabric-js/enzyme';

export const CHAT_PERMISSIONS = {
  SEND: 'message:send',
  DELETE: 'message:delete',
  PIN: 'message:pin',
  MANAGE_CHANNEL: 'channel:manage',
} as const;

export interface DemoIdentity {
  key: 'admin' | 'manager' | 'member' | 'guest';
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
    blurb: 'Full access — send, delete, pin, manage channels',
    password: 'demo',
    user: makeUser('u-admin', 'Ada', 'Admin', ['admin'], [
      CHAT_PERMISSIONS.SEND,
      CHAT_PERMISSIONS.DELETE,
      CHAT_PERMISSIONS.PIN,
      CHAT_PERMISSIONS.MANAGE_CHANNEL,
    ]),
  },
  {
    key: 'manager',
    label: 'Max (Manager)',
    blurb: 'Moderator — send, delete, pin',
    password: 'demo',
    user: makeUser('u-manager', 'Max', 'Manager', ['manager'], [
      CHAT_PERMISSIONS.SEND,
      CHAT_PERMISSIONS.DELETE,
      CHAT_PERMISSIONS.PIN,
    ]),
  },
  {
    key: 'member',
    label: 'Mia (Member)',
    blurb: 'Standard member — send only',
    password: 'demo',
    user: makeUser('u-member', 'Mia', 'Member', ['user'], [CHAT_PERMISSIONS.SEND]),
  },
  {
    key: 'guest',
    label: 'Gus (Guest)',
    blurb: 'Read-only — cannot send',
    password: 'demo',
    user: makeUser('u-guest', 'Gus', 'Guest', ['guest'], []),
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
