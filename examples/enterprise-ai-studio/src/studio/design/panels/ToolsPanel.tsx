import { useState } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  Card,
  EmptyHint,
  Badge,
} from '../ui';
import { toast } from '../../ui/toast';
import { validateArgs, executeTool } from '../lib/tools';
import type { DesignTool } from '../types';

export function ToolsPanel(): React.ReactElement {
  const tools = useDesignStore((s) => s.tools);
  const toolInvocations = useDesignStore((s) => s.toolInvocations);
  const recordInvocation = useDesignStore((s) => s.recordInvocation);

  const [selectedId, setSelectedId] = useState<string | null>(tools[0]?.id ?? null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const selected: DesignTool | undefined = tools.find((t) => t.id === selectedId);

  function handleSelect(tool: DesignTool): void {
    setSelectedId(tool.id);
    setArgs({});
    setErrors([]);
  }

  function handleArgChange(name: string, value: string): void {
    setArgs((prev) => ({ ...prev, [name]: value }));
  }

  function handleRun(): void {
    if (selected == null) return;
    const errs = validateArgs(selected, args);
    if (errs.length > 0) {
      setErrors(errs);
      toast.error(errs[0]!);
      return;
    }
    setErrors([]);
    const inv = executeTool(selected, args);
    recordInvocation(inv);
    toast.success(`${selected.name} executed successfully`);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Tool Use"
        subtitle="Function calling — select a tool, fill params, run"
      />

      {/* Tool list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Available tools
        </p>
        {tools.map((tool) => (
          <Card
            key={tool.id}
            className={`cursor-pointer transition ${
              selectedId === tool.id
                ? 'border-indigo-400 bg-indigo-50'
                : 'hover:bg-slate-50'
            }`}
          >
            <button
              type="button"
              className="w-full text-left space-y-1"
              onClick={() => handleSelect(tool)}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-800">
                  {tool.name}
                </span>
                <Badge tone="slate">{tool.params.length} params</Badge>
              </div>
              <p className="text-xs text-slate-500">{tool.description}</p>
            </button>
          </Card>
        ))}
      </div>

      {/* Selected tool form */}
      {selected != null && (
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Run: <span className="font-mono text-indigo-700">{selected.name}</span>
          </p>
          <div className="space-y-3">
            {selected.params.map((param) => (
              <TextInput
                key={param.name}
                value={args[param.name] ?? ''}
                onChange={(v) => handleArgChange(param.name, v)}
                label={`${param.name} (${param.type}) — ${param.description}`}
                placeholder={param.description}
              />
            ))}
            {errors.length > 0 && (
              <ul className="text-xs text-rose-600 space-y-0.5">
                {errors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            )}
            <Btn variant="primary" onClick={handleRun}>
              Run tool
            </Btn>
          </div>
        </Card>
      )}

      {/* Invocation history */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Invocation history
        </p>
        {toolInvocations.length === 0 && (
          <EmptyHint>No invocations yet. Run a tool above.</EmptyHint>
        )}
        {toolInvocations.map((inv) => {
          const tool = tools.find((t) => t.id === inv.toolId);
          const argSummary = Object.entries(inv.args)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          return (
            <Card key={inv.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-700">
                  {tool?.name ?? inv.toolId}
                </span>
                <Badge tone="slate">
                  {new Date(inv.createdAt).toLocaleTimeString()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 truncate">Args: {argSummary}</p>
              <p className="text-xs text-emerald-700">{inv.result}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
