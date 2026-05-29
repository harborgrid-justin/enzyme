import { useState, useMemo } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  TextArea,
  Badge,
  Card,
  EmptyHint,
  PreviewFrame,
  Stat,
} from '../ui';
import { resolveBindings } from '../lib/databind';
import { toast } from '../../ui/toast';
import type { DataSource, DataBinding, DataSourceKind } from '../types';

const KIND_TONE = {
  rest: 'sky',
  graphql: 'indigo',
  mock: 'slate',
} as const satisfies Record<DataSourceKind, 'sky' | 'indigo' | 'slate'>;

const KINDS: DataSourceKind[] = ['rest', 'graphql', 'mock'];

export function DataBindingPanel(): React.ReactElement {
  const dataSources = useDesignStore((s) => s.dataSources);
  const dataBindings = useDesignStore((s) => s.dataBindings);
  const addDataSource = useDesignStore((s) => s.addDataSource);
  const removeDataSource = useDesignStore((s) => s.removeDataSource);
  const addBinding = useDesignStore((s) => s.addBinding);
  const removeBinding = useDesignStore((s) => s.removeBinding);
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId) ?? null,
    [pages, activePageId]
  );

  // Add-source form state
  const [srcName, setSrcName] = useState('');
  const [srcKind, setSrcKind] = useState<DataSourceKind>('rest');
  const [srcUrl, setSrcUrl] = useState('');
  const [srcSample, setSrcSample] = useState('{}');

  // Add-binding form state
  const [bindToken, setBindToken] = useState('');
  const [bindSourceId, setBindSourceId] = useState<string>(dataSources[0]?.id ?? '');
  const [bindPath, setBindPath] = useState('');

  function handleAddSource(): void {
    const name = srcName.trim();
    const url = srcUrl.trim();
    if (name === '' || url === '') return;
    let parsed: Record<string, unknown>;
    try {
      const raw = JSON.parse(srcSample.trim() === '' ? '{}' : srcSample);
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new Error('Sample must be a JSON object');
      }
      parsed = raw as Record<string, unknown>;
    } catch (err) {
      toast.error(`Invalid sample JSON: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    const newSource: DataSource = {
      id: `ds-${crypto.randomUUID().slice(0, 8)}`,
      name,
      kind: srcKind,
      url,
      sample: parsed,
    };
    addDataSource(newSource);
    setSrcName('');
    setSrcUrl('');
    setSrcSample('{}');
    toast.success(`Data source "${name}" added`);
  }

  function handleAddBinding(): void {
    const token = bindToken.trim();
    const path = bindPath.trim();
    const sourceId = bindSourceId.trim();
    if (token === '' || path === '' || sourceId === '') return;
    const newBinding: DataBinding = {
      id: `bind-${crypto.randomUUID().slice(0, 8)}`,
      token,
      sourceId,
      path,
    };
    addBinding(newBinding);
    setBindToken('');
    setBindPath('');
    toast.success(`Binding {{bind:${token}}} added`);
  }

  const resolution = useMemo(() => {
    if (activePage == null) return null;
    return resolveBindings(activePage.body, dataBindings, dataSources);
  }, [activePage, dataBindings, dataSources]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Data Binding"
        subtitle="Connect REST, GraphQL, or mock sources; resolve {{bind:token}} placeholders"
      />

      {/* Sources list */}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Data sources
        </div>
        {dataSources.length === 0 ? (
          <EmptyHint>No data sources yet. Add one below.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {dataSources.map((ds) => (
              <Card key={ds.id}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{ds.name}</span>
                      <Badge tone={KIND_TONE[ds.kind]}>{ds.kind}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 truncate">{ds.url}</div>
                    <pre className="mt-1 rounded bg-slate-50 p-1.5 text-[10px] font-mono text-slate-600 overflow-x-auto">
                      {JSON.stringify(ds.sample, null, 2)}
                    </pre>
                  </div>
                  <Btn variant="danger" onClick={() => removeDataSource(ds.id)}>
                    Delete
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add-source form */}
      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">Add data source</div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[120px]">
              <TextInput label="Name" value={srcName} onChange={setSrcName} placeholder="Pricing API" />
            </div>
            <label className="block text-xs font-medium text-slate-600">
              Kind
              <select
                value={srcKind}
                onChange={(e) => setSrcKind(e.target.value as DataSourceKind)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex-1 min-w-[120px]">
              <TextInput label="URL" value={srcUrl} onChange={setSrcUrl} placeholder="https://api.example.com/data" />
            </div>
          </div>
          <TextArea
            value={srcSample}
            onChange={setSrcSample}
            placeholder='{"price": "$49"}'
            rows={3}
            mono
          />
          <Btn
            variant="primary"
            onClick={handleAddSource}
            disabled={srcName.trim() === '' || srcUrl.trim() === ''}
          >
            Add source
          </Btn>
        </div>
      </Card>

      {/* Bindings list */}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Bindings
        </div>
        {dataBindings.length === 0 ? (
          <EmptyHint>No bindings yet. Map a token to a source path below.</EmptyHint>
        ) : (
          <div className="space-y-1">
            {dataBindings.map((b) => {
              const src = dataSources.find((d) => d.id === b.sourceId);
              return (
                <Card key={b.id}>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-indigo-700">{`{{bind:${b.token}}}`}</code>
                    <span className="text-slate-400">→</span>
                    <span className="text-xs text-slate-600">{src?.name ?? b.sourceId}.{b.path}</span>
                    <div className="ml-auto">
                      <Btn variant="danger" onClick={() => removeBinding(b.id)}>
                        Delete
                      </Btn>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add-binding form */}
      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">Add binding</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[100px]">
            <TextInput label="Token" value={bindToken} onChange={setBindToken} placeholder="teamPrice" />
          </div>
          <label className="block text-xs font-medium text-slate-600">
            Source
            <select
              value={bindSourceId}
              onChange={(e) => setBindSourceId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
            >
              {dataSources.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex-1 min-w-[100px]">
            <TextInput label="Path" value={bindPath} onChange={setBindPath} placeholder="user.name" />
          </div>
          <div className="flex items-end">
            <Btn
              variant="primary"
              onClick={handleAddBinding}
              disabled={bindToken.trim() === '' || bindPath.trim() === '' || dataSources.length === 0}
            >
              Add binding
            </Btn>
          </div>
        </div>
      </Card>

      {/* Resolution preview */}
      {resolution != null ? (
        <div className="space-y-2">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Resolution preview — active page
          </div>
          <Stat label="Resolved bindings" value={resolution.resolved} />
          {resolution.unresolved.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resolution.unresolved.map((token) => (
                <span
                  key={token}
                  className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700"
                >
                  {`{{bind:${token}}}`}
                </span>
              ))}
            </div>
          )}
          <PreviewFrame body={resolution.html} className="h-64 rounded-lg border border-slate-200" />
        </div>
      ) : (
        <EmptyHint>Select an active page to preview binding resolution.</EmptyHint>
      )}
    </div>
  );
}
