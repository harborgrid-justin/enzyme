import { auth } from '@missionfabric-js/enzyme';
import { DEMO_IDENTITIES, initials } from '../users';

/**
 * "Sign in as…" switcher driving enzyme's real auth flow: each click calls
 * `useAuth().login()` against the mock `/auth/login` endpoint, which sets the
 * user + tokens so RBAC gating reflects the selected identity.
 */
export function UserSwitcher(): React.ReactElement {
  const { user, isAuthenticated, isLoading, login, logout } = auth.useAuth();

  async function loginAs(email: string, password: string): Promise<void> {
    if (isAuthenticated) {
      await logout();
    }
    await login({ email, password });
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
          {initials(user.displayName)}
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">{user.displayName}</div>
          <div className="text-[11px] text-slate-500">
            {user.roles.join(', ')} · {user.permissions.length} permissions
          </div>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => void logout()}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-500">Sign in as:</span>
      {DEMO_IDENTITIES.map((identity) => (
        <button
          key={identity.key}
          type="button"
          disabled={isLoading}
          title={identity.blurb}
          onClick={() => void loginAs(identity.user.email, identity.password)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
        >
          {identity.label}
        </button>
      ))}
    </div>
  );
}
