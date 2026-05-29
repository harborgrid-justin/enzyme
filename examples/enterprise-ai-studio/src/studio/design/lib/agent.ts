/**
 * Multi-step agent workflows (feature #25).
 *
 * Executes a workflow's steps in order, producing a per-step output. Each step
 * kind has a deterministic stub "tool" so the run is reproducible in the
 * no-backend studio; the runner is async + cancellable so the UI can show a
 * live plan with running/done/failed states.
 */
import type { AgentRun, AgentRunStep, AgentStep, AgentWorkflow } from '../types';

let runCounter = 0;

export function createRun(workflow: AgentWorkflow): AgentRun {
  runCounter += 1;
  return {
    id: `run-${Date.now().toString(36)}-${runCounter}`,
    workflowId: workflow.id,
    steps: workflow.steps.map<AgentRunStep>((s) => ({
      stepId: s.id,
      status: 'pending',
      output: '',
    })),
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
}

/** Produce the deterministic output for a step given the running goal. */
export function runStep(step: AgentStep, goal: string): string {
  switch (step.kind) {
    case 'research':
      return `Gathered 4 references and constraints for "${goal}".`;
    case 'wireframe':
      return `Low-fidelity wireframe: header, hero, 3-column features, CTA.`;
    case 'build':
      return `<section data-step="build"><h1>${goal}</h1><p>Generated layout.</p></section>`;
    case 'a11y-fix':
      return `Applied 3 a11y fixes: alt text, lang attribute, contrast bump.`;
    case 'review':
      return `Review passed: matches goal, on-brand, AA contrast.`;
  }
}

export interface StepCallbacks {
  onStep: (index: number, patch: Partial<AgentRunStep>) => void;
  shouldCancel?: () => boolean;
  stepDelayMs?: number;
}

/**
 * Drive a run to completion, invoking `onStep` as each step transitions. Pure
 * sequencing logic; the caller supplies the timing + cancellation.
 */
export async function executeRun(
  workflow: AgentWorkflow,
  callbacks: StepCallbacks
): Promise<void> {
  const delay = callbacks.stepDelayMs ?? 500;
  for (let i = 0; i < workflow.steps.length; i += 1) {
    if (callbacks.shouldCancel?.() === true) {
      callbacks.onStep(i, { status: 'failed', output: 'Cancelled.' });
      return;
    }
    const step = workflow.steps[i]!;
    callbacks.onStep(i, { status: 'running' });
    await sleep(delay);
    callbacks.onStep(i, { status: 'done', output: runStep(step, workflow.goal) });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
