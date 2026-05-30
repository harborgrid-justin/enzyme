/**
 * Compliance & risk logic (features 56–61).
 *
 * Pure, dependency-free helpers powering framework readiness scoring, evidence
 * freshness, vendor-portfolio risk, the likelihood × impact risk register,
 * incident SLA / MTTR math, and DSAR statutory-clock tracking. Everything is
 * deterministic so it can be unit-tested without a backend.
 */
import { daysSince } from './governance';
import type {
  ComplianceControl,
  ComplianceFramework,
  DataAccess,
  DsarRequest,
  DsarStatus,
  EvidenceItem,
  Incident,
  Risk,
  RiskTier,
  Vendor,
} from '../types.compliance';

// --- 56. Compliance frameworks ----------------------------------------------

export interface FrameworkReadiness {
  framework: ComplianceFramework;
  total: number;
  implemented: number;
  partial: number;
  gap: number;
  /** Controls that count toward the score (total minus not-applicable). */
  applicable: number;
  /** 0..1 readiness: implemented counts full, partial counts half. */
  score: number;
}

/** Score a single framework from the controls mapped to it. */
export function frameworkReadiness(
  controls: ComplianceControl[],
  framework: ComplianceFramework
): FrameworkReadiness {
  const scoped = controls.filter((c) => c.framework === framework);
  const implemented = scoped.filter((c) => c.status === 'implemented').length;
  const partial = scoped.filter((c) => c.status === 'partial').length;
  const gap = scoped.filter((c) => c.status === 'gap').length;
  const applicable = scoped.filter((c) => c.status !== 'not-applicable').length;
  const score = applicable === 0 ? 1 : Number(((implemented + 0.5 * partial) / applicable).toFixed(2));
  return { framework, total: scoped.length, implemented, partial, gap, applicable, score };
}

/** Aggregate readiness across every applicable control, regardless of framework. */
export function overallReadiness(controls: ComplianceControl[]): number {
  const applicable = controls.filter((c) => c.status !== 'not-applicable');
  if (applicable.length === 0) return 1;
  const implemented = applicable.filter((c) => c.status === 'implemented').length;
  const partial = applicable.filter((c) => c.status === 'partial').length;
  return Number(((implemented + 0.5 * partial) / applicable.length).toFixed(2));
}

// --- 57. Evidence freshness --------------------------------------------------

export type EvidenceState = 'fresh' | 'stale' | 'expired';

/** Classify evidence against its refresh cadence: expired ≥ cadence, stale ≥ 80%. */
export function evidenceState(item: EvidenceItem, now: Date = new Date()): EvidenceState {
  const age = daysSince(item.collectedAt, now);
  if (age >= item.cadenceDays) return 'expired';
  if (age >= item.cadenceDays * 0.8) return 'stale';
  return 'fresh';
}

/**
 * Fraction of applicable controls backed by at least one non-expired evidence
 * item — the number an auditor actually cares about.
 */
export function evidenceCoverage(
  controls: ComplianceControl[],
  evidence: EvidenceItem[],
  now: Date = new Date()
): number {
  const applicable = controls.filter((c) => c.status !== 'not-applicable');
  if (applicable.length === 0) return 1;
  const covered = applicable.filter((c) =>
    evidence.some((e) => e.controlId === c.id && evidenceState(e, now) !== 'expired')
  ).length;
  return Number((covered / applicable.length).toFixed(2));
}

// --- 58. Vendor risk ---------------------------------------------------------

const TIER_WEIGHT: Record<RiskTier, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const ACCESS_WEIGHT: Record<DataAccess, number> = { none: 0, metadata: 1, pii: 2, sensitive: 3 };
/** Worst-case per-vendor weight (critical tier + sensitive access). */
const MAX_VENDOR_WEIGHT = 4 + 3;

/** Whether a vendor's security review is overdue against its cadence. */
export function vendorReviewDue(vendor: Vendor, now: Date = new Date()): boolean {
  return daysSince(vendor.lastReviewed, now) >= vendor.reviewCadenceDays;
}

export interface PortfolioRisk {
  /** 0..100 weighted portfolio risk (tier + data access). */
  score: number;
  counts: Record<RiskTier, number>;
  reviewsDue: number;
}

/** Roll a vendor portfolio up into a single risk score plus tier breakdown. */
export function portfolioRisk(vendors: Vendor[], now: Date = new Date()): PortfolioRisk {
  const counts: Record<RiskTier, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let total = 0;
  let reviewsDue = 0;
  for (const v of vendors) {
    counts[v.tier] += 1;
    total += TIER_WEIGHT[v.tier] + ACCESS_WEIGHT[v.dataAccess];
    if (vendorReviewDue(v, now)) reviewsDue += 1;
  }
  const score = vendors.length === 0 ? 0 : Math.round((total / vendors.length / MAX_VENDOR_WEIGHT) * 100);
  return { score, counts, reviewsDue };
}

// --- 59. Risk register -------------------------------------------------------

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Inherent risk on the classic 1..25 likelihood × impact scale. */
export function inherentRisk(likelihood: number, impact: number): number {
  return likelihood * impact;
}

/** Map a 1..25 score to a qualitative level. */
export function riskLevel(score: number): RiskLevel {
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 15) return 'high';
  return 'critical';
}

/** Residual risk after applying a risk's mitigation factor (rounded). */
export function residualRisk(risk: Risk): number {
  return Math.round(inherentRisk(risk.likelihood, risk.impact) * (1 - risk.mitigation));
}

export interface RegisterSummary {
  open: number;
  mitigating: number;
  accepted: number;
  closed: number;
  topRisk: Risk | null;
  inherentAvg: number;
  residualAvg: number;
}

/** Summarize a risk register: status counts, the worst risk, and averages. */
export function registerSummary(risks: Risk[]): RegisterSummary {
  const summary: RegisterSummary = {
    open: 0,
    mitigating: 0,
    accepted: 0,
    closed: 0,
    topRisk: null,
    inherentAvg: 0,
    residualAvg: 0,
  };
  if (risks.length === 0) return summary;
  let inherentTotal = 0;
  let residualTotal = 0;
  let topScore = -1;
  for (const r of risks) {
    summary[r.status] += 1;
    const inherent = inherentRisk(r.likelihood, r.impact);
    inherentTotal += inherent;
    residualTotal += residualRisk(r);
    if (inherent > topScore) {
      topScore = inherent;
      summary.topRisk = r;
    }
  }
  summary.inherentAvg = Number((inherentTotal / risks.length).toFixed(1));
  summary.residualAvg = Number((residualTotal / risks.length).toFixed(1));
  return summary;
}

// --- 60. Incident register ---------------------------------------------------

function hoursBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3_600_000;
}

/** Elapsed hours: to resolution if resolved, else to `now`. */
export function incidentDurationHours(incident: Incident, now: Date = new Date()): number {
  const end = incident.resolvedAt ?? now.toISOString();
  return Number(hoursBetween(incident.openedAt, end).toFixed(2));
}

/** Whether an incident has blown (or is blowing) its time-to-resolve SLA. */
export function slaBreached(incident: Incident, now: Date = new Date()): boolean {
  return incidentDurationHours(incident, now) > incident.slaHours;
}

/** Mean time to resolve, in hours, over resolved incidents only. */
export function mttrHours(incidents: Incident[]): number {
  const resolved = incidents.filter((i) => i.resolvedAt !== null);
  if (resolved.length === 0) return 0;
  const total = resolved.reduce((sum, i) => sum + incidentDurationHours(i), 0);
  return Number((total / resolved.length).toFixed(2));
}

export interface IncidentSummary {
  open: number;
  resolved: number;
  breached: number;
  mttrHours: number;
}

export function incidentSummary(incidents: Incident[], now: Date = new Date()): IncidentSummary {
  return {
    open: incidents.filter((i) => i.resolvedAt === null).length,
    resolved: incidents.filter((i) => i.resolvedAt !== null).length,
    breached: incidents.filter((i) => slaBreached(i, now)).length,
    mttrHours: mttrHours(incidents),
  };
}

// --- 61. Data-subject requests (DSAR) ---------------------------------------

export type DsarUrgency = 'on-track' | 'due-soon' | 'overdue' | 'closed';

const DSAR_CLOSED: DsarStatus[] = ['completed', 'rejected'];

/** Whole days left before the statutory deadline (negative once overdue). */
export function dsarDaysRemaining(req: DsarRequest, now: Date = new Date()): number {
  const due = new Date(req.receivedAt).getTime() + req.dueDays * 86_400_000;
  return Math.floor((due - now.getTime()) / 86_400_000);
}

/** Triage state of a request; resolved requests report `closed`. */
export function dsarUrgency(req: DsarRequest, now: Date = new Date()): DsarUrgency {
  if (DSAR_CLOSED.includes(req.status)) return 'closed';
  const remaining = dsarDaysRemaining(req, now);
  if (remaining < 0) return 'overdue';
  if (remaining <= 7) return 'due-soon';
  return 'on-track';
}

/** Fraction of still-active requests that are within their statutory window. */
export function dsarSlaCompliance(requests: DsarRequest[], now: Date = new Date()): number {
  const active = requests.filter((r) => !DSAR_CLOSED.includes(r.status));
  if (active.length === 0) return 1;
  const onTime = active.filter((r) => dsarDaysRemaining(r, now) >= 0).length;
  return Number((onTime / active.length).toFixed(2));
}
