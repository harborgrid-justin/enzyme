/**
 * Domain types for the **Design** workspace — the enterprise visual-prototyping
 * surface layered on top of the chat studio.
 *
 * Where the chat studio turns prompts into streamed artifacts, the Design
 * workspace turns those artifacts into a managed, collaborative, deployable
 * design system: tokens, reusable components, multi-page prototypes, review +
 * approval, deploy targets, grounded generation, and agentic workflows.
 *
 * Everything here is plain data so it can be persisted to localStorage (the
 * studio has no backend) and round-tripped through the pure helpers in
 * `design/lib/*`, which carry the real, unit-tested logic.
 */

// --- 1. Design tokens --------------------------------------------------------

export type TokenCategory = 'color' | 'typography' | 'spacing' | 'radius' | 'shadow';

export interface DesignToken {
  /** Stable id, e.g. `color.brand.primary`. Doubles as the CSS var name source. */
  id: string;
  /** Short display name, e.g. "Brand / Primary". */
  name: string;
  category: TokenCategory;
  /** Raw value: hex for color, `16px` for spacing, a font stack, etc. */
  value: string;
}

export interface TokenSet {
  id: string;
  name: string;
  tokens: DesignToken[];
}

// --- 2. Component library ----------------------------------------------------

export interface ComponentProp {
  name: string;
  /** Placeholder occurrence in the body, e.g. `{{label}}`. */
  type: 'text' | 'color' | 'url' | 'boolean';
  defaultValue: string;
}

export interface DesignComponent {
  id: string;
  name: string;
  /** Markup with `{{prop}}` placeholders. */
  body: string;
  props: ComponentProp[];
  /** Where it came from — extracted from an artifact, or authored. */
  origin: 'extracted' | 'authored';
  createdAt: string;
}

// --- 3. Multi-page prototypes ------------------------------------------------

export interface DesignPage {
  id: string;
  name: string;
  /** In-prototype route, e.g. `/`, `/pricing`. */
  route: string;
  /** HTML body for the page (Tailwind-CDN friendly, like studio artifacts). */
  body: string;
}

export interface PageLink {
  id: string;
  fromPageId: string;
  toPageId: string;
  /** Human label for the navigation edge (e.g. "Get started" button). */
  label: string;
}

// --- 4. Responsive preview ---------------------------------------------------

export interface Breakpoint {
  id: string;
  name: string;
  width: number;
  height: number;
}

// --- 6. Inspector ------------------------------------------------------------

export interface InspectedNode {
  /** Index path into the parsed element list (stable for a given body). */
  path: number;
  tag: string;
  text: string;
  /** Flattened inline style declarations. */
  style: Record<string, string>;
}

// --- 9. Brand kit ------------------------------------------------------------

export interface BrandKit {
  name: string;
  logoSvg: string;
  /** Allowed palette (hex). Off-palette colors are flagged by the linter. */
  palette: string[];
  /** Allowed font families. */
  fonts: string[];
  /** Voice + tone guidance shown to the assistant. */
  voice: string;
}

// --- 10. Assets --------------------------------------------------------------

export type AssetKind = 'image' | 'icon' | 'font' | 'video';

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  /** A URL or data-URI the artifact references. */
  url: string;
  /** Bytes (display only). */
  size: number;
  createdAt: string;
}

// --- 11. Collaboration / presence -------------------------------------------

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  /** Normalized cursor position (0..1) within the active surface. */
  cursor: { x: number; y: number };
  /** Page/component the peer is currently focused on. */
  focusId: string | null;
  lastSeen: number;
}

// --- 12. Comments ------------------------------------------------------------

export interface CommentReply {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface DesignComment {
  id: string;
  /** Page or component the comment is pinned to. */
  targetId: string;
  /** Optional anchor within the target (normalized x/y). */
  anchor: { x: number; y: number } | null;
  author: string;
  body: string;
  resolved: boolean;
  createdAt: string;
  replies: CommentReply[];
}

// --- 13. Approvals -----------------------------------------------------------

export type ApprovalStatus = 'draft' | 'in-review' | 'changes-requested' | 'approved';

export interface ApprovalDecision {
  reviewer: string;
  decision: 'approved' | 'changes-requested';
  note: string;
  decidedAt: string;
}

export interface ApprovalRequest {
  id: string;
  targetId: string;
  status: ApprovalStatus;
  requiredApprovals: number;
  reviewers: string[];
  decisions: ApprovalDecision[];
  createdAt: string;
}

// --- 14. Workspaces ----------------------------------------------------------

export interface Project {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  members: string[];
  projects: Project[];
}

export interface Workspace {
  id: string;
  name: string;
  teams: Team[];
}

// --- 15. Activity feed -------------------------------------------------------

export type ActivityKind =
  | 'component'
  | 'comment'
  | 'approval'
  | 'deploy'
  | 'commit'
  | 'mention'
  | 'eval'
  | 'agent';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  actor: string;
  summary: string;
  /** People @mentioned in the summary. */
  mentions: string[];
  createdAt: string;
}

// --- 16. Deploy --------------------------------------------------------------

export type DeployProvider = 'vercel' | 'netlify' | 'static';
export type DeployStatus = 'queued' | 'building' | 'live' | 'failed';

export interface Deployment {
  id: string;
  provider: DeployProvider;
  environment: EnvName;
  targetId: string;
  url: string;
  status: DeployStatus;
  log: string[];
  createdAt: string;
}

// --- 17. Git sync ------------------------------------------------------------

export interface GitCommit {
  id: string;
  message: string;
  author: string;
  branch: string;
  files: string[];
  createdAt: string;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  branch: string;
  status: 'open' | 'merged' | 'closed';
  createdAt: string;
}

export interface GitState {
  repo: string | null;
  branch: string;
  commits: GitCommit[];
  pullRequests: PullRequest[];
}

// --- 18. Data binding --------------------------------------------------------

export type DataSourceKind = 'rest' | 'graphql' | 'mock';

export interface DataSource {
  id: string;
  name: string;
  kind: DataSourceKind;
  url: string;
  /** Parsed sample payload used to resolve bindings in preview. */
  sample: Record<string, unknown>;
}

export interface DataBinding {
  id: string;
  /** `{{bind:token}}` placeholder in the target body. */
  token: string;
  sourceId: string;
  /** Dot-path into the source sample, e.g. `user.name`. */
  path: string;
}

// --- 19. Environments --------------------------------------------------------

export type EnvName = 'development' | 'staging' | 'production';

export interface EnvConfig {
  name: EnvName;
  vars: Record<string, string>;
  /** Page id currently promoted to this environment, if any. */
  promotedTargetId: string | null;
  promotedAt: string | null;
}

// --- 20. Embed / handoff export ---------------------------------------------

export type ExportFormat = 'react' | 'vue' | 'web-component' | 'storybook';

// --- 21. Knowledge base / RAG ------------------------------------------------

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

export interface RetrievedChunk {
  docId: string;
  docTitle: string;
  snippet: string;
  score: number;
}

// --- 22. Tool use ------------------------------------------------------------

export interface ToolParam {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
}

export interface DesignTool {
  id: string;
  name: string;
  description: string;
  params: ToolParam[];
}

export interface ToolInvocation {
  id: string;
  toolId: string;
  args: Record<string, string>;
  result: string;
  createdAt: string;
}

// --- 23. Prompt library ------------------------------------------------------

export interface PromptVersion {
  version: number;
  template: string;
  createdAt: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  /** Variable names referenced as `{{var}}` in the template. */
  variables: string[];
  versions: PromptVersion[];
}

// --- 24. Evals ---------------------------------------------------------------

export type EvalMatcher = 'contains' | 'equals' | 'regex';

export interface EvalCase {
  id: string;
  name: string;
  prompt: string;
  expected: string;
  matcher: EvalMatcher;
}

export interface EvalResult {
  caseId: string;
  provider: string;
  output: string;
  passed: boolean;
  latencyMs: number;
}

// --- 25. Agent workflows -----------------------------------------------------

export type AgentStepKind = 'research' | 'wireframe' | 'build' | 'a11y-fix' | 'review';

export interface AgentStep {
  id: string;
  name: string;
  kind: AgentStepKind;
}

export type AgentStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface AgentRunStep {
  stepId: string;
  status: AgentStepStatus;
  output: string;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  goal: string;
  steps: AgentStep[];
}

export interface AgentRun {
  id: string;
  workflowId: string;
  steps: AgentRunStep[];
  startedAt: string;
  finishedAt: string | null;
}
