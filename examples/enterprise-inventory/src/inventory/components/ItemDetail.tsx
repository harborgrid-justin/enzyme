import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Barcode,
  Boxes,
  ClipboardCheck,
  Eye,
  Lock,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { auth, flags, security } from '@missionfabric-js/enzyme';
import {
  useAdjustItemStock,
  useItem,
  useUpdateItemDetails,
  useUpdateItemStatus,
} from '../api/items';
import { INVENTORY_PERMISSIONS, type StockStatus } from '../types';
import { INVENTORY_FLAGS } from '../flags';
import { useInventoryStore } from '../store/inventoryStore';
import { PageHeader, Panel } from './PageHeader';

const STATUS_LABEL: Record<StockStatus, string> = {
  'in-stock': 'in stock',
  'low-stock': 'low stock',
  'on-order': 'on order',
  'out-of-stock': 'out of stock',
  discontinued: 'discontinued',
};

export function ItemDetail(): React.ReactElement {
  const { id = '' } = useParams();
  const { data: item, isLoading, error } = useItem(id);
  const { hasPermission } = auth.useAuth();
  const pushAudit = useInventoryStore((s) => s.pushAuditEvent);
  const autoReorderEnabled = flags.useFeatureFlag(INVENTORY_FLAGS.AUTO_REORDER);
  const barcodeScanEnabled = flags.useFeatureFlag(INVENTORY_FLAGS.BARCODE_SCAN);
  const aiForecastingEnabled = flags.useFeatureFlag(INVENTORY_FLAGS.AI_FORECASTING);

  const updateStatus = useUpdateItemStatus(id);
  const updateDetails = useUpdateItemDetails(id);
  const adjustStock = useAdjustItemStock(id);

  const canUpdate = hasPermission(INVENTORY_PERMISSIONS.UPDATE);
  const canAdjust = hasPermission(INVENTORY_PERMISSIONS.ADJUST_STOCK);
  const canOrder = hasPermission(INVENTORY_PERMISSIONS.ORDER);
  const canDiscontinue = hasPermission(INVENTORY_PERMISSIONS.DISCONTINUE);

  const [draftDescription, setDraftDescription] = useState<string | null>(null);
  const [draftReorder, setDraftReorder] = useState<number | null>(null);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Cycle count');

  // Reset draft when navigating between items.
  useEffect(() => {
    setDraftDescription(null);
    setDraftReorder(null);
    setAdjustDelta(0);
    setAdjustReason('Cycle count');
  }, [id]);

  if (isLoading && !item) {
    return (
      <section className="page-stack">
        <PageHeader
          eyebrow="Item detail"
          title="Loading item"
          description="Hydrating SKU record through enzyme's API hook."
        />
      </section>
    );
  }
  if (error || !item) {
    return (
      <section className="page-stack">
        <PageHeader
          eyebrow="Item detail"
          title="Not found"
          description="The requested SKU does not exist or has been removed."
        />
      </section>
    );
  }

  const effectiveDescription = draftDescription ?? item.description;
  const effectiveReorder = draftReorder ?? item.reorderLevel;
  const isDirty =
    (draftDescription !== null && draftDescription !== item.description) ||
    (draftReorder !== null && draftReorder !== item.reorderLevel);

  function transition(status: StockStatus, expectedRestockAt?: string): void {
    if (!item) return;
    updateStatus.mutate({
      body: { status, expectedRestockAt },
      pathParams: { id },
    });
    pushAudit(
      `Status: ${item.sku} -> ${status}${expectedRestockAt ? ` (ETA ${expectedRestockAt})` : ''}`
    );
  }

  function saveDetails(): void {
    if (!isDirty) return;
    updateDetails.mutate({
      body: {
        description: effectiveDescription,
        reorderLevel: effectiveReorder,
      },
      pathParams: { id },
    });
    pushAudit(`Details: ${item?.sku} updated (reorder ${effectiveReorder})`);
    setDraftDescription(null);
    setDraftReorder(null);
  }

  function applyAdjust(): void {
    if (adjustDelta === 0 || !canAdjust || !item) return;
    adjustStock.mutate({
      body: { delta: adjustDelta, reason: adjustReason },
      pathParams: { id },
    });
    pushAudit(
      `Stock: ${item.sku} ${adjustDelta > 0 ? '+' : ''}${adjustDelta} (${adjustReason})`
    );
    setAdjustDelta(0);
  }

  function placeRestockOrder(): void {
    if (!item) return;
    const eta = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    transition('on-order', eta);
  }

  function markInStock(): void {
    transition('in-stock');
  }

  function discontinue(): void {
    transition('discontinued');
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={`${item.category} · SKU ${item.sku}`}
        title={item.name}
        description={`Owner: ${item.owner} · ${item.warehouse} · ${item.location} · Updated ${new Date(item.updatedAt).toLocaleString()}`}
      />

      <div className="metric-grid">
        <SmallMetric label="On hand" value={item.quantity.toLocaleString()} />
        <SmallMetric label="Reorder level" value={item.reorderLevel.toLocaleString()} />
        <SmallMetric label="Unit cost" value={`$${item.unitCost.toFixed(2)}`} />
        <SmallMetric label="Retail price" value={`$${item.retailPrice.toFixed(2)}`} />
      </div>

      <div className="two-column detail-grid">
        <Panel title="Details" icon={<PenLine size={18} />}>
          <label className="field-label">
            <span>Description</span>
            <textarea
              className="editor-textarea"
              value={effectiveDescription}
              disabled={!canUpdate}
              onChange={(event) => setDraftDescription(event.target.value)}
              rows={6}
              spellCheck={false}
              aria-label="Item description"
            />
          </label>
          <label className="field-label">
            <span>Reorder threshold</span>
            <input
              type="number"
              min={0}
              className="number-input"
              value={effectiveReorder}
              disabled={!canUpdate}
              onChange={(event) =>
                setDraftReorder(Math.max(0, Number(event.target.value) || 0))
              }
              aria-label="Reorder threshold"
            />
          </label>
          <div className="editor-actions">
            <button
              type="button"
              className="primary-button"
              disabled={!canUpdate || !isDirty || updateDetails.isPending}
              onClick={saveDetails}
            >
              {updateDetails.isPending ? 'Saving…' : 'Save details'}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={!isDirty}
              onClick={() => {
                setDraftDescription(null);
                setDraftReorder(null);
              }}
            >
              Discard
            </button>
            {!canUpdate && (
              <span className="muted small">Updating requires buyer permission.</span>
            )}
          </div>
        </Panel>

        <Panel title="Governance" icon={<Lock size={18} />}>
          <dl className="metadata-list">
            <div>
              <dt>SKU</dt>
              <dd>{item.sku}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-pill ${item.status}`}>{STATUS_LABEL[item.status]}</span>
              </dd>
            </div>
            <div>
              <dt>Supplier</dt>
              <dd>{item.supplierName}</dd>
            </div>
            <div>
              <dt>Last restocked</dt>
              <dd>{new Date(item.lastRestockedAt).toLocaleDateString()}</dd>
            </div>
            {item.expectedRestockAt && (
              <div>
                <dt>Expected restock</dt>
                <dd>{new Date(item.expectedRestockAt).toLocaleDateString()}</dd>
              </div>
            )}
            <div>
              <dt>Margin</dt>
              <dd>
                {item.retailPrice > 0
                  ? `${Math.round(((item.retailPrice - item.unitCost) / item.retailPrice) * 100)}%`
                  : '—'}
              </dd>
            </div>
          </dl>

          <div className="action-stack">
            <button
              type="button"
              className="secondary-button"
              disabled={
                !canOrder ||
                updateStatus.isPending ||
                item.status === 'on-order' ||
                item.status === 'discontinued'
              }
              onClick={placeRestockOrder}
              title={
                autoReorderEnabled
                  ? 'Submit a restock order (auto-reorder ETA in 5 days)'
                  : 'Submit a restock order'
              }
            >
              Place restock order
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={
                !canOrder || updateStatus.isPending || item.status === 'in-stock'
              }
              onClick={markInStock}
            >
              {updateStatus.isPending ? 'Updating…' : 'Mark in stock'}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={
                !canDiscontinue || updateStatus.isPending || item.status === 'discontinued'
              }
              onClick={discontinue}
            >
              Discontinue SKU
            </button>
            {!canOrder && (
              <p className="muted small">Procurement actions require buyer or manager role.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="two-column detail-grid">
        <Panel title="Stock adjustment" icon={<ClipboardCheck size={18} />}>
          {!canAdjust && (
            <p className="muted small">
              Stock adjustments require the picker role or higher.
            </p>
          )}
          <div className="adjust-grid">
            <label className="field-label">
              <span>Quantity delta</span>
              <input
                type="number"
                className="number-input"
                value={adjustDelta}
                disabled={!canAdjust}
                onChange={(event) => setAdjustDelta(Number(event.target.value) || 0)}
                aria-label="Quantity delta"
              />
            </label>
            <label className="field-label">
              <span>Reason</span>
              <input
                type="text"
                className="text-input"
                value={adjustReason}
                disabled={!canAdjust}
                onChange={(event) => setAdjustReason(event.target.value)}
                placeholder="Cycle count, pick, receipt, damage…"
                aria-label="Reason"
              />
            </label>
          </div>
          <div className="editor-actions">
            <button
              type="button"
              className="ghost-button"
              disabled={!canAdjust || adjustStock.isPending}
              onClick={() => setAdjustDelta((d) => d - 1)}
            >
              − 1
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={!canAdjust || adjustStock.isPending}
              onClick={() => setAdjustDelta((d) => d + 1)}
            >
              + 1
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={!canAdjust || adjustStock.isPending}
              onClick={() => setAdjustDelta((d) => d + 10)}
            >
              + 10
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!canAdjust || adjustDelta === 0 || adjustStock.isPending}
              onClick={applyAdjust}
            >
              {adjustStock.isPending
                ? 'Applying…'
                : adjustDelta > 0
                  ? `Receive ${adjustDelta}`
                  : adjustDelta < 0
                    ? `Pick ${Math.abs(adjustDelta)}`
                    : 'Apply'}
            </button>
          </div>
          <p className="muted small">
            Adjustments mutate quantity through enzyme's <code>useApiMutation</code> with
            optimistic cache updates — the badge above flips instantly and the audit log records
            the transaction.
          </p>
        </Panel>

        <Panel title="Safe label preview" icon={<Eye size={18} />}>
          <p className="muted small">
            Rendered through <code>security.useSafeText</code> — paste a script tag into the
            description and watch it round-trip as inert text.
          </p>
          <SafePreview
            sku={item.sku}
            name={item.name}
            description={effectiveDescription}
            tags={item.tags}
          />
        </Panel>
      </div>

      {barcodeScanEnabled && (
        <Panel title="Barcode helper" icon={<Barcode size={18} />}>
          <div className="barcode-card">
            <code className="barcode-strip" aria-hidden="true">
              {item.sku.split('').join(' ')}
            </code>
            <p className="muted small">
              Behind the <code>{INVENTORY_FLAGS.BARCODE_SCAN}</code> flag — a real deployment
              would replace this with a camera scanner that submits stock deltas above.
            </p>
          </div>
        </Panel>
      )}

      {aiForecastingEnabled && (
        <Panel title="Demand forecasting (beta)" icon={<Sparkles size={18} />}>
          <p className="muted small">
            Behind the <code>{INVENTORY_FLAGS.AI_FORECASTING}</code> flag — toggle on Settings.
          </p>
          <ul className="ai-suggestions">
            <li>
              Expected weekly demand: <strong>{Math.max(1, Math.round(item.quantity / 8))}</strong>{' '}
              units (based on category {item.category}).
            </li>
            <li>
              Recommended reorder level: <strong>{Math.max(item.reorderLevel, 12)}</strong> — adjust above to
              align with the model.
            </li>
            <li>
              Forecast tags: {item.tags.slice(0, 2).join(', ') || '—'}
            </li>
          </ul>
        </Panel>
      )}

      <Panel title="Footprint" icon={<Boxes size={18} />}>
        <p className="muted small">
          On hand × unit cost ={' '}
          <strong>
            $
            {(item.quantity * item.unitCost).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </strong>{' '}
          tied up in this SKU.
        </p>
      </Panel>
    </section>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="metric-card compact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/**
 * Renders the editable description through enzyme's `useSafeText`, which
 * HTML-entity-encodes any user-authored markup. Try pasting
 * `<script>alert(1)</script>` into the description — it round-trips as inert text.
 */
function SafePreview({
  sku,
  name,
  description,
  tags,
}: {
  sku: string;
  name: string;
  description: string;
  tags: string[];
}): React.ReactElement {
  const safeDescription = security.useSafeText(description);
  return (
    <article className="preview-surface">
      <div className="eyebrow">SKU {sku}</div>
      <h2>{name}</h2>
      <p>{safeDescription}</p>
      <div className="tag-row">
        {tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
    </article>
  );
}
