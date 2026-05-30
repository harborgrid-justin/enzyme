/**
 * @file AuditTrail — an append-only, queryable business-audit log.
 *
 * Distinct from `monitoring` crash breadcrumbs (which capture low-level
 * diagnostics): this records structured `{ actor, action, target, at }` events
 * that an admin surface can read back, filter, and export. It is observable
 * (via {@link AuditTrail.subscribe}) so React views can re-render on change,
 * and framework-agnostic (no DOM/React dependency in the core).
 *
 * With `hashChain: true` each entry is linked to the previous one by a hash,
 * making casual tampering detectable via {@link AuditTrail.verifyIntegrity}.
 * The default hash is a fast, NON-cryptographic checksum — adequate for
 * change-detection, not for adversarial tamper-proofing. For the latter, inject
 * a cryptographic `hash` (e.g. backed by SubtleCrypto). As with all
 * client-side governance, this is a UX/integrity aid, not a server boundary.
 */

import { generateId } from './ids';
import type { AuditEntry, AuditInput, AuditQuery } from './types';

/** Options for {@link createAuditTrail}. */
export interface AuditTrailOptions {
  /** Maximum number of entries retained; oldest are dropped. Default `500`. */
  limit?: number;
  /** Seed entries, newest-first. Copied defensively. */
  initial?: readonly AuditEntry[];
  /** Override id generation (e.g. for deterministic tests). */
  generateId?: (entry: AuditInput) => string;
  /** Override the clock; must return an ISO-8601 string. */
  now?: () => string;
  /** Called after every successful {@link AuditTrail.record}. */
  onChange?: (entries: readonly AuditEntry[]) => void;
  /**
   * Link entries into a tamper-evident hash chain. Default `false`. When on,
   * every recorded entry carries `prevHash` + `hash` and
   * {@link AuditTrail.verifyIntegrity} can validate the chain.
   */
  hashChain?: boolean;
  /**
   * Hash function used when `hashChain` is on. Defaults to a fast,
   * non-cryptographic checksum; inject a cryptographic hash for real
   * tamper-evidence. Must be deterministic.
   */
  hash?: (input: string) => string;
}

const DEFAULT_LIMIT = 500;

/** Genesis link for the first (oldest) entry in a chain. */
const GENESIS_HASH = '0';

/**
 * Fast, non-cryptographic 32-bit FNV-1a checksum rendered as 8 hex chars.
 * Detects accidental/casual tampering; not collision- or forgery-resistant.
 */
export function checksum(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * An observable, append-only audit log. Entries are kept newest-first and the
 * list is capped at `limit`.
 */
export class AuditTrail {
  private entries: readonly AuditEntry[];
  private readonly limit: number;
  private readonly makeId: (entry: AuditInput) => string;
  private readonly now: () => string;
  private readonly onChange: ((entries: readonly AuditEntry[]) => void) | undefined;
  private readonly hashChain: boolean;
  private readonly hash: (input: string) => string;
  private readonly listeners = new Set<() => void>();

  constructor(options: AuditTrailOptions = {}) {
    this.limit = options.limit ?? DEFAULT_LIMIT;
    this.makeId = options.generateId ?? (() => generateId('aud'));
    this.now = options.now ?? (() => new Date().toISOString());
    this.onChange = options.onChange;
    this.hashChain = options.hashChain ?? false;
    this.hash = options.hash ?? checksum;
    this.entries = options.initial != null ? options.initial.slice(0, this.limit) : [];
  }

  /** Record a new event and return the stored {@link AuditEntry}. */
  record(input: AuditInput): AuditEntry {
    const entry: AuditEntry = {
      id: this.makeId(input),
      actor: input.actor,
      action: input.action,
      target: input.target,
      at: this.now(),
      ...(input.metadata != null ? { metadata: input.metadata } : {}),
    };
    if (this.hashChain) {
      const prevHash = this.entries[0]?.hash ?? GENESIS_HASH;
      entry.prevHash = prevHash;
      entry.hash = this.hash(this.canonicalize(entry, prevHash));
    }
    this.entries = [entry, ...this.entries].slice(0, this.limit);
    this.onChange?.(this.entries);
    this.emit();
    return entry;
  }

  /**
   * Verify the hash chain (only meaningful when `hashChain` is on). Returns
   * `true` when every entry's `hash` recomputes and links to the previous
   * entry's `hash`; `false` if any entry was altered, reordered, or removed.
   */
  verifyIntegrity(): boolean {
    if (!this.hashChain) return true;
    // Entries are newest-first, so entry[i]'s predecessor is entry[i + 1].
    for (let i = 0; i < this.entries.length; i += 1) {
      const entry = this.entries[i];
      if (entry == null) return false;
      const expectedPrev = this.entries[i + 1]?.hash ?? GENESIS_HASH;
      if (entry.prevHash !== expectedPrev) return false;
      if (entry.hash !== this.hash(this.canonicalize(entry, expectedPrev))) return false;
    }
    return true;
  }

  /** Returns a {@link AuditSink}-compatible bound recorder. */
  readonly sink = (input: AuditInput): void => {
    this.record(input);
  };

  /** All entries, newest-first. Stable reference until the next mutation. */
  list(): readonly AuditEntry[] {
    return this.entries;
  }

  /** Filter entries (ANDing all provided fields), newest-first. */
  query(q: AuditQuery): AuditEntry[] {
    const result = this.entries.filter((e) => {
      if (q.actor != null && e.actor !== q.actor) return false;
      if (q.action != null && e.action !== q.action) return false;
      if (q.target != null && e.target !== q.target) return false;
      if (q.since != null && e.at < q.since) return false;
      if (q.until != null && e.at > q.until) return false;
      return true;
    });
    return q.limit != null ? result.slice(0, q.limit) : result;
  }

  /** Remove all entries. */
  clear(): void {
    if (this.entries.length === 0) return;
    this.entries = [];
    this.onChange?.(this.entries);
    this.emit();
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Current snapshot, stable until the next mutation (for `useSyncExternalStore`). */
  readonly getSnapshot = (): readonly AuditEntry[] => this.entries;

  /** Serializable copy of the trail. */
  toJSON(): AuditEntry[] {
    return [...this.entries];
  }

  /** Canonical string fed to the hash function (deterministic field order). */
  private canonicalize(entry: AuditEntry, prevHash: string): string {
    const meta = entry.metadata != null ? JSON.stringify(entry.metadata) : '';
    return `${prevHash}|${entry.id}|${entry.actor}|${entry.action}|${entry.target}|${entry.at}|${meta}`;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Create an {@link AuditTrail}. */
export function createAuditTrail(options?: AuditTrailOptions): AuditTrail {
  return new AuditTrail(options);
}
