import { Link } from 'react-router-dom';
import type { InventoryItem, StockStatus } from '../types';

const COLUMNS: StockStatus[] = ['in-stock', 'low-stock', 'on-order', 'out-of-stock'];

const LABELS: Record<StockStatus, string> = {
  'in-stock': 'in stock',
  'low-stock': 'low stock',
  'on-order': 'on order',
  'out-of-stock': 'out of stock',
  discontinued: 'discontinued',
};

export function OperationsBoard({
  items,
  compact = false,
}: {
  items: InventoryItem[];
  compact?: boolean;
}): React.ReactElement {
  return (
    <div className={compact ? 'workflow-board compact' : 'workflow-board'}>
      {COLUMNS.map((status) => {
        const visible = items.filter((item) => item.status === status);
        return (
          <div className="workflow-column" key={status}>
            <h3>
              <span className={`status-dot ${status}`} />
              {LABELS[status]}
              <span className="count">{visible.length}</span>
            </h3>
            {visible.length === 0 ? (
              <p className="muted small">No items</p>
            ) : (
              visible.map((item) => (
                <Link to={`/items/${item.id}`} className="workflow-card" key={item.id}>
                  <strong>{item.name}</strong>
                  <span>
                    {item.warehouse} · {item.quantity} on hand
                  </span>
                </Link>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
