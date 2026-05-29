/**
 * Domain types for the **enterprise** Design capabilities (features 26–55).
 *
 * These layer governance, AI-ops, content/localization, integrations, and
 * analytics on top of the visual-prototyping core — the surface area that moves
 * the studio from "prototype generator" to an enterprise-grade competitor.
 *
 * As with the core domain, everything here is plain serializable data so it can
 * be persisted to localStorage and round-tripped through the pure helpers in
 * `design/lib/*` (which carry the real, unit-tested logic).
 */

// =============================================================================
// Governance & trust (26–31)
// =============================================================================

// --- 26. Audit log -----------------------------------------------------------

/** A hash-chained audit entry. `hash` covers the entry + `prevHash` (tamper-evident). */
export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  prevHash: string;
  hash: string;
}

// --- 27. Access control (RBAC) ----------------------------------------------

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface RbacMember {
  name: string;
  role: Role;
}

export interface RbacMatrix {
  roles: Role[];
  /** Permission keys, e.g. `deploy`, `tokens.write`. */
  permissions: string[];
  /** role → permissions it grants. */
  grants: Record<Role, string[]>;
  members: RbacMember[];
}

// --- 28. SSO & SCIM ----------------------------------------------------------

export type SsoProtocol = 'saml' | 'oidc';

export interface IdentityProvider {
  id: string;
  name: string;
  protocol: SsoProtocol;
  domain: string;
  enabled: boolean;
}

export interface ScimUser {
  id: string;
  email: string;
  role: Role;
  /** Whether the user exists in the studio (provisioned) vs only at the IdP. */
  provisioned: boolean;
}

// --- 29. Data governance -----------------------------------------------------

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface DataPolicy {
  id: string;
  name: string;
  region: string;
  retentionDays: number;
  classification: DataClassification;
}

// --- 30. PII / DLP -----------------------------------------------------------

export type PiiKind = 'email' | 'phone' | 'ssn' | 'credit-card' | 'ip';

export interface PiiFinding {
  kind: PiiKind;
  match: string;
  index: number;
}

// --- 31. Secrets vault -------------------------------------------------------

export interface VaultSecret {
  id: string;
  name: string;
  /** Last 4 chars only; the value itself is never stored in the clear. */
  hint: string;
  lastRotated: string;
  rotationDays: number;
}

// =============================================================================
// AI operations (32–37)
// =============================================================================

// --- 32. Model registry & routing -------------------------------------------

export type ModelTier = 'frontier' | 'balanced' | 'fast';
export type RouteIntent = 'quality' | 'cheap' | 'vision';

export interface ModelEntry {
  id: string;
  provider: string;
  name: string;
  tier: ModelTier;
  costPer1kIn: number;
  costPer1kOut: number;
  vision: boolean;
  enabled: boolean;
}

export interface RoutingRule {
  intent: RouteIntent;
  modelId: string;
}

export interface RoutingPolicy {
  defaultModelId: string;
  rules: RoutingRule[];
}

// --- 33. Cost governance -----------------------------------------------------

export interface Budget {
  id: string;
  scope: string;
  limitUsd: number;
  spentUsd: number;
}

// --- 34. Guardrails ----------------------------------------------------------

export type GuardrailSeverity = 'low' | 'medium' | 'high';

export interface GuardrailFinding {
  rule: string;
  severity: GuardrailSeverity;
  excerpt: string;
}

// --- 35. Groundedness --------------------------------------------------------

export interface GroundednessReport {
  /** 0..1 fraction of output claims supported by the provided sources. */
  score: number;
  supported: string[];
  unsupported: string[];
}

// --- 36. Experiments (A/B) ---------------------------------------------------

export interface ExperimentVariant {
  id: string;
  name: string;
  visitors: number;
  conversions: number;
}

export type ExperimentStatus = 'draft' | 'running' | 'complete';

export interface Experiment {
  id: string;
  name: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
}

// --- 37. Observability -------------------------------------------------------

export type TraceStatus = 'ok' | 'error';

export interface Trace {
  id: string;
  op: string;
  ms: number;
  status: TraceStatus;
  at: string;
}

// =============================================================================
// Content & localization (38–43)
// =============================================================================

// --- 38. Localization (i18n) -------------------------------------------------

export interface LocaleString {
  key: string;
  /** locale code → translated value. The base locale is always present. */
  values: Record<string, string>;
}

export interface LocaleCatalog {
  base: string;
  locales: string[];
  strings: LocaleString[];
}

// --- 39. SEO -----------------------------------------------------------------

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  keywords: string[];
}

export interface SeoIssue {
  field: string;
  message: string;
  severity: GuardrailSeverity;
}

// --- 41. Image synthesis -----------------------------------------------------

export type ImageStyle = 'photographic' | 'illustration' | 'isometric' | 'minimal';
export type ImageJobStatus = 'queued' | 'rendering' | 'done' | 'failed';

export interface ImageJob {
  id: string;
  prompt: string;
  style: ImageStyle;
  status: ImageJobStatus;
  /** Data-URI SVG placeholder produced deterministically from the prompt. */
  preview: string;
  createdAt: string;
}

// --- 42. CMS versioning ------------------------------------------------------

export type ContentStatus = 'draft' | 'published';

export interface ContentRevision {
  version: number;
  body: string;
  at: string;
  author: string;
}

export interface ContentEntry {
  id: string;
  title: string;
  status: ContentStatus;
  version: number;
  body: string;
  history: ContentRevision[];
}

// =============================================================================
// Integrations & automation (44–49)
// =============================================================================

// --- 44. Webhooks ------------------------------------------------------------

export type DeliveryStatus = 'success' | 'failed' | 'pending';

export interface WebhookDelivery {
  id: string;
  event: string;
  status: DeliveryStatus;
  at: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  deliveries: WebhookDelivery[];
}

// --- 45. Connectors ----------------------------------------------------------

export interface Connector {
  id: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
}

// --- 46. Automations ---------------------------------------------------------

export interface Automation {
  id: string;
  name: string;
  /** Event key that fires the rule, e.g. `deploy.succeeded`. */
  trigger: string;
  /** Action key, e.g. `notify.slack`. */
  action: string;
  enabled: boolean;
}

// --- 47. Scheduler -----------------------------------------------------------

export interface ScheduledJob {
  id: string;
  name: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRun: string | null;
}

// --- 48. API keys ------------------------------------------------------------

export interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  /** Display-only prefix + masked tail; full key shown once at creation. */
  masked: string;
  createdAt: string;
  lastUsed: string | null;
}

// --- 49. Template gallery ----------------------------------------------------

export interface TemplateItem {
  id: string;
  name: string;
  category: string;
  description: string;
  installs: number;
  installed: boolean;
}

// =============================================================================
// Analytics & insights (50–55)
// =============================================================================

// --- 50. Funnels -------------------------------------------------------------

export interface FunnelStep {
  name: string;
  count: number;
}

export interface Funnel {
  id: string;
  name: string;
  steps: FunnelStep[];
}

// --- 52. Performance budget --------------------------------------------------

export interface PerfMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  budget: number;
  /** Whether higher is better (e.g. score) or lower is better (e.g. ms). */
  lowerIsBetter: boolean;
}

// --- 53. Capacity ------------------------------------------------------------

export interface CapacityResource {
  id: string;
  name: string;
  used: number;
  limit: number;
  unit: string;
}

// --- 54. Anomalies -----------------------------------------------------------

export interface MetricSeries {
  id: string;
  name: string;
  points: number[];
}

export interface Anomaly {
  index: number;
  value: number;
  zScore: number;
}
