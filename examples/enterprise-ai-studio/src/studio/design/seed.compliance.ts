/**
 * Seed fixtures for the Compliance & risk capabilities (features 56–61).
 *
 * Tuned so every panel opens onto a meaningful state: a control library that is
 * partway to audit-ready, evidence at every freshness tier, a vendor portfolio
 * with reviews coming due, a populated risk register, incidents both within and
 * past SLA, and DSARs at each point on the statutory clock. Dates are anchored
 * to a fixed `now` so the unit tests are deterministic.
 */
import type {
  ComplianceControl,
  DsarRequest,
  EvidenceItem,
  Incident,
  Risk,
  Vendor,
} from './types.compliance';

const now = '2026-05-29T12:00:00.000Z';
const day = (n: number): string => new Date(Date.parse(now) - n * 86_400_000).toISOString();

// --- 56. Compliance frameworks ----------------------------------------------

export const SEED_CONTROLS: ComplianceControl[] = [
  { id: 'ctl-cc61', framework: 'SOC 2', ref: 'CC6.1', title: 'Logical access controls', status: 'implemented', owner: 'Ada' },
  { id: 'ctl-cc62', framework: 'SOC 2', ref: 'CC6.2', title: 'Access provisioning & deprovisioning', status: 'partial', owner: 'Eli' },
  { id: 'ctl-cc71', framework: 'SOC 2', ref: 'CC7.1', title: 'Vulnerability detection', status: 'gap', owner: 'Eli' },
  { id: 'ctl-a124', framework: 'ISO 27001', ref: 'A.12.4', title: 'Logging & monitoring', status: 'implemented', owner: 'Ada' },
  { id: 'ctl-a92', framework: 'ISO 27001', ref: 'A.9.2', title: 'User access management', status: 'partial', owner: 'Ana' },
  { id: 'ctl-a181', framework: 'ISO 27001', ref: 'A.18.1', title: 'Compliance with legal requirements', status: 'not-applicable', owner: 'Ada' },
  { id: 'ctl-g32', framework: 'GDPR', ref: 'Art.32', title: 'Security of processing', status: 'implemented', owner: 'Ada' },
  { id: 'ctl-g30', framework: 'GDPR', ref: 'Art.30', title: 'Records of processing activities', status: 'gap', owner: 'Ana' },
];

// --- 57. Evidence freshness --------------------------------------------------

export const SEED_EVIDENCE: EvidenceItem[] = [
  { id: 'ev-1', controlId: 'ctl-cc61', name: 'SSO enforcement screenshot', collectedAt: day(5), cadenceDays: 30 },
  { id: 'ev-2', controlId: 'ctl-a124', name: 'Audit-log retention config', collectedAt: day(26), cadenceDays: 30 },
  { id: 'ev-3', controlId: 'ctl-g32', name: 'Encryption-at-rest attestation', collectedAt: day(40), cadenceDays: 30 },
  { id: 'ev-4', controlId: 'ctl-cc62', name: 'Quarterly access review export', collectedAt: day(10), cadenceDays: 90 },
  { id: 'ev-5', controlId: 'ctl-a92', name: 'Joiner/mover/leaver tickets', collectedAt: day(85), cadenceDays: 90 },
];

// --- 58. Vendor risk ---------------------------------------------------------

export const SEED_VENDORS: Vendor[] = [
  { id: 'ven-1', name: 'OpenAI', category: 'LLM provider', tier: 'high', dataAccess: 'sensitive', lastReviewed: day(20), reviewCadenceDays: 90 },
  { id: 'ven-2', name: 'Stripe', category: 'Payments', tier: 'critical', dataAccess: 'pii', lastReviewed: day(120), reviewCadenceDays: 90 },
  { id: 'ven-3', name: 'Datadog', category: 'Observability', tier: 'medium', dataAccess: 'metadata', lastReviewed: day(200), reviewCadenceDays: 180 },
  { id: 'ven-4', name: 'Figma', category: 'Design', tier: 'low', dataAccess: 'none', lastReviewed: day(30), reviewCadenceDays: 365 },
  { id: 'ven-5', name: 'Slack', category: 'Collaboration', tier: 'medium', dataAccess: 'pii', lastReviewed: day(95), reviewCadenceDays: 90 },
];

// --- 59. Risk register -------------------------------------------------------

export const SEED_RISKS: Risk[] = [
  { id: 'risk-1', title: 'Model output data exfiltration', category: 'AI', likelihood: 4, impact: 5, mitigation: 0.5, status: 'mitigating', owner: 'Ada' },
  { id: 'risk-2', title: 'Prompt-injection takeover', category: 'AI', likelihood: 5, impact: 4, mitigation: 0.6, status: 'open', owner: 'Eli' },
  { id: 'risk-3', title: 'Key vendor outage', category: 'Operational', likelihood: 3, impact: 3, mitigation: 0.3, status: 'accepted', owner: 'Eli' },
  { id: 'risk-4', title: 'Customer PII leakage', category: 'Privacy', likelihood: 3, impact: 5, mitigation: 0.4, status: 'mitigating', owner: 'Ana' },
  { id: 'risk-5', title: 'Cloud cost overrun', category: 'Financial', likelihood: 2, impact: 2, mitigation: 0, status: 'open', owner: 'Ada' },
];

// --- 60. Incident register ---------------------------------------------------

export const SEED_INCIDENTS: Incident[] = [
  { id: 'inc-1', title: 'Completions API 5xx spike', severity: 'sev1', service: 'api', openedAt: '2026-05-29T06:00:00.000Z', resolvedAt: null, slaHours: 4 },
  { id: 'inc-2', title: 'Slow streaming for EU region', severity: 'sev3', service: 'gateway', openedAt: '2026-05-28T12:00:00.000Z', resolvedAt: '2026-05-28T18:00:00.000Z', slaHours: 24 },
  { id: 'inc-3', title: 'Audit-log write backlog', severity: 'sev2', service: 'audit', openedAt: '2026-05-27T12:00:00.000Z', resolvedAt: '2026-05-29T00:00:00.000Z', slaHours: 24 },
  { id: 'inc-4', title: 'Dashboard chart render glitch', severity: 'sev4', service: 'web', openedAt: '2026-05-29T11:00:00.000Z', resolvedAt: null, slaHours: 72 },
  { id: 'inc-5', title: 'Webhook delivery retries', severity: 'sev2', service: 'webhooks', openedAt: '2026-05-26T12:00:00.000Z', resolvedAt: '2026-05-26T20:00:00.000Z', slaHours: 24 },
];

// --- 61. Data-subject requests (DSAR) ---------------------------------------

export const SEED_DSARS: DsarRequest[] = [
  { id: 'dsar-1', subject: 'maria.lopez@example.com', type: 'access', receivedAt: day(5), dueDays: 30, status: 'in-progress' },
  { id: 'dsar-2', subject: 'jon.weber@example.com', type: 'delete', receivedAt: day(28), dueDays: 30, status: 'received' },
  { id: 'dsar-3', subject: 'priya.nair@example.com', type: 'rectify', receivedAt: day(35), dueDays: 30, status: 'in-progress' },
  { id: 'dsar-4', subject: 'sam.okafor@example.com', type: 'portability', receivedAt: day(10), dueDays: 45, status: 'in-progress' },
  { id: 'dsar-5', subject: 'lena.brandt@example.com', type: 'access', receivedAt: day(20), dueDays: 30, status: 'completed' },
];
