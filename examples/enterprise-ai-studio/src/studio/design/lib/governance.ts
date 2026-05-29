/**
 * Governance & trust logic (features 26–31).
 *
 * Pure, dependency-free helpers powering the audit trail, RBAC checks, SCIM
 * directory reconciliation, retention evaluation, PII/DLP scanning, and secret
 * rotation status. Everything is deterministic so it can be unit-tested without
 * a backend.
 */
import type {
  AuditEntry,
  DataPolicy,
  PiiFinding,
  PiiKind,
  RbacMatrix,
  Role,
  ScimUser,
  VaultSecret,
} from '../types.advanced';

// --- 26. Audit log -----------------------------------------------------------

/** Small synchronous string hash (FNV-1a, hex). Tamper-evidence, not crypto. */
export function hashEntry(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Append an entry to a hash-chained audit log, linking it to the previous head. */
export function appendAudit(
  log: AuditEntry[],
  fields: { id: string; actor: string; action: string; target: string; at: string }
): AuditEntry {
  const prevHash = log[0]?.hash ?? 'genesis';
  const hash = hashEntry(`${prevHash}|${fields.actor}|${fields.action}|${fields.target}|${fields.at}`);
  return { ...fields, prevHash, hash };
}

/** Verify the chain is intact (newest-first ordering, as the store keeps it). */
export function verifyAuditChain(log: AuditEntry[]): boolean {
  for (let i = 0; i < log.length; i += 1) {
    const entry = log[i]!;
    const expectedPrev = log[i + 1]?.hash ?? 'genesis';
    if (entry.prevHash !== expectedPrev) return false;
    const expected = hashEntry(
      `${entry.prevHash}|${entry.actor}|${entry.action}|${entry.target}|${entry.at}`
    );
    if (entry.hash !== expected) return false;
  }
  return true;
}

// --- 27. RBAC ----------------------------------------------------------------

/** Whether a role grants a permission under the matrix. `owner` is all-powerful. */
export function can(matrix: RbacMatrix, role: Role, permission: string): boolean {
  if (role === 'owner') return true;
  return (matrix.grants[role] ?? []).includes(permission);
}

/** Effective permission count for a role (owner gets everything). */
export function effectivePermissions(matrix: RbacMatrix, role: Role): number {
  return role === 'owner' ? matrix.permissions.length : (matrix.grants[role] ?? []).length;
}

// --- 28. SCIM ----------------------------------------------------------------

export interface ScimPlan {
  toAdd: ScimUser[];
  toRemove: ScimUser[];
  inSync: ScimUser[];
}

/** Reconcile IdP-provided users against locally-provisioned ones. */
export function scimDiff(directory: ScimUser[]): ScimPlan {
  return {
    toAdd: directory.filter((u) => !u.provisioned),
    toRemove: [],
    inSync: directory.filter((u) => u.provisioned),
  };
}

// --- 29. Retention -----------------------------------------------------------

/** Whether data of a given age (days) is past a policy's retention window. */
export function isExpired(policy: DataPolicy, ageDays: number): boolean {
  return ageDays > policy.retentionDays;
}

/** Days remaining before expiry (negative when already expired). */
export function retentionRemaining(policy: DataPolicy, ageDays: number): number {
  return policy.retentionDays - ageDays;
}

// --- 30. PII / DLP -----------------------------------------------------------

const PII_PATTERNS: { kind: PiiKind; re: RegExp }[] = [
  { kind: 'email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { kind: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { kind: 'credit-card', re: /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g },
  { kind: 'phone', re: /\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g },
  { kind: 'ip', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
];

/** Scan free text for PII. Order is most-specific-first to avoid double counts. */
export function scanPii(text: string): PiiFinding[] {
  const findings: PiiFinding[] = [];
  const claimed: Array<[number, number]> = [];
  for (const { kind, re } of PII_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (claimed.some(([s, e]) => start < e && end > s)) continue;
      claimed.push([start, end]);
      findings.push({ kind, match: m[0], index: start });
    }
  }
  return findings.sort((a, b) => a.index - b.index);
}

/** Replace detected PII with redaction markers. */
export function redactPii(text: string): { redacted: string; count: number } {
  const findings = scanPii(text);
  let redacted = text;
  // Replace from the end so indices stay valid.
  for (const f of [...findings].sort((a, b) => b.index - a.index)) {
    redacted =
      redacted.slice(0, f.index) +
      `[REDACTED:${f.kind}]` +
      redacted.slice(f.index + f.match.length);
  }
  return { redacted, count: findings.length };
}

// --- 31. Secrets -------------------------------------------------------------

export type RotationState = 'ok' | 'due-soon' | 'overdue';

/** Days since a secret was last rotated. */
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

/** Classify rotation health against the secret's policy. */
export function rotationState(secret: VaultSecret, now: Date = new Date()): RotationState {
  const age = daysSince(secret.lastRotated, now);
  if (age >= secret.rotationDays) return 'overdue';
  if (age >= secret.rotationDays * 0.8) return 'due-soon';
  return 'ok';
}
