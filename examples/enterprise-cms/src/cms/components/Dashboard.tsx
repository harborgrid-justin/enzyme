import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Eye,
  FileText,
  Flag,
  Rocket,
  ShieldCheck,
  CalendarClock,
} from 'lucide-react';
import { auth, flags } from '@missionfabric-js/enzyme';
import { useEntries } from '../api/entries';
import { CMS_FLAGS } from '../flags';
import { Metric, Panel } from './PageHeader';
import { WorkflowBoard } from './WorkflowBoard';

export function Dashboard(): React.ReactElement {
  const { data = [], isLoading } = useEntries();
  const { user } = auth.useAuth();
  const flagCtx = flags.useFeatureFlagContext();
  const totalViews = data.reduce((sum, entry) => sum + entry.views, 0);
  const totalConversions = data.reduce((sum, entry) => sum + entry.conversions, 0);
  const liveEntries = data.filter((e) => e.status === 'published').length;

  return (
    <section className="page-stack">
      <div className="hero-card">
        <div>
          <div className="eyebrow">Enterprise CMS blueprint</div>
          <h2>Build editorial systems as Enzyme feature modules.</h2>
          <p>
            This example mirrors the chat demo pattern as a complete app: guarded actions,
            cached entries, optimistic publish, feature gates, audit state, and operational
            observability — all wired to real framework hooks.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" to="/content">
            Manage content <ChevronRight size={16} />
          </Link>
          <Link className="secondary-button" to="/workflow">
            Review workflow
          </Link>
        </div>
      </div>

      <div className="metric-grid">
        <Metric
          icon={<FileText />}
          label="Entries"
          value={isLoading ? '…' : data.length.toString()}
          detail="Across 4 content types"
        />
        <Metric
          icon={<Eye />}
          label="Views"
          value={totalViews.toLocaleString()}
          detail="Across channels"
        />
        <Metric
          icon={<Rocket />}
          label="Conversions"
          value={totalConversions.toLocaleString()}
          detail="Attributed actions"
        />
        <Metric
          icon={<ShieldCheck />}
          label="Role"
          value={user?.roles.join(', ') ?? '—'}
          detail={`${user?.permissions.length ?? 0} permissions`}
        />
      </div>

      <div className="two-column">
        <Panel title="Publishing pipeline" icon={<CalendarClock size={18} />}>
          <WorkflowBoard entries={data} compact />
          <p className="muted small">
            {liveEntries} live · {data.length - liveEntries} in pipeline
          </p>
        </Panel>
        <Panel title="Enabled framework capabilities" icon={<Flag size={18} />}>
          <div className="flag-list">
            {Object.entries(flagCtx.flags).map(([flag, enabled]) => (
              <span
                className={`flag-chip ${enabled === true ? 'enabled' : ''}`}
                key={flag}
                title={
                  flag === CMS_FLAGS.AI_ASSIST
                    ? 'Toggle on the Settings page to reveal the AI assist panel'
                    : undefined
                }
              >
                {flag}: {enabled === true ? 'on' : 'off'}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
