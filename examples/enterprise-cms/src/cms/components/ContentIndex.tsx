import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useEntries } from '../api/entries';
import { useCmsStore, type StatusFilter } from '../store/cmsStore';
import type { CmsEntry } from '../types';
import { PageHeader, Panel } from './PageHeader';

const FILTERS: StatusFilter[] = ['all', 'draft', 'review', 'scheduled', 'published', 'archived'];

export function ContentIndex(): React.ReactElement {
  const { data = [], isLoading } = useEntries();
  const filter = useCmsStore((s) => s.statusFilter);
  const setFilter = useCmsStore((s) => s.setStatusFilter);

  const visible = useMemo(
    () => (filter === 'all' ? data : data.filter((entry) => entry.status === filter)),
    [data, filter]
  );

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Content registry"
        title="Entries"
        description="A typed content registry backed by query caching and Enzyme-style feature boundaries. Filter state is mirrored across browser tabs via `state.useBroadcastSync`."
      />
      <div className="toolbar" role="tablist" aria-label="Status filter">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={filter === status}
            className={filter === status ? 'selected' : ''}
            onClick={() => setFilter(status)}
          >
            {status}
            <span className="count">
              {status === 'all' ? data.length : data.filter((e) => e.status === status).length}
            </span>
          </button>
        ))}
      </div>
      {isLoading ? (
        <Panel title="Loading content" icon={<Activity size={18} />}>
          <p>Fetching entries through enzyme's `useApiRequest`.</p>
        </Panel>
      ) : visible.length === 0 ? (
        <Panel title="No entries" icon={<Activity size={18} />}>
          <p className="muted">No entries match the current filter.</p>
        </Panel>
      ) : (
        <div className="content-grid">
          {visible.map((entry) => (
            <ContentCard entry={entry} key={entry.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function ContentCard({ entry }: { entry: CmsEntry }): React.ReactElement {
  return (
    <Link className="content-card" to={`/content/${entry.id}`}>
      <div className="card-header-row">
        <span className={`status-pill ${entry.status}`}>{entry.status}</span>
        <span className="muted small">{entry.type}</span>
      </div>
      <h3>{entry.title}</h3>
      <p>{entry.body.slice(0, 140)}{entry.body.length > 140 ? '…' : ''}</p>
      <div className="tag-row">
        {entry.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <div className="card-footer-row">
        <span>{entry.authorName}</span>
        <span>{entry.seoScore}% SEO</span>
      </div>
    </Link>
  );
}
