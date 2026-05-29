/**
 * Feature registry for the Design workspace.
 *
 * The 25 capabilities are grouped into the four themes that position the studio
 * against Claude Design: deeper design tooling, real collaboration, a path to
 * production, and an enterprise-strength AI layer. The workspace shell renders
 * its left-nav and active panel straight off this list.
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
];

export const DESIGN_FEATURES: DesignFeature[] = DESIGN_GROUPS.flatMap((g) => g.features);
