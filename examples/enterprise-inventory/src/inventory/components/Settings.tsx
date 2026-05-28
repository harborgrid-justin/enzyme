import { Activity, Flag } from 'lucide-react';
import { auth, flags, monitoring } from '@missionfabric-js/enzyme';
import { useInventoryStore } from '../store/inventoryStore';
import { INVENTORY_PERMISSIONS } from '../types';
import { PageHeader, Panel } from './PageHeader';
import { MetricsPanel } from './MetricsPanel';
import { ErrorProne } from './ErrorProne';

function errorFallback(
  error: { message: string },
  reset: () => void
): React.ReactElement {
  return (
    <div className="error-fallback">
      <p>
        <strong>Something broke:</strong> {error.message}
      </p>
      <button type="button" onClick={reset} className="primary-button">
        Recover
      </button>
    </div>
  );
}

export function Settings(): React.ReactElement {
  const { hasPermission } = auth.useAuth();
  const flagCtx = flags.useFeatureFlagContext();
  const auditEvents = useInventoryStore((s) => s.auditEvents);
  const canManage = hasPermission(INVENTORY_PERMISSIONS.MANAGE_SETTINGS);

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="System settings"
        title="Framework controls"
        description="Toggle inventory capabilities and inspect audit events. Feature-flag changes apply instantly via enzyme's `FeatureFlagProvider.setFlag`."
      />

      <div className="two-column">
        <Panel title="Feature flags" icon={<Flag size={18} />}>
          {!canManage && (
            <p className="muted small">
              Read-only — managing flags requires the manager role.
            </p>
          )}
          <div className="settings-list">
            {Object.entries(flagCtx.flags).map(([flag, enabled]) => (
              <label className="setting-row" key={flag}>
                <span>{flag}</span>
                <input
                  type="checkbox"
                  checked={enabled === true}
                  disabled={!canManage}
                  onChange={() => flagCtx.setFlag(flag, !(enabled === true))}
                />
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Audit stream" icon={<Activity size={18} />}>
          <ul className="audit-list">
            {auditEvents.map((event) => (
              <li key={event.id}>
                <span className="audit-time">
                  {new Date(event.at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="audit-msg">{event.message}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="two-column">
        <MetricsPanel />
        <Panel title="Error boundary" icon={<Activity size={18} />}>
          <p className="muted small">
            The button below throws on render. <code>monitoring.ErrorBoundary</code> catches it
            without taking down the rest of the page.
          </p>
          <monitoring.ErrorBoundary fallback={errorFallback}>
            <ErrorProne />
          </monitoring.ErrorBoundary>
        </Panel>
      </div>
    </section>
  );
}
