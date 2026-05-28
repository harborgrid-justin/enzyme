import { useMemo } from 'react';
import { Building2, Package, Truck } from 'lucide-react';
import { useItems } from '../api/items';
import { Metric, PageHeader, Panel } from './PageHeader';

interface SupplierSummary {
  id: string;
  name: string;
  skuCount: number;
  unitsOnHand: number;
  onOrder: number;
  inventoryValue: number;
}

export function Suppliers(): React.ReactElement {
  const { data = [] } = useItems();
  const summaries = useMemo<SupplierSummary[]>(() => {
    const byId = new Map<string, SupplierSummary>();
    for (const item of data) {
      const existing = byId.get(item.supplierId) ?? {
        id: item.supplierId,
        name: item.supplierName,
        skuCount: 0,
        unitsOnHand: 0,
        onOrder: 0,
        inventoryValue: 0,
      };
      existing.skuCount += 1;
      existing.unitsOnHand += item.quantity;
      existing.onOrder += item.status === 'on-order' ? 1 : 0;
      existing.inventoryValue += item.quantity * item.unitCost;
      byId.set(item.supplierId, existing);
    }
    return Array.from(byId.values()).sort((a, b) => b.inventoryValue - a.inventoryValue);
  }, [data]);

  const onOrderCount = data.filter((item) => item.status === 'on-order').length;

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Supplier intelligence"
        title="Suppliers and procurement"
        description="A supplier-facing rollup for procurement planning. Aggregations are derived from the same React Query cache the rest of the app reads, so any optimistic mutation updates this page live."
      />
      <div className="metric-grid">
        <Metric icon={<Building2 />} label="Suppliers" value={summaries.length.toString()} detail="Active partners" />
        <Metric
          icon={<Package />}
          label="SKUs covered"
          value={data.length.toString()}
          detail="Across all suppliers"
        />
        <Metric
          icon={<Truck />}
          label="On order"
          value={onOrderCount.toString()}
          detail="Open restock requests"
        />
        <Metric
          icon={<Building2 />}
          label="Total value"
          value={`$${Math.round(
            summaries.reduce((sum, s) => sum + s.inventoryValue, 0)
          ).toLocaleString()}`}
          detail="Quantity × unit cost"
        />
      </div>
      <Panel title="Top suppliers by inventory value" icon={<Truck size={18} />}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>SKUs</th>
              <th>Units on hand</th>
              <th>On order</th>
              <th>Inventory value</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((supplier) => (
              <tr key={supplier.id}>
                <td>{supplier.name}</td>
                <td>{supplier.skuCount}</td>
                <td>{supplier.unitsOnHand.toLocaleString()}</td>
                <td>{supplier.onOrder}</td>
                <td>
                  $
                  {Math.round(supplier.inventoryValue).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}
