import { useState } from 'react';
import { useDesignStore } from '../store';
import { SectionHeader, Badge, Card, TextArea, Stat } from '../ui';
import { groundednessScore } from '../lib/aiops';

const SAMPLE_OUTPUT =
  'The primary brand color is indigo. Every image needs descriptive alt text. We offer a lifetime free tier with unlimited seats.';

/** Feature #35 — groundedness / hallucination scoring against the knowledge base. */
export function GroundednessPanel(): React.ReactElement {
  const knowledge = useDesignStore((s) => s.knowledge);
  const [output, setOutput] = useState(SAMPLE_OUTPUT);
  const sources = knowledge.map((d) => `${d.title}. ${d.content}`);
  const report = groundednessScore(output, sources);
  const pct = Math.round(report.score * 100);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Groundedness"
        subtitle="Check generated claims against your knowledge base"
        action={<Badge tone={pct >= 75 ? 'emerald' : pct >= 50 ? 'amber' : 'rose'}>{pct}% grounded</Badge>}
      />
      <TextArea value={output} onChange={setOutput} rows={4} placeholder="Generated output to check…" />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Supported claims" value={report.supported.length} />
        <Stat label="Unsupported claims" value={report.unsupported.length} />
      </div>
      {report.unsupported.length > 0 && (
        <Card>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-500">
            Unsupported by sources
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            {report.unsupported.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400">⚠</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
