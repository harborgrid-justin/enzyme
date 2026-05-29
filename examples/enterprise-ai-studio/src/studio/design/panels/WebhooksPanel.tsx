import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card } from '../ui';
import { deliverySuccessRate, signPayload } from '../lib/integrations';

/** Feature #44 — outbound webhooks with delivery health + signing. */
export function WebhooksPanel(): React.ReactElement {
  const webhooks = useAdvancedStore((s) => s.webhooks);
  const toggleWebhook = useAdvancedStore((s) => s.toggleWebhook);

  return (
    <div className="space-y-4">
      <SectionHeader title="Webhooks" subtitle="Signed event delivery to external endpoints" />
      <div className="space-y-3">
        {webhooks.map((w) => {
          const rate = deliverySuccessRate(w);
          const sample = signPayload('whsec', `{"event":"${w.events[0] ?? 'ping'}"}`);
          return (
            <Card key={w.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="text-sm text-slate-800">{w.url}</code>
                <Badge tone={w.enabled ? 'emerald' : 'slate'}>{w.enabled ? 'active' : 'paused'}</Badge>
                <Badge tone={rate >= 0.9 ? 'emerald' : 'amber'}>{Math.round(rate * 100)}% ok</Badge>
                <Btn
                  variant={w.enabled ? 'danger' : 'primary'}
                  onClick={() => toggleWebhook(w.id)}
                >
                  {w.enabled ? 'Pause' : 'Resume'}
                </Btn>
              </div>
              <div className="flex flex-wrap gap-1">
                {w.events.map((e) => (
                  <Badge key={e} tone="indigo">{e}</Badge>
                ))}
              </div>
              <p className="truncate font-mono text-[10px] text-slate-400">
                X-Signature: {sample}
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                {w.deliveries.map((d) => (
                  <span key={d.id} className={d.status === 'success' ? 'text-emerald-600' : 'text-rose-500'}>
                    {d.status === 'success' ? '●' : '○'} {d.event}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
