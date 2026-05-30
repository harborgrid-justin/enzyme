/**
 * Advanced (enterprise) Design store — features 26–55.
 *
 * Kept separate from the core `useDesignStore` so the governance / AI-ops /
 * content / integrations / analytics domains stay reviewable in isolation. Like
 * the core store it's seeded from `seed.advanced.ts`, persisted to localStorage,
 * and delegates all real logic to the pure helpers in `lib/*`.
 *
 * The audit log (feature #26) is the cross-cutting spine: mutating actions call
 * `audit(...)` so every other capability leaves a tamper-evident trail.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appendAudit } from './lib/governance';
import { generateKey, maskKey } from './lib/integrations';
import { commitRevision, svgPlaceholder } from './lib/content';
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
  ImageStyle,
  LocaleCatalog,
  MetricSeries,
  ModelEntry,
  PerfMetric,
  RbacMatrix,
  Role,
  RouteIntent,
  RoutingPolicy,
  ScheduledJob,
  ScimUser,
  SeoMeta,
  TemplateItem,
  Trace,
  VaultSecret,
  Webhook,
} from './types.advanced';
import {
  SEED_API_KEYS,
  SEED_AUDIT,
  SEED_AUTOMATIONS,
  SEED_BUDGETS,
  SEED_CAPACITY,
  SEED_CATALOG,
  SEED_CONNECTORS,
  SEED_CONTENT,
  SEED_EXPERIMENTS,
  SEED_FUNNELS,
  SEED_HEAT_POINTS,
  SEED_IDPS,
  SEED_IMAGE_JOBS,
  SEED_JOBS,
  SEED_MODELS,
  SEED_PERF,
  SEED_POLICIES,
  SEED_RBAC,
  SEED_ROUTING,
  SEED_SCIM,
  SEED_SECRETS,
  SEED_SEO,
  SEED_SERIES,
  SEED_TEMPLATES,
  SEED_TRACES,
  SEED_WEBHOOKS,
} from './seed.advanced';
import { uid } from './lib/id';

export interface AdvancedState {
  actor: string;

  // governance
  audit: AuditEntry[];
  rbac: RbacMatrix;
  idps: IdentityProvider[];
  scim: ScimUser[];
  policies: DataPolicy[];
  secrets: VaultSecret[];
  // ai-ops
  models: ModelEntry[];
  routing: RoutingPolicy;
  budgets: Budget[];
  experiments: Experiment[];
  traces: Trace[];
  // content
  catalog: LocaleCatalog;
  seo: SeoMeta;
  imageJobs: ImageJob[];
  content: ContentEntry[];
  // integrations
  webhooks: Webhook[];
  connectors: Connector[];
  automations: Automation[];
  jobs: ScheduledJob[];
  apiKeys: ApiKey[];
  templates: TemplateItem[];
  // analytics
  funnels: Funnel[];
  heatPoints: { x: number; y: number }[];
  perf: PerfMetric[];
  capacity: CapacityResource[];
  series: MetricSeries[];

  // --- actions -------------------------------------------------------------
  setActor: (actor: string) => void;
  audit_: (action: string, target: string) => void;

  // 27 rbac
  toggleGrant: (role: Role, permission: string) => void;
  setMemberRole: (name: string, role: Role) => void;
  // 28 sso/scim
  toggleIdp: (id: string) => void;
  provisionUser: (id: string) => void;
  // 29 policies
  updatePolicy: (id: string, patch: Partial<Pick<DataPolicy, 'retentionDays'>>) => void;
  // 31 secrets
  rotateSecret: (id: string) => void;
  // 32 models / routing
  toggleModel: (id: string) => void;
  setRoute: (intent: RouteIntent, modelId: string) => void;
  // 34/35/40 are pure-view + log only
  // 36 experiments
  setExperimentStatus: (id: string, status: Experiment['status']) => void;
  // 38 localization
  setTranslation: (key: string, locale: string, value: string) => void;
  // 39 seo
  updateSeo: (patch: Partial<SeoMeta>) => void;
  // 41 image synthesis
  queueImage: (prompt: string, style: ImageStyle) => void;
  // 42 cms
  publishContent: (id: string) => void;
  reviseContent: (id: string, body: string) => void;
  // 44 webhooks
  toggleWebhook: (id: string) => void;
  // 45 connectors
  toggleConnector: (id: string) => void;
  // 46 automations
  toggleAutomation: (id: string) => void;
  // 47 scheduler
  toggleJob: (id: string) => void;
  runJobNow: (id: string) => void;
  // 48 api keys
  createApiKey: (name: string, scopes: string[]) => string;
  revokeApiKey: (id: string) => void;
  // 49 templates
  installTemplate: (id: string) => void;
  // 26 audit integrity (no-op helper exposed for the panel)
}

export const useAdvancedStore = create<AdvancedState>()(
  persist(
    (set) => {
      const log = (s: AdvancedState, action: string, target: string): AuditEntry[] => [
        appendAudit(s.audit, { id: uid('aud'), actor: s.actor, action, target, at: new Date().toISOString() }),
        ...s.audit,
      ].slice(0, 200);

      return {
        actor: 'Ada',
        audit: SEED_AUDIT,
        rbac: SEED_RBAC,
        idps: SEED_IDPS,
        scim: SEED_SCIM,
        policies: SEED_POLICIES,
        secrets: SEED_SECRETS,
        models: SEED_MODELS,
        routing: SEED_ROUTING,
        budgets: SEED_BUDGETS,
        experiments: SEED_EXPERIMENTS,
        traces: SEED_TRACES,
        catalog: SEED_CATALOG,
        seo: SEED_SEO,
        imageJobs: SEED_IMAGE_JOBS,
        content: SEED_CONTENT,
        webhooks: SEED_WEBHOOKS,
        connectors: SEED_CONNECTORS,
        automations: SEED_AUTOMATIONS,
        jobs: SEED_JOBS,
        apiKeys: SEED_API_KEYS,
        templates: SEED_TEMPLATES,
        funnels: SEED_FUNNELS,
        heatPoints: SEED_HEAT_POINTS,
        perf: SEED_PERF,
        capacity: SEED_CAPACITY,
        series: SEED_SERIES,

        setActor: (actor) => set({ actor }),
        audit_: (action, target) => set((s) => ({ audit: log(s, action, target) })),

        toggleGrant: (role, permission) =>
          set((s) => {
            const has = (s.rbac.grants[role] ?? []).includes(permission);
            const next = has
              ? s.rbac.grants[role].filter((p) => p !== permission)
              : [...(s.rbac.grants[role] ?? []), permission];
            return {
              rbac: { ...s.rbac, grants: { ...s.rbac.grants, [role]: next } },
              audit: log(s, has ? 'rbac.revoke' : 'rbac.grant', `${role}:${permission}`),
            };
          }),
        setMemberRole: (name, role) =>
          set((s) => ({
            rbac: { ...s.rbac, members: s.rbac.members.map((m) => (m.name === name ? { ...m, role } : m)) },
            audit: log(s, 'rbac.role', `${name}→${role}`),
          })),

        toggleIdp: (id) =>
          set((s) => ({
            idps: s.idps.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)),
            audit: log(s, 'sso.toggle', id),
          })),
        provisionUser: (id) =>
          set((s) => ({
            scim: s.scim.map((u) => (u.id === id ? { ...u, provisioned: true } : u)),
            audit: log(s, 'scim.provision', id),
          })),

        updatePolicy: (id, patch) =>
          set((s) => ({
            policies: s.policies.map((p) => (p.id === id ? { ...p, ...patch } : p)),
            audit: log(s, 'policy.update', id),
          })),

        rotateSecret: (id) =>
          set((s) => ({
            secrets: s.secrets.map((sec) =>
              sec.id === id ? { ...sec, lastRotated: new Date().toISOString() } : sec
            ),
            audit: log(s, 'secret.rotate', id),
          })),

        toggleModel: (id) =>
          set((s) => ({
            models: s.models.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
            audit: log(s, 'model.toggle', id),
          })),
        setRoute: (intent, modelId) =>
          set((s) => ({
            routing: {
              ...s.routing,
              rules: s.routing.rules.some((r) => r.intent === intent)
                ? s.routing.rules.map((r) => (r.intent === intent ? { ...r, modelId } : r))
                : [...s.routing.rules, { intent, modelId }],
            },
            audit: log(s, 'route.set', `${intent}→${modelId}`),
          })),

        setExperimentStatus: (id, status) =>
          set((s) => ({
            experiments: s.experiments.map((e) => (e.id === id ? { ...e, status } : e)),
            audit: log(s, 'experiment.status', `${id}:${status}`),
          })),

        setTranslation: (key, locale, value) =>
          set((s) => ({
            catalog: {
              ...s.catalog,
              strings: s.catalog.strings.map((str) =>
                str.key === key ? { ...str, values: { ...str.values, [locale]: value } } : str
              ),
            },
          })),

        updateSeo: (patch) => set((s) => ({ seo: { ...s.seo, ...patch } })),

        queueImage: (prompt, style) =>
          set((s) => ({
            imageJobs: [
              {
                id: uid('img'),
                prompt,
                style,
                status: 'done',
                preview: svgPlaceholder(prompt, style),
                createdAt: new Date().toISOString(),
              },
              ...s.imageJobs,
            ],
            audit: log(s, 'image.generate', prompt.slice(0, 40)),
          })),

        publishContent: (id) =>
          set((s) => ({
            content: s.content.map((c) => (c.id === id ? { ...c, status: 'published' } : c)),
            audit: log(s, 'content.publish', id),
          })),
        reviseContent: (id, body) =>
          set((s) => ({
            content: s.content.map((c) =>
              c.id === id ? commitRevision(c, body, s.actor, new Date().toISOString()) : c
            ),
            audit: log(s, 'content.revise', id),
          })),

        toggleWebhook: (id) =>
          set((s) => ({
            webhooks: s.webhooks.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
            audit: log(s, 'webhook.toggle', id),
          })),

        toggleConnector: (id) =>
          set((s) => {
            const con = s.connectors.find((c) => c.id === id);
            return {
              connectors: s.connectors.map((c) => (c.id === id ? { ...c, connected: !c.connected } : c)),
              audit: log(s, con?.connected === true ? 'connector.disconnect' : 'connector.connect', id),
            };
          }),

        toggleAutomation: (id) =>
          set((s) => ({
            automations: s.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
            audit: log(s, 'automation.toggle', id),
          })),

        toggleJob: (id) =>
          set((s) => ({
            jobs: s.jobs.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j)),
            audit: log(s, 'job.toggle', id),
          })),
        runJobNow: (id) =>
          set((s) => ({
            jobs: s.jobs.map((j) => (j.id === id ? { ...j, lastRun: new Date().toISOString() } : j)),
            audit: log(s, 'job.run', id),
          })),

        createApiKey: (name, scopes) => {
          const { full } = generateKey();
          set((s) => ({
            apiKeys: [
              {
                id: uid('key'),
                name,
                scopes,
                masked: maskKey(full),
                createdAt: new Date().toISOString(),
                lastUsed: null,
              },
              ...s.apiKeys,
            ],
            audit: log(s, 'apikey.create', name),
          }));
          return full;
        },
        revokeApiKey: (id) =>
          set((s) => ({
            apiKeys: s.apiKeys.filter((k) => k.id !== id),
            audit: log(s, 'apikey.revoke', id),
          })),

        installTemplate: (id) =>
          set((s) => ({
            templates: s.templates.map((t) =>
              t.id === id ? { ...t, installed: !t.installed, installs: t.installs + (t.installed ? -1 : 1) } : t
            ),
            audit: log(s, 'template.install', id),
          })),
      };
    },
    {
      name: 'enzyme-design-advanced',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
