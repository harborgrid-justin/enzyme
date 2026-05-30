/**
 * Domain types for the **Compliance & risk** Design capabilities (features 56–61).
 *
 * This layer rounds out the enterprise spine: a control library mapped to the
 * frameworks an org actually gets audited against (SOC 2 / ISO 27001 / GDPR),
 * the evidence that proves each control, third-party vendor risk, a likelihood ×
 * impact risk register, a security incident log with SLA tracking, and a GDPR /
 * CCPA data-subject-request queue.
 *
 * As elsewhere in the Design domain, everything here is plain serializable data
 * so it can persist to localStorage and round-trip through the pure, unit-tested
 * helpers in `design/lib/compliance.ts`.
 */

// =============================================================================
// 56. Compliance frameworks
// =============================================================================

export type ComplianceFramework = 'SOC 2' | 'ISO 27001' | 'GDPR';

export type ControlStatus = 'implemented' | 'partial' | 'gap' | 'not-applicable';

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  /** Framework-native reference, e.g. `CC6.1`, `A.12.4`, `Art.32`. */
  ref: string;
  title: string;
  status: ControlStatus;
  owner: string;
}

// =============================================================================
// 57. Evidence freshness
// =============================================================================

export interface EvidenceItem {
  id: string;
  /** Control this evidence substantiates. */
  controlId: string;
  name: string;
  collectedAt: string;
  /** How often the evidence must be refreshed to stay audit-ready. */
  cadenceDays: number;
}

// =============================================================================
// 58. Vendor risk
// =============================================================================

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

/** What class of data the vendor can touch — drives the risk weighting. */
export type DataAccess = 'none' | 'metadata' | 'pii' | 'sensitive';

export interface Vendor {
  id: string;
  name: string;
  category: string;
  tier: RiskTier;
  dataAccess: DataAccess;
  lastReviewed: string;
  reviewCadenceDays: number;
}

// =============================================================================
// 59. Risk register
// =============================================================================

export type RiskStatus = 'open' | 'mitigating' | 'accepted' | 'closed';

export interface Risk {
  id: string;
  title: string;
  category: string;
  /** 1 (rare) .. 5 (almost certain). */
  likelihood: number;
  /** 1 (negligible) .. 5 (severe). */
  impact: number;
  /** Fraction of inherent risk removed by controls, 0..1. */
  mitigation: number;
  status: RiskStatus;
  owner: string;
}

// =============================================================================
// 60. Incident register
// =============================================================================

export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  service: string;
  openedAt: string;
  /** `null` while still open. */
  resolvedAt: string | null;
  /** Time-to-resolve commitment for this severity, in hours. */
  slaHours: number;
}

// =============================================================================
// 61. Data-subject requests (DSAR)
// =============================================================================

export type DsarType = 'access' | 'delete' | 'rectify' | 'portability';

export type DsarStatus = 'received' | 'in-progress' | 'completed' | 'rejected';

export interface DsarRequest {
  id: string;
  subject: string;
  type: DsarType;
  receivedAt: string;
  /** Statutory window in days (GDPR is 30). */
  dueDays: number;
  status: DsarStatus;
}
