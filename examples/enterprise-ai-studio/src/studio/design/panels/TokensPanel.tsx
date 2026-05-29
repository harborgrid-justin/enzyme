import { useState, useMemo } from 'react';
import type { TokenCategory, DesignToken } from '../types';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  Badge,
  Card,
  EmptyHint,
} from '../ui';
import { toast } from '../../ui/toast';
import { tokensToCss, applyColorTokens } from '../lib/tokens';

const CATEGORIES: TokenCategory[] = ['color', 'typography', 'spacing', 'radius', 'shadow'];

const CATEGORY_TONE: Record<TokenCategory, 'indigo' | 'sky' | 'emerald' | 'amber' | 'slate'> = {
  color: 'indigo',
  typography: 'sky',
  spacing: 'emerald',
  radius: 'amber',
  shadow: 'slate',
};

export function TokensPanel(): React.ReactElement {
  const tokenSets = useDesignStore((s) => s.tokenSets);
  const activeTokenSetId = useDesignStore((s) => s.activeTokenSetId);
  const addToken = useDesignStore((s) => s.addToken);
  const updateToken = useDesignStore((s) => s.updateToken);
  const removeToken = useDesignStore((s) => s.removeToken);
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);
  const updatePageBody = useDesignStore((s) => s.updatePageBody);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<TokenCategory>('color');
  const [newValue, setNewValue] = useState('');

  const activeSet = useMemo(
    () => tokenSets.find((ts) => ts.id === activeTokenSetId),
    [tokenSets, activeTokenSetId]
  );

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId),
    [pages, activePageId]
  );

  const grouped = useMemo((): Record<TokenCategory, DesignToken[]> => {
    const base: Record<TokenCategory, DesignToken[]> = {
      color: [], typography: [], spacing: [], radius: [], shadow: [],
    };
    if (activeSet == null) return base;
    for (const token of activeSet.tokens) {
      base[token.category].push(token);
    }
    return base;
  }, [activeSet]);

  function handleAdd(): void {
    if (newName.trim() === '' || newValue.trim() === '') return;
    const slug = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const id = `tok-${slug}-${crypto.randomUUID().slice(0, 6)}`;
    addToken({ id, name: newName.trim(), category: newCategory, value: newValue.trim() });
    setNewName('');
    setNewValue('');
    toast.success(`Token "${newName.trim()}" added`);
  }

  function handleReskin(): void {
    if (activeSet == null || activePage == null) return;
    const result = applyColorTokens(activePage.body, activeSet);
    updatePageBody(activePage.id, result.html);
    toast.success(`${result.replaced} colors tokenized on "${activePage.name}"`);
  }

  if (activeSet == null) {
    return <EmptyHint>No active token set found.</EmptyHint>;
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={activeSet.name}
        subtitle="Design tokens — color, type, spacing, radius, shadow"
        action={
          <Btn variant="primary" onClick={handleReskin} disabled={activePage == null}>
            Re-skin active page
          </Btn>
        }
      />

      {CATEGORIES.map((cat) => {
        const tokens = grouped[cat];
        if (tokens.length === 0) return null;
        return (
          <div key={cat}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {cat}
            </div>
            <div className="space-y-1">
              {tokens.map((token) => (
                <Card key={token.id} className="flex items-center gap-3 py-2">
                  {cat === 'color' && (
                    <span
                      className="h-6 w-6 flex-shrink-0 rounded border border-slate-200"
                      style={{ backgroundColor: token.value }}
                    />
                  )}
                  <span className="flex-1 truncate text-xs font-medium text-slate-700">
                    {token.name}
                  </span>
                  <Badge tone={CATEGORY_TONE[cat]}>{token.category}</Badge>
                  <input
                    type="text"
                    value={token.value}
                    onChange={(e) => updateToken(token.id, { value: e.target.value })}
                    className="w-32 rounded border border-slate-300 px-2 py-0.5 text-xs font-mono text-slate-800 focus:border-indigo-400 focus:outline-none"
                  />
                  <Btn variant="danger" onClick={() => removeToken(token.id)} title="Remove token">
                    ×
                  </Btn>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">Add token</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[120px]">
            <TextInput
              label="Name"
              value={newName}
              onChange={setNewName}
              placeholder="Brand / Secondary"
            />
          </div>
          <label className="block text-xs font-medium text-slate-600">
            Category
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as TokenCategory)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="flex-1 min-w-[120px]">
            <TextInput
              label="Value"
              value={newValue}
              onChange={setNewValue}
              placeholder="#a855f7 or 16px"
            />
          </div>
          <div className="flex items-end">
            <Btn variant="primary" onClick={handleAdd} disabled={newName.trim() === '' || newValue.trim() === ''}>
              Add
            </Btn>
          </div>
        </div>
      </Card>

      <details className="rounded-lg border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-slate-600">
          Generated CSS
        </summary>
        <pre className="overflow-x-auto px-4 pb-4 pt-2 text-[11px] text-slate-700">
          {tokensToCss(activeSet)}
        </pre>
      </details>
    </div>
  );
}
