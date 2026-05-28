import { auth } from '@missionfabric-js/enzyme';
import { MODELS, PROVIDERS } from '../providers/catalog';

const STARTER_PROMPTS = [
  {
    title: 'Design a landing page',
    body: 'Build a landing page for an infrastructure-as-code SaaS startup.',
    glyph: '🎨',
  },
  {
    title: 'Draft a quarterly review',
    body: 'Draft a QBR memo for Q3 — focus on ARR, retention, and risks.',
    glyph: '📄',
  },
  {
    title: 'Build a dashboard',
    body: 'Design an analytics dashboard with KPI cards and a 12-month MRR chart.',
    glyph: '📊',
  },
  {
    title: 'Create a brand logo',
    body: 'Create an SVG logo for a company called Atlas — modern, gradient, abstract.',
    glyph: '✨',
  },
] as const;

/**
 * Empty-state shown before any conversation is selected. Doubles as an overview
 * of the providers/models the studio can route to + a launchpad of prompts
 * that demonstrate the artifact iteration capability.
 */
export function WelcomeScreen(): React.ReactElement {
  const { user } = auth.useAuth();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl px-8 py-12 text-center">
        <h1 className="mb-3 text-3xl font-bold text-slate-900">
          {user ? `Welcome back, ${user.firstName}.` : 'Enzyme AI Studio'}
        </h1>
        <p className="mb-8 text-slate-600">
          One workspace, every frontier model. Ask for designs, dashboards, or
          documents — the assistant streams a live preview alongside the chat
          and lets you iterate version by version.
        </p>

        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Start with an artifact prompt
        </h2>
        <div className="mx-auto mb-8 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
          {STARTER_PROMPTS.map((p) => (
            <div
              key={p.title}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{p.glyph}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{p.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{p.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {MODELS.length} models across {Object.keys(PROVIDERS).length} providers
        </h2>
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.values(PROVIDERS).map((p) => {
            const count = MODELS.filter((m) => m.provider === p.id).length;
            return (
              <a
                key={p.id}
                href={p.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="text-2xl">{p.glyph}</div>
                <div className="mt-1 text-xs font-semibold text-slate-900">{p.label}</div>
                <div className="text-[10px] text-slate-500">
                  {count} model{count === 1 ? '' : 's'}
                </div>
              </a>
            );
          })}
        </div>

        <p className="mt-8 text-xs text-slate-400">
          All providers are mocked in-browser via MSW. No real API keys required.
          After a first draft, ask "make it darker" or "add a CTA" to create the
          next iteration.
        </p>
      </div>
    </div>
  );
}
