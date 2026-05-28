import { flags } from '@missionfabric-js/enzyme';
import { useMemo, useState } from 'react';
import { MODELS, PROVIDERS, ACCENT_CLASSES, providerOf, modelOrDefault } from '../providers/catalog';
import { useStudioStore } from '../store/studioStore';
import { useAzureStore, liveModelId } from '../azure/store';
import type { ModelDescriptor, ModelCapability } from '../types';

interface ModelPickerProps {
  /** The active conversation's default model — drives the placeholder text. */
  conversationModelId: string;
  /** Surface this as compact (inline w/ composer) or full (popover content). */
  compact?: boolean;
}

/**
 * Provider/model picker. Now a rich popover with grouping by provider, price
 * + context window readouts, and a capabilities row.
 *
 * Beta-flagged models only appear when `beta-features` is on (flip from the
 * right-rail Settings panel).
 */
export function ModelPicker({ conversationModelId, compact }: ModelPickerProps): React.ReactElement {
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);
  const setModelOverride = useStudioStore((s) => s.setModelOverride);
  const liveDeployment = useAzureStore((s) => s.liveDeployment);
  const betaEnabled = flags.useFeatureFlag(flags.flagKeys.BETA_FEATURES);
  const [open, setOpen] = useState(false);

  const activeModelId = modelOverrideId ?? conversationModelId;
  const isLive = activeModelId.startsWith('azure-live:');
  const activeModel = isLive ? null : modelOrDefault(activeModelId);
  const activeLabel = isLive ? (liveDeployment?.label ?? 'Azure live deployment') : activeModel?.label ?? '—';

  const visibleModels = useMemo(
    () => MODELS.filter((m) => betaEnabled || m.beta !== true),
    [betaEnabled]
  );
  const grouped = useMemo(() => groupByProvider(visibleModels), [visibleModels]);

  function selectModel(id: string): void {
    setModelOverride(id === conversationModelId ? null : id);
    setOpen(false);
  }

  return (
    <div className={`relative ${compact === true ? 'text-xs' : ''}`}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Model
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-left text-sm hover:border-indigo-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        <span className="flex min-w-0 items-center gap-2">
          {isLive ? (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-100 text-[10px] font-bold text-emerald-700"
              title="Live Azure Foundry deployment"
            >
              ⬢
            </span>
          ) : (
            <ProviderGlyph modelId={activeModelId} />
          )}
          <span className="min-w-0 truncate font-medium">{activeLabel}</span>
          {isLive && (
            <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-semibold text-emerald-700">
              LIVE
            </span>
          )}
        </span>
        <span className="text-[10px] text-slate-400">▾</span>
      </button>

      {modelOverrideId != null && modelOverrideId !== conversationModelId && (
        <p className="mt-1 text-[11px] text-slate-500">
          Override for this turn ·{' '}
          <button
            type="button"
            onClick={() => setModelOverride(null)}
            className="text-indigo-600 hover:underline"
          >
            reset
          </button>
        </p>
      )}

      {open && (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close model picker"
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />
          <div className="absolute right-0 z-20 mt-1 max-h-96 w-[420px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-2xl">
            {liveDeployment != null && (
              <div className="mb-1 border-b border-slate-100 pb-1">
                <div className="flex items-center gap-2 px-2 py-1">
                  <span className="text-base">⬢</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Azure Foundry · live
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => selectModel(liveModelId(liveDeployment))}
                  className={`block w-full rounded px-2 py-2 text-left text-xs transition ${
                    activeModelId === liveModelId(liveDeployment)
                      ? 'bg-emerald-50 ring-1 ring-emerald-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{liveDeployment.label}</span>
                    <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-semibold text-emerald-700">
                      LIVE
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {liveDeployment.modelName ?? 'deployment'}
                    {liveDeployment.modelVersion != null && `@${liveDeployment.modelVersion}`}
                    {' · '}
                    routed through Azure bridge
                  </p>
                </button>
              </div>
            )}
            {Object.entries(grouped).map(([providerId, models]) => {
              if (models.length === 0) return null;
              const provider = PROVIDERS[providerId as keyof typeof PROVIDERS];
              return (
                <div key={providerId} className="mb-1">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="text-base">{provider.glyph}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {provider.label}
                    </span>
                    <span className="text-[10px] text-slate-400">· {provider.requestFormat} format</span>
                  </div>
                  {models.map((m) => (
                    <ModelOption
                      key={m.id}
                      model={m}
                      isActive={m.id === activeModelId}
                      onClick={() => selectModel(m.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ModelOption({
  model,
  isActive,
  onClick,
}: {
  model: ModelDescriptor;
  isActive: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded px-2 py-2 text-left text-xs transition ${
        isActive
          ? 'bg-indigo-50 ring-1 ring-indigo-200'
          : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-900">{model.label}</span>
        <span className="font-mono text-[10px] text-slate-500">
          ${model.pricing.inputPer1M}/{model.pricing.outputPer1M}·M
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">{model.tagline}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
          {formatContextWindow(model.contextWindow)} ctx
        </span>
        {model.maxOutputTokens != null && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
            {formatContextWindow(model.maxOutputTokens)} out
          </span>
        )}
        {model.beta === true && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            BETA
          </span>
        )}
        {model.capabilities?.slice(0, 3).map((cap) => (
          <CapabilityBadge key={cap} cap={cap} />
        ))}
      </div>
    </button>
  );
}

function CapabilityBadge({ cap }: { cap: ModelCapability }): React.ReactElement {
  const label =
    cap === 'extended-thinking'
      ? 'thinking'
      : cap === 'adaptive-thinking'
        ? 'adaptive'
        : cap === 'computer-use'
          ? 'computer'
          : cap === 'structured-output'
            ? 'structured'
            : cap === 'ultra-long-context'
              ? 'ultra-ctx'
              : cap === 'open-weights'
                ? 'open'
                : cap;
  return (
    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
      {label}
    </span>
  );
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return tokens.toString();
}

function groupByProvider(models: ModelDescriptor[]): Record<string, ModelDescriptor[]> {
  const groups: Record<string, ModelDescriptor[]> = {
    anthropic: [],
    openai: [],
    microsoft: [],
    huggingface: [],
    google: [],
  };
  for (const m of models) (groups[m.provider] ??= []).push(m);
  return groups;
}

function ProviderGlyph({ modelId }: { modelId: string }): React.ReactElement {
  const provider = providerOf(modelId);
  const classes = ACCENT_CLASSES[provider.accent] ?? ACCENT_CLASSES.indigo;
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold ${classes.chip}`}
      title={provider.label}
    >
      {provider.glyph}
    </span>
  );
}

export function ProviderBadge({ modelId }: { modelId: string }): React.ReactElement {
  const provider = providerOf(modelId);
  const classes = ACCENT_CLASSES[provider.accent] ?? ACCENT_CLASSES.indigo;
  return (
    <div className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${classes.chip}`}>
      <span>{provider.glyph}</span>
      <span>{provider.label}</span>
    </div>
  );
}
