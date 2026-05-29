/**
 * Seed fixtures for the enterprise Design capabilities (features 26–55).
 *
 * Chosen so every panel has something meaningful on first open: a populated
 * audit trail, a realistic RBAC matrix, a model registry with routing, live
 * budgets, experiments mid-flight, localization gaps to fix, and so on.
 */
import { appendAudit } from './lib/governance';
import { svgPlaceholder } from './lib/content';
import type {
  ApiKey,
  AuditEntry,
  Automation,
  Budget,
  CapacityResource,
  Connector,
  ContentEntry,
  DataPolicy,
  Experiment,
  Funnel,
  IdentityProvider,
  ImageJob,
  LocaleCatalog,
  MetricSeries,
  ModelEntry,
  PerfMetric,
  RbacMatrix,
  RoutingPolicy,
  ScheduledJob,
  ScimUser,
  SeoMeta,
  TemplateItem,
  Trace,
  VaultSecret,
  Webhook,
} from './types.advanced';

const now = '2026-05-29T12:00:00.000Z';
const day = (n: number): string => new Date(Date.parse(now) - n * 86_400_000).toISOString();

// --- 26. Audit log -----------------------------------------------------------

export const SEED_AUDIT: AuditEntry[] = (() => {
  const events = [
    { actor: 'Ada', action: 'deploy', target: 'page-home', at: day(2) },
    { actor: 'Eli', action: 'rbac.grant', target: 'editor:deploy', at: day(1) },
    { actor: 'Ana', action: 'tokens.write', target: 'color.brand.primary', at: day(0) },
  ];
  const log: AuditEntry[] = [];
  events.forEach((e, i) => {
    log.unshift(appendAudit(log, { id: `aud-${i + 1}`, ...e }));
  });
  return log;
})();

// --- 27. RBAC ----------------------------------------------------------------

export const SEED_RBAC: RbacMatrix = {
  roles: ['owner', 'admin', 'editor', 'viewer'],
  permissions: ['tokens.write', 'pages.write', 'deploy', 'approvals.decide', 'members.manage', 'secrets.read'],
  grants: {
    owner: [],
    admin: ['tokens.write', 'pages.write', 'deploy', 'approvals.decide', 'members.manage', 'secrets.read'],
    editor: ['tokens.write', 'pages.write', 'deploy'],
    viewer: [],
  },
  members: [
    { name: 'Ada', role: 'owner' },
    { name: 'Eli', role: 'admin' },
    { name: 'Ana', role: 'editor' },
    { name: 'Gus', role: 'viewer' },
  ],
};

// --- 28. SSO & SCIM ----------------------------------------------------------

export const SEED_IDPS: IdentityProvider[] = [
  { id: 'idp-okta', name: 'Okta', protocol: 'saml', domain: 'acme.com', enabled: true },
  { id: 'idp-entra', name: 'Microsoft Entra ID', protocol: 'oidc', domain: 'acme.com', enabled: false },
];

export const SEED_SCIM: ScimUser[] = [
  { id: 'u-ada', email: 'ada@acme.com', role: 'owner', provisioned: true },
  { id: 'u-eli', email: 'eli@acme.com', role: 'admin', provisioned: true },
  { id: 'u-noa', email: 'noa@acme.com', role: 'editor', provisioned: false },
  { id: 'u-ravi', email: 'ravi@acme.com', role: 'viewer', provisioned: false },
];

// --- 29. Data governance -----------------------------------------------------

export const SEED_POLICIES: DataPolicy[] = [
  { id: 'pol-eu', name: 'EU customer data', region: 'eu-west', retentionDays: 365, classification: 'restricted' },
  { id: 'pol-logs', name: 'Application logs', region: 'us-east', retentionDays: 30, classification: 'internal' },
  { id: 'pol-marketing', name: 'Marketing assets', region: 'global', retentionDays: 730, classification: 'public' },
];

// --- 31. Secrets vault -------------------------------------------------------

export const SEED_SECRETS: VaultSecret[] = [
  { id: 'sec-anthropic', name: 'ANTHROPIC_API_KEY', hint: '…a1b2', lastRotated: day(12), rotationDays: 90 },
  { id: 'sec-db', name: 'DATABASE_URL', hint: '…9f3c', lastRotated: day(95), rotationDays: 90 },
  { id: 'sec-stripe', name: 'STRIPE_SECRET', hint: '…77de', lastRotated: day(80), rotationDays: 90 },
];

// --- 32. Model registry & routing -------------------------------------------

export const SEED_MODELS: ModelEntry[] = [
  { id: 'claude-opus', provider: 'anthropic', name: 'Claude Opus 4.8', tier: 'frontier', costPer1kIn: 0.015, costPer1kOut: 0.075, vision: true, enabled: true },
  { id: 'claude-haiku', provider: 'anthropic', name: 'Claude Haiku 4.5', tier: 'fast', costPer1kIn: 0.0008, costPer1kOut: 0.004, vision: true, enabled: true },
  { id: 'gpt-balanced', provider: 'openai', name: 'GPT balanced', tier: 'balanced', costPer1kIn: 0.005, costPer1kOut: 0.015, vision: true, enabled: true },
  { id: 'gemini-fast', provider: 'google', name: 'Gemini Flash', tier: 'fast', costPer1kIn: 0.0007, costPer1kOut: 0.003, vision: true, enabled: false },
];

export const SEED_ROUTING: RoutingPolicy = {
  defaultModelId: 'gpt-balanced',
  rules: [
    { intent: 'quality', modelId: 'claude-opus' },
    { intent: 'cheap', modelId: 'claude-haiku' },
    { intent: 'vision', modelId: 'gpt-balanced' },
  ],
};

// --- 33. Cost governance -----------------------------------------------------

export const SEED_BUDGETS: Budget[] = [
  { id: 'bud-design', scope: 'Design Systems team', limitUsd: 500, spentUsd: 412 },
  { id: 'bud-growth', scope: 'Growth team', limitUsd: 300, spentUsd: 96 },
  { id: 'bud-org', scope: 'Org-wide', limitUsd: 2000, spentUsd: 1380 },
];

// --- 36. Experiments ---------------------------------------------------------

export const SEED_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-hero',
    name: 'Hero CTA copy',
    status: 'running',
    variants: [
      { id: 'v-a', name: 'Get started', visitors: 2400, conversions: 168 },
      { id: 'v-b', name: 'Start free trial', visitors: 2380, conversions: 233 },
    ],
  },
  {
    id: 'exp-pricing',
    name: 'Pricing layout',
    status: 'complete',
    variants: [
      { id: 'p-a', name: '2-column', visitors: 1800, conversions: 90 },
      { id: 'p-b', name: '3-column', visitors: 1790, conversions: 97 },
    ],
  },
];

// --- 37. Observability -------------------------------------------------------

export const SEED_TRACES: Trace[] = [
  { id: 't1', op: 'generate.page', ms: 1240, status: 'ok', at: day(0) },
  { id: 't2', op: 'generate.page', ms: 980, status: 'ok', at: day(0) },
  { id: 't3', op: 'retrieve.rag', ms: 210, status: 'ok', at: day(0) },
  { id: 't4', op: 'generate.component', ms: 3200, status: 'error', at: day(0) },
  { id: 't5', op: 'deploy.build', ms: 5400, status: 'ok', at: day(1) },
  { id: 't6', op: 'generate.page', ms: 1520, status: 'ok', at: day(1) },
  { id: 't7', op: 'retrieve.rag', ms: 190, status: 'ok', at: day(1) },
];

// --- 38. Localization --------------------------------------------------------

export const SEED_CATALOG: LocaleCatalog = {
  base: 'en',
  locales: ['en', 'es', 'de', 'ja'],
  strings: [
    { key: 'hero.title', values: { en: 'Ship enterprise UIs in minutes', es: 'Lanza interfaces empresariales en minutos', de: 'Enterprise-UIs in Minuten', ja: '' } },
    { key: 'hero.cta', values: { en: 'Get started', es: 'Comenzar', de: 'Loslegen', ja: '始める' } },
    { key: 'pricing.team', values: { en: 'Team', es: 'Equipo', de: '', ja: '' } },
    { key: 'pricing.enterprise', values: { en: 'Enterprise', es: '', de: '', ja: '' } },
  ],
};

// --- 39. SEO -----------------------------------------------------------------

export const SEED_SEO: SeoMeta = {
  title: 'Enzyme — enterprise AI design studio',
  description: 'From prompt to production-grade prototype with governance, collaboration, and deploy built in.',
  canonical: 'https://acme.dev/',
  ogImage: '',
  keywords: ['ai design', 'visual prototyping', 'enterprise'],
};

// --- 41. Image synthesis -----------------------------------------------------

export const SEED_IMAGE_JOBS: ImageJob[] = [
  {
    id: 'img-1',
    prompt: 'Abstract hero background, indigo gradient',
    style: 'minimal',
    status: 'done',
    preview: svgPlaceholder('Abstract hero background, indigo gradient', 'minimal'),
    createdAt: day(1),
  },
];

// --- 42. CMS versioning ------------------------------------------------------

export const SEED_CONTENT: ContentEntry[] = [
  {
    id: 'cnt-hero',
    title: 'Homepage hero copy',
    status: 'published',
    version: 3,
    body: 'Ship enterprise UIs in minutes.\nFrom prompt to production-grade prototype.',
    history: [
      { version: 2, body: 'Ship UIs fast.\nFrom prompt to prototype.', at: day(5), author: 'Ada' },
      { version: 1, body: 'Build UIs with AI.', at: day(9), author: 'Eli' },
    ],
  },
  {
    id: 'cnt-pricing',
    title: 'Pricing intro',
    status: 'draft',
    version: 1,
    body: 'Simple, transparent pricing for teams of every size.',
    history: [],
  },
];

// --- 44. Webhooks ------------------------------------------------------------

export const SEED_WEBHOOKS: Webhook[] = [
  {
    id: 'wh-deploy',
    url: 'https://hooks.acme.dev/deploys',
    events: ['deploy.succeeded', 'deploy.failed'],
    enabled: true,
    deliveries: [
      { id: 'd1', event: 'deploy.succeeded', status: 'success', at: day(0) },
      { id: 'd2', event: 'deploy.succeeded', status: 'success', at: day(1) },
      { id: 'd3', event: 'deploy.failed', status: 'failed', at: day(2) },
    ],
  },
];

// --- 45. Connectors ----------------------------------------------------------

export const SEED_CONNECTORS: Connector[] = [
  { id: 'con-slack', name: 'Slack', category: 'Messaging', description: 'Post deploy + approval notifications.', connected: true },
  { id: 'con-jira', name: 'Jira', category: 'Project', description: 'Create issues from comments.', connected: false },
  { id: 'con-github', name: 'GitHub', category: 'Code', description: 'Sync prototypes to a repo.', connected: true },
  { id: 'con-figma', name: 'Figma', category: 'Design', description: 'Import/export frames.', connected: true },
  { id: 'con-linear', name: 'Linear', category: 'Project', description: 'Track design tasks.', connected: false },
  { id: 'con-notion', name: 'Notion', category: 'Docs', description: 'Publish specs to a workspace.', connected: false },
];

// --- 46. Automations ---------------------------------------------------------

export const SEED_AUTOMATIONS: Automation[] = [
  { id: 'auto-1', name: 'Notify on deploy', trigger: 'deploy.succeeded', action: 'notify.slack', enabled: true },
  { id: 'auto-2', name: 'Issue on changes requested', trigger: 'approval.changes', action: 'create.jira', enabled: true },
  { id: 'auto-3', name: 'Re-run evals nightly', trigger: 'schedule.nightly', action: 'run.evals', enabled: false },
];

// --- 47. Scheduler -----------------------------------------------------------

export const SEED_JOBS: ScheduledJob[] = [
  { id: 'job-evals', name: 'Nightly eval suite', intervalMinutes: 1440, enabled: true, lastRun: day(1) },
  { id: 'job-a11y', name: 'Hourly a11y crawl', intervalMinutes: 60, enabled: true, lastRun: day(0) },
  { id: 'job-backup', name: 'Workspace backup', intervalMinutes: 1440, enabled: false, lastRun: null },
];

// --- 48. API keys ------------------------------------------------------------

export const SEED_API_KEYS: ApiKey[] = [
  { id: 'key-ci', name: 'CI pipeline', scopes: ['deploy', 'pages.read'], masked: 'enz_sk_••••a1b2', createdAt: day(30), lastUsed: day(0) },
  { id: 'key-readonly', name: 'Analytics export', scopes: ['pages.read'], masked: 'enz_sk_••••77de', createdAt: day(10), lastUsed: day(2) },
];

// --- 49. Template gallery ----------------------------------------------------

export const SEED_TEMPLATES: TemplateItem[] = [
  { id: 'tpl-saas', name: 'SaaS landing', category: 'Marketing', description: 'Hero, features, pricing, FAQ.', installs: 1240, installed: true },
  { id: 'tpl-dash', name: 'Admin dashboard', category: 'App', description: 'KPI cards, charts, data table.', installs: 980, installed: false },
  { id: 'tpl-docs', name: 'Docs site', category: 'Content', description: 'Sidebar nav + article layout.', installs: 612, installed: false },
  { id: 'tpl-onboard', name: 'Onboarding flow', category: 'App', description: 'Multi-step wizard with progress.', installs: 430, installed: false },
];

// --- 50. Funnels -------------------------------------------------------------

export const SEED_FUNNELS: Funnel[] = [
  {
    id: 'fun-signup',
    name: 'Signup funnel',
    steps: [
      { name: 'Visited', count: 12000 },
      { name: 'Started signup', count: 4200 },
      { name: 'Verified email', count: 2600 },
      { name: 'Created project', count: 1400 },
      { name: 'Activated', count: 900 },
    ],
  },
];

// --- 51. Heatmap -------------------------------------------------------------

/** Synthetic but deterministic click cloud weighted toward the hero CTA. */
export const SEED_HEAT_POINTS: { x: number; y: number }[] = (() => {
  const pts: { x: number; y: number }[] = [];
  let s = 7;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < 200; i += 1) {
    // Cluster around (0.5, 0.35) — the hero CTA — with spread.
    pts.push({
      x: Math.min(0.99, Math.max(0, 0.5 + (rnd() - 0.5) * 0.6)),
      y: Math.min(0.99, Math.max(0, 0.35 + (rnd() - 0.5) * 0.7)),
    });
  }
  return pts;
})();

// --- 52. Performance budget --------------------------------------------------

export const SEED_PERF: PerfMetric[] = [
  { id: 'lcp', name: 'Largest Contentful Paint', value: 1900, unit: 'ms', budget: 2500, lowerIsBetter: true },
  { id: 'cls', name: 'Cumulative Layout Shift', value: 0.04, unit: '', budget: 0.1, lowerIsBetter: true },
  { id: 'tbt', name: 'Total Blocking Time', value: 320, unit: 'ms', budget: 200, lowerIsBetter: true },
  { id: 'bundle', name: 'JS bundle', value: 168, unit: 'KB', budget: 200, lowerIsBetter: true },
  { id: 'a11y', name: 'Lighthouse a11y', value: 96, unit: '', budget: 90, lowerIsBetter: false },
];

// --- 53. Capacity ------------------------------------------------------------

export const SEED_CAPACITY: CapacityResource[] = [
  { id: 'cap-seats', name: 'Member seats', used: 18, limit: 25, unit: 'seats' },
  { id: 'cap-projects', name: 'Projects', used: 6, limit: 20, unit: 'projects' },
  { id: 'cap-storage', name: 'Asset storage', used: 47, limit: 50, unit: 'GB' },
  { id: 'cap-tokens', name: 'Monthly AI tokens', used: 8.2, limit: 12, unit: 'M' },
];

// --- 54. Anomalies -----------------------------------------------------------

export const SEED_SERIES: MetricSeries[] = [
  { id: 'ser-latency', name: 'p95 latency (ms)', points: [320, 310, 330, 305, 315, 890, 300, 312] },
  { id: 'ser-errors', name: 'Errors / hr', points: [2, 1, 3, 2, 2, 1, 14, 3, 2] },
  { id: 'ser-spend', name: 'Hourly spend ($)', points: [4, 5, 4, 6, 5, 5, 4, 5] },
];
