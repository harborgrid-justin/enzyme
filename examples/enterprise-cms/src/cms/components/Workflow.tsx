import { useEntries } from '../api/entries';
import { PageHeader } from './PageHeader';
import { WorkflowBoard } from './WorkflowBoard';

export function Workflow(): React.ReactElement {
  const { data = [] } = useEntries();
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Workflow orchestration"
        title="Editorial review board"
        description="Workflow state is modeled as a CMS workflow with RBAC-gated transitions and optimistic mutations. Permitted actions are determined by enzyme's `useAuth().hasPermission`."
      />
      <WorkflowBoard entries={data} />
    </section>
  );
}
