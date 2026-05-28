import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, Lock, PenLine, Sparkles } from 'lucide-react';
import { auth, flags, security } from '@missionfabric-js/enzyme';
import { useEntry, useUpdateEntryBody, useUpdateEntryStatus } from '../api/entries';
import { CMS_PERMISSIONS, type WorkflowStatus } from '../types';
import { CMS_FLAGS } from '../flags';
import { useCmsStore } from '../store/cmsStore';
import { PageHeader, Panel } from './PageHeader';

export function ContentDetail(): React.ReactElement {
  const { id = '' } = useParams();
  const { data: entry, isLoading, error } = useEntry(id);
  const { hasPermission } = auth.useAuth();
  const pushAudit = useCmsStore((s) => s.pushAuditEvent);
  const livePreviewEnabled = flags.useFeatureFlag(CMS_FLAGS.LIVE_PREVIEW);
  const schedulingEnabled = flags.useFeatureFlag(CMS_FLAGS.SCHEDULED_PUBLISHING);

  const updateStatus = useUpdateEntryStatus(id);
  const updateBody = useUpdateEntryBody(id);

  const canUpdate = hasPermission(CMS_PERMISSIONS.UPDATE);
  const canPublish = hasPermission(CMS_PERMISSIONS.PUBLISH);
  const canArchive = hasPermission(CMS_PERMISSIONS.ARCHIVE);

  const [draftBody, setDraftBody] = useState<string | null>(null);

  if (isLoading && !entry) {
    return (
      <PageHeader
        eyebrow="Content detail"
        title="Loading entry"
        description="Hydrating content record through enzyme's API hook."
      />
    );
  }
  if (error || !entry) {
    return (
      <PageHeader
        eyebrow="Content detail"
        title="Not found"
        description="The requested CMS entry does not exist or has been archived."
      />
    );
  }

  const effectiveBody = draftBody ?? entry.body;
  const isDirty = draftBody !== null && draftBody !== entry.body;

  function transition(status: WorkflowStatus, publishAt?: string): void {
    updateStatus.mutate({ body: { status, publishAt }, pathParams: { id } });
    pushAudit(`Workflow: ${entry?.id} -> ${status}${publishAt ? ` (at ${publishAt})` : ''}`);
  }

  function saveBody(): void {
    if (!isDirty || draftBody === null) return;
    updateBody.mutate({ body: { body: draftBody }, pathParams: { id } });
    pushAudit(`Body edit: ${entry?.id} (${draftBody.length} chars)`);
    setDraftBody(null);
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={entry.type}
        title={entry.title}
        description={`Owner: ${entry.owner} · Channel: ${entry.channel} · Updated ${new Date(entry.updatedAt).toLocaleString()}`}
      />

      <div className="two-column detail-grid">
        <Panel title="Editor" icon={<PenLine size={18} />}>
          <textarea
            className="editor-textarea"
            value={effectiveBody}
            disabled={!canUpdate}
            onChange={(event) => setDraftBody(event.target.value)}
            rows={12}
            spellCheck={false}
            aria-label="Entry body"
          />
          <div className="editor-actions">
            <button
              type="button"
              className="primary-button"
              disabled={!canUpdate || !isDirty || updateBody.isPending}
              onClick={saveBody}
            >
              {updateBody.isPending ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={!isDirty}
              onClick={() => setDraftBody(null)}
            >
              Discard
            </button>
            {!canUpdate && <span className="muted small">Updating requires editor permission.</span>}
          </div>
        </Panel>

        <Panel title="Governance" icon={<Lock size={18} />}>
          <dl className="metadata-list">
            <div>
              <dt>Slug</dt>
              <dd>{entry.slug}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-pill ${entry.status}`}>{entry.status}</span>
              </dd>
            </div>
            <div>
              <dt>Author</dt>
              <dd>{entry.authorName}</dd>
            </div>
            {entry.publishAt && (
              <div>
                <dt>Publishes at</dt>
                <dd>{new Date(entry.publishAt).toLocaleString()}</dd>
              </div>
            )}
            <div>
              <dt>SEO score</dt>
              <dd>{entry.seoScore}%</dd>
            </div>
          </dl>

          <div className="action-stack">
            <button
              type="button"
              className="secondary-button"
              disabled={!canUpdate || updateStatus.isPending || entry.status === 'review'}
              onClick={() => transition('review')}
            >
              Send to review
            </button>
            {schedulingEnabled && (
              <button
                type="button"
                className="secondary-button"
                disabled={!canPublish || updateStatus.isPending}
                onClick={() => {
                  const at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                  transition('scheduled', at);
                }}
              >
                Schedule (+7 days)
              </button>
            )}
            <button
              type="button"
              className="primary-button"
              disabled={!canPublish || updateStatus.isPending || entry.status === 'published'}
              onClick={() => transition('published')}
            >
              {updateStatus.isPending ? 'Publishing…' : 'Publish now'}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={!canArchive || updateStatus.isPending || entry.status === 'archived'}
              onClick={() => transition('archived')}
            >
              Archive
            </button>
            {!canPublish && (
              <p className="muted small">Publishing requires the admin role.</p>
            )}
          </div>
        </Panel>
      </div>

      {livePreviewEnabled && (
        <Panel title="Live preview" icon={<Eye size={18} />}>
          <SafePreview body={effectiveBody} title={entry.title} tags={entry.tags} />
        </Panel>
      )}

      {flags.useFeatureFlag(CMS_FLAGS.AI_ASSIST) && (
        <Panel title="AI assist (beta)" icon={<Sparkles size={18} />}>
          <p className="muted small">
            Behind the <code>{CMS_FLAGS.AI_ASSIST}</code> flag — toggle on Settings to enable.
            Suggestions appear inline as you type.
          </p>
          <ul className="ai-suggestions">
            <li>Tighten the opening — lead with the customer outcome.</li>
            <li>Add a metric. Current draft has 0 numeric claims.</li>
            <li>Suggested tags: {entry.tags.slice(0, 2).join(', ') || '—'}</li>
          </ul>
        </Panel>
      )}
    </section>
  );
}

/**
 * Renders the entry body through enzyme's `useSafeText`, which HTML-entity-encodes
 * any user-authored markup. Try pasting `<script>alert(1)</script>` into the
 * editor — it round-trips as inert text.
 */
function SafePreview({
  title,
  body,
  tags,
}: {
  title: string;
  body: string;
  tags: string[];
}): React.ReactElement {
  const safeBody = security.useSafeText(body);
  return (
    <article className="preview-surface">
      <h2>{title}</h2>
      <p>{safeBody}</p>
      <div className="tag-row">
        {tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
    </article>
  );
}
