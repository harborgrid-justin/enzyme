/**
 * Feature registry for the Design workspace.
 *
 * The 55 capabilities are grouped into themes that position the studio against
 * Claude Design / MindStudio: deeper design tooling, real collaboration, a path
 * to production, an enterprise-strength AI layer, and the enterprise spine —
 * governance & trust, AI operations, content & localization, integrations &
 * automation, and analytics. The workspace shell renders its left-nav and
 * active panel straight off this list.
 */
import type { ReactElement } from 'react';
import { TokensPanel } from './panels/TokensPanel';
import { ComponentsPanel } from './panels/ComponentsPanel';
import { PagesPanel } from './panels/PagesPanel';
import { ResponsivePanel } from './panels/ResponsivePanel';
import { VersionDiffPanel } from './panels/VersionDiffPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { FigmaPanel } from './panels/FigmaPanel';
import { A11yPanel } from './panels/A11yPanel';
import { BrandKitPanel } from './panels/BrandKitPanel';
import { AssetsPanel } from './panels/AssetsPanel';
import { PresencePanel } from './panels/PresencePanel';
import { CommentsPanel } from './panels/CommentsPanel';
import { ApprovalsPanel } from './panels/ApprovalsPanel';
import { WorkspacesPanel } from './panels/WorkspacesPanel';
import { ActivityPanel } from './panels/ActivityPanel';
import { DeployPanel } from './panels/DeployPanel';
import { GitPanel } from './panels/GitPanel';
import { DataBindingPanel } from './panels/DataBindingPanel';
import { EnvironmentsPanel } from './panels/EnvironmentsPanel';
import { ExportPanel } from './panels/ExportPanel';
import { KnowledgePanel } from './panels/KnowledgePanel';
import { ToolsPanel } from './panels/ToolsPanel';
import { PromptLibraryPanel } from './panels/PromptLibraryPanel';
import { EvalsPanel } from './panels/EvalsPanel';
import { AgentPanel } from './panels/AgentPanel';
// Enterprise capabilities (26–55).
import { AuditLogPanel } from './panels/AuditLogPanel';
import { AccessControlPanel } from './panels/AccessControlPanel';
import { SsoPanel } from './panels/SsoPanel';
import { DataPolicyPanel } from './panels/DataPolicyPanel';
import { DlpPanel } from './panels/DlpPanel';
import { SecretsPanel } from './panels/SecretsPanel';
import { ModelRegistryPanel } from './panels/ModelRegistryPanel';
import { CostGovernancePanel } from './panels/CostGovernancePanel';
import { GuardrailsPanel } from './panels/GuardrailsPanel';
import { GroundednessPanel } from './panels/GroundednessPanel';
import { ExperimentsPanel } from './panels/ExperimentsPanel';
import { ObservabilityPanel } from './panels/ObservabilityPanel';
import { LocalizationPanel } from './panels/LocalizationPanel';
import { SeoPanel } from './panels/SeoPanel';
import { TonePanel } from './panels/TonePanel';
import { ImageSynthPanel } from './panels/ImageSynthPanel';
import { CmsPanel } from './panels/CmsPanel';
import { ReadabilityPanel } from './panels/ReadabilityPanel';
import { WebhooksPanel } from './panels/WebhooksPanel';
import { ConnectorsPanel } from './panels/ConnectorsPanel';
import { AutomationsPanel } from './panels/AutomationsPanel';
import { SchedulerPanel } from './panels/SchedulerPanel';
import { ApiKeysPanel } from './panels/ApiKeysPanel';
import { TemplateGalleryPanel } from './panels/TemplateGalleryPanel';
import { FunnelsPanel } from './panels/FunnelsPanel';
import { HeatmapPanel } from './panels/HeatmapPanel';
import { PerfBudgetPanel } from './panels/PerfBudgetPanel';
import { CapacityPanel } from './panels/CapacityPanel';
import { AnomaliesPanel } from './panels/AnomaliesPanel';
import { ExecReportPanel } from './panels/ExecReportPanel';

export interface DesignFeature {
  num: number;
  id: string;
  title: string;
  icon: string;
  blurb: string;
  Panel: () => ReactElement;
}

export interface DesignFeatureGroup {
  id: string;
  label: string;
  features: DesignFeature[];
}

export const DESIGN_GROUPS: DesignFeatureGroup[] = [
  {
    id: 'depth',
    label: 'Design depth',
    features: [
      { num: 1, id: 'tokens', title: 'Design tokens', icon: '🎨', blurb: 'Token system + re-skin', Panel: TokensPanel },
      { num: 2, id: 'components', title: 'Component library', icon: '🧩', blurb: 'Extract reusable components', Panel: ComponentsPanel },
      { num: 3, id: 'pages', title: 'Multi-page prototypes', icon: '🗺️', blurb: 'Linked, navigable pages', Panel: PagesPanel },
      { num: 4, id: 'responsive', title: 'Responsive matrix', icon: '📱', blurb: 'Breakpoint preview', Panel: ResponsivePanel },
      { num: 5, id: 'diff', title: 'Version diff', icon: '🔍', blurb: 'Compare versions', Panel: VersionDiffPanel },
      { num: 6, id: 'inspector', title: 'Inspector', icon: '🎯', blurb: 'Direct manipulation', Panel: InspectorPanel },
      { num: 7, id: 'figma', title: 'Figma interop', icon: '🔺', blurb: 'Import / export frames', Panel: FigmaPanel },
      { num: 8, id: 'a11y', title: 'Accessibility audit', icon: '♿', blurb: 'WCAG audit + autofix', Panel: A11yPanel },
      { num: 9, id: 'brand', title: 'Brand guardrails', icon: '🛡️', blurb: 'Lint against brand kit', Panel: BrandKitPanel },
      { num: 10, id: 'assets', title: 'Asset manager', icon: '🖼️', blurb: 'Images, icons, fonts', Panel: AssetsPanel },
    ],
  },
  {
    id: 'collab',
    label: 'Collaboration',
    features: [
      { num: 11, id: 'presence', title: 'Live presence', icon: '👥', blurb: 'Multiplayer cursors', Panel: PresencePanel },
      { num: 12, id: 'comments', title: 'Comments', icon: '💬', blurb: 'Threaded review', Panel: CommentsPanel },
      { num: 13, id: 'approvals', title: 'Approvals', icon: '✅', blurb: 'Sign-off workflow', Panel: ApprovalsPanel },
      { num: 14, id: 'workspaces', title: 'Workspaces', icon: '🏢', blurb: 'Teams & projects', Panel: WorkspacesPanel },
      { num: 15, id: 'activity', title: 'Activity feed', icon: '📣', blurb: '@mentions + events', Panel: ActivityPanel },
    ],
  },
  {
    id: 'production',
    label: 'To production',
    features: [
      { num: 16, id: 'deploy', title: 'Deploy', icon: '🚀', blurb: 'One-click deploy', Panel: DeployPanel },
      { num: 17, id: 'git', title: 'Git sync', icon: '🌿', blurb: 'Commits & PRs', Panel: GitPanel },
      { num: 18, id: 'data', title: 'Data binding', icon: '🔌', blurb: 'Bind to live data', Panel: DataBindingPanel },
      { num: 19, id: 'environments', title: 'Environments', icon: '🪜', blurb: 'Promote dev→prod', Panel: EnvironmentsPanel },
      { num: 20, id: 'export', title: 'Code export', icon: '📦', blurb: 'React / Vue / WC', Panel: ExportPanel },
    ],
  },
  {
    id: 'ai',
    label: 'AI power',
    features: [
      { num: 21, id: 'knowledge', title: 'Knowledge / RAG', icon: '📚', blurb: 'Grounded generation', Panel: KnowledgePanel },
      { num: 22, id: 'tools', title: 'Tool use', icon: '🛠️', blurb: 'Function calling', Panel: ToolsPanel },
      { num: 23, id: 'prompts', title: 'Prompt library', icon: '📝', blurb: 'Versioned templates', Panel: PromptLibraryPanel },
      { num: 24, id: 'evals', title: 'Eval harness', icon: '🧪', blurb: 'Regression matrix', Panel: EvalsPanel },
      { num: 25, id: 'agents', title: 'Agent workflows', icon: '🤖', blurb: 'Multi-step runs', Panel: AgentPanel },
    ],
  },
  {
    id: 'governance',
    label: 'Governance & trust',
    features: [
      { num: 26, id: 'audit', title: 'Audit log', icon: '📜', blurb: 'Tamper-evident trail', Panel: AuditLogPanel },
      { num: 27, id: 'rbac', title: 'Access control', icon: '🔐', blurb: 'Role → permission matrix', Panel: AccessControlPanel },
      { num: 28, id: 'sso', title: 'SSO & SCIM', icon: '🪪', blurb: 'Enterprise sign-on', Panel: SsoPanel },
      { num: 29, id: 'data-policy', title: 'Data governance', icon: '🗄️', blurb: 'Residency & retention', Panel: DataPolicyPanel },
      { num: 30, id: 'dlp', title: 'PII / DLP', icon: '🕵️', blurb: 'Detect + redact PII', Panel: DlpPanel },
      { num: 31, id: 'secrets', title: 'Secrets vault', icon: '🔑', blurb: 'Rotation enforcement', Panel: SecretsPanel },
    ],
  },
  {
    id: 'aiops',
    label: 'AI operations',
    features: [
      { num: 32, id: 'models', title: 'Model registry', icon: '🧠', blurb: 'Catalog + routing', Panel: ModelRegistryPanel },
      { num: 33, id: 'cost', title: 'Cost governance', icon: '💰', blurb: 'Budgets & projection', Panel: CostGovernancePanel },
      { num: 34, id: 'guardrails', title: 'Guardrails', icon: '🚧', blurb: 'Injection screening', Panel: GuardrailsPanel },
      { num: 35, id: 'groundedness', title: 'Groundedness', icon: '⚓', blurb: 'Hallucination check', Panel: GroundednessPanel },
      { num: 36, id: 'experiments', title: 'Experiments', icon: '🧬', blurb: 'A/B with significance', Panel: ExperimentsPanel },
      { num: 37, id: 'observability', title: 'Observability', icon: '📈', blurb: 'Traces & latency', Panel: ObservabilityPanel },
    ],
  },
  {
    id: 'content',
    label: 'Content & localization',
    features: [
      { num: 38, id: 'i18n', title: 'Localization', icon: '🌐', blurb: 'Translation coverage', Panel: LocalizationPanel },
      { num: 39, id: 'seo', title: 'SEO optimizer', icon: '🔎', blurb: 'Meta + social audit', Panel: SeoPanel },
      { num: 40, id: 'tone', title: 'Tone rewriter', icon: '🗣️', blurb: 'Brand-voice rewrite', Panel: TonePanel },
      { num: 41, id: 'image-synth', title: 'Image synthesis', icon: '🎞️', blurb: 'Generate imagery', Panel: ImageSynthPanel },
      { num: 42, id: 'cms', title: 'Content (CMS)', icon: '📰', blurb: 'Versioned content', Panel: CmsPanel },
      { num: 43, id: 'readability', title: 'Readability', icon: '📖', blurb: 'Reading-ease grade', Panel: ReadabilityPanel },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations & automation',
    features: [
      { num: 44, id: 'webhooks', title: 'Webhooks', icon: '🔗', blurb: 'Signed event delivery', Panel: WebhooksPanel },
      { num: 45, id: 'connectors', title: 'Connectors', icon: '🧰', blurb: 'Slack, Jira, GitHub…', Panel: ConnectorsPanel },
      { num: 46, id: 'automations', title: 'Automations', icon: '⚙️', blurb: 'Trigger → action', Panel: AutomationsPanel },
      { num: 47, id: 'scheduler', title: 'Scheduler', icon: '⏰', blurb: 'Recurring jobs', Panel: SchedulerPanel },
      { num: 48, id: 'api-keys', title: 'API keys', icon: '🗝️', blurb: 'Scoped dev access', Panel: ApiKeysPanel },
      { num: 49, id: 'templates', title: 'Template gallery', icon: '🗂️', blurb: 'Installable starts', Panel: TemplateGalleryPanel },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & insights',
    features: [
      { num: 50, id: 'funnels', title: 'Funnels', icon: '🫗', blurb: 'Conversion drop-off', Panel: FunnelsPanel },
      { num: 51, id: 'heatmap', title: 'Heatmap', icon: '🔥', blurb: 'Click density', Panel: HeatmapPanel },
      { num: 52, id: 'perf-budget', title: 'Performance budget', icon: '⚡', blurb: 'Web Vitals vs budget', Panel: PerfBudgetPanel },
      { num: 53, id: 'capacity', title: 'Capacity', icon: '📦', blurb: 'Quota planning', Panel: CapacityPanel },
      { num: 54, id: 'anomalies', title: 'Anomalies', icon: '🚨', blurb: 'Spike detection', Panel: AnomaliesPanel },
      { num: 55, id: 'exec-report', title: 'Executive report', icon: '🧾', blurb: 'One-click rollup', Panel: ExecReportPanel },
    ],
  },
];

export const DESIGN_FEATURES: DesignFeature[] = DESIGN_GROUPS.flatMap((g) => g.features);
