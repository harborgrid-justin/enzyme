/**
 * Seed data for the Design workspace.
 *
 * The studio has no backend, so the design domain boots from this fixture and
 * persists user edits to localStorage. The numbers/snippets are chosen so each
 * panel has something meaningful to show on first open.
 */
import type {
  Asset,
  BrandKit,
  DataBinding,
  DataSource,
  DesignComponent,
  DesignPage,
  DesignTool,
  EnvConfig,
  EvalCase,
  GitState,
  KnowledgeDoc,
  PageLink,
  PromptTemplate,
  TokenSet,
  Workspace,
  AgentWorkflow,
  Breakpoint,
} from './types';

const now = '2026-05-29T12:00:00.000Z';

export const SEED_BREAKPOINTS: Breakpoint[] = [
  { id: 'mobile', name: 'Mobile', width: 390, height: 844 },
  { id: 'tablet', name: 'Tablet', width: 820, height: 1180 },
  { id: 'desktop', name: 'Desktop', width: 1440, height: 900 },
];

export const SEED_TOKEN_SET: TokenSet = {
  id: 'core',
  name: 'Core palette',
  tokens: [
    { id: 'color.brand.primary', name: 'Brand / Primary', category: 'color', value: '#6366f1' },
    { id: 'color.brand.accent', name: 'Brand / Accent', category: 'color', value: '#0ea5e9' },
    { id: 'color.surface.base', name: 'Surface / Base', category: 'color', value: '#0f172a' },
    { id: 'color.text.primary', name: 'Text / Primary', category: 'color', value: '#f8fafc' },
    { id: 'space.md', name: 'Spacing / Medium', category: 'spacing', value: '16px' },
    { id: 'radius.lg', name: 'Radius / Large', category: 'radius', value: '12px' },
    { id: 'font.sans', name: 'Font / Sans', category: 'typography', value: 'Inter, system-ui, sans-serif' },
  ],
};

const HERO = `<main style="font-family: Inter, system-ui; background:#0f172a; color:#f8fafc; padding:48px">
  <h1>Ship enterprise UIs in minutes</h1>
  <p>From prompt to production-grade prototype.</p>
  <a href="/pricing" style="background:#6366f1; padding:12px 20px; border-radius:12px">Get started</a>
</main>`;

const PRICING = `<main style="font-family: Inter, system-ui; padding:48px">
  <h1>Pricing</h1>
  <div style="display:flex; gap:16px">
    <div style="border:1px solid #6366f1; padding:24px; border-radius:12px">Team — {{bind:teamPrice}}/mo</div>
    <div style="border:1px solid #0ea5e9; padding:24px; border-radius:12px">Enterprise — Contact us</div>
  </div>
</main>`;

export const SEED_PAGES: DesignPage[] = [
  { id: 'page-home', name: 'Home', route: '/', body: HERO },
  { id: 'page-pricing', name: 'Pricing', route: '/pricing', body: PRICING },
];

export const SEED_PAGE_LINKS: PageLink[] = [
  { id: 'link-1', fromPageId: 'page-home', toPageId: 'page-pricing', label: 'Get started' },
];

export const SEED_COMPONENTS: DesignComponent[] = [
  {
    id: 'cmp-cta',
    name: 'CTA Button',
    body: '<a href="{{href}}" style="background:{{color}}; padding:12px 20px; border-radius:12px">{{label}}</a>',
    props: [
      { name: 'label', type: 'text', defaultValue: 'Get started' },
      { name: 'href', type: 'url', defaultValue: '/signup' },
      { name: 'color', type: 'color', defaultValue: '#6366f1' },
    ],
    origin: 'extracted',
    createdAt: now,
  },
];

export const SEED_BRAND: BrandKit = {
  name: 'Acme',
  logoSvg: '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#6366f1"/></svg>',
  palette: ['#6366f1', '#0ea5e9', '#0f172a', '#f8fafc'],
  fonts: ['Inter', 'system-ui'],
  voice: 'Confident, concise, enterprise-credible. Avoid hype words.',
};

export const SEED_ASSETS: Asset[] = [
  { id: 'asset-logo', name: 'logo.svg', kind: 'icon', url: 'data:image/svg+xml,<svg/>', size: 482, createdAt: now },
  { id: 'asset-hero', name: 'hero.webp', kind: 'image', url: 'https://example.com/hero.webp', size: 84231, createdAt: now },
];

export const SEED_WORKSPACE: Workspace = {
  id: 'ws-acme',
  name: 'Acme Corp',
  teams: [
    {
      id: 'team-design',
      name: 'Design Systems',
      members: ['Ada', 'Eli', 'Ana'],
      projects: [
        { id: 'proj-marketing', name: 'Marketing site' },
        { id: 'proj-console', name: 'Admin console' },
      ],
    },
    {
      id: 'team-growth',
      name: 'Growth',
      members: ['Gus', 'Ada'],
      projects: [{ id: 'proj-landing', name: 'Campaign landing pages' }],
    },
  ],
};

export const SEED_KNOWLEDGE: KnowledgeDoc[] = [
  {
    id: 'kb-brand',
    title: 'Brand guidelines',
    content:
      'The primary brand color is indigo (#6366f1). Use Inter for all headings. Keep copy confident and concise. Dark surfaces use #0f172a.',
    tags: ['brand', 'color', 'typography'],
  },
  {
    id: 'kb-a11y',
    title: 'Accessibility standard',
    content:
      'All interfaces must meet WCAG 2.1 AA. Text contrast must be at least 4.5:1. Every image needs descriptive alt text. Interactive controls require accessible names.',
    tags: ['a11y', 'wcag', 'contrast'],
  },
  {
    id: 'kb-layout',
    title: 'Layout system',
    content:
      'Use an 8px spacing grid. Cards use a 12px radius. The marketing site uses a 1440px max content width with a 12-column grid.',
    tags: ['layout', 'spacing', 'grid'],
  },
];

export const SEED_TOOLS: DesignTool[] = [
  {
    id: 'fetch-data',
    name: 'fetch_data',
    description: 'Fetch JSON from a REST endpoint to populate a component.',
    params: [{ name: 'url', type: 'string', description: 'The endpoint URL' }],
  },
  {
    id: 'query-db',
    name: 'query_db',
    description: 'Run a read-only SQL query against the analytics warehouse.',
    params: [{ name: 'sql', type: 'string', description: 'A SELECT statement' }],
  },
  {
    id: 'palette-from-image',
    name: 'palette_from_image',
    description: 'Extract a color palette from an uploaded image.',
    params: [{ name: 'url', type: 'string', description: 'Image URL' }],
  },
];

export const SEED_PROMPTS: PromptTemplate[] = [
  {
    id: 'prompt-landing',
    name: 'Landing page',
    variables: ['product', 'audience'],
    versions: [
      {
        version: 1,
        template:
          'Design a high-converting landing page for {{product}} aimed at {{audience}}. Use the brand palette and Inter font.',
        createdAt: now,
      },
    ],
  },
  {
    id: 'prompt-dashboard',
    name: 'Analytics dashboard',
    variables: ['metrics'],
    versions: [
      {
        version: 1,
        template: 'Build an analytics dashboard showing {{metrics}} with KPI cards and a chart.',
        createdAt: now,
      },
    ],
  },
];

export const SEED_EVALS: EvalCase[] = [
  {
    id: 'eval-cta',
    name: 'CTA present',
    prompt: 'Generate a landing page hero',
    expected: 'Get started',
    matcher: 'contains',
  },
  {
    id: 'eval-brand',
    name: 'Uses brand color',
    prompt: 'Style a primary button',
    expected: '#6366f1',
    matcher: 'contains',
  },
];

export const SEED_DATA_SOURCES: DataSource[] = [
  {
    id: 'ds-pricing',
    name: 'Pricing API',
    kind: 'rest',
    url: 'https://api.acme.dev/pricing',
    sample: { teamPrice: '$49', enterprisePrice: 'Custom', seats: 25 },
  },
  {
    id: 'ds-user',
    name: 'User profile',
    kind: 'graphql',
    url: 'https://api.acme.dev/graphql',
    sample: { user: { name: 'Ada Lovelace', plan: 'Enterprise' } },
  },
];

export const SEED_DATA_BINDINGS: DataBinding[] = [
  { id: 'bind-1', token: 'teamPrice', sourceId: 'ds-pricing', path: 'teamPrice' },
];

export const SEED_ENVIRONMENTS: EnvConfig[] = [
  { name: 'development', vars: { API_BASE: 'http://localhost:3004' }, promotedTargetId: 'page-home', promotedAt: now },
  { name: 'staging', vars: { API_BASE: 'https://staging.acme.dev' }, promotedTargetId: null, promotedAt: null },
  { name: 'production', vars: { API_BASE: 'https://acme.dev' }, promotedTargetId: null, promotedAt: null },
];

export const SEED_GIT: GitState = {
  repo: 'acme/marketing-site',
  branch: 'main',
  commits: [
    {
      id: 'c1',
      message: 'feat(design): add hero prototype',
      author: 'Ada',
      branch: 'main',
      files: ['pages/home.html'],
      createdAt: now,
    },
  ],
  pullRequests: [],
};

export const SEED_WORKFLOWS: AgentWorkflow[] = [
  {
    id: 'wf-landing',
    name: 'Prototype a landing page',
    goal: 'A launch landing page for the new analytics product',
    steps: [
      { id: 's1', name: 'Research', kind: 'research' },
      { id: 's2', name: 'Wireframe', kind: 'wireframe' },
      { id: 's3', name: 'Build', kind: 'build' },
      { id: 's4', name: 'A11y fix', kind: 'a11y-fix' },
      { id: 's5', name: 'Review', kind: 'review' },
    ],
  },
];

/** Simulated peers for presence (feature #11). */
export const SEED_PEERS = [
  { id: 'peer-eli', name: 'Eli', color: '#0ea5e9' },
  { id: 'peer-ana', name: 'Ana', color: '#f59e0b' },
] as const;
