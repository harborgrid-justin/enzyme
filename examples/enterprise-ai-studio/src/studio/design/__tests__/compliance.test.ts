import { describe, it, expect } from 'vitest';
import {
  frameworkReadiness,
  overallReadiness,
  evidenceState,
  evidenceCoverage,
  vendorReviewDue,
  portfolioRisk,
  inherentRisk,
  riskLevel,
  residualRisk,
  registerSummary,
  incidentDurationHours,
  slaBreached,
  mttrHours,
  incidentSummary,
  dsarDaysRemaining,
  dsarUrgency,
  dsarSlaCompliance,
} from '../lib/compliance';
import {
  SEED_CONTROLS,
  SEED_EVIDENCE,
  SEED_VENDORS,
  SEED_RISKS,
  SEED_INCIDENTS,
  SEED_DSARS,
} from '../seed.compliance';

// Anchor every relative date in the seeds for determinism.
const NOW = new Date('2026-05-29T12:00:00.000Z');

const evidence = (id: string) => SEED_EVIDENCE.find((e) => e.id === id)!;
const vendor = (id: string) => SEED_VENDORS.find((v) => v.id === id)!;
const risk = (id: string) => SEED_RISKS.find((r) => r.id === id)!;
const incident = (id: string) => SEED_INCIDENTS.find((i) => i.id === id)!;
const dsar = (id: string) => SEED_DSARS.find((d) => d.id === id)!;

// =============================================================================
// Compliance frameworks (#56)
// =============================================================================

describe('compliance frameworks (#56)', () => {
  it('scores a framework, counting partials as half and excluding N/A', () => {
    const iso = frameworkReadiness(SEED_CONTROLS, 'ISO 27001');
    expect(iso.total).toBe(3);
    expect(iso.applicable).toBe(2); // A.18.1 is not-applicable
    expect(iso.score).toBe(0.75); // (1 implemented + 0.5 partial) / 2
  });
  it('handles a framework with a gap', () => {
    const soc2 = frameworkReadiness(SEED_CONTROLS, 'SOC 2');
    expect(soc2.gap).toBe(1);
    expect(soc2.score).toBe(0.5); // (1 + 0.5) / 3
  });
  it('aggregates readiness across every applicable control', () => {
    expect(overallReadiness(SEED_CONTROLS)).toBeCloseTo(0.57, 2); // 4 / 7
  });
});

// =============================================================================
// Evidence freshness (#57)
// =============================================================================

describe('evidence freshness (#57)', () => {
  it('classifies fresh, stale, and expired against cadence', () => {
    expect(evidenceState(evidence('ev-1'), NOW)).toBe('fresh'); // 5d / 30d
    expect(evidenceState(evidence('ev-2'), NOW)).toBe('stale'); // 26d / 30d
    expect(evidenceState(evidence('ev-3'), NOW)).toBe('expired'); // 40d / 30d
  });
  it('counts only non-expired evidence toward coverage', () => {
    // 4 of 7 applicable controls have non-expired evidence (the GDPR Art.32 one is expired).
    expect(evidenceCoverage(SEED_CONTROLS, SEED_EVIDENCE, NOW)).toBeCloseTo(0.57, 2);
  });
});

// =============================================================================
// Vendor risk (#58)
// =============================================================================

describe('vendor risk (#58)', () => {
  it('flags vendors past their review cadence', () => {
    expect(vendorReviewDue(vendor('ven-1'), NOW)).toBe(false); // 20d / 90d
    expect(vendorReviewDue(vendor('ven-2'), NOW)).toBe(true); // 120d / 90d
    expect(vendorReviewDue(vendor('ven-5'), NOW)).toBe(true); // 95d / 90d
  });
  it('rolls the portfolio up into a weighted score', () => {
    const p = portfolioRisk(SEED_VENDORS, NOW);
    expect(p.score).toBe(57); // avg(6,6,3,1,4)=4 of max 7 → 57%
    expect(p.reviewsDue).toBe(3);
    expect(p.counts).toEqual({ low: 1, medium: 2, high: 1, critical: 1 });
  });
});

// =============================================================================
// Risk register (#59)
// =============================================================================

describe('risk register (#59)', () => {
  it('computes inherent score and qualitative level', () => {
    expect(inherentRisk(4, 5)).toBe(20);
    expect(riskLevel(4)).toBe('low');
    expect(riskLevel(9)).toBe('medium');
    expect(riskLevel(15)).toBe('high');
    expect(riskLevel(20)).toBe('critical');
  });
  it('applies mitigation to get residual risk', () => {
    expect(residualRisk(risk('risk-1'))).toBe(10); // 20 × (1 − 0.5)
    expect(residualRisk(risk('risk-3'))).toBe(6); // round(9 × 0.7)
  });
  it('summarizes the register', () => {
    const s = registerSummary(SEED_RISKS);
    expect(s.open).toBe(2);
    expect(s.mitigating).toBe(2);
    expect(s.accepted).toBe(1);
    expect(inherentRisk(s.topRisk!.likelihood, s.topRisk!.impact)).toBe(20);
    expect(s.inherentAvg).toBe(13.6);
    expect(s.residualAvg).toBe(7.4);
  });
});

// =============================================================================
// Incident register (#60)
// =============================================================================

describe('incident register (#60)', () => {
  it('measures duration to resolution or to now', () => {
    expect(incidentDurationHours(incident('inc-1'), NOW)).toBe(6); // open, 6h elapsed
    expect(incidentDurationHours(incident('inc-2'))).toBe(6); // resolved in 6h
    expect(incidentDurationHours(incident('inc-3'))).toBe(36); // resolved in 36h
  });
  it('flags SLA breaches for open and resolved incidents', () => {
    expect(slaBreached(incident('inc-1'), NOW)).toBe(true); // 6h > 4h SLA, still open
    expect(slaBreached(incident('inc-2'), NOW)).toBe(false); // 6h < 24h SLA
    expect(slaBreached(incident('inc-3'), NOW)).toBe(true); // 36h > 24h SLA
  });
  it('computes MTTR over resolved incidents and a summary', () => {
    expect(mttrHours(SEED_INCIDENTS)).toBeCloseTo(16.67, 1); // (6 + 36 + 8) / 3
    const s = incidentSummary(SEED_INCIDENTS, NOW);
    expect(s.open).toBe(2);
    expect(s.resolved).toBe(3);
    expect(s.breached).toBe(2);
  });
});

// =============================================================================
// Data-subject requests (#61)
// =============================================================================

describe('data-subject requests (#61)', () => {
  it('computes days remaining against the statutory window', () => {
    expect(dsarDaysRemaining(dsar('dsar-1'), NOW)).toBe(25); // received 5d ago, 30-day window
    expect(dsarDaysRemaining(dsar('dsar-3'), NOW)).toBe(-5); // received 35d ago, 30-day window
  });
  it('triages urgency, treating resolved requests as closed', () => {
    expect(dsarUrgency(dsar('dsar-1'), NOW)).toBe('on-track');
    expect(dsarUrgency(dsar('dsar-2'), NOW)).toBe('due-soon'); // 2d remaining
    expect(dsarUrgency(dsar('dsar-3'), NOW)).toBe('overdue');
    expect(dsarUrgency(dsar('dsar-5'), NOW)).toBe('closed'); // completed
  });
  it('reports SLA compliance over active requests only', () => {
    expect(dsarSlaCompliance(SEED_DSARS, NOW)).toBe(0.75); // 3 of 4 active on-time
  });
});
