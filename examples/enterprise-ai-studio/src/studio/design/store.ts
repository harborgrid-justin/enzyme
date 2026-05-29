/**
 * Design workspace store.
 *
 * Single Zustand store backing all 25 Design capabilities. The studio has no
 * backend, so the whole design domain is seeded from `seed.ts` and persisted
 * to localStorage (minus transient presence). Pure logic lives in `lib/*`;
 * this store is just normalized state + the actions panels call.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ActivityEvent,
  ActivityKind,
  AgentRun,
  AgentRunStep,
  ApprovalDecision,
  ApprovalRequest,
  Asset,
  Breakpoint,
  BrandKit,
  Collaborator,
  DataBinding,
  DataSource,
  DesignComment,
  DesignComponent,
  DesignPage,
  DesignTool,
  Deployment,
  DeployProvider,
  EnvConfig,
  EnvName,
  EvalCase,
  EvalResult,
  GitState,
  KnowledgeDoc,
  PageLink,
  PromptTemplate,
  ToolInvocation,
  TokenSet,
  DesignToken,
  Workspace,
  Project,
  Team,
  AgentWorkflow,
} from './types';
import {
  SEED_ASSETS,
  SEED_BRAND,
  SEED_BREAKPOINTS,
  SEED_COMPONENTS,
  SEED_DATA_BINDINGS,
  SEED_DATA_SOURCES,
  SEED_ENVIRONMENTS,
  SEED_EVALS,
  SEED_GIT,
  SEED_KNOWLEDGE,
  SEED_PAGE_LINKS,
  SEED_PAGES,
  SEED_PROMPTS,
  SEED_TOKEN_SET,
  SEED_TOOLS,
  SEED_WORKFLOWS,
  SEED_WORKSPACE,
} from './seed';

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Parse `@Name` mentions out of free text. */
export function parseMentions(text: string): string[] {
  return [...text.matchAll(/@([A-Za-z][\w-]*)/g)].map((m) => m[1]!);
}

export interface DesignState {
  /** Who actions are attributed to (synced from auth in DesignWorkspace). */
  actor: string;

  // 1. tokens
  tokenSets: TokenSet[];
  activeTokenSetId: string;
  // 2. components
  components: DesignComponent[];
  // 3. pages
  pages: DesignPage[];
  pageLinks: PageLink[];
  activePageId: string | null;
  // 4. breakpoints
  breakpoints: Breakpoint[];
  // 9. brand
  brand: BrandKit;
  // 10. assets
  assets: Asset[];
  // 11. presence (transient)
  collaborators: Collaborator[];
  // 12. comments
  comments: DesignComment[];
  // 13. approvals
  approvals: ApprovalRequest[];
  // 14. workspaces
  workspace: Workspace;
  activeTeamId: string;
  activeProjectId: string;
  // 15. activity
  activity: ActivityEvent[];
  // 16. deploy
  deployments: Deployment[];
  // 17. git
  git: GitState;
  // 18. data
  dataSources: DataSource[];
  dataBindings: DataBinding[];
  // 19. environments
  environments: EnvConfig[];
  // 21. knowledge
  knowledge: KnowledgeDoc[];
  // 22. tools
  tools: DesignTool[];
  toolInvocations: ToolInvocation[];
  // 23. prompts
  prompts: PromptTemplate[];
  // 24. evals
  evalCases: EvalCase[];
  evalResults: EvalResult[];
  // 25. agents
  workflows: AgentWorkflow[];
  agentRuns: AgentRun[];

  // --- actions -------------------------------------------------------------
  setActor: (actor: string) => void;
  logActivity: (kind: ActivityKind, summary: string) => void;

  // tokens
  addToken: (token: DesignToken) => void;
  updateToken: (id: string, patch: Partial<DesignToken>) => void;
  removeToken: (id: string) => void;

  // components
  addComponent: (component: DesignComponent) => void;
  removeComponent: (id: string) => void;

  // pages
  addPage: (page: DesignPage) => void;
  updatePageBody: (id: string, body: string) => void;
  removePage: (id: string) => void;
  setActivePage: (id: string | null) => void;
  addPageLink: (link: PageLink) => void;
  removePageLink: (id: string) => void;

  // breakpoints
  addBreakpoint: (bp: Breakpoint) => void;
  removeBreakpoint: (id: string) => void;

  // brand
  updateBrand: (patch: Partial<BrandKit>) => void;

  // assets
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;

  // presence
  setCollaborators: (list: Collaborator[]) => void;

  // comments
  addComment: (targetId: string, body: string, anchor: { x: number; y: number } | null) => void;
  addReply: (commentId: string, body: string) => void;
  resolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;

  // approvals
  requestApproval: (targetId: string, reviewers: string[], requiredApprovals: number) => void;
  decideApproval: (id: string, decision: ApprovalDecision['decision'], note: string) => void;

  // workspaces
  addTeam: (name: string) => void;
  addProject: (teamId: string, name: string) => void;
  setActiveScope: (teamId: string, projectId: string) => void;

  // deploy
  createDeployment: (provider: DeployProvider, environment: EnvName, targetId: string) => string;
  updateDeployment: (id: string, patch: Partial<Pick<Deployment, 'status' | 'url'>> & { logLine?: string }) => void;

  // git
  connectRepo: (repo: string) => void;
  commit: (message: string, files: string[]) => void;
  openPullRequest: (title: string, branch: string) => void;
  mergePullRequest: (id: string) => void;

  // data
  addDataSource: (source: DataSource) => void;
  removeDataSource: (id: string) => void;
  addBinding: (binding: DataBinding) => void;
  removeBinding: (id: string) => void;

  // environments
  setEnvVar: (env: EnvName, key: string, value: string) => void;
  promoteToEnv: (env: EnvName, targetId: string) => void;

  // knowledge
  addDoc: (doc: KnowledgeDoc) => void;
  removeDoc: (id: string) => void;

  // tools
  recordInvocation: (invocation: ToolInvocation) => void;

  // prompts
  upsertPrompt: (prompt: PromptTemplate) => void;
  removePrompt: (id: string) => void;

  // evals
  addEvalCase: (evalCase: EvalCase) => void;
  removeEvalCase: (id: string) => void;
  setEvalResults: (results: EvalResult[]) => void;

  // agents
  addRun: (run: AgentRun) => void;
  updateRunStep: (runId: string, index: number, patch: Partial<AgentRunStep>) => void;
  finishRun: (runId: string) => void;
}

const firstTeam = SEED_WORKSPACE.teams[0]!;

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      actor: 'Ada',
      tokenSets: [SEED_TOKEN_SET],
      activeTokenSetId: SEED_TOKEN_SET.id,
      components: SEED_COMPONENTS,
      pages: SEED_PAGES,
      pageLinks: SEED_PAGE_LINKS,
      activePageId: SEED_PAGES[0]?.id ?? null,
      breakpoints: SEED_BREAKPOINTS,
      brand: SEED_BRAND,
      assets: SEED_ASSETS,
      collaborators: [],
      comments: [],
      approvals: [],
      workspace: SEED_WORKSPACE,
      activeTeamId: firstTeam.id,
      activeProjectId: firstTeam.projects[0]?.id ?? '',
      activity: [],
      deployments: [],
      git: SEED_GIT,
      dataSources: SEED_DATA_SOURCES,
      dataBindings: SEED_DATA_BINDINGS,
      environments: SEED_ENVIRONMENTS,
      knowledge: SEED_KNOWLEDGE,
      tools: SEED_TOOLS,
      toolInvocations: [],
      prompts: SEED_PROMPTS,
      evalCases: SEED_EVALS,
      evalResults: [],
      workflows: SEED_WORKFLOWS,
      agentRuns: [],

      setActor: (actor) => set({ actor }),
      logActivity: (kind, summary) =>
        set((s) => ({
          activity: [
            {
              id: uid('act'),
              kind,
              actor: s.actor,
              summary,
              mentions: parseMentions(summary),
              createdAt: new Date().toISOString(),
            },
            ...s.activity,
          ].slice(0, 100),
        })),

      addToken: (token) =>
        set((s) => ({
          tokenSets: s.tokenSets.map((ts) =>
            ts.id === s.activeTokenSetId ? { ...ts, tokens: [...ts.tokens, token] } : ts
          ),
        })),
      updateToken: (id, patch) =>
        set((s) => ({
          tokenSets: s.tokenSets.map((ts) =>
            ts.id === s.activeTokenSetId
              ? { ...ts, tokens: ts.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)) }
              : ts
          ),
        })),
      removeToken: (id) =>
        set((s) => ({
          tokenSets: s.tokenSets.map((ts) =>
            ts.id === s.activeTokenSetId ? { ...ts, tokens: ts.tokens.filter((t) => t.id !== id) } : ts
          ),
        })),

      addComponent: (component) => {
        set((s) => ({ components: [...s.components, component] }));
        get().logActivity('component', `extracted component "${component.name}"`);
      },
      removeComponent: (id) => set((s) => ({ components: s.components.filter((c) => c.id !== id) })),

      addPage: (page) => set((s) => ({ pages: [...s.pages, page], activePageId: page.id })),
      updatePageBody: (id, body) =>
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, body } : p)) })),
      removePage: (id) =>
        set((s) => ({
          pages: s.pages.filter((p) => p.id !== id),
          pageLinks: s.pageLinks.filter((l) => l.fromPageId !== id && l.toPageId !== id),
          activePageId: s.activePageId === id ? (s.pages.find((p) => p.id !== id)?.id ?? null) : s.activePageId,
        })),
      setActivePage: (id) => set({ activePageId: id }),
      addPageLink: (link) => set((s) => ({ pageLinks: [...s.pageLinks, link] })),
      removePageLink: (id) => set((s) => ({ pageLinks: s.pageLinks.filter((l) => l.id !== id) })),

      addBreakpoint: (bp) => set((s) => ({ breakpoints: [...s.breakpoints, bp] })),
      removeBreakpoint: (id) => set((s) => ({ breakpoints: s.breakpoints.filter((b) => b.id !== id) })),

      updateBrand: (patch) => set((s) => ({ brand: { ...s.brand, ...patch } })),

      addAsset: (asset) => set((s) => ({ assets: [asset, ...s.assets] })),
      removeAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

      setCollaborators: (collaborators) => set({ collaborators }),

      addComment: (targetId, body, anchor) => {
        set((s) => ({
          comments: [
            {
              id: uid('cmt'),
              targetId,
              anchor,
              author: s.actor,
              body,
              resolved: false,
              createdAt: new Date().toISOString(),
              replies: [],
            },
            ...s.comments,
          ],
        }));
        get().logActivity('comment', `commented on ${targetId}: ${body.slice(0, 60)}`);
      },
      addReply: (commentId, body) =>
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  replies: [
                    ...c.replies,
                    { id: uid('rep'), author: s.actor, body, createdAt: new Date().toISOString() },
                  ],
                }
              : c
          ),
        })),
      resolveComment: (commentId) =>
        set((s) => ({
          comments: s.comments.map((c) => (c.id === commentId ? { ...c, resolved: !c.resolved } : c)),
        })),
      deleteComment: (commentId) => set((s) => ({ comments: s.comments.filter((c) => c.id !== commentId) })),

      requestApproval: (targetId, reviewers, requiredApprovals) => {
        set((s) => ({
          approvals: [
            {
              id: uid('apr'),
              targetId,
              status: 'in-review',
              requiredApprovals,
              reviewers,
              decisions: [],
              createdAt: new Date().toISOString(),
            },
            ...s.approvals.filter((a) => a.targetId !== targetId),
          ],
        }));
        get().logActivity('approval', `requested review on ${targetId} from ${reviewers.join(', ')}`);
      },
      decideApproval: (id, decision, note) =>
        set((s) => ({
          approvals: s.approvals.map((a) => {
            if (a.id !== id) return a;
            const decisions = [
              ...a.decisions.filter((d) => d.reviewer !== s.actor),
              { reviewer: s.actor, decision, note, decidedAt: new Date().toISOString() },
            ];
            const approvals = decisions.filter((d) => d.decision === 'approved').length;
            const changes = decisions.some((d) => d.decision === 'changes-requested');
            const status = changes
              ? 'changes-requested'
              : approvals >= a.requiredApprovals
                ? 'approved'
                : 'in-review';
            return { ...a, decisions, status };
          }),
        })),

      addTeam: (name) =>
        set((s) => {
          const team: Team = { id: uid('team'), name, members: [s.actor], projects: [] };
          return { workspace: { ...s.workspace, teams: [...s.workspace.teams, team] } };
        }),
      addProject: (teamId, name) =>
        set((s) => {
          const project: Project = { id: uid('proj'), name };
          return {
            workspace: {
              ...s.workspace,
              teams: s.workspace.teams.map((t) =>
                t.id === teamId ? { ...t, projects: [...t.projects, project] } : t
              ),
            },
          };
        }),
      setActiveScope: (activeTeamId, activeProjectId) => set({ activeTeamId, activeProjectId }),

      createDeployment: (provider, environment, targetId) => {
        const id = uid('dep');
        set((s) => ({
          deployments: [
            {
              id,
              provider,
              environment,
              targetId,
              url: `https://${provider}-${id.slice(-5)}.app`,
              status: 'queued',
              log: ['Queued deployment…'],
              createdAt: new Date().toISOString(),
            },
            ...s.deployments,
          ],
        }));
        get().logActivity('deploy', `deploying ${targetId} to ${provider} (${environment})`);
        return id;
      },
      updateDeployment: (id, patch) =>
        set((s) => ({
          deployments: s.deployments.map((d) => {
            if (d.id !== id) return d;
            const next: Deployment = { ...d };
            if (patch.status != null) next.status = patch.status;
            if (patch.url != null) next.url = patch.url;
            if (patch.logLine != null) next.log = [...d.log, patch.logLine];
            return next;
          }),
        })),

      connectRepo: (repo) => set((s) => ({ git: { ...s.git, repo } })),
      commit: (message, files) => {
        set((s) => ({
          git: {
            ...s.git,
            commits: [
              {
                id: uid('c'),
                message,
                author: s.actor,
                branch: s.git.branch,
                files,
                createdAt: new Date().toISOString(),
              },
              ...s.git.commits,
            ],
          },
        }));
        get().logActivity('commit', `committed "${message}"`);
      },
      openPullRequest: (title, branch) =>
        set((s) => ({
          git: {
            ...s.git,
            pullRequests: [
              {
                id: uid('pr'),
                number: s.git.pullRequests.length + 1,
                title,
                branch,
                status: 'open',
                createdAt: new Date().toISOString(),
              },
              ...s.git.pullRequests,
            ],
          },
        })),
      mergePullRequest: (id) =>
        set((s) => ({
          git: {
            ...s.git,
            pullRequests: s.git.pullRequests.map((pr) =>
              pr.id === id ? { ...pr, status: 'merged' } : pr
            ),
          },
        })),

      addDataSource: (source) => set((s) => ({ dataSources: [...s.dataSources, source] })),
      removeDataSource: (id) =>
        set((s) => ({
          dataSources: s.dataSources.filter((d) => d.id !== id),
          dataBindings: s.dataBindings.filter((b) => b.sourceId !== id),
        })),
      addBinding: (binding) => set((s) => ({ dataBindings: [...s.dataBindings, binding] })),
      removeBinding: (id) => set((s) => ({ dataBindings: s.dataBindings.filter((b) => b.id !== id) })),

      setEnvVar: (env, key, value) =>
        set((s) => ({
          environments: s.environments.map((e) =>
            e.name === env ? { ...e, vars: { ...e.vars, [key]: value } } : e
          ),
        })),
      promoteToEnv: (env, targetId) => {
        set((s) => ({
          environments: s.environments.map((e) =>
            e.name === env
              ? { ...e, promotedTargetId: targetId, promotedAt: new Date().toISOString() }
              : e
          ),
        }));
        get().logActivity('deploy', `promoted ${targetId} to ${env}`);
      },

      addDoc: (doc) => set((s) => ({ knowledge: [...s.knowledge, doc] })),
      removeDoc: (id) => set((s) => ({ knowledge: s.knowledge.filter((d) => d.id !== id) })),

      recordInvocation: (invocation) =>
        set((s) => ({ toolInvocations: [invocation, ...s.toolInvocations].slice(0, 50) })),

      upsertPrompt: (prompt) =>
        set((s) => ({
          prompts: s.prompts.some((p) => p.id === prompt.id)
            ? s.prompts.map((p) => (p.id === prompt.id ? prompt : p))
            : [...s.prompts, prompt],
        })),
      removePrompt: (id) => set((s) => ({ prompts: s.prompts.filter((p) => p.id !== id) })),

      addEvalCase: (evalCase) => set((s) => ({ evalCases: [...s.evalCases, evalCase] })),
      removeEvalCase: (id) =>
        set((s) => ({
          evalCases: s.evalCases.filter((c) => c.id !== id),
          evalResults: s.evalResults.filter((r) => r.caseId !== id),
        })),
      setEvalResults: (evalResults) => {
        set({ evalResults });
        const passed = evalResults.filter((r) => r.passed).length;
        get().logActivity('eval', `ran ${evalResults.length} evals — ${passed} passed`);
      },

      addRun: (run) => set((s) => ({ agentRuns: [run, ...s.agentRuns] })),
      updateRunStep: (runId, index, patch) =>
        set((s) => ({
          agentRuns: s.agentRuns.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  steps: r.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
                }
              : r
          ),
        })),
      finishRun: (runId) => {
        set((s) => ({
          agentRuns: s.agentRuns.map((r) =>
            r.id === runId ? { ...r, finishedAt: new Date().toISOString() } : r
          ),
        }));
        get().logActivity('agent', `agent run completed`);
      },
    }),
    {
      name: 'enzyme-design-workspace',
      storage: createJSONStorage(() => localStorage),
      // Persist the durable design domain; presence is transient.
      partialize: (s) => {
        const { collaborators: _collaborators, ...rest } = s;
        void _collaborators;
        return rest;
      },
    }
  )
);
