import { useState } from 'react';
import { SectionHeader, Badge, Card, TextArea, Stat } from '../ui';
import { readability } from '../lib/content';

const SAMPLE =
  'Our enterprise platform empowers cross-functional stakeholders to operationalize synergistic prototyping workflows, facilitating accelerated time-to-value across heterogeneous organizational units.';

/** Feature #43 — readability scoring (Flesch Reading Ease). */
export function ReadabilityPanel(): React.ReactElement {
  const [text, setText] = useState(SAMPLE);
  const r = readability(text);
  const tone = r.ease >= 60 ? 'emerald' : r.ease >= 40 ? 'amber' : 'rose';

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Readability"
        subtitle="Flesch Reading Ease — keep marketing copy plain and scannable"
        action={<Badge tone={tone}>{r.grade}</Badge>}
      />
      <TextArea value={text} onChange={setText} rows={5} placeholder="Paste copy to grade…" />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Reading ease" value={r.ease} />
        <Stat label="Words" value={r.words} />
        <Stat label="Sentences" value={r.sentences} />
      </div>
      <Card className="text-xs text-slate-500">
        Aim for 60–70 (plain English). Below 30 reads like dense academic prose — shorten sentences and
        prefer common words.
      </Card>
    </div>
  );
}
