import { useState } from 'react';
import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card, TextInput, EmptyHint } from '../ui';
import { buildImagePrompt } from '../lib/content';
import { toast } from '../../ui/toast';
import type { ImageStyle } from '../types.advanced';

const STYLES: ImageStyle[] = ['photographic', 'illustration', 'isometric', 'minimal'];

/** Feature #41 — image / asset synthesis (deterministic placeholders). */
export function ImageSynthPanel(): React.ReactElement {
  const jobs = useAdvancedStore((s) => s.imageJobs);
  const queueImage = useAdvancedStore((s) => s.queueImage);
  const [brief, setBrief] = useState('');
  const [style, setStyle] = useState<ImageStyle>('minimal');

  function generate(): void {
    if (brief.trim() === '') {
      toast.error('Describe the image first');
      return;
    }
    queueImage(buildImagePrompt(brief, style), style);
    setBrief('');
    toast.success('Generated image');
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Image synthesis" subtitle="Generate on-brand imagery from a brief" />
      <Card className="space-y-3">
        <TextInput label="Brief" value={brief} onChange={setBrief} placeholder="e.g. abstract hero background" />
        <div className="flex flex-wrap gap-2">
          {STYLES.map((sName) => (
            <Btn key={sName} variant={sName === style ? 'primary' : 'ghost'} onClick={() => setStyle(sName)}>
              {sName}
            </Btn>
          ))}
        </div>
        <Btn variant="primary" onClick={generate}>Generate</Btn>
      </Card>
      {jobs.length === 0 ? (
        <EmptyHint>No images yet.</EmptyHint>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {jobs.map((j) => (
            <Card key={j.id} className="space-y-2 p-3">
              <img src={j.preview} alt={j.prompt} className="h-24 w-full rounded object-cover" />
              <Badge tone="slate">{j.style}</Badge>
              <p className="line-clamp-2 text-[11px] text-slate-500">{j.prompt}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
