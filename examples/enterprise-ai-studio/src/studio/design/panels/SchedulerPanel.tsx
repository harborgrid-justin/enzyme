import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card } from '../ui';
import { intervalLabel, isDue, nextRun } from '../lib/integrations';
import { toast } from '../../ui/toast';

/** Feature #47 — scheduled jobs / automations. */
export function SchedulerPanel(): React.ReactElement {
  const jobs = useAdvancedStore((s) => s.jobs);
  const toggleJob = useAdvancedStore((s) => s.toggleJob);
  const runJobNow = useAdvancedStore((s) => s.runJobNow);

  return (
    <div className="space-y-4">
      <SectionHeader title="Scheduler" subtitle="Recurring jobs — eval runs, crawls, backups" />
      <div className="space-y-2">
        {jobs.map((j) => {
          const due = isDue(j);
          return (
            <Card key={j.id} className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-800">{j.name}</span>
              <Badge tone="slate">{intervalLabel(j.intervalMinutes)}</Badge>
              {j.enabled ? <Badge tone="emerald">enabled</Badge> : <Badge tone="slate">paused</Badge>}
              {due && j.enabled && <Badge tone="amber">due</Badge>}
              <span className="ml-auto text-[11px] text-slate-400">
                next {nextRun(j).toLocaleString()}
              </span>
              <Btn onClick={() => { runJobNow(j.id); toast.success(`Ran ${j.name}`); }}>Run now</Btn>
              <Btn variant={j.enabled ? 'danger' : 'primary'} onClick={() => toggleJob(j.id)}>
                {j.enabled ? 'Pause' : 'Enable'}
              </Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
