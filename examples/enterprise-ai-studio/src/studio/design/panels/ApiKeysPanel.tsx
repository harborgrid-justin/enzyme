import { useState } from 'react';
import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card, TextInput, EmptyHint } from '../ui';
import { toast } from '../../ui/toast';

const SCOPES = ['pages.read', 'pages.write', 'deploy', 'tokens.write'];

/** Feature #48 — developer portal: API keys with scopes. */
export function ApiKeysPanel(): React.ReactElement {
  const apiKeys = useAdvancedStore((s) => s.apiKeys);
  const createApiKey = useAdvancedStore((s) => s.createApiKey);
  const revokeApiKey = useAdvancedStore((s) => s.revokeApiKey);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['pages.read']);
  const [reveal, setReveal] = useState<string | null>(null);

  function create(): void {
    if (name.trim() === '') {
      toast.error('Name the key');
      return;
    }
    const full = createApiKey(name.trim(), scopes);
    setReveal(full);
    setName('');
    toast.success('Key created — copy it now, it won’t be shown again');
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="API keys" subtitle="Programmatic access with scoped permissions" />
      {reveal != null && (
        <Card className="border-emerald-300 bg-emerald-50">
          <p className="text-xs font-medium text-emerald-700">New key (shown once):</p>
          <code className="mt-1 block break-all text-sm text-emerald-900">{reveal}</code>
          <Btn onClick={() => { void navigator.clipboard?.writeText(reveal); toast.success('Copied'); }}>
            Copy
          </Btn>
        </Card>
      )}
      <Card className="space-y-3">
        <TextInput label="Key name" value={name} onChange={setName} placeholder="e.g. CI pipeline" />
        <div className="flex flex-wrap gap-2">
          {SCOPES.map((sc) => {
            const on = scopes.includes(sc);
            return (
              <Btn
                key={sc}
                variant={on ? 'primary' : 'ghost'}
                onClick={() => setScopes((prev) => (on ? prev.filter((p) => p !== sc) : [...prev, sc]))}
              >
                {sc}
              </Btn>
            );
          })}
        </div>
        <Btn variant="primary" onClick={create}>Create key</Btn>
      </Card>
      {apiKeys.length === 0 ? (
        <EmptyHint>No API keys yet.</EmptyHint>
      ) : (
        <div className="space-y-2">
          {apiKeys.map((k) => (
            <Card key={k.id} className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-800">{k.name}</span>
              <code className="text-xs text-slate-400">{k.masked}</code>
              <div className="flex flex-wrap gap-1">
                {k.scopes.map((sc) => (
                  <Badge key={sc} tone="slate">{sc}</Badge>
                ))}
              </div>
              <Btn variant="danger" onClick={() => { revokeApiKey(k.id); toast.success('Revoked'); }}>
                Revoke
              </Btn>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
