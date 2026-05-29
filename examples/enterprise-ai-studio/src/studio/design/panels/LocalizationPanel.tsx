import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card } from '../ui';
import { localeCoverage } from '../lib/content';

/** Feature #38 — localization manager with per-locale coverage. */
export function LocalizationPanel(): React.ReactElement {
  const catalog = useAdvancedStore((s) => s.catalog);
  const setTranslation = useAdvancedStore((s) => s.setTranslation);
  const coverage = localeCoverage(catalog);
  const targetLocales = catalog.locales.filter((l) => l !== catalog.base);

  return (
    <div className="space-y-4">
      <SectionHeader title="Localization" subtitle={`Base locale: ${catalog.base} · ${targetLocales.length} target locales`} />

      <div className="grid grid-cols-3 gap-3">
        {targetLocales.map((l) => {
          const pct = Math.round((coverage[l] ?? 0) * 100);
          return (
            <Card key={l} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase text-slate-700">{l}</span>
                <Badge tone={pct === 100 ? 'emerald' : pct >= 50 ? 'amber' : 'rose'}>{pct}%</Badge>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="py-1.5 pr-3 text-left font-medium text-slate-600">Key</th>
                {catalog.locales.map((l) => (
                  <th key={l} className="px-2 py-1.5 text-left font-medium uppercase text-slate-600">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catalog.strings.map((str) => (
                <tr key={str.key} className="border-t border-slate-100 align-top">
                  <td className="py-1.5 pr-3 font-mono text-slate-700">{str.key}</td>
                  {catalog.locales.map((l) => (
                    <td key={l} className="px-2 py-1.5">
                      <input
                        value={str.values[l] ?? ''}
                        readOnly={l === catalog.base}
                        onChange={(e) => setTranslation(str.key, l, e.target.value)}
                        placeholder={l === catalog.base ? '' : 'missing'}
                        className="w-32 rounded border border-slate-200 px-1.5 py-1 text-xs read-only:bg-slate-50 read-only:text-slate-500 focus:border-indigo-400 focus:outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
