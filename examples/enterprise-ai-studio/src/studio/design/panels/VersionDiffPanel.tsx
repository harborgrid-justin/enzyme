import { useState, useMemo } from 'react';
import { useDesignStore } from '../store';
import { SectionHeader, Card, EmptyHint, Stat } from '../ui';
import { diffLines, diffStats } from '../lib/diff';
import type { DiffLine } from '../lib/diff';

const OP_STYLES: Record<DiffLine['op'], string> = {
  equal: 'bg-white text-slate-500',
  add: 'bg-emerald-50 text-emerald-800',
  remove: 'bg-rose-50 text-rose-700',
};

const OP_PREFIX: Record<DiffLine['op'], string> = {
  equal: ' ',
  add: '+',
  remove: '-',
};

export function VersionDiffPanel(): React.ReactElement {
  const pages = useDesignStore((s) => s.pages);

  const [pageAId, setPageAId] = useState<string>(pages[0]?.id ?? '');
  const [pageBId, setPageBId] = useState<string>(pages[1]?.id ?? pages[0]?.id ?? '');

  const pageA = useMemo(() => pages.find((p) => p.id === pageAId), [pages, pageAId]);
  const pageB = useMemo(() => pages.find((p) => p.id === pageBId), [pages, pageBId]);

  const lines = useMemo(
    () => (pageA != null && pageB != null ? diffLines(pageA.body, pageB.body) : []),
    [pageA, pageB]
  );

  const stats = useMemo(
    () => (pageA != null && pageB != null ? diffStats(pageA.body, pageB.body) : null),
    [pageA, pageB]
  );

  if (pages.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader
          title="Version Diff"
          subtitle="Compare two pages side-by-side"
        />
        <EmptyHint>No pages available. Add pages in the Pages panel first.</EmptyHint>
      </div>
    );
  }

  const tagDeltaEntries = stats != null ? Object.entries(stats.tagDelta) : [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Version Diff"
        subtitle="Line-by-line and structural diff between two pages"
      />

      {/* Page selectors */}
      <div className="flex gap-3">
        <label className="flex-1 block text-xs font-medium text-slate-600">
          Page A (base)
          <select
            value={pageAId}
            onChange={(e) => setPageAId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.route})
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 block text-xs font-medium text-slate-600">
          Page B (compare)
          <select
            value={pageBId}
            onChange={(e) => setPageBId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.route})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Stats row */}
      {stats != null && (
        <div className="flex gap-3">
          <Stat label="Lines added" value={<span className="text-emerald-600">+{stats.added}</span>} />
          <Stat label="Lines removed" value={<span className="text-rose-600">-{stats.removed}</span>} />
          <Stat
            label="Tag delta"
            value={
              tagDeltaEntries.length === 0 ? (
                <span className="text-slate-400">none</span>
              ) : (
                <span className="space-x-1">
                  {tagDeltaEntries.map(([tag, delta]) => (
                    <span
                      key={tag}
                      className={delta > 0 ? 'text-emerald-600' : 'text-rose-600'}
                    >
                      {delta > 0 ? '+' : ''}{delta} {tag}
                    </span>
                  ))}
                </span>
              )
            }
          />
        </div>
      )}

      {/* Diff viewer */}
      {lines.length === 0 && pageA != null && pageB != null ? (
        <EmptyHint>Pages are identical — no differences found.</EmptyHint>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <pre className="font-mono text-[11px] leading-5">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 px-3 py-0 ${OP_STYLES[line.op]}`}
                >
                  <span className="w-4 flex-shrink-0 select-none font-bold opacity-60">
                    {OP_PREFIX[line.op]}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{line.text}</span>
                </div>
              ))}
            </pre>
          </div>
        </Card>
      )}

      {/* Tag delta breakdown */}
      {tagDeltaEntries.length > 0 && (
        <Card>
          <div className="mb-2 text-xs font-semibold text-slate-600">Tag delta breakdown</div>
          <div className="flex flex-wrap gap-2">
            {tagDeltaEntries.map(([tag, delta]) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  delta > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {delta > 0 ? '+' : ''}{delta} &lt;{tag}&gt;
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
