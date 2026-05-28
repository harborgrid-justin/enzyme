/**
 * Demo identities for the "Sign in as…" switcher.
 *
 * Each user carries explicit permissions so RBAC gating works without a real
 * backend. The enterprise AI workspace gates three actions:
 *
 *   ai:chat               — start a conversation / send turns
 *   ai:conversation:share — flip a conversation to workspace-shared
 *   ai:model:manage       — toggle beta models, edit org system prompts
 *
 * Client-side RBAC here is UX only — a real deployment must enforce these on
 * the server.
 */
import type { auth } from '@missionfabric-js/enzyme';

export const STUDIO_PERMISSIONS = {
  CHAT: 'ai:chat',
  SHARE: 'ai:conversation:share',
  MANAGE_MODELS: 'ai:model:manage',
} as const;

export interface DemoIdentity {
  key: 'admin' | 'engineer' | 'analyst' | 'guest';
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
    blurb: 'Full access — chat, share conversations, manage models',
    password: 'demo',
    user: makeUser('u-admin', 'Ada', 'Admin', ['admin'], [
      STUDIO_PERMISSIONS.CHAT,
      STUDIO_PERMISSIONS.SHARE,
      STUDIO_PERMISSIONS.MANAGE_MODELS,
    ]),
  },
  {
    key: 'engineer',
    label: 'Eli (Engineer)',
    blurb: 'Chat + share workspace conversations',
    password: 'demo',
    user: makeUser('u-engineer', 'Eli', 'Engineer', ['user'], [
      STUDIO_PERMISSIONS.CHAT,
      STUDIO_PERMISSIONS.SHARE,
    ]),
  },
  {
    key: 'analyst',
    label: 'Ana (Analyst)',
    blurb: 'Chat only — private conversations',
    password: 'demo',
    user: makeUser('u-analyst', 'Ana', 'Analyst', ['user'], [STUDIO_PERMISSIONS.CHAT]),
  },
  {
    key: 'guest',
    label: 'Gus (Guest)',
    blurb: 'Read-only — can browse shared conversations',
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
