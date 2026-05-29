import { useState } from 'react';
import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card, TextArea } from '../ui';
import { revisionDelta } from '../lib/content';
import { toast } from '../../ui/toast';

/** Feature #42 — content versioning / CMS with revision history. */
export function CmsPanel(): React.ReactElement {
  const content = useAdvancedStore((s) => s.content);
  const reviseContent = useAdvancedStore((s) => s.reviseContent);
  const publishContent = useAdvancedStore((s) => s.publishContent);
  const [activeId, setActiveId] = useState(content[0]?.id ?? '');
  const entry = content.find((c) => c.id === activeId) ?? content[0]!;
  const [draft, setDraft] = useState(entry.body);

  function selectEntry(id: string): void {
    setActiveId(id);
    setDraft(content.find((c) => c.id === id)?.body ?? '');
  }

  const delta = revisionDelta(entry.body, draft);
  const dirty = draft !== entry.body;

  return (
    <div className="space-y-4">
      <SectionHeader title="Content (CMS)" subtitle="Versioned content entries with publish workflow" />
      <div className="flex flex-wrap gap-2">
        {content.map((c) => (
          <Btn key={c.id} variant={c.id === entry.id ? 'primary' : 'ghost'} onClick={() => selectEntry(c.id)}>
            {c.title}
          </Btn>
        ))}
      </div>
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">{entry.title}</span>
          <Badge tone={entry.status === 'published' ? 'emerald' : 'amber'}>{entry.status}</Badge>
          <Badge tone="slate">v{entry.version}</Badge>
          {dirty && <Badge tone="indigo">+{delta.added} / -{delta.removed}</Badge>}
        </div>
        <TextArea value={draft} onChange={setDraft} rows={5} />
        <div className="flex gap-2">
          <Btn
            variant="primary"
            disabled={!dirty}
            onClick={() => {
              reviseContent(entry.id, draft);
              toast.success(`Saved v${entry.version + 1}`);
            }}
          >
            Save revision
          </Btn>
          {entry.status !== 'published' && (
            <Btn onClick={() => { publishContent(entry.id); toast.success('Published'); }}>Publish</Btn>
          )}
        </div>
      </Card>
      {entry.history.length > 0 && (
        <Card>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
          <div className="space-y-1.5">
            {entry.history.map((rev) => (
              <div key={rev.version} className="flex items-center gap-2 text-xs text-slate-600">
                <Badge tone="slate">v{rev.version}</Badge>
                <span className="truncate">{rev.body.split('\n')[0]}</span>
                <span className="ml-auto text-slate-400">{rev.author} · {new Date(rev.at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
