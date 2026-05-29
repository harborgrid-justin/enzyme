/**
 * Integrations & automation logic (features 44–49).
 *
 * Pure helpers for webhook signing/delivery health, automation rule matching,
 * schedule next-run computation, and API-key generation/masking. Deterministic
 * where it can be; key generation takes an explicit RNG for testability.
 */
import type { Automation, ScheduledJob, Webhook } from '../types.advanced';
import { hashEntry } from './governance';

// --- 44. Webhooks ------------------------------------------------------------

/** HMAC-ish signature for a payload (FNV chain — illustrative, not crypto). */
export function signPayload(secret: string, payload: string): string {
  return `sha256=${hashEntry(`${secret}:${payload}`)}${hashEntry(payload)}`;
}

/** Success rate of a webhook's recent deliveries (0..1). */
export function deliverySuccessRate(webhook: Webhook): number {
  if (webhook.deliveries.length === 0) return 1;
  const ok = webhook.deliveries.filter((d) => d.status === 'success').length;
  return Number((ok / webhook.deliveries.length).toFixed(2));
}

// --- 46. Automations ---------------------------------------------------------

/** Automations whose trigger matches an emitted event and that are enabled. */
export function matchAutomations(automations: Automation[], event: string): Automation[] {
  return automations.filter((a) => a.enabled && a.trigger === event);
}

// --- 47. Scheduler -----------------------------------------------------------

/** Next run time for an interval job, given its last run (or `from` if never run). */
export function nextRun(job: ScheduledJob, from: Date = new Date()): Date {
  const base = job.lastRun != null ? new Date(job.lastRun) : from;
  return new Date(base.getTime() + job.intervalMinutes * 60_000);
}

/** Whether a job is due to run at `now`. */
export function isDue(job: ScheduledJob, now: Date = new Date()): boolean {
  if (!job.enabled) return false;
  if (job.lastRun == null) return true;
  return nextRun(job, now).getTime() <= now.getTime();
}

/** Human label for an interval (minutes → "every 15m" / "every 2h" / "daily"). */
export function intervalLabel(minutes: number): string {
  if (minutes % 1440 === 0) {
    const d = minutes / 1440;
    return d === 1 ? 'daily' : `every ${d}d`;
  }
  if (minutes % 60 === 0) return `every ${minutes / 60}h`;
  return `every ${minutes}m`;
}

// --- 48. API keys ------------------------------------------------------------

export interface GeneratedKey {
  /** Full key, shown to the user exactly once. */
  full: string;
  /** Persisted masked form. */
  masked: string;
}

/** Generate an API key with a visible prefix and a masked tail. */
export function generateKey(rng: () => number = Math.random): GeneratedKey {
  const body = Array.from({ length: 24 }, () =>
    Math.floor(rng() * 36).toString(36)
  ).join('');
  const full = `enz_sk_${body}`;
  return { full, masked: maskKey(full) };
}

/** Mask a key, keeping its prefix and last 4 chars. */
export function maskKey(full: string): string {
  const tail = full.slice(-4);
  return `enz_sk_••••${tail}`;
}
