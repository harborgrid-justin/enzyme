import { flags } from '@missionfabric-js/enzyme';

/**
 * Feature-flagged "beta" surface. The panel content is gated by `FlagGate`, and
 * the flag can be toggled at runtime via `useFeatureFlagContext().setFlag`.
 */
export function BetaPanel(): React.ReactElement {
  const { isEnabled, setFlag } = flags.useFeatureFlagContext();
  const on = isEnabled(flags.flagKeys.BETA_FEATURES);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Beta: Threads</h3>
        <button
          type="button"
          onClick={() => setFlag(flags.flagKeys.BETA_FEATURES, !on)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            on ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {on ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      <flags.FlagGate
        flag={flags.flagKeys.BETA_FEATURES}
        fallback={
          <p className="text-xs text-slate-400">
            Threaded replies are behind the <code>beta-features</code> flag. Toggle it above.
          </p>
        }
      >
        <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
          🧵 Threaded replies are <strong>enabled</strong> — reply inline to any message.
        </div>
      </flags.FlagGate>
    </section>
  );
}
