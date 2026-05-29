/**
 * Feature #82: model comparison.
 *
 * A sortable, scrollable matrix of every model in the catalog — provider,
 * context window, max output, per-million pricing, and capabilities — so users
 * can pick the right trade-off without leaving the studio.
 */
import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { MODELS, PROVIDERS } from '../providers/catalog';

interface ModelCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SortKey = 'label' | 'context' | 'input' | 'output';

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return tokens.toString();
}

export function ModelCompareDialog({
  open,
  onOpenChange,
}: ModelCompareDialogProps): React.ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('output');

  const rows = [...MODELS].sort((a, b) => {
    switch (sortKey) {
      case 'label':
        return a.label.localeCompare(b.label);
      case 'context':
        return b.contextWindow - a.contextWindow;
      case 'input':
        return a.pricing.inputPer1M - b.pricing.inputPer1M;
      case 'output':
      default:
        return a.pricing.outputPer1M - b.pricing.outputPer1M;
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Compare models"
      description="Pricing is per million tokens. Click a column header to sort."
      size="lg"
    >
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-white dark:bg-slate-900">
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-700">
              <SortableTh label="Model" active={sortKey === 'label'} onClick={() => setSortKey('label')} />
              <th className="px-2 py-2">Provider</th>
              <SortableTh label="Context" active={sortKey === 'context'} onClick={() => setSortKey('context')} />
              <th className="px-2 py-2">Max out</th>
              <SortableTh label="In $/M" active={sortKey === 'input'} onClick={() => setSortKey('input')} />
              <SortableTh label="Out $/M" active={sortKey === 'output'} onClick={() => setSortKey('output')} />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-2 py-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{m.label}</div>
                  <div className="text-[10px] text-slate-400">
                    {(m.capabilities ?? []).slice(0, 3).join(' · ')}
                  </div>
                </td>
                <td className="px-2 py-2 text-slate-500">
                  {PROVIDERS[m.provider].glyph} {PROVIDERS[m.provider].label}
                </td>
                <td className="px-2 py-2 font-mono text-slate-600">{formatTokens(m.contextWindow)}</td>
                <td className="px-2 py-2 font-mono text-slate-600">
                  {m.maxOutputTokens != null ? formatTokens(m.maxOutputTokens) : '—'}
                </td>
                <td className="px-2 py-2 font-mono text-slate-600">${m.pricing.inputPer1M}</td>
                <td className="px-2 py-2 font-mono text-slate-600">${m.pricing.outputPer1M}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

function SortableTh({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <th className="px-2 py-2">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-indigo-600 ${active ? 'text-indigo-600' : ''}`}
      >
        {label}
        {active && <span aria-hidden>▾</span>}
      </button>
    </th>
  );
}
