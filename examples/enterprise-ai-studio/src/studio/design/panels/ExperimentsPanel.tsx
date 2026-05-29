import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card } from '../ui';
import { conversionRate, analyzeExperiment } from '../lib/aiops';
import type { ExperimentStatus } from '../types.advanced';

const STATUS_TONE: Record<ExperimentStatus, 'slate' | 'sky' | 'emerald'> = {
  draft: 'slate',
  running: 'sky',
  complete: 'emerald',
};

/** Feature #36 — A/B experiment framework with significance readout. */
export function ExperimentsPanel(): React.ReactElement {
  const experiments = useAdvancedStore((s) => s.experiments);
  const setStatus = useAdvancedStore((s) => s.setExperimentStatus);

  return (
    <div className="space-y-4">
      <SectionHeader title="Experiments" subtitle="A/B test prototype variants with stat-significance" />
      {experiments.map((exp) => {
        const readout = analyzeExperiment(exp);
        return (
          <Card key={exp.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{exp.name}</span>
              <Badge tone={STATUS_TONE[exp.status]}>{exp.status}</Badge>
              {readout.significant ? (
                <Badge tone="emerald">significant · +{readout.liftPoints}pts</Badge>
              ) : (
                <Badge tone="slate">+{readout.liftPoints}pts (not sig.)</Badge>
              )}
              {exp.status === 'running' && (
                <Btn variant="ghost" onClick={() => setStatus(exp.id, 'complete')}>
                  Conclude
                </Btn>
              )}
            </div>
            <div className="space-y-1.5">
              {exp.variants.map((v) => {
                const rate = conversionRate(v.visitors, v.conversions);
                const winner = v.id === readout.bestVariantId;
                return (
                  <div key={v.id} className="space-y-0.5">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className={winner ? 'font-semibold text-emerald-700' : ''}>
                        {v.name} {winner && '★'}
                      </span>
                      <span>
                        {(rate * 100).toFixed(1)}% · {v.conversions}/{v.visitors}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div
                        className={`h-2 rounded-full ${winner ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                        style={{ width: `${Math.min(100, rate * 100 * 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
