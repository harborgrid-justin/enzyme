import { useEffect, useMemo, useState } from 'react';
import {
  useCognitiveAccounts,
  useDeployableModels,
  useDeployModel,
  type DeployLogLine,
} from '../../azure/api';
import { useAzureStore } from '../../azure/store';
import {
  DEFAULT_TEMPLATE,
  DEPLOYMENT_TEMPLATES,
  SKU_CHOICES,
  type DeploymentTemplate,
} from '../../azure/deploymentCatalog';
import type { DeployRequest } from '../../azure/types';

/**
 * Live deploy wizard.
 *
 * Flow:
 *   1. Pick a starter template (preset) — DeepSeek V4 Pro is the default
 *      because it was the user's stated investor-demo target.
 *   2. Pick the target Cognitive Services / Foundry account (from real az output).
 *   3. Tune the deployment name, SKU, capacity (defaults pre-filled).
 *   4. Confirm. We POST to /api/azure/cognitive/deploy which shells out to
 *      `az cognitiveservices account deployment create` and streams the log
 *      back via SSE.
 *
 * Errors are surfaced inline; on success the deployments list refetches and
 * the new deployment appears with a "Use in studio" CTA in the list above.
 */
export function DeployModelWizard(): React.ReactElement | null {
  const subscriptionId = useAzureStore((s) => s.selectedSubscriptionId);
  const accountFromStore = useAzureStore((s) => s.selectedAccountName);
  const { data: accounts } = useCognitiveAccounts(subscriptionId);

  const [template, setTemplate] = useState<DeploymentTemplate>(DEFAULT_TEMPLATE);
  const [accountName, setAccountName] = useState<string | null>(accountFromStore);
  const [deploymentName, setDeploymentName] = useState(template.defaultDeploymentName);
  const [skuName, setSkuName] = useState(template.skuName);
  const [skuCapacity, setSkuCapacity] = useState(template.skuCapacity);
  const [modelName, setModelName] = useState(template.modelName);
  const [modelVersion, setModelVersion] = useState(template.modelVersion);
  const [modelFormat, setModelFormat] = useState(template.modelFormat);
  const [log, setLog] = useState<DeployLogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  // When the user switches templates, refill the form with that preset's defaults.
  useEffect(() => {
    setDeploymentName(template.defaultDeploymentName);
    setSkuName(template.skuName);
    setSkuCapacity(template.skuCapacity);
    setModelName(template.modelName);
    setModelVersion(template.modelVersion);
    setModelFormat(template.modelFormat);
  }, [template]);

  // Sync with whatever the user picked in the deployments list above.
  useEffect(() => {
    if (accountFromStore != null) setAccountName(accountFromStore);
  }, [accountFromStore]);

  const account = useMemo(
    () => (accounts ?? []).find((a) => a.name === accountName) ?? null,
    [accounts, accountName]
  );
  const { data: availableModels } = useDeployableModels(
    subscriptionId,
    account?.resourceGroup ?? null,
    account?.name ?? null
  );

  const { start } = useDeployModel();

  async function runDeploy(): Promise<void> {
    if (account == null || subscriptionId == null) return;
    setLog([]);
    setExitCode(null);
    setRunning(true);
    const body: DeployRequest = {
      subscriptionId,
      resourceGroup: account.resourceGroup,
      accountName: account.name,
      deploymentName,
      modelName,
      modelVersion,
      modelFormat,
      skuName,
      skuCapacity,
    };
    const c = await start(body, {
      onLog: (line) => setLog((prev) => [...prev, line]),
      onDone: (code) => {
        setExitCode(code);
        setRunning(false);
      },
      onError: (message) => {
        setLog((prev) => [...prev, { ts: Date.now(), stream: 'meta', line: `⚠ ${message}` }]);
        setExitCode(-1);
        setRunning(false);
      },
    });
    setController(c);
  }

  function abort(): void {
    controller?.abort();
    setRunning(false);
  }

  if (subscriptionId == null) {
    return null;
  }

  const canDeploy =
    !running && account != null && deploymentName.trim() !== '' && modelName.trim() !== '';

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">Deploy a model to Foundry</h3>

      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Starter template
          </label>
          <div className="grid grid-cols-2 gap-1">
            {DEPLOYMENT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t)}
                className={`rounded-md border px-2 py-1.5 text-left text-[11px] transition ${
                  t.id === template.id
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{t.label}</span>
                  {t.recommended === true && (
                    <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-semibold text-emerald-700">
                      DEFAULT
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">{t.blurb}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  ~${t.estimatedHourlyUsd.toFixed(2)}/hr est.
                </p>
              </button>
            ))}
          </div>
        </div>

        <Row label="Account">
          <select
            value={accountName ?? ''}
            onChange={(e) => setAccountName(e.target.value || null)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">— pick a Cognitive Services account —</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.name}>
                {a.name} ({a.location})
              </option>
            ))}
          </select>
        </Row>

        <Row label="Deployment name">
          <input
            type="text"
            value={deploymentName}
            onChange={(e) => setDeploymentName(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </Row>

        <div className="grid grid-cols-3 gap-2">
          <Row label="Model name">
            <input
              list="azure-model-names"
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {/* Real available models from az for this account — used as input suggestions. */}
            <datalist id="azure-model-names">
              {(availableModels ?? []).map((m) => {
                const name = m.model?.name ?? m.name;
                if (name == null) return null;
                return <option key={name} value={name} />;
              })}
            </datalist>
          </Row>
          <Row label="Version">
            <input
              type="text"
              value={modelVersion}
              onChange={(e) => setModelVersion(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </Row>
          <Row label="Format">
            <input
              type="text"
              value={modelFormat}
              onChange={(e) => setModelFormat(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </Row>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Row label="SKU">
            <select
              value={skuName}
              onChange={(e) => setSkuName(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {SKU_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Capacity (TPM × 1000)">
            <input
              type="number"
              min={1}
              max={1000}
              value={skuCapacity}
              onChange={(e) => setSkuCapacity(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </Row>
          <div className="flex items-end">
            {running ? (
              <button
                type="button"
                onClick={abort}
                className="w-full rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
              >
                Abort
              </button>
            ) : (
              <button
                type="button"
                disabled={!canDeploy}
                onClick={() => void runDeploy()}
                className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                Deploy →
              </button>
            )}
          </div>
        </div>
      </div>

      {(log.length > 0 || running) && (
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Deploy log
            </span>
            {running && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
            {exitCode != null && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                  exitCode === 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                exit {exitCode}
              </span>
            )}
          </div>
          <pre className="max-h-64 overflow-auto rounded bg-slate-950 p-2 font-mono text-[10px] leading-relaxed text-slate-200">
            {log.map((entry, i) => (
              <div key={i} className={entry.stream === 'stderr' ? 'text-rose-300' : entry.stream === 'meta' ? 'text-indigo-300' : ''}>
                {entry.line}
              </div>
            ))}
          </pre>
        </div>
      )}

      <p className="mt-2 text-[10px] text-slate-400">
        Executes <code className="px-1">az cognitiveservices account deployment create</code> with
        the fields above. Live cost on a real Azure account.
      </p>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
