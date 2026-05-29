import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card, TextInput, EmptyHint } from '../ui';
import { auditSeo } from '../lib/content';
import type { GuardrailSeverity } from '../types.advanced';

const TONE: Record<GuardrailSeverity, 'rose' | 'amber' | 'slate'> = {
  high: 'rose',
  medium: 'amber',
  low: 'slate',
};

/** Feature #39 — SEO & social metadata optimizer. */
export function SeoPanel(): React.ReactElement {
  const seo = useAdvancedStore((s) => s.seo);
  const updateSeo = useAdvancedStore((s) => s.updateSeo);
  const { issues, score } = auditSeo(seo);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="SEO optimizer"
        subtitle="Audit page metadata against search + social best practices"
        action={<Badge tone={score >= 80 ? 'emerald' : score >= 50 ? 'amber' : 'rose'}>{score}/100</Badge>}
      />
      <Card className="space-y-3">
        <TextInput label="Title" value={seo.title} onChange={(v) => updateSeo({ title: v })} />
        <TextInput label="Meta description" value={seo.description} onChange={(v) => updateSeo({ description: v })} />
        <TextInput label="Canonical URL" value={seo.canonical} onChange={(v) => updateSeo({ canonical: v })} />
        <TextInput label="Social image (og:image)" value={seo.ogImage} onChange={(v) => updateSeo({ ogImage: v })} placeholder="https://…" />
        <TextInput
          label="Keywords (comma-separated)"
          value={seo.keywords.join(', ')}
          onChange={(v) => updateSeo({ keywords: v.split(',').map((k) => k.trim()).filter(Boolean) })}
        />
      </Card>
      <Card>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Issues ({issues.length})
        </p>
        {issues.length === 0 ? (
          <EmptyHint>No SEO issues — nicely optimized.</EmptyHint>
        ) : (
          <div className="space-y-1.5">
            {issues.map((i) => (
              <div key={i.field} className="flex items-center gap-2 text-sm">
                <Badge tone={TONE[i.severity]}>{i.field}</Badge>
                <span className="text-slate-700">{i.message}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
