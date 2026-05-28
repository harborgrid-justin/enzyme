import { auth } from '@missionfabric-js/enzyme';
import { MODELS, PROVIDERS } from '../providers/catalog';

/**
 * Empty-state shown before any conversation is selected. Doubles as an overview
 * of the providers/models the studio can route to.
 */
export function WelcomeScreen(): React.ReactElement {
  const { user } = auth.useAuth();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl px-8 py-12 text-center">
        <h1 className="mb-3 text-3xl font-bold text-slate-900">
          {user ? `Welcome back, ${user.firstName}.` : 'Enzyme AI Studio'}
        </h1>
        <p className="mb-8 text-slate-600">
          One workspace, every frontier model. Pick a conversation on the left or
          start a new one — switch providers mid-thread, share with your team,
          and keep an eye on cost as you go.
        </p>

        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Available providers
        </h2>
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.values(PROVIDERS).map((p) => {
            const count = MODELS.filter((m) => m.provider === p.id).length;
            return (
              <div
                key={p.id}
                className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm"
              >
                <div className="text-2xl">{p.glyph}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{p.label}</div>
                <div className="text-[11px] text-slate-500">
                  {count} model{count === 1 ? '' : 's'}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-xs text-slate-400">
          All providers are mocked in-browser via MSW. No real API keys required —
          swap the mock for a real fetch to ship.
        </p>
      </div>
    </div>
  );
}
