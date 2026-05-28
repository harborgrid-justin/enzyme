import { auth } from '@missionfabric-js/enzyme';
import { Sparkles } from 'lucide-react';
import { DEMO_IDENTITIES } from '../users';

/**
 * Pre-auth gate. The demo "log in as…" buttons drive enzyme's real auth flow
 * (`useAuth().login()` -> mock `/auth/login`), so RBAC gating downstream reflects
 * the chosen identity.
 */
export function LoginScreen(): React.ReactElement {
  const { login, isLoading, error } = auth.useAuth();

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <Sparkles size={28} />
          <span>Enzyme CMS</span>
        </div>
        <h1>Composable publishing operations</h1>
        <p>
          A demo CMS built on the <code>@missionfabric-js/enzyme</code> framework. Sign in as one
          of the canned identities below to see role-gated workflow actions, optimistic publish,
          live preview, audit stream, and Web Vitals — all wired to real framework hooks.
        </p>
        <div className="login-identities">
          {DEMO_IDENTITIES.map((identity) => (
            <button
              key={identity.key}
              type="button"
              disabled={isLoading}
              onClick={() =>
                void login({ email: identity.user.email, password: identity.password })
              }
              className="login-identity"
            >
              <div className="login-identity-row">
                <strong>{identity.label}</strong>
                <code>{identity.user.email}</code>
              </div>
              <span>{identity.blurb}</span>
            </button>
          ))}
        </div>
        {error != null && <p className="login-error">{error}</p>}
        <p className="muted">
          Client-side RBAC here is UX only — a real deployment must enforce permissions on the
          server.
        </p>
      </div>
    </div>
  );
}
