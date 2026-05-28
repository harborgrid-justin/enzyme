import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { flags } from '@missionfabric-js/enzyme';
import { useItems } from '../api/items';
import { useInventoryStore, type StatusFilter } from '../store/inventoryStore';
import type { InventoryItem, StockStatus } from '../types';
import { INVENTORY_FLAGS } from '../flags';
import { PageHeader, Panel } from './PageHeader';

const FILTERS: StatusFilter[] = [
  'all',
  'in-stock',
  'low-stock',
  'on-order',
  'out-of-stock',
  'discontinued',
];

const LABELS: Record<StatusFilter, string> = {
  all: 'all',
  'in-stock': 'in stock',
  'low-stock': 'low stock',
  'on-order': 'on order',
  'out-of-stock': 'out of stock',
  discontinued: 'discontinued',
};

export function ItemIndex(): React.ReactElement {
  const { data = [], isLoading } = useItems();
  const statusFilter = useInventoryStore((s) => s.statusFilter);
  const setStatusFilter = useInventoryStore((s) => s.setStatusFilter);
  const warehouseFilter = useInventoryStore((s) => s.warehouseFilter);
  const setWarehouseFilter = useInventoryStore((s) => s.setWarehouseFilter);
  const multiWarehouseEnabled = flags.useFeatureFlag(INVENTORY_FLAGS.MULTI_WAREHOUSE);

  const warehouses = useMemo(() => {
    const set = new Set(data.map((item) => item.warehouse));
    return ['all', ...Array.from(set).sort()];
  }, [data]);

  const visible = useMemo(
    () =>
      data.filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (multiWarehouseEnabled && warehouseFilter !== 'all' && item.warehouse !== warehouseFilter)
          return false;
        return true;
      }),
    [data, statusFilter, warehouseFilter, multiWarehouseEnabled]
  );

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Item registry"
        title="Inventory"
        description="A typed SKU registry backed by query caching and Enzyme-style feature boundaries. Status and warehouse filters are mirrored across browser tabs via `state.useBroadcastSync`."
      />
      <div className="toolbar" role="tablist" aria-label="Status filter">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={statusFilter === status}
            className={statusFilter === status ? 'selected' : ''}
            onClick={() => setStatusFilter(status)}
          >
            {LABELS[status]}
            <span className="count">
              {status === 'all'
                ? data.length
                : data.filter((e) => e.status === (status as StockStatus)).length}
            </span>
          </button>
        ))}
      </div>
      {multiWarehouseEnabled && (
        <div className="toolbar" role="tablist" aria-label="Warehouse filter">
          {warehouses.map((wh) => (
            <button
              key={wh}
              type="button"
              role="tab"
              aria-selected={warehouseFilter === wh}
              className={warehouseFilter === wh ? 'selected' : ''}
              onClick={() => setWarehouseFilter(wh)}
            >
              {wh === 'all' ? 'all warehouses' : wh}
              <span className="count">
                {wh === 'all' ? data.length : data.filter((e) => e.warehouse === wh).length}
              </span>
            </button>
          ))}
        </div>
      )}
      {isLoading ? (
        <Panel title="Loading inventory" icon={<Activity size={18} />}>
          <p>Fetching items through enzyme's `useApiRequest`.</p>
        </Panel>
      ) : visible.length === 0 ? (
        <Panel title="No items" icon={<Activity size={18} />}>
          <p className="muted">No items match the current filter.</p>
        </Panel>
      ) : (
        <div className="content-grid">
          {visible.map((item) => (
            <ItemCard item={item} key={item.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function ItemCard({ item }: { item: InventoryItem }): React.ReactElement {
  return (
    <Link className="content-card" to={`/items/${item.id}`}>
      <div className="card-header-row">
        <span className={`status-pill ${item.status}`}>{LABELS[item.status]}</span>
        <span className="muted small">{item.category}</span>
      </div>
      <h3>{item.name}</h3>
      <p>
        {item.description.slice(0, 140)}
        {item.description.length > 140 ? '…' : ''}
      </p>
      <div className="tag-row">
        {item.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <div className="card-footer-row">
        <span>
          {item.warehouse} · {item.location}
        </span>
        <span>
          {item.quantity} on hand · ${item.unitCost}
        </span>
      </div>
      <div className="card-footer-row">
        <span>SKU {item.sku}</span>
        <span>Reorder at {item.reorderLevel}</span>
      </div>
    </Link>
  );
}
