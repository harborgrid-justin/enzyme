import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Flag,
  Package,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import { auth, flags } from '@missionfabric-js/enzyme';
import { useItems } from '../api/items';
import { INVENTORY_FLAGS } from '../flags';
import { Metric, Panel } from './PageHeader';
import { OperationsBoard } from './OperationsBoard';

export function Dashboard(): React.ReactElement {
  const { data = [], isLoading } = useItems();
  const { user } = auth.useAuth();
  const flagCtx = flags.useFeatureFlagContext();

  const onHand = data.reduce((sum, item) => sum + item.quantity, 0);
  const inventoryValue = data.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );
  const needsAttention = data.filter(
    (item) => item.status === 'low-stock' || item.status === 'out-of-stock'
  ).length;
  const warehouses = new Set(data.map((item) => item.warehouse)).size;

  return (
    <section className="page-stack">
      <div className="hero-card">
        <div>
          <div className="eyebrow">Enterprise inventory blueprint</div>
          <h2>Run warehouse operations as Enzyme feature modules.</h2>
          <p>
            This example mirrors the CMS demo pattern as a complete inventory management app:
            RBAC-gated stock actions, optimistic adjustments, restock workflow board, feature
            gates for auto-reorder + barcode scan, broadcast-synced filters, and live
            observability — all wired to real framework hooks.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" to="/items">
            Browse items <ChevronRight size={16} />
          </Link>
          <Link className="secondary-button" to="/operations">
            Operations board
          </Link>
        </div>
      </div>

      <div className="metric-grid">
        <Metric
          icon={<Package />}
          label="SKUs tracked"
          value={isLoading ? '…' : data.length.toString()}
          detail="Across active categories"
        />
        <Metric
          icon={<Warehouse />}
          label="Units on hand"
          value={onHand.toLocaleString()}
          detail={`Across ${warehouses} warehouse${warehouses === 1 ? '' : 's'}`}
        />
        <Metric
          icon={<DollarSign />}
          label="Inventory value"
          value={`$${Math.round(inventoryValue).toLocaleString()}`}
          detail="Sum of quantity × unit cost"
        />
        <Metric
          icon={<AlertTriangle />}
          label="Needs attention"
          value={needsAttention.toString()}
          detail="Low or out of stock"
          tone={needsAttention > 0 ? 'warn' : 'success'}
        />
      </div>

      <div className="two-column">
        <Panel title="Stock pipeline" icon={<ClipboardList size={18} />}>
          <OperationsBoard items={data} compact />
          <p className="muted small">
            {data.filter((i) => i.status === 'in-stock').length} healthy ·{' '}
            {data.filter((i) => i.status === 'on-order').length} on order ·{' '}
            {data.filter((i) => i.status === 'discontinued').length} discontinued
          </p>
        </Panel>
        <Panel title="Active capabilities" icon={<Flag size={18} />}>
          <div className="flag-list">
            {Object.entries(flagCtx.flags).map(([flag, enabled]) => (
              <span
                className={`flag-chip ${enabled === true ? 'enabled' : ''}`}
                key={flag}
                title={
                  flag === INVENTORY_FLAGS.AI_FORECASTING
                    ? 'Toggle on the Settings page to reveal the AI forecasting panel'
                    : undefined
                }
              >
                {flag}: {enabled === true ? 'on' : 'off'}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      <div className="hero-card">
        <div>
          <div className="eyebrow">Active identity</div>
          <h2>
            <ShieldCheck size={20} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            {user?.displayName ?? '—'}
          </h2>
          <p>
            Roles: <code>{user?.roles.join(', ') ?? '—'}</code> · Permissions:{' '}
            <code>{user?.permissions.length ?? 0}</code> — actions throughout the app are gated by{' '}
            <code>useAuth().hasPermission</code>.
          </p>
        </div>
      </div>
    </section>
  );
}
