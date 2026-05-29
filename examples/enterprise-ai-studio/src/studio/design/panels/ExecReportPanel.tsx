import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Card } from '../ui';
import { buildExecReport, perfPassRate, funnelRates, detectAnomalies } from '../lib/analytics';
import { toast } from '../../ui/toast';

/** Feature #55 — executive report rollup (markdown export). */
export function ExecReportPanel(): React.ReactElement {
  const budgets = useAdvancedStore((s) => s.budgets);
  const perf = useAdvancedStore((s) => s.perf);
  const funnels = useAdvancedStore((s) => s.funnels);
  const series = useAdvancedStore((s) => s.series);

  const firstFunnel = funnels[0];
  const funnelOverall = firstFunnel
    ? (funnelRates(firstFunnel).at(-1)?.overallRate ?? 0)
    : 0;
  const openAnomalies = series.reduce((sum, s) => sum + detectAnomalies(s).length, 0);

  const report = buildExecReport(
    {
      workspace: 'Acme Corp',
      features: 55,
      budgets: {
        spentUsd: budgets.reduce((s, b) => s + b.spentUsd, 0),
        limitUsd: budgets.reduce((s, b) => s + b.limitUsd, 0),
      },
      perfPassRate: perfPassRate(perf),
      funnelOverall,
      openAnomalies,
    },
    new Date('2026-05-29').toLocaleDateString()
  );

  function copy(): void {
    void navigator.clipboard?.writeText(report);
    toast.success('Report copied to clipboard');
  }

  function download(): void {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'executive-summary.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded executive-summary.md');
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Executive report"
        subtitle="One-click rollup of spend, performance, conversion, and risk"
        action={
          <div className="flex gap-2">
            <Btn onClick={copy}>Copy</Btn>
            <Btn variant="primary" onClick={download}>Download .md</Btn>
          </div>
        }
      />
      <Card>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700">
          {report}
        </pre>
      </Card>
    </div>
  );
}
