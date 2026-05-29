import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card } from '../ui';
import type { DataClassification } from '../types.advanced';

const TONE: Record<DataClassification, 'slate' | 'sky' | 'amber' | 'rose'> = {
  public: 'slate',
  internal: 'sky',
  confidential: 'amber',
  restricted: 'rose',
};

/** Feature #29 — data residency, classification & retention policies. */
export function DataPolicyPanel(): React.ReactElement {
  const policies = useAdvancedStore((s) => s.policies);
  const updatePolicy = useAdvancedStore((s) => s.updatePolicy);

  return (
    <div className="space-y-4">
      <SectionHeader title="Data governance" subtitle="Residency region, classification, and retention windows" />
      <div className="space-y-2">
        {policies.map((p) => (
          <Card key={p.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{p.name}</span>
              <Badge tone={TONE[p.classification]}>{p.classification}</Badge>
              <Badge tone="slate">{p.region}</Badge>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Retention
              <input
                type="range"
                min={7}
                max={730}
                step={1}
                value={p.retentionDays}
                onChange={(e) => updatePolicy(p.id, { retentionDays: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="w-20 text-right font-medium text-slate-800">{p.retentionDays} days</span>
            </label>
          </Card>
        ))}
      </div>
    </div>
  );
}
