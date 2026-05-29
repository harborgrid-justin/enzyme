import { useState } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  Badge,
  Card,
  EmptyHint,
} from '../ui';
import { toast } from '../../ui/toast';
import { createRun, executeRun } from '../lib/agent';
import type { AgentWorkflow, AgentRun } from '../types';

type StepStatus = 'pending' | 'running' | 'done' | 'failed';

function statusBadgeTone(
  status: StepStatus
): 'slate' | 'amber' | 'emerald' | 'rose' {
  switch (status) {
    case 'pending':
      return 'slate';
    case 'running':
      return 'amber';
    case 'done':
      return 'emerald';
    case 'failed':
      return 'rose';
  }
}

export function AgentPanel(): React.ReactElement {
  const workflows = useDesignStore((s) => s.workflows);
  const agentRuns = useDesignStore((s) => s.agentRuns);
  const addRun = useDesignStore((s) => s.addRun);
  const updateRunStep = useDesignStore((s) => s.updateRunStep);
  const finishRun = useDesignStore((s) => s.finishRun);

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(
    workflows[0]?.id ?? ''
  );
  const [running, setRunning] = useState(false);

  const workflow: AgentWorkflow | undefined = workflows.find(
    (w) => w.id === selectedWorkflowId
  );

  const latestRun: AgentRun | undefined = agentRuns.find(
    (r) => r.workflowId === selectedWorkflowId
  );

  const priorRunsCount = agentRuns.filter(
    (r) => r.workflowId === selectedWorkflowId
  ).length;

  async function handleRunWorkflow(): Promise<void> {
    if (workflow == null) return;
    const run = createRun(workflow);
    addRun(run);
    setRunning(true);
    try {
      await executeRun(workflow, {
        stepDelayMs: 600,
        onStep: (i, patch) => updateRunStep(run.id, i, patch),
      });
      finishRun(run.id);
      toast.success(`Workflow "${workflow.name}" completed`);
    } catch {
      toast.error('Workflow failed unexpectedly');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Agent Workflows"
        subtitle="Multi-step agentic task runner"
        action={
          <Btn
            variant="primary"
            onClick={() => void handleRunWorkflow()}
            disabled={running || workflow == null}
          >
            {running ? 'Running…' : 'Run workflow'}
          </Btn>
        }
      />

      {/* Workflow selector */}
      {workflows.length === 0 ? (
        <EmptyHint>No workflows defined.</EmptyHint>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Workflows
          </p>
          <div className="flex flex-wrap gap-2">
            {workflows.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWorkflowId(w.id)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  selectedWorkflowId === w.id
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Workflow detail */}
      {workflow != null && (
        <Card>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Goal
              </p>
              <p className="mt-1 text-sm text-slate-700">{workflow.goal}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Steps
              </p>
              <ol className="space-y-1.5">
                {workflow.steps.map((step, idx) => (
                  <li key={step.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-slate-400 w-4 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-slate-700">{step.name}</span>
                    <Badge tone="slate">{step.kind}</Badge>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      )}

      {/* Latest run */}
      {latestRun != null && workflow != null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Latest run
            </p>
            <span className="text-xs text-slate-400">
              {priorRunsCount} run{priorRunsCount !== 1 ? 's' : ''} total ·{' '}
              {new Date(latestRun.startedAt).toLocaleTimeString()}
            </span>
          </div>
          <div className="space-y-2">
            {latestRun.steps.map((runStep, idx) => {
              const stepName = workflow.steps[idx]?.name ?? `Step ${idx + 1}`;
              const status = runStep.status as StepStatus;
              return (
                <Card key={runStep.stepId} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {stepName}
                    </span>
                    <Badge tone={statusBadgeTone(status)}>
                      {status === 'running' ? '⟳ running' : status}
                    </Badge>
                  </div>
                  {runStep.output.length > 0 && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {runStep.output}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {latestRun == null && workflow != null && (
        <EmptyHint>No runs yet. Click "Run workflow" to start.</EmptyHint>
      )}
    </div>
  );
}
