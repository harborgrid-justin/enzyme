import { auth } from '@missionfabric-js/enzyme';
import { initials } from '../users';

/** Active-identity badge with sign-out, backed by enzyme's auth flow. */
export function UserMenu(): React.ReactElement | null {
  const { user, isAuthenticated, logout, isLoading } = auth.useAuth();
  if (!isAuthenticated || !user) return null;

  return (
    <div className="user-menu">
      <div className="user-meta">
        <div className="user-name">{user.displayName}</div>
        <div className="user-role">
          {user.roles.join(', ')} · {user.permissions.length} perms
        </div>
      </div>
      <span className="avatar" title={user.displayName}>
        {initials(user.displayName)}
      </span>
      <button
        type="button"
        className="ghost-button"
        disabled={isLoading}
        onClick={() => void logout()}
      >
        Sign out
      </button>
    </div>
  );
}
