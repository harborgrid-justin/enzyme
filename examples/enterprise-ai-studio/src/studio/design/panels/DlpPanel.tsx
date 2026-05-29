import { useState } from 'react';
import { SectionHeader, Btn, Badge, Card, TextArea, EmptyHint } from '../ui';
import { scanPii, redactPii } from '../lib/governance';
import { toast } from '../../ui/toast';

const SAMPLE =
  'Contact ada@acme.com or call 415-555-0142. Card 4242 4242 4242 4242, SSN 123-45-6789, from 10.0.12.4.';

/** Feature #30 — PII / DLP scanner with one-click redaction. */
export function DlpPanel(): React.ReactElement {
  const [text, setText] = useState(SAMPLE);
  const findings = scanPii(text);

  function redact(): void {
    const { redacted, count } = redactPii(text);
    setText(redacted);
    toast.success(`Redacted ${count} PII match${count === 1 ? '' : 'es'}`);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="PII / DLP scanner"
        subtitle="Detect and redact sensitive data before it reaches a model or prototype"
        action={
          <Btn variant="primary" onClick={redact} disabled={findings.length === 0}>
            Redact all
          </Btn>
        }
      />
      <TextArea value={text} onChange={setText} rows={5} mono placeholder="Paste content to scan…" />
      <Card>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Findings ({findings.length})
        </p>
        {findings.length === 0 ? (
          <EmptyHint>No PII detected.</EmptyHint>
        ) : (
          <div className="space-y-1.5">
            {findings.map((f, i) => (
              <div key={`${f.kind}-${i}`} className="flex items-center gap-2 text-sm">
                <Badge tone="rose">{f.kind}</Badge>
                <code className="text-slate-700">{f.match}</code>
                <span className="ml-auto text-[11px] text-slate-400">@{f.index}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
