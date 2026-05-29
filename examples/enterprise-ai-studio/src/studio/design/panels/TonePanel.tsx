import { useState } from 'react';
import { SectionHeader, Btn, Card, TextArea } from '../ui';
import { rewriteTone, type Tone } from '../lib/content';
import { toast } from '../../ui/toast';

const TONES: Tone[] = ['concise', 'confident', 'friendly'];
const SAMPLE =
  'We think our really amazing platform might possibly help you build super incredible apps very fast.';

/** Feature #40 — brand-voice tone rewriter. */
export function TonePanel(): React.ReactElement {
  const [text, setText] = useState(SAMPLE);
  const [tone, setTone] = useState<Tone>('confident');
  const rewritten = rewriteTone(text, tone);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Tone rewriter"
        subtitle="Rewrite copy to the brand voice — concise, confident, on-message"
        action={
          <Btn
            variant="primary"
            onClick={() => {
              setText(rewritten);
              toast.success('Applied rewrite');
            }}
          >
            Apply
          </Btn>
        }
      />
      <div className="flex gap-2">
        {TONES.map((t) => (
          <Btn key={t} variant={t === tone ? 'primary' : 'ghost'} onClick={() => setTone(t)}>
            {t}
          </Btn>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-600">Original</p>
          <TextArea value={text} onChange={setText} rows={5} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-600">Rewritten ({tone})</p>
          <Card className="h-full text-sm text-slate-800">{rewritten}</Card>
        </div>
      </div>
    </div>
  );
}
