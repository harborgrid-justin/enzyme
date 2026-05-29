import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card } from '../ui';

/** Feature #45 — integrations marketplace / connectors. */
export function ConnectorsPanel(): React.ReactElement {
  const connectors = useAdvancedStore((s) => s.connectors);
  const toggleConnector = useAdvancedStore((s) => s.toggleConnector);
  const connected = connectors.filter((c) => c.connected).length;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Connectors"
        subtitle="Integrate the studio with your existing stack"
        action={<Badge tone="indigo">{connected} connected</Badge>}
      />
      <div className="grid grid-cols-2 gap-3">
        {connectors.map((c) => (
          <Card key={c.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{c.name}</span>
              <Badge tone="slate">{c.category}</Badge>
              {c.connected && <Badge tone="emerald">connected</Badge>}
            </div>
            <p className="text-xs text-slate-500">{c.description}</p>
            <Btn variant={c.connected ? 'danger' : 'primary'} onClick={() => toggleConnector(c.id)}>
              {c.connected ? 'Disconnect' : 'Connect'}
            </Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}
