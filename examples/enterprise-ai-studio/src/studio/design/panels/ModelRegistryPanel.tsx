import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card } from '../ui';
import { routeModel, estimateCost } from '../lib/aiops';
import type { ModelTier, RouteIntent } from '../types.advanced';

const TIER_TONE: Record<ModelTier, 'indigo' | 'sky' | 'slate'> = {
  frontier: 'indigo',
  balanced: 'sky',
  fast: 'slate',
};
const INTENTS: RouteIntent[] = ['quality', 'cheap', 'vision'];

/** Feature #32 — model registry + intent-based routing policy. */
export function ModelRegistryPanel(): React.ReactElement {
  const models = useAdvancedStore((s) => s.models);
  const routing = useAdvancedStore((s) => s.routing);
  const toggleModel = useAdvancedStore((s) => s.toggleModel);
  const setRoute = useAdvancedStore((s) => s.setRoute);
  const enabled = models.filter((m) => m.enabled);

  return (
    <div className="space-y-4">
      <SectionHeader title="Model registry" subtitle="Catalog of providers/models with a routing policy" />

      <Card>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Routing policy</p>
        <div className="space-y-2">
          {INTENTS.map((intent) => (
            <div key={intent} className="flex items-center gap-3 text-sm">
              <span className="w-20 capitalize text-slate-600">{intent}</span>
              <span className="text-slate-400">→</span>
              <select
                value={routeModel(routing, intent)}
                onChange={(e) => setRoute(intent, e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                {enabled.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">
            Default: {models.find((m) => m.id === routing.defaultModelId)?.name ?? '—'}
          </p>
        </div>
      </Card>

      <div className="space-y-2">
        {models.map((m) => (
          <Card key={m.id} className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-800">{m.name}</span>
            <Badge tone={TIER_TONE[m.tier]}>{m.tier}</Badge>
            <span className="text-[11px] text-slate-500">{m.provider}</span>
            {m.vision && <Badge tone="emerald">vision</Badge>}
            <span className="ml-auto text-[11px] text-slate-400">
              ~${estimateCost(m, 1000, 500)}/req
            </span>
            <Btn variant={m.enabled ? 'danger' : 'primary'} onClick={() => toggleModel(m.id)}>
              {m.enabled ? 'Disable' : 'Enable'}
            </Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}
