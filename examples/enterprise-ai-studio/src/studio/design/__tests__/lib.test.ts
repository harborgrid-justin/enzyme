import { describe, it, expect } from 'vitest';
import { tokensToCss, applyColorTokens, tokenCssVar } from '../lib/tokens';
import { extractComponent, renderComponent, placeholderNames } from '../lib/componentize';
import { auditHtml, applyAutofixes, contrastRatio } from '../lib/a11y';
import { diffLines, diffStats } from '../lib/diff';
import { checkBrand } from '../lib/brand';
import { pageToFigma, figmaToPage } from '../lib/figma';
import { parseNodes, applyNodeEdit } from '../lib/inspector';
import { retrieve, groundingPreamble } from '../lib/rag';
import { matchExpectation, runEvals, passRateByProvider } from '../lib/evals';
import { renderPrompt, extractVariables, addVersion } from '../lib/prompts';
import { exportPage } from '../lib/exporters';
import { resolveBindings, readPath } from '../lib/databind';
import { validateArgs, executeTool } from '../lib/tools';
import { createRun, runStep } from '../lib/agent';
import { SEED_TOKEN_SET, SEED_BRAND, SEED_PAGES, SEED_KNOWLEDGE, SEED_TOOLS, SEED_PROMPTS, SEED_EVALS, SEED_WORKFLOWS, SEED_DATA_SOURCES, SEED_DATA_BINDINGS } from '../seed';
import type { BrandKit, DesignPage } from '../types';

describe('tokens (#1)', () => {
  it('compiles a token set to CSS custom properties', () => {
    const css = tokensToCss(SEED_TOKEN_SET);
    expect(css).toContain(':root {');
    expect(css).toContain('--color-brand-primary: #6366f1;');
  });
  it('derives a safe css var name', () => {
    expect(tokenCssVar({ id: 'color.brand.primary' })).toBe('--color-brand-primary');
  });
  it('rewrites literal hex colors to var() references', () => {
    const html = '<a style="background:#6366f1">x</a>';
    const { html: out, replaced } = applyColorTokens(html, SEED_TOKEN_SET);
    expect(replaced).toBe(1);
    expect(out).toContain('var(--color-brand-primary)');
  });
});

describe('componentize (#2)', () => {
  it('extracts label/href/color props from a markup block', () => {
    const cmp = extractComponent('CTA', '<a href="/go" style="background:#ff0000">Click me</a>');
    const names = cmp.props.map((p) => p.name).sort();
    expect(names).toEqual(['color', 'href', 'label']);
    expect(cmp.body).toContain('{{label}}');
    expect(cmp.origin).toBe('extracted');
  });
  it('renders a component with overrides and reports placeholders', () => {
    const cmp = extractComponent('CTA', '<a href="/go">Click me</a>');
    expect(renderComponent(cmp, { label: 'Buy' })).toContain('Buy');
    expect(placeholderNames(cmp.body)).toContain('label');
  });
});

describe('a11y (#8)', () => {
  it('flags a missing alt and autofixes it', () => {
    const report = auditHtml('<img src="x.png">');
    const issue = report.issues.find((i) => i.id === 'img-alt');
    expect(issue).toBeDefined();
    const fixed = applyAutofixes('<img src="x.png">', report);
    expect(fixed).toMatch(/alt=/);
  });
  it('computes WCAG contrast (black on white ~21)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('scores a clean fragment higher than a broken one', () => {
    const clean = auditHtml('<button>Go</button>').score;
    const broken = auditHtml('<img src="x"><button></button>').score;
    expect(clean).toBeGreaterThan(broken);
  });
});

describe('diff (#5)', () => {
  it('detects added and removed lines', () => {
    const stats = diffStats('a\nb\nc', 'a\nc\nd');
    expect(stats.added).toBeGreaterThan(0);
    expect(stats.removed).toBeGreaterThan(0);
  });
  it('reports tag deltas (counts opening tags)', () => {
    const stats = diffStats('<div></div>', '<div></div><div></div>');
    expect(stats.tagDelta.div).toBe(1);
  });
  it('marks equal lines as equal', () => {
    expect(diffLines('x', 'x')).toEqual([{ op: 'equal', text: 'x' }]);
  });
});

describe('brand (#9)', () => {
  it('flags off-palette colors with a suggestion', () => {
    const violations = checkBrand('<div style="color:#abcdef">x</div>', SEED_BRAND);
    const color = violations.find((v) => v.kind === 'color');
    expect(color).toBeDefined();
    expect(color?.suggestion).toBeDefined();
  });
  it('passes on-palette colors', () => {
    expect(checkBrand('<div style="color:#6366f1"></div>', SEED_BRAND)).toHaveLength(0);
  });
});

describe('figma (#7)', () => {
  it('round-trips a page through figma export/import', () => {
    const page = SEED_PAGES[0]!;
    const doc = pageToFigma(page);
    expect(doc.frame.type).toBe('FRAME');
    const back = figmaToPage(doc, 'page-test');
    expect(back.body).toContain('<');
  });
});

describe('inspector (#6)', () => {
  it('parses nodes and round-trips a text edit', () => {
    const html = '<h1>Hello</h1>';
    const nodes = parseNodes(html);
    expect(nodes[0]?.tag).toBe('h1');
    expect(applyNodeEdit(html, 0, { text: 'Bye' })).toBe('<h1>Bye</h1>');
  });
  it('adds an inline style to a node', () => {
    const out = applyNodeEdit('<p>x</p>', 0, { style: { color: 'red' } });
    expect(out).toContain('style="color: red"');
  });
});

describe('rag (#21)', () => {
  it('retrieves the most relevant doc for a query', () => {
    const chunks = retrieve('every image needs alt text and contrast', SEED_KNOWLEDGE);
    expect(chunks[0]?.docId).toBe('kb-a11y');
    expect(groundingPreamble(chunks)).toContain('[1]');
  });
  it('returns nothing for an empty query', () => {
    expect(retrieve('', SEED_KNOWLEDGE)).toHaveLength(0);
  });
});

describe('evals (#24)', () => {
  it('matches via contains/equals/regex', () => {
    expect(matchExpectation('Get started now', 'get started', 'contains')).toBe(true);
    expect(matchExpectation('abc', 'abc', 'equals')).toBe(true);
    expect(matchExpectation('a1b2', '\\d', 'regex')).toBe(true);
  });
  it('runs a matrix and computes per-provider pass rate', () => {
    const results = runEvals(SEED_EVALS, ['anthropic', 'huggingface']);
    expect(results).toHaveLength(SEED_EVALS.length * 2);
    const rates = passRateByProvider(results);
    expect(rates.anthropic).toBeGreaterThan(rates.huggingface!);
  });
});

describe('prompts (#23)', () => {
  it('extracts variables and renders with values', () => {
    expect(extractVariables('Hi {{name}} from {{org}}')).toEqual(['name', 'org']);
    const rendered = renderPrompt(SEED_PROMPTS[0]!, { product: 'Enzyme', audience: 'PMs' });
    expect(rendered).toContain('Enzyme');
    expect(rendered).toContain('PMs');
  });
  it('appends a new version', () => {
    const next = addVersion(SEED_PROMPTS[0]!, 'New {{thing}}');
    expect(next.versions).toHaveLength(SEED_PROMPTS[0]!.versions.length + 1);
    expect(next.variables).toEqual(['thing']);
  });
});

describe('exporters (#20)', () => {
  it('exports a page to each framework format', () => {
    const page = SEED_PAGES[0]!;
    expect(exportPage(page, 'react').filename).toMatch(/\.tsx$/);
    expect(exportPage(page, 'vue').code).toContain('<template>');
    expect(exportPage(page, 'web-component').code).toContain('customElements.define');
    expect(exportPage(page, 'storybook').filename).toMatch(/stories/);
  });
});

describe('databind (#18)', () => {
  it('reads a dot-path', () => {
    expect(readPath({ a: { b: 2 } }, 'a.b')).toBe(2);
  });
  it('resolves {{bind:token}} placeholders against sources', () => {
    const page: DesignPage = { id: 'p', name: 'p', route: '/', body: 'Price: {{bind:teamPrice}}' };
    const res = resolveBindings(page.body, SEED_DATA_BINDINGS, SEED_DATA_SOURCES);
    expect(res.resolved).toBe(1);
    expect(res.html).toContain('$49');
  });
  it('reports unresolved placeholders', () => {
    const res = resolveBindings('{{bind:missing}}', [], SEED_DATA_SOURCES);
    expect(res.unresolved).toContain('missing');
  });
});

describe('tools (#22)', () => {
  it('validates required args', () => {
    const tool = SEED_TOOLS[0]!;
    expect(validateArgs(tool, {}).length).toBeGreaterThan(0);
    expect(validateArgs(tool, { url: 'https://x' })).toHaveLength(0);
  });
  it('executes a tool deterministically', () => {
    const inv = executeTool(SEED_TOOLS[0]!, { url: 'https://x' });
    expect(inv.result).toContain('Fetched');
  });
});

describe('agent (#25)', () => {
  it('creates a run with pending steps', () => {
    const run = createRun(SEED_WORKFLOWS[0]!);
    expect(run.steps).toHaveLength(SEED_WORKFLOWS[0]!.steps.length);
    expect(run.steps.every((s) => s.status === 'pending')).toBe(true);
  });
  it('produces step output per kind', () => {
    expect(runStep({ id: 's', name: 'Build', kind: 'build' }, 'a page')).toContain('a page');
  });
});

// Guard against accidental contrast helper export drift used by brand.ts.
it('brand kit fixture is well formed', () => {
  const kit: BrandKit = SEED_BRAND;
  expect(kit.palette.length).toBeGreaterThan(0);
});
