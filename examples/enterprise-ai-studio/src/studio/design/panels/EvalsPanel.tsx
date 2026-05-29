import { useState } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  TextArea,
  Badge,
  Card,
  EmptyHint,
} from '../ui';
import { toast } from '../../ui/toast';
import { runEvals, passRateByProvider } from '../lib/evals';
import type { EvalCase, EvalMatcher } from '../types';

const PROVIDERS = [
  'anthropic',
  'openai',
  'google',
  'microsoft',
  'huggingface',
] as const;

export function EvalsPanel(): React.ReactElement {
  const evalCases = useDesignStore((s) => s.evalCases);
  const evalResults = useDesignStore((s) => s.evalResults);
  const addEvalCase = useDesignStore((s) => s.addEvalCase);
  const removeEvalCase = useDesignStore((s) => s.removeEvalCase);
  const setEvalResults = useDesignStore((s) => s.setEvalResults);

  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [newMatcher, setNewMatcher] = useState<EvalMatcher>('contains');

  function handleRun(): void {
    const results = runEvals(evalCases, [...PROVIDERS]);
    setEvalResults(results);
    toast.success(`Ran ${results.length} eval results`);
  }

  function handleAdd(): void {
    if (newName.trim() === '' || newPrompt.trim() === '' || newExpected.trim() === '') {
      toast.error('Name, prompt and expected are required');
      return;
    }
    const evalCase: EvalCase = {
      id: `eval-${crypto.randomUUID()}`,
      name: newName.trim(),
      prompt: newPrompt.trim(),
      expected: newExpected.trim(),
      matcher: newMatcher,
    };
    addEvalCase(evalCase);
    setNewName('');
    setNewPrompt('');
    setNewExpected('');
    setNewMatcher('contains');
    toast.success(`Added eval case "${evalCase.name}"`);
  }

  const passRates = passRateByProvider(evalResults);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Evals"
        subtitle="Regression harness across providers"
        action={
          <Btn
            variant="primary"
            onClick={handleRun}
            disabled={evalCases.length === 0}
          >
            Run evals
          </Btn>
        }
      />

      {/* Results matrix */}
      {evalResults.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Results matrix
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-1.5 pr-3 text-slate-600 font-medium">
                    Case
                  </th>
                  {PROVIDERS.map((p) => (
                    <th
                      key={p}
                      className="text-center py-1.5 px-2 text-slate-600 font-medium capitalize"
                    >
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evalCases.map((ec) => (
                  <tr
                    key={ec.id}
                    className="border-t border-slate-100"
                  >
                    <td className="py-1.5 pr-3 text-slate-700 font-medium">
                      {ec.name}
                    </td>
                    {PROVIDERS.map((provider) => {
                      const result = evalResults.find(
                        (r) => r.caseId === ec.id && r.provider === provider
                      );
                      return (
                        <td
                          key={provider}
                          className="text-center py-1.5 px-2"
                        >
                          {result == null ? (
                            <span className="text-slate-300">—</span>
                          ) : result.passed ? (
                            <span className="text-emerald-600 font-bold">✓</span>
                          ) : (
                            <span className="text-rose-500 font-bold">✗</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pass-rate bars */}
      {Object.keys(passRates).length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Pass rate by provider
          </p>
          <div className="space-y-2">
            {PROVIDERS.map((provider) => {
              const rate = passRates[provider] ?? 0;
              return (
                <div key={provider} className="space-y-0.5">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="capitalize">{provider}</span>
                    <span>{Math.round(rate * 100)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${rate * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Cases management */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Cases ({evalCases.length})
        </p>
        {evalCases.length === 0 && (
          <EmptyHint>No eval cases yet. Add one below.</EmptyHint>
        )}
        {evalCases.map((ec) => (
          <Card key={ec.id} className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="text-sm font-medium text-slate-800">{ec.name}</span>
                <div className="flex items-center gap-2">
                  <Badge tone="indigo">{ec.matcher}</Badge>
                  <span className="text-xs text-slate-500">
                    expected: <code className="text-slate-700">{ec.expected}</code>
                  </span>
                </div>
              </div>
              <Btn variant="danger" onClick={() => removeEvalCase(ec.id)}>
                Delete
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {/* Add case form */}
      <Card>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Add Eval Case
        </p>
        <div className="space-y-3">
          <TextInput
            value={newName}
            onChange={setNewName}
            placeholder="Case name"
            label="Name"
          />
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Prompt</p>
            <TextArea
              value={newPrompt}
              onChange={setNewPrompt}
              placeholder="The prompt to evaluate…"
              rows={2}
            />
          </div>
          <TextInput
            value={newExpected}
            onChange={setNewExpected}
            placeholder="Expected output or pattern"
            label="Expected"
          />
          <label className="block text-xs font-medium text-slate-600">
            Matcher
            <select
              value={newMatcher}
              onChange={(e) => setNewMatcher(e.target.value as EvalMatcher)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              <option value="contains">contains</option>
              <option value="equals">equals</option>
              <option value="regex">regex</option>
            </select>
          </label>
          <Btn variant="primary" onClick={handleAdd}>
            Add case
          </Btn>
        </div>
      </Card>
    </div>
  );
}
