/**
 * @file AuditTrail — an append-only, queryable business-audit log.
 *
 * Distinct from `monitoring` crash breadcrumbs (which capture low-level
 * diagnostics): this records structured `{ actor, action, target, at }` events
 * that an admin surface can read back, filter, and export. It is observable
 * (via {@link AuditTrail.subscribe}) so React views can re-render on change,
 * and framework-agnostic (no DOM/React dependency in the core).
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
}

const DEFAULT_LIMIT = 500;

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
  private readonly listeners = new Set<() => void>();

  constructor(options: AuditTrailOptions = {}) {
    this.limit = options.limit ?? DEFAULT_LIMIT;
    this.makeId = options.generateId ?? (() => generateId('aud'));
    this.now = options.now ?? (() => new Date().toISOString());
    this.onChange = options.onChange;
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
    this.entries = [entry, ...this.entries].slice(0, this.limit);
    this.onChange?.(this.entries);
    this.emit();
    return entry;
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

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Create an {@link AuditTrail}. */
export function createAuditTrail(options?: AuditTrailOptions): AuditTrail {
  return new AuditTrail(options);
}
