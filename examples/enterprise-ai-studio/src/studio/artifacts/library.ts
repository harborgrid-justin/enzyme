/**
 * Canned artifact templates the mock provider cycles through.
 *
 * Each template is a real, working HTML / SVG / Markdown document — the mock
 * just picks the closest match for the user's prompt and streams it back wrapped
 * in `<artifact …>` tags. Iteration prompts ("make it darker", "add a CTA")
 * route through `applyVariation` which mutates the template body to reflect
 * the requested change.
 */
import type { ArtifactKind } from './types';

export interface ArtifactTemplate {
  id: string;
  title: string;
  kind: ArtifactKind;
  language?: string;
  /** Keywords in the user's prompt that route to this template. */
  triggers: string[];
  body: string;
}

// -----------------------------------------------------------------------------
// HTML — Landing page
// -----------------------------------------------------------------------------

const LANDING_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atlas — Modern infrastructure for builders</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 antialiased">
  <header class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
    <div class="flex items-center gap-2">
      <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500"></div>
      <span class="text-lg font-bold tracking-tight">Atlas</span>
    </div>
    <nav class="hidden gap-8 text-sm font-medium text-slate-600 md:flex">
      <a href="#" class="hover:text-slate-900">Product</a>
      <a href="#" class="hover:text-slate-900">Pricing</a>
      <a href="#" class="hover:text-slate-900">Customers</a>
      <a href="#" class="hover:text-slate-900">Docs</a>
    </nav>
    <div class="flex items-center gap-3">
      <a href="#" class="text-sm font-medium text-slate-700 hover:text-slate-900">Sign in</a>
      <a href="#" class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800">Start free</a>
    </div>
  </header>

  <section class="mx-auto max-w-6xl px-6 pb-20 pt-12 text-center md:pt-20">
    <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
      Now in public beta — join 2,400 teams
    </span>
    <h1 class="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
      Ship infrastructure
      <span class="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500 bg-clip-text text-transparent">in minutes</span>,
      not weeks.
    </h1>
    <p class="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
      Atlas gives you production-grade compute, networking, and observability behind one declarative API. Your team focuses on product; we handle the platform.
    </p>
    <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
      <a href="#" class="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-slate-800">Get started — free</a>
      <a href="#" class="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Book a demo →</a>
    </div>
  </section>

  <section class="border-t border-slate-200 bg-white">
    <div class="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-3">
      <div>
        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-xl">⚡</div>
        <h3 class="text-lg font-semibold">Instant rollouts</h3>
        <p class="mt-1 text-sm text-slate-600">Push to main, ship to prod. Atlas builds, tests, and deploys in under 90 seconds — every time.</p>
      </div>
      <div>
        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-100 text-xl">🔒</div>
        <h3 class="text-lg font-semibold">SOC 2 + HIPAA</h3>
        <p class="mt-1 text-sm text-slate-600">Compliance built in. Audit logs, encryption-at-rest, and least-privilege access are default — not bolt-ons.</p>
      </div>
      <div>
        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-xl">📈</div>
        <h3 class="text-lg font-semibold">Observability first</h3>
        <p class="mt-1 text-sm text-slate-600">Metrics, traces, and logs are unified out-of-the-box. Diagnose incidents in one place, no plumbing required.</p>
      </div>
    </div>
  </section>

  <footer class="border-t border-slate-200 bg-slate-50 px-6 py-10 text-center text-xs text-slate-500">
    © 2026 Atlas Systems · Crafted with care
  </footer>
</body>
</html>`;

// -----------------------------------------------------------------------------
// HTML — Analytics dashboard
// -----------------------------------------------------------------------------

const DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atlas — Q3 Overview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 antialiased">
  <div class="mx-auto max-w-7xl px-6 py-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Q3 Overview</h1>
        <p class="text-sm text-slate-500">Updated 4 minutes ago · all values exclude internal accounts</p>
      </div>
      <div class="flex gap-2">
        <button class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Last 90 days</button>
        <button class="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">Export</button>
      </div>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-slate-500">ARR</p>
        <p class="mt-1 text-3xl font-bold text-slate-900">$12.4M</p>
        <p class="mt-1 text-xs font-medium text-emerald-600">▲ 24% vs. plan</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-slate-500">Active customers</p>
        <p class="mt-1 text-3xl font-bold text-slate-900">2,418</p>
        <p class="mt-1 text-xs font-medium text-emerald-600">▲ 312 this quarter</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-slate-500">Net retention</p>
        <p class="mt-1 text-3xl font-bold text-slate-900">118%</p>
        <p class="mt-1 text-xs font-medium text-emerald-600">▲ 4 pts</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-slate-500">Gross margin</p>
        <p class="mt-1 text-3xl font-bold text-slate-900">76%</p>
        <p class="mt-1 text-xs font-medium text-rose-600">▼ 1.2 pts</p>
      </div>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h3 class="text-sm font-semibold text-slate-900">Monthly recurring revenue</h3>
        <p class="text-xs text-slate-500">Last 12 months</p>
        <div class="mt-4 flex h-56 items-end gap-2">
          ${[32, 38, 42, 48, 51, 55, 62, 68, 72, 80, 88, 96]
            .map(
              (h) =>
                `<div class="flex-1 rounded-t bg-gradient-to-t from-indigo-500 to-fuchsia-400" style="height: ${h}%"></div>`
            )
            .join('')}
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Top customers</h3>
        <ul class="mt-3 divide-y divide-slate-100 text-sm">
          <li class="flex justify-between py-2"><span>Vanta</span><span class="font-mono text-slate-500">$284k</span></li>
          <li class="flex justify-between py-2"><span>Linear</span><span class="font-mono text-slate-500">$201k</span></li>
          <li class="flex justify-between py-2"><span>Modal</span><span class="font-mono text-slate-500">$184k</span></li>
          <li class="flex justify-between py-2"><span>Retool</span><span class="font-mono text-slate-500">$162k</span></li>
          <li class="flex justify-between py-2"><span>Posthog</span><span class="font-mono text-slate-500">$148k</span></li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>`;

// -----------------------------------------------------------------------------
// HTML — Pricing page
// -----------------------------------------------------------------------------

const PRICING = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pricing — Atlas</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 antialiased">
  <div class="mx-auto max-w-6xl px-6 py-16">
    <div class="text-center">
      <h1 class="text-4xl font-bold tracking-tight text-slate-900">Pricing that scales with you</h1>
      <p class="mt-3 text-slate-600">Start free. Pay for what you use. Cancel anytime.</p>
    </div>

    <div class="mt-12 grid gap-6 md:grid-cols-3">
      <!-- Starter -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Starter</h3>
        <p class="mt-2 text-4xl font-bold text-slate-900">$0<span class="text-base font-normal text-slate-500">/mo</span></p>
        <p class="mt-1 text-sm text-slate-600">For hobby projects and early experiments.</p>
        <a href="#" class="mt-6 block rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">Get started</a>
        <ul class="mt-6 space-y-2 text-sm text-slate-600">
          <li>✓ 1 project</li>
          <li>✓ Community support</li>
          <li>✓ 100 GB bandwidth</li>
          <li>✓ Public deploys</li>
        </ul>
      </div>

      <!-- Pro -->
      <div class="relative rounded-2xl border-2 border-indigo-500 bg-white p-6 shadow-xl">
        <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">Most popular</span>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-indigo-600">Pro</h3>
        <p class="mt-2 text-4xl font-bold text-slate-900">$49<span class="text-base font-normal text-slate-500">/mo</span></p>
        <p class="mt-1 text-sm text-slate-600">For growing teams shipping daily.</p>
        <a href="#" class="mt-6 block rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm hover:bg-indigo-700">Start 14-day trial</a>
        <ul class="mt-6 space-y-2 text-sm text-slate-600">
          <li>✓ Unlimited projects</li>
          <li>✓ Priority support · 8h SLA</li>
          <li>✓ 1 TB bandwidth</li>
          <li>✓ Private deploys + previews</li>
          <li>✓ SSO + audit logs</li>
        </ul>
      </div>

      <!-- Enterprise -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Enterprise</h3>
        <p class="mt-2 text-4xl font-bold text-slate-900">Custom</p>
        <p class="mt-1 text-sm text-slate-600">For regulated industries and global scale.</p>
        <a href="#" class="mt-6 block rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800">Contact sales</a>
        <ul class="mt-6 space-y-2 text-sm text-slate-600">
          <li>✓ Everything in Pro</li>
          <li>✓ Dedicated CSM · 1h SLA</li>
          <li>✓ Custom data residency</li>
          <li>✓ SOC 2 Type II + HIPAA</li>
          <li>✓ Custom contracts + invoicing</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>`;

// -----------------------------------------------------------------------------
// SVG — Logo / illustration
// -----------------------------------------------------------------------------

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="50%" stop-color="#d946ef" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="240" height="240" rx="48" fill="url(#grad)" />
  <circle cx="120" cy="120" r="80" fill="url(#glow)" />
  <path d="M 80 160 L 120 80 L 160 160 M 96 132 L 144 132" stroke="white" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none" />
</svg>`;

// -----------------------------------------------------------------------------
// Markdown — Project brief
// -----------------------------------------------------------------------------

const PROJECT_BRIEF = `# Project brief — Quarterly business review

**Owner:** Ada Admin · **Audience:** board + exec staff · **Format:** 30 min read

## Summary

Q3 closed at **$12.4M ARR** (+24% vs. plan) on the back of expansion within
the design partner cohort. Net retention reached **118%**, the strongest
print since the company hit GA. Gross margin softened by **1.2 pts** as
infra costs trailed pricing for new tiers — we're tracking a return to the
prior baseline by mid-Q4.

## Wins

1. **Enterprise wedge** — 6 new logos signed >$100k ACV, including two
   regulated-industry accounts that put SOC 2 to its first real test.
2. **Self-serve funnel** — paid conversion lifted to **6.1%** after the
   pricing-page redesign and the in-product paywall experiment shipped on
   the 14th.
3. **Reliability** — 99.97% availability vs. the 99.95% commitment, with
   zero customer-impacting incidents in the last 42 days.

## Risks

- **Concentration** — top-5 customers are 28% of ARR. Adding three new
  $200k+ logos in Q4 would bring that under 25%.
- **Hiring** — we're behind on senior platform engineers; the gap is
  pushing the multi-region rollout into Q1.

## Asks

| Ask | Owner | Cost |
| --- | --- | ---- |
| Approve $1.2M for EU region launch | Eng | $1.2M cap-ex |
| Greenlight named-account hiring (3 SDRs) | GTM | $480k OpEx |
| Sign off on pricing v3 (private rollout) | Product | none |

> _Generated as a quarterly-review starter draft — replace the numbers with
> the ones from \`metrics/q3-final.csv\` before sending to the board._`;

// -----------------------------------------------------------------------------
// Code — TypeScript snippet
// -----------------------------------------------------------------------------

const REACT_HOOK_TS = `import { useEffect, useRef, useState } from 'react';

/**
 * Debounce a fast-changing value (e.g. an input field) so downstream effects
 * fire at most once per \`delay\` ms after the value settles.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timer.current != null) clearTimeout(timer.current);
    };
  }, [value, delay]);

  return debounced;
}

// Example:
//   const search = useDebouncedValue(rawSearch, 200);
//   useEffect(() => { fetchResults(search); }, [search]);`;

// -----------------------------------------------------------------------------
// Registry + routing
// -----------------------------------------------------------------------------

export const ARTIFACT_TEMPLATES: ArtifactTemplate[] = [
  {
    id: 'landing-page',
    title: 'Modern landing page',
    kind: 'html',
    triggers: ['landing', 'home page', 'homepage', 'marketing site', 'website'],
    body: LANDING_PAGE,
  },
  {
    id: 'pricing-page',
    title: 'Pricing page (3-tier)',
    kind: 'html',
    triggers: ['pricing', 'plans', 'subscription'],
    body: PRICING,
  },
  {
    id: 'dashboard',
    title: 'Analytics dashboard',
    kind: 'html',
    triggers: ['dashboard', 'analytics', 'admin panel', 'kpi', 'metrics page'],
    body: DASHBOARD,
  },
  {
    id: 'logo-svg',
    title: 'Brand logo (SVG)',
    kind: 'svg',
    triggers: ['logo', 'icon', 'svg', 'illustration', 'brand mark'],
    body: LOGO_SVG,
  },
  {
    id: 'qbr-brief',
    title: 'Quarterly business review brief',
    kind: 'markdown',
    triggers: ['qbr', 'quarterly', 'business review', 'brief', 'memo', 'document', 'report'],
    body: PROJECT_BRIEF,
  },
  {
    id: 'debounce-hook',
    title: 'useDebouncedValue React hook',
    kind: 'code',
    language: 'typescript',
    triggers: ['hook', 'debounce', 'react', 'typescript snippet', 'utility function'],
    body: REACT_HOOK_TS,
  },
];

/** Find the best-fit template given a prompt; returns null if nothing matches. */
export function pickTemplate(prompt: string): ArtifactTemplate | null {
  const haystack = prompt.toLowerCase();
  let best: { tpl: ArtifactTemplate; score: number } | null = null;
  for (const tpl of ARTIFACT_TEMPLATES) {
    const score = tpl.triggers.reduce(
      (acc, trigger) => acc + (haystack.includes(trigger) ? trigger.length : 0),
      0
    );
    if (score > 0 && (best == null || score > best.score)) {
      best = { tpl, score };
    }
  }
  return best?.tpl ?? null;
}

/**
 * Generic iteration heuristic — given a prompt referencing an existing
 * artifact (e.g. "make it darker", "add a CTA"), mutate the source.
 */
export function applyVariation(
  source: string,
  kind: ArtifactKind,
  prompt: string
): { body: string; label: string } | null {
  const p = prompt.toLowerCase();

  if (kind === 'html') {
    if (/(dark|night|black)/.test(p)) {
      return { body: toDark(source), label: 'Dark theme' };
    }
    if (/(light|bright|white)/.test(p)) {
      return { body: toLight(source), label: 'Light theme' };
    }
    if (/(brand|color|palette|recolor)/.test(p)) {
      return { body: recolor(source), label: 'Brand palette' };
    }
    if (/(cta|button|action|signup|sign up)/.test(p)) {
      return { body: addCta(source), label: 'Added CTA' };
    }
    if (/(condense|tighten|shorter|compact)/.test(p)) {
      return { body: tighten(source), label: 'Condensed' };
    }
  }

  if (kind === 'svg') {
    if (/(dark|night)/.test(p)) {
      return {
        body: source.replace('#6366f1', '#1e1b4b').replace('#d946ef', '#581c87').replace('#f43f5e', '#9f1239'),
        label: 'Darker palette',
      };
    }
    if (/(green|emerald|teal)/.test(p)) {
      return {
        body: source.replace('#6366f1', '#059669').replace('#d946ef', '#0d9488').replace('#f43f5e', '#10b981'),
        label: 'Teal palette',
      };
    }
  }

  if (kind === 'markdown' && /(shorter|brief|condense|tighten)/.test(p)) {
    const tightened = source
      .split('\n')
      .filter((line, i) => i < 8 || line.startsWith('#') || line.startsWith('|'))
      .join('\n');
    return { body: tightened, label: 'Tighter narrative' };
  }

  return null;
}

function toDark(html: string): string {
  return html
    .replace(/bg-slate-50/g, 'bg-slate-950')
    .replace(/bg-slate-100/g, 'bg-slate-900')
    .replace(/bg-white/g, 'bg-slate-900')
    .replace(/text-slate-900/g, 'text-slate-50')
    .replace(/text-slate-700/g, 'text-slate-200')
    .replace(/text-slate-600/g, 'text-slate-300')
    .replace(/text-slate-500/g, 'text-slate-400')
    .replace(/border-slate-200/g, 'border-slate-700')
    .replace(/border-slate-300/g, 'border-slate-600')
    .replace(/hover:bg-slate-100/g, 'hover:bg-slate-800')
    .replace(/hover:bg-slate-50/g, 'hover:bg-slate-800')
    .replace(/divide-slate-100/g, 'divide-slate-700');
}

function toLight(html: string): string {
  return html
    .replace(/bg-slate-950/g, 'bg-slate-50')
    .replace(/bg-slate-900/g, 'bg-white')
    .replace(/text-slate-50/g, 'text-slate-900')
    .replace(/text-slate-200/g, 'text-slate-700')
    .replace(/text-slate-300/g, 'text-slate-600')
    .replace(/text-slate-400/g, 'text-slate-500')
    .replace(/border-slate-700/g, 'border-slate-200')
    .replace(/border-slate-600/g, 'border-slate-300')
    .replace(/hover:bg-slate-800/g, 'hover:bg-slate-100')
    .replace(/divide-slate-700/g, 'divide-slate-100');
}

function recolor(html: string): string {
  return html
    .replace(/indigo-500/g, 'emerald-500')
    .replace(/indigo-600/g, 'emerald-600')
    .replace(/indigo-100/g, 'emerald-100')
    .replace(/indigo-700/g, 'emerald-700')
    .replace(/fuchsia-500/g, 'teal-500')
    .replace(/fuchsia-400/g, 'teal-400')
    .replace(/fuchsia-100/g, 'teal-100')
    .replace(/rose-500/g, 'sky-500')
    .replace(/rose-100/g, 'sky-100');
}

function addCta(html: string): string {
  const cta = `
  <section class="border-t border-slate-200 bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-rose-500 px-6 py-16 text-center text-white">
    <h2 class="text-3xl font-bold tracking-tight">Ready to build with Atlas?</h2>
    <p class="mx-auto mt-3 max-w-xl text-indigo-50">Spin up your first project in under two minutes. No credit card required, no commitment, full feature access for 14 days.</p>
    <a href="#" class="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-lg hover:bg-indigo-50">Start your free trial →</a>
  </section>
`;
  return html.replace('</body>', `${cta}  </body>`);
}

function tighten(html: string): string {
  return html
    .replace(/py-20/g, 'py-12')
    .replace(/py-16/g, 'py-10')
    .replace(/pt-20/g, 'pt-12')
    .replace(/text-6xl/g, 'text-4xl')
    .replace(/text-5xl/g, 'text-3xl')
    .replace(/text-4xl/g, 'text-3xl');
}
