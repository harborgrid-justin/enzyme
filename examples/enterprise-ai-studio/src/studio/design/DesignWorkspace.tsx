/**
 * Design workspace shell.
 *
 * A parallel surface to the chat studio: a grouped feature nav on the left and
 * the active capability panel on the right. The 25 panels are sourced from the
 * registry. Actions are attributed to the signed-in user so collaboration,
 * comments, and approvals reflect "who did what".
 */
import { useEffect, useMemo, useState } from 'react';
import { auth } from '@missionfabric-js/enzyme';
import { useDesignStore } from './store';
import { useAdvancedStore } from './advancedStore';
import { DESIGN_GROUPS, DESIGN_FEATURES } from './registry';
import { cn } from '../ui/cn';

export function DesignWorkspace(): React.ReactElement {
  const [activeId, setActiveId] = useState<string>('tokens');
  const [query, setQuery] = useState('');
  const { user } = auth.useAuth();
  const setActor = useDesignStore((s) => s.setActor);
  const setAdvancedActor = useAdvancedStore((s) => s.setActor);
  const activePageId = useDesignStore((s) => s.activePageId);
  const pages = useDesignStore((s) => s.pages);

  // Attribute design + governance actions to the signed-in identity.
  useEffect(() => {
    if (user?.firstName != null) {
      setActor(user.firstName);
      setAdvancedActor(user.firstName);
    }
  }, [user?.firstName, setActor, setAdvancedActor]);

  const active = useMemo(
    () => DESIGN_FEATURES.find((f) => f.id === activeId) ?? DESIGN_FEATURES[0]!,
    [activeId]
  );
  const ActivePanel = active.Panel;

  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return DESIGN_GROUPS;
    return DESIGN_GROUPS.map((g) => ({
      ...g,
      features: g.features.filter(
        (f) => f.title.toLowerCase().includes(q) || f.blurb.toLowerCase().includes(q)
      ),
    })).filter((g) => g.features.length > 0);
  }, [query]);

  return (
    <div className="flex min-h-0 flex-1">
      {/* Feature nav */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter capabilities…"
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {filteredGroups.map((group) => (
            <div key={group.id} className="mb-3">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.features.map((feature) => (
                  <li key={feature.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(feature.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition',
                        feature.id === activeId
                          ? 'bg-indigo-50 font-medium text-indigo-700'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <span aria-hidden className="w-5 text-center">
                        {feature.icon}
                      </span>
                      <span className="flex-1 truncate">{feature.title}</span>
                      <span className="text-[10px] text-slate-400">#{feature.num}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Active panel */}
      <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-4xl p-5">
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-lg" aria-hidden>
              {active.icon}
            </span>
            <span className="font-medium text-slate-700">{active.title}</span>
            <span>·</span>
            <span>{active.blurb}</span>
            <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
              {activePage != null ? `Active page: ${activePage.name}` : 'No active page'}
            </span>
          </div>
          <ActivePanel />
        </div>
      </main>
    </div>
  );
}
