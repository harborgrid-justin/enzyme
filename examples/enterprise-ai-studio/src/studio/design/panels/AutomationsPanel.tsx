import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card } from '../ui';
import { matchAutomations } from '../lib/integrations';

const EVENTS = ['deploy.succeeded', 'approval.changes', 'schedule.nightly'];

/** Feature #46 — trigger → action automations. */
export function AutomationsPanel(): React.ReactElement {
  const automations = useAdvancedStore((s) => s.automations);
  const toggleAutomation = useAdvancedStore((s) => s.toggleAutomation);

  return (
    <div className="space-y-4">
      <SectionHeader title="Automations" subtitle="When an event fires, run an action automatically" />
      <div className="space-y-2">
        {automations.map((a) => (
          <Card key={a.id} className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-800">{a.name}</span>
            <Badge tone="slate">on {a.trigger}</Badge>
            <span className="text-slate-400">→</span>
            <Badge tone="indigo">{a.action}</Badge>
            <Btn
              variant={a.enabled ? 'danger' : 'primary'}
              onClick={() => toggleAutomation(a.id)}
            >
              {a.enabled ? 'Disable' : 'Enable'}
            </Btn>
          </Card>
        ))}
      </div>
      <Card>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Dry-run: who fires on each event?
        </p>
        <div className="space-y-1 text-xs text-slate-600">
          {EVENTS.map((ev) => {
            const matched = matchAutomations(automations, ev);
            return (
              <div key={ev} className="flex gap-2">
                <code className="w-44 text-slate-700">{ev}</code>
                <span>
                  {matched.length === 0 ? '—' : matched.map((m) => m.action).join(', ')}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
