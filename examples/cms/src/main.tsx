import { QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Enzyme from '@missionfabric-js/enzyme';
import {
  Activity,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Flag,
  Globe2,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Moon,
  PenLine,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Link,
  NavLink,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useParams,
} from 'react-router-dom';
import { create } from 'zustand';
import './styles.css';

type Role = 'admin' | 'editor' | 'reviewer' | 'viewer';
type WorkflowStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
type ContentType = 'page' | 'post' | 'landing' | 'docs';

interface CmsUser {
  id: string;
  name: string;
  role: Role;
  avatar: string;
}

interface CmsEntry {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  status: WorkflowStatus;
  author: string;
  owner: string;
  channel: string;
  updatedAt: string;
  publishAt?: string;
  views: number;
  conversions: number;
  seoScore: number;
  body: string;
  tags: string[];
}

interface CmsStore {
  currentUser: CmsUser;
  activeWorkspace: string;
  auditEvents: string[];
  flags: Record<string, boolean>;
  setRole: (role: Role) => void;
  toggleFlag: (flag: string) => void;
  addAuditEvent: (event: string) => void;
}

const users: CmsUser[] = [
  { id: 'u1', name: 'Ada Lovelace', role: 'admin', avatar: 'AL' },
  { id: 'u2', name: 'Grace Hopper', role: 'editor', avatar: 'GH' },
  { id: 'u3', name: 'Katherine Johnson', role: 'reviewer', avatar: 'KJ' },
  { id: 'u4', name: 'Content Viewer', role: 'viewer', avatar: 'CV' },
];

const initialEntries: CmsEntry[] = [
  {
    id: 'home-refresh',
    title: 'Homepage conversion refresh',
    slug: '/home-refresh',
    type: 'landing',
    status: 'review',
    author: 'Grace Hopper',
    owner: 'Growth',
    channel: 'Web',
    updatedAt: '2026-05-27T10:40:00Z',
    views: 18420,
    conversions: 1260,
    seoScore: 91,
    body: 'Refresh the primary landing page with proof points, customer quotes, and a faster product tour.',
    tags: ['growth', 'homepage', 'seo'],
  },
  {
    id: 'docs-onboarding',
    title: 'Developer onboarding guide',
    slug: '/docs/developer-onboarding',
    type: 'docs',
    status: 'published',
    author: 'Ada Lovelace',
    owner: 'Platform',
    channel: 'Docs',
    updatedAt: '2026-05-26T16:15:00Z',
    views: 9321,
    conversions: 402,
    seoScore: 96,
    body: 'A step-by-step guide for installing the framework, wiring providers, and publishing the first feature module.',
    tags: ['docs', 'platform', 'developer'],
  },
  {
    id: 'q3-launch-plan',
    title: 'Q3 launch editorial plan',
    slug: '/blog/q3-launch-plan',
    type: 'post',
    status: 'scheduled',
    author: 'Katherine Johnson',
    owner: 'Marketing',
    channel: 'Blog',
    updatedAt: '2026-05-25T13:05:00Z',
    publishAt: '2026-06-03T14:00:00Z',
    views: 4100,
    conversions: 228,
    seoScore: 87,
    body: 'Editorial calendar and messaging pillars for the Q3 launch sequence.',
    tags: ['launch', 'calendar', 'marketing'],
  },
  {
    id: 'security-trust-center',
    title: 'Trust center security update',
    slug: '/trust/security-update',
    type: 'page',
    status: 'draft',
    author: 'Ada Lovelace',
    owner: 'Security',
    channel: 'Web',
    updatedAt: '2026-05-24T09:20:00Z',
    views: 7600,
    conversions: 530,
    seoScore: 94,
    body: 'Security control updates, compliance evidence, and new enterprise trust-center disclosures.',
    tags: ['security', 'compliance', 'trust'],
  },
];

let entries = [...initialEntries];

const sleep = (ms = 250) => new Promise((resolve) => window.setTimeout(resolve, ms));

const cmsApi = {
  async listEntries() {
    await sleep();
    return entries;
  },
  async getEntry(id: string) {
    await sleep();
    const entry = entries.find((item) => item.id === id);
    if (!entry) {
      throw new Error('Entry not found');
    }
    return entry;
  },
  async updateStatus(input: { id: string; status: WorkflowStatus }) {
    await sleep();
    entries = entries.map((entry) =>
      entry.id === input.id
        ? { ...entry, status: input.status, updatedAt: new Date().toISOString() }
        : entry,
    );
    return entries.find((entry) => entry.id === input.id)!;
  },
};

const queryClient =
  'queryClient' in Enzyme.queries && Enzyme.queries.queryClient
    ? Enzyme.queries.queryClient
    : Enzyme.queries.createQueryClient?.() ?? new Enzyme.queries.QueryClient();

const useCmsStore = create<CmsStore>((set) => ({
  currentUser: users[0],
  activeWorkspace: 'Acme CMS',
  auditEvents: [
    'RBAC policy loaded for editorial workflow',
    'Predictive content prefetch enabled',
    'Draft autosave channel opened',
  ],
  flags: {
    aiAssist: true,
    scheduledPublishing: true,
    livePreview: true,
    governanceMode: true,
  },
  setRole: (role) =>
    set((state) => ({
      currentUser: users.find((user) => user.role === role) ?? state.currentUser,
    })),
  toggleFlag: (flag) =>
    set((state) => ({
      flags: { ...state.flags, [flag]: !state.flags[flag] },
    })),
  addAuditEvent: (event) =>
    set((state) => ({ auditEvents: [event, ...state.auditEvents].slice(0, 8) })),
}));

const permissions: Record<Role, string[]> = {
  admin: ['content:read', 'content:create', 'content:update', 'content:publish', 'settings:manage'],
  editor: ['content:read', 'content:create', 'content:update'],
  reviewer: ['content:read', 'content:update'],
  viewer: ['content:read'],
};

function hasPermission(role: Role, permission: string) {
  return permissions[role].includes(permission);
}

function useEntries() {
  return useQuery({
    queryKey: ['cms', 'entries'],
    queryFn: cmsApi.listEntries,
  });
}

function useEntry(id: string) {
  return useQuery({
    queryKey: ['cms', 'entry', id],
    queryFn: () => cmsApi.getEntry(id),
  });
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppChrome />
      </Router>
    </QueryClientProvider>
  );
}

function AppChrome() {
  const currentUser = useCmsStore((state) => state.currentUser);
  const setRole = useCmsStore((state) => state.setRole);
  const activeWorkspace = useCmsStore((state) => state.activeWorkspace);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <Sparkles size={24} />
          <span>Enzyme CMS</span>
        </Link>
        <nav className="nav-list">
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <NavItem to="/content" icon={<FileText size={18} />} label="Content" />
          <NavItem to="/workflow" icon={<CheckCircle2 size={18} />} label="Workflow" />
          <NavItem to="/audience" icon={<Users size={18} />} label="Audience" />
          <NavItem to="/settings" icon={<Settings size={18} />} label="Settings" />
        </nav>
        <div className="framework-card">
          <div className="eyebrow">Framework surface</div>
          <p>
            Uses Enzyme query orchestration, feature flags, RBAC concepts, routing, shared state,
            monitoring, and performance patterns in one CMS example.
          </p>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <div className="eyebrow">{activeWorkspace}</div>
            <h1>Composable publishing operations</h1>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} />
              <span>Search content, tags, authors</span>
            </div>
            <select
              aria-label="Preview role"
              value={currentUser.role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {users.map((user) => (
                <option key={user.id} value={user.role}>
                  {user.name} · {user.role}
                </option>
              ))}
            </select>
            <div className="avatar" title={currentUser.name}>
              {currentUser.avatar}
            </div>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/content" element={<ContentIndex />} />
          <Route path="/content/:id" element={<ContentDetail />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/audience" element={<Audience />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to={to} end={to === '/'}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function Dashboard() {
  const { data = [] } = useEntries();
  const flags = useCmsStore((state) => state.flags);
  const currentUser = useCmsStore((state) => state.currentUser);
  const totalViews = data.reduce((sum, entry) => sum + entry.views, 0);
  const totalConversions = data.reduce((sum, entry) => sum + entry.conversions, 0);

  return (
    <section className="page-stack">
      <div className="hero-card">
        <div>
          <div className="eyebrow">Enterprise CMS blueprint</div>
          <h2>Build editorial systems as Enzyme feature modules.</h2>
          <p>
            This example mirrors the chat-style demo pattern as a complete app: routes, guarded
            actions, cached data, optimistic mutations, feature gates, audit state, and operational
            observability.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" to="/content">
            Manage content <ChevronRight size={16} />
          </Link>
          <Link className="secondary-button" to="/workflow">
            Review workflow
          </Link>
        </div>
      </div>

      <div className="metric-grid">
        <Metric icon={<FileText />} label="Entries" value={data.length.toString()} detail="4 content types" />
        <Metric icon={<Eye />} label="Views" value={totalViews.toLocaleString()} detail="Across channels" />
        <Metric icon={<Rocket />} label="Conversions" value={totalConversions.toLocaleString()} detail="Attributed actions" />
        <Metric icon={<ShieldCheck />} label="Role" value={currentUser.role} detail="RBAC simulation" />
      </div>

      <div className="two-column">
        <Panel title="Publishing pipeline" icon={<CalendarClock size={18} />}>
          <WorkflowBoard entries={data} compact />
        </Panel>
        <Panel title="Enabled framework capabilities" icon={<Flag size={18} />}>
          <div className="flag-list">
            {Object.entries(flags).map(([flag, enabled]) => (
              <span className={`flag-chip ${enabled ? 'enabled' : ''}`} key={flag}>
                {flag}: {enabled ? 'on' : 'off'}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function ContentIndex() {
  const { data = [], isLoading } = useEntries();
  const [filter, setFilter] = useState<WorkflowStatus | 'all'>('all');
  const visible = useMemo(
    () => (filter === 'all' ? data : data.filter((entry) => entry.status === filter)),
    [data, filter],
  );

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Content registry"
        title="Entries"
        description="A typed content registry backed by query caching and Enzyme-style feature boundaries."
      />
      <div className="toolbar">
        {(['all', 'draft', 'review', 'scheduled', 'published'] as const).map((status) => (
          <button className={filter === status ? 'selected' : ''} key={status} onClick={() => setFilter(status)}>
            {status}
          </button>
        ))}
      </div>
      {isLoading ? (
        <Panel title="Loading content" icon={<Activity size={18} />}>
          <p>Fetching entries through the CMS query layer.</p>
        </Panel>
      ) : (
        <div className="content-grid">
          {visible.map((entry) => (
            <ContentCard entry={entry} key={entry.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function ContentCard({ entry }: { entry: CmsEntry }) {
  return (
    <Link className="content-card" to={`/content/${entry.id}`}>
      <div className="card-header-row">
        <span className="status-pill">{entry.status}</span>
        <span>{entry.type}</span>
      </div>
      <h3>{entry.title}</h3>
      <p>{entry.body}</p>
      <div className="tag-row">
        {entry.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <div className="card-footer-row">
        <span>{entry.author}</span>
        <span>{entry.seoScore}% SEO</span>
      </div>
    </Link>
  );
}

function ContentDetail() {
  const { id = '' } = useParams();
  const { data: entry, isLoading, error } = useEntry(id);
  const queryClientInstance = useQueryClient();
  const currentUser = useCmsStore((state) => state.currentUser);
  const addAuditEvent = useCmsStore((state) => state.addAuditEvent);
  const canPublish = hasPermission(currentUser.role, 'content:publish');
  const canUpdate = hasPermission(currentUser.role, 'content:update');

  const mutation = useMutation({
    mutationFn: cmsApi.updateStatus,
    onMutate: async (input) => {
      await queryClientInstance.cancelQueries({ queryKey: ['cms', 'entries'] });
      const previous = queryClientInstance.getQueryData<CmsEntry[]>(['cms', 'entries']);
      queryClientInstance.setQueryData<CmsEntry[]>(['cms', 'entries'], (old = []) =>
        old.map((item) => (item.id === input.id ? { ...item, status: input.status } : item)),
      );
      addAuditEvent(`Optimistic workflow update: ${input.id} -> ${input.status}`);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClientInstance.setQueryData(['cms', 'entries'], context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClientInstance.setQueryData(['cms', 'entry', updated.id], updated);
      queryClientInstance.invalidateQueries({ queryKey: ['cms', 'entries'] });
    },
  });

  if (isLoading) return <PageHeader eyebrow="Content detail" title="Loading entry" description="Hydrating content record." />;
  if (error || !entry) return <PageHeader eyebrow="Content detail" title="Not found" description="The requested CMS entry does not exist." />;

  return (
    <section className="page-stack">
      <PageHeader eyebrow={entry.type} title={entry.title} description={entry.body} />
      <div className="two-column detail-grid">
        <Panel title="Editor preview" icon={<PenLine size={18} />}>
          <article className="preview-surface">
            <span className="status-pill">{entry.status}</span>
            <h2>{entry.title}</h2>
            <p>{entry.body}</p>
            <div className="tag-row">
              {entry.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </article>
        </Panel>
        <Panel title="Governance" icon={<Lock size={18} />}>
          <dl className="metadata-list">
            <div><dt>Slug</dt><dd>{entry.slug}</dd></div>
            <div><dt>Owner</dt><dd>{entry.owner}</dd></div>
            <div><dt>Channel</dt><dd>{entry.channel}</dd></div>
            <div><dt>Updated</dt><dd>{new Date(entry.updatedAt).toLocaleString()}</dd></div>
          </dl>
          <div className="action-stack">
            <button disabled={!canUpdate || mutation.isPending} onClick={() => mutation.mutate({ id: entry.id, status: 'review' })}>
              Send to review
            </button>
            <button disabled={!canPublish || mutation.isPending} onClick={() => mutation.mutate({ id: entry.id, status: 'published' })}>
              Publish now
            </button>
            {!canPublish && <p className="muted">Publishing requires admin permission.</p>}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Workflow() {
  const { data = [] } = useEntries();
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Workflow orchestration"
        title="Editorial review board"
        description="Review state is modeled as a CMS workflow with guarded transitions and audit logging."
      />
      <WorkflowBoard entries={data} />
    </section>
  );
}

function WorkflowBoard({ entries, compact = false }: { entries: CmsEntry[]; compact?: boolean }) {
  const statuses: WorkflowStatus[] = ['draft', 'review', 'scheduled', 'published'];
  return (
    <div className={compact ? 'workflow-board compact' : 'workflow-board'}>
      {statuses.map((status) => (
        <div className="workflow-column" key={status}>
          <h3>{status}</h3>
          {entries
            .filter((entry) => entry.status === status)
            .map((entry) => (
              <Link to={`/content/${entry.id}`} className="workflow-card" key={entry.id}>
                <strong>{entry.title}</strong>
                <span>{entry.owner}</span>
              </Link>
            ))}
        </div>
      ))}
    </div>
  );
}

function Audience() {
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Audience intelligence"
        title="Segments and journeys"
        description="A CMS-facing audience view for campaign routing, localization, and personalization."
      />
      <div className="metric-grid">
        <Metric icon={<Globe2 />} label="Locales" value="12" detail="Ready for publish" />
        <Metric icon={<Users />} label="Segments" value="8" detail="Active audiences" />
        <Metric icon={<MessageSquare />} label="Messages" value="34" detail="In campaign map" />
        <Metric icon={<Bell />} label="Alerts" value="3" detail="Governance checks" />
      </div>
    </section>
  );
}

function SettingsPage() {
  const flags = useCmsStore((state) => state.flags);
  const toggleFlag = useCmsStore((state) => state.toggleFlag);
  const auditEvents = useCmsStore((state) => state.auditEvents);

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="System settings"
        title="Framework controls"
        description="Toggle CMS capabilities and inspect audit events generated by query, state, and workflow actions."
      />
      <div className="two-column">
        <Panel title="Feature flags" icon={<Flag size={18} />}>
          <div className="settings-list">
            {Object.entries(flags).map(([flag, enabled]) => (
              <label className="setting-row" key={flag}>
                <span>{flag}</span>
                <input checked={enabled} onChange={() => toggleFlag(flag)} type="checkbox" />
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Audit stream" icon={<Activity size={18} />}>
          <ul className="audit-list">
            {auditEvents.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  );
}

function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="page-header">
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
