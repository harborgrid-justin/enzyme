import { Link } from 'react-router-dom';
import type { CmsEntry, WorkflowStatus } from '../types';

const COLUMNS: WorkflowStatus[] = ['draft', 'review', 'scheduled', 'published'];

export function WorkflowBoard({
  entries,
  compact = false,
}: {
  entries: CmsEntry[];
  compact?: boolean;
}): React.ReactElement {
  return (
    <div className={compact ? 'workflow-board compact' : 'workflow-board'}>
      {COLUMNS.map((status) => {
        const items = entries.filter((entry) => entry.status === status);
        return (
          <div className="workflow-column" key={status}>
            <h3>
              <span className={`status-dot ${status}`} />
              {status}
              <span className="count">{items.length}</span>
            </h3>
            {items.length === 0 ? (
              <p className="muted small">No entries</p>
            ) : (
              items.map((entry) => (
                <Link to={`/content/${entry.id}`} className="workflow-card" key={entry.id}>
                  <strong>{entry.title}</strong>
                  <span>
                    {entry.owner} · {entry.type}
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
