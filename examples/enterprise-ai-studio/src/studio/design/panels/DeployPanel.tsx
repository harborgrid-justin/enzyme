import { useState } from 'react';
import type { DeployProvider, EnvName } from '../types';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  Badge,
  Card,
  EmptyHint,
} from '../ui';

const STATUS_TONE = {
  queued: 'slate',
  building: 'amber',
  live: 'emerald',
  failed: 'rose',
} as const satisfies Record<string, 'slate' | 'amber' | 'emerald' | 'rose'>;

const PROVIDERS: DeployProvider[] = ['vercel', 'netlify', 'static'];
const ENVIRONMENTS: EnvName[] = ['development', 'staging', 'production'];

export function DeployPanel(): React.ReactElement {
  const deployments = useDesignStore((s) => s.deployments);
  const createDeployment = useDesignStore((s) => s.createDeployment);
  const updateDeployment = useDesignStore((s) => s.updateDeployment);
  const pages = useDesignStore((s) => s.pages);

  const [pageId, setPageId] = useState<string>(pages[0]?.id ?? '');
  const [provider, setProvider] = useState<DeployProvider>('vercel');
  const [env, setEnv] = useState<EnvName>('production');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function handleDeploy(): void {
    if (pageId === '') return;
    const id = createDeployment(provider, env, pageId);
    setTimeout(() => {
      updateDeployment(id, { status: 'building', logLine: 'Building…' });
    }, 400);
    setTimeout(() => {
      updateDeployment(id, { status: 'building', logLine: 'Uploading assets…' });
    }, 1200);
    setTimeout(() => {
      updateDeployment(id, { status: 'live', logLine: 'Deployed ✓' });
    }, 2000);
  }

  function toggleExpand(id: string): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Deploy"
        subtitle="One-click deploy to Vercel, Netlify, or static hosting"
      />

      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">New deployment</div>
        <div className="flex flex-wrap gap-2">
          <label className="block text-xs font-medium text-slate-600">
            Page
            <select
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Provider
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as DeployProvider)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Environment
            <select
              value={env}
              onChange={(e) => setEnv(e.target.value as EnvName)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
            >
              {ENVIRONMENTS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Btn variant="primary" onClick={handleDeploy} disabled={pageId === ''}>
              Deploy
            </Btn>
          </div>
        </div>
      </Card>

      {deployments.length === 0 ? (
        <EmptyHint>No deployments yet. Configure a target above and click Deploy.</EmptyHint>
      ) : (
        <div className="space-y-2">
          {deployments.map((d) => (
            <Card key={d.id}>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="slate">{d.provider}</Badge>
                <Badge tone="indigo">{d.environment}</Badge>
                <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                {d.status === 'live' && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-xs text-indigo-600 underline hover:text-indigo-800 truncate max-w-[200px]"
                  >
                    {d.url}
                  </a>
                )}
                <div className="ml-auto">
                  <Btn onClick={() => toggleExpand(d.id)}>
                    {expandedIds.has(d.id) ? 'Hide log' : 'Show log'}
                  </Btn>
                </div>
              </div>
              {expandedIds.has(d.id) && (
                <pre className="mt-2 rounded bg-slate-900 p-3 text-[11px] font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap">
                  {d.log.join('\n')}
                </pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
