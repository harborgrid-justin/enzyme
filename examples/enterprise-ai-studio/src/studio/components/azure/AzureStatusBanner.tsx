import { useAzureStatus } from '../../azure/api';

/**
 * Top-of-console banner. Renders three states:
 *
 *   1. Bridge unreachable          → tells the user to start `npm run dev`
 *   2. `az` missing                → install instructions
 *   3. `az login` missing          → "run az login" callout
 *
 * In the happy path it collapses to a one-line "signed in as ..." badge.
 */
export function AzureStatusBanner(): React.ReactElement {
  const { data, isLoading, error, refetch } = useAzureStatus();

  if (isLoading) {
    return (
      <Banner variant="neutral">
        <span className="inline-flex items-center gap-2">
          <Spinner /> Probing the Azure bridge…
        </span>
      </Banner>
    );
  }

  if (error != null || data == null) {
    return (
      <Banner variant="error">
        <p className="font-semibold">Azure bridge unreachable.</p>
        <p>
          Start the dev server on your Windows box (<code className="px-1">npm run dev</code>) so
          the bridge can call <code className="px-1">az</code>.
        </p>
        <RetryButton onClick={() => void refetch()} />
      </Banner>
    );
  }

  if (!data.installed) {
    return (
      <Banner variant="error">
        <p className="font-semibold">Azure CLI not found on the host.</p>
        <p className="mt-1">
          Install it via{' '}
          <code className="px-1">winget install -e --id Microsoft.AzureCLI</code> and restart this
          dev server.
        </p>
        <RetryButton onClick={() => void refetch()} />
      </Banner>
    );
  }

  if (!data.loggedIn) {
    return (
      <Banner variant="warn">
        <p className="font-semibold">
          Azure CLI {data.cliVersion} is installed but you're not signed in.
        </p>
        <p className="mt-1">
          Run <code className="px-1">az login</code> in PowerShell, then click refresh.
        </p>
        <RetryButton onClick={() => void refetch()} />
      </Banner>
    );
  }

  const account = data.account as { name?: string; user?: { name?: string } } | null;
  return (
    <Banner variant="ok">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            Signed in · az {data.cliVersion}
            {data.isWindows ? ' on Windows' : ` on ${data.platform}`}
          </p>
          <p className="truncate text-[11px] text-emerald-800/80">
            {account?.user?.name ?? 'unknown'} · default subscription{' '}
            <span className="font-mono">{account?.name ?? '—'}</span>
          </p>
        </div>
        <RetryButton onClick={() => void refetch()} small />
      </div>
    </Banner>
  );
}

function Banner({
  variant,
  children,
}: {
  variant: 'neutral' | 'ok' | 'warn' | 'error';
  children: React.ReactNode;
}): React.ReactElement {
  const cls =
    variant === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : variant === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : variant === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-900'
          : 'border-slate-200 bg-slate-50 text-slate-700';
  return <div className={`rounded-lg border px-3 py-2 text-xs ${cls}`}>{children}</div>;
}

function Spinner(): React.ReactElement {
  return <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />;
}

function RetryButton({
  onClick,
  small,
}: {
  onClick: () => void;
  small?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-2 inline-flex items-center gap-1 rounded border border-current/30 px-2 py-0.5 text-[11px] font-medium hover:bg-white/40 ${
        small === true ? 'mt-0' : ''
      }`}
    >
      ↻ Refresh
    </button>
  );
}
