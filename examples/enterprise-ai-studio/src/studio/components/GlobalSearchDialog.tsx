/**
 * Feature #84: global search across every conversation.
 *
 * On open, fetches all message histories the caller can see and builds a small
 * in-memory index, then filters by query. Selecting a hit jumps to that
 * conversation. Distinct from the command palette (which matches titles/models)
 * — this searches message *content*.
 */
import { api } from '@missionfabric-js/enzyme';
import { useEffect, useMemo, useState } from 'react';
import { useConversations } from '../api/conversations';
import { useStudioStore } from '../store/studioStore';
import { providerOf } from '../providers/catalog';
import type { StudioMessage } from '../types';
import { cn } from '../ui/cn';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IndexEntry {
  conversationId: string;
  modelId: string;
  title: string;
  role: StudioMessage['role'];
  content: string;
  messageId: string;
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: GlobalSearchDialogProps): React.ReactElement | null {
  const { data: conversations } = useConversations();
  const setActiveConversation = useStudioStore((s) => s.setActiveConversation);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<IndexEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const list = conversations ?? [];
      const all: IndexEntry[] = [];
      for (const c of list) {
        try {
          const res = await api.apiClient.request<StudioMessage[]>({
            method: 'GET',
            url: `/conversations/${c.id}/messages`,
          });
          for (const m of res.data ?? []) {
            all.push({
              conversationId: c.id,
              modelId: c.modelId,
              title: c.title,
              role: m.role,
              content: m.content,
              messageId: m.id,
            });
          }
        } catch {
          // Skip conversations that fail to load.
        }
      }
      if (!cancelled) {
        setIndex(all);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, conversations]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return [];
    return index.filter((r) => r.content.toLowerCase().includes(q)).slice(0, 40);
  }, [query, index]);

  if (!open) return null;

  function snippet(content: string): string {
    const q = query.trim().toLowerCase();
    const idx = content.toLowerCase().indexOf(q);
    if (idx < 0) return content.slice(0, 120);
    const start = Math.max(0, idx - 40);
    return (start > 0 ? '…' : '') + content.slice(start, start + 120) + '…';
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh] backdrop-blur-sm'
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      role="presentation"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search message content across all conversations…"
          aria-label="Global message search"
          className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none dark:border-slate-800 dark:text-slate-100"
        />
        <div className="max-h-[55vh] overflow-y-auto p-1 text-sm">
          {loading && <p className="px-3 py-6 text-center text-xs text-slate-400">Indexing…</p>}
          {!loading && query.trim() !== '' && results.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-slate-400">No matches.</p>
          )}
          {!loading && query.trim() === '' && (
            <p className="px-3 py-6 text-center text-xs text-slate-400">
              Type to search across {index.length.toLocaleString()} messages.
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.messageId}
              type="button"
              onClick={() => {
                setActiveConversation(r.conversationId);
                onOpenChange(false);
              }}
              className="block w-full rounded-md px-3 py-2 text-left hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none dark:hover:bg-indigo-950"
            >
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span aria-hidden>{providerOf(r.modelId).glyph}</span>
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                  {r.title}
                </span>
                <span className="uppercase">· {r.role}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{snippet(r.content)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
