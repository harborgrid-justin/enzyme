import { useItems } from '../api/items';
import { PageHeader } from './PageHeader';
import { OperationsBoard } from './OperationsBoard';

export function Operations(): React.ReactElement {
  const { data = [] } = useItems();
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Operations orchestration"
        title="Stock health board"
        description="Pipeline of items grouped by health. RBAC-gated transitions (place restock order, discontinue) live in each item's detail view; permitted actions are determined by enzyme's `useAuth().hasPermission`."
      />
      <OperationsBoard items={data} />
    </section>
  );
}
