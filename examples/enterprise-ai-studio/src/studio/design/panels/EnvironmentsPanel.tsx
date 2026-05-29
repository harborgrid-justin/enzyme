import { useState } from 'react';
import { useDesignStore } from '../store';
import { SectionHeader, Btn, TextInput, Badge, Card } from '../ui';
import { toast } from '../../ui/toast';
import type { EnvName } from '../types';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ENV_ORDER: EnvName[] = ['development', 'staging', 'production'];

function EnvCard({ envName }: { envName: EnvName }): React.ReactElement {
  const environments = useDesignStore((s) => s.environments);
  const pages = useDesignStore((s) => s.pages);
  const setEnvVar = useDesignStore((s) => s.setEnvVar);
  const promoteToEnv = useDesignStore((s) => s.promoteToEnv);

  const env = environments.find((e) => e.name === envName)!;
  const promotedPage = pages.find((p) => p.id === env.promotedTargetId);

  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string>(pages[0]?.id ?? '');

  const varEntries = Object.entries(env.vars);

  function handleAddVar(): void {
    const k = newKey.trim();
    const v = newVal.trim();
    if (k === '') return;
    setEnvVar(env.name, k, v);
    setNewKey('');
    setNewVal('');
  }

  function handlePromote(): void {
    if (selectedPageId === '') return;
    promoteToEnv(env.name, selectedPageId);
    const pageName = pages.find((p) => p.id === selectedPageId)?.name ?? selectedPageId;
    toast.success(`"${pageName}" promoted to ${env.name}`);
  }

  const toneMap: Record<EnvName, 'sky' | 'amber' | 'emerald'> = {
    development: 'sky',
    staging: 'amber',
    production: 'emerald',
  };

  return (
    <Card className="flex-1 min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800 capitalize">{env.name}</span>
        <Badge tone={toneMap[env.name]}>{env.name}</Badge>
      </div>

      <div className="mb-1 text-xs font-medium text-slate-500">Promoted page</div>
      <div className="mb-3 text-xs text-slate-700">
        {promotedPage != null ? (
          <>
            <span className="font-medium">{promotedPage.name}</span>
            {env.promotedAt != null && (
              <span className="ml-1 text-slate-400">{relativeTime(env.promotedAt)}</span>
            )}
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>

      <div className="mb-1 text-xs font-medium text-slate-500">Variables</div>
      <div className="space-y-1 mb-3">
        {varEntries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span className="w-24 shrink-0 truncate font-mono text-[11px] text-slate-500">{k}</span>
            <span className="text-[11px] text-slate-400">=</span>
            <div className="flex-1">
              <TextInput
                value={v}
                onChange={(val) => setEnvVar(env.name, k, val)}
                placeholder="value"
              />
            </div>
          </div>
        ))}
        <div className="flex items-end gap-1 pt-1">
          <div className="flex-1">
            <TextInput value={newKey} onChange={setNewKey} placeholder="KEY" />
          </div>
          <div className="flex-1">
            <TextInput value={newVal} onChange={setNewVal} placeholder="value" />
          </div>
          <Btn onClick={handleAddVar} disabled={newKey.trim() === ''}>
            +
          </Btn>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="mb-1 text-xs font-medium text-slate-500">Promote page</div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Btn variant="primary" onClick={handlePromote} disabled={selectedPageId === ''}>
            Promote to {env.name}
          </Btn>
        </div>
      </div>
    </Card>
  );
}

export function EnvironmentsPanel(): React.ReactElement {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Environments"
        subtitle="Promote pages from development → staging → production"
      />
      <div className="flex flex-wrap gap-4 items-start">
        {ENV_ORDER.map((envName, i) => (
          <div key={envName} className="flex flex-1 min-w-[220px] items-start gap-2">
            <EnvCard envName={envName} />
            {i < ENV_ORDER.length - 1 && (
              <div className="mt-8 text-slate-300 text-lg font-bold select-none">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
