import { flags } from '@missionfabric-js/enzyme';
import { MODELS, PROVIDERS, ACCENT_CLASSES, providerOf } from '../providers/catalog';
import { useStudioStore } from '../store/studioStore';

interface ModelPickerProps {
  /** The active conversation's default model — drives the placeholder text. */
  conversationModelId: string;
  /** Surface this as compact (inline w/ composer) or full (popover content). */
  compact?: boolean;
}

/**
 * Provider/model picker. Beta-flagged models (currently Llama 4 405B) only
 * appear when the `beta-features` flag is on — flip it from the right-rail
 * Settings panel to see the gating take effect.
 */
export function ModelPicker({ conversationModelId, compact }: ModelPickerProps): React.ReactElement {
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);
  const setModelOverride = useStudioStore((s) => s.setModelOverride);
  const betaEnabled = flags.useFeatureFlag(flags.flagKeys.BETA_FEATURES);

  const activeModelId = modelOverrideId ?? conversationModelId;
  const visibleModels = MODELS.filter((m) => betaEnabled || m.beta !== true);
  const grouped = groupByProvider(visibleModels);

  return (
    <div className={compact === true ? 'text-xs' : ''}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Model
      </label>
      <select
        value={activeModelId}
        onChange={(e) => {
          const value = e.target.value;
          setModelOverride(value === conversationModelId ? null : value);
        }}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        {Object.entries(grouped).map(([providerId, models]) => {
          const provider = PROVIDERS[providerId as keyof typeof PROVIDERS];
          return (
            <optgroup key={providerId} label={`${provider.glyph}  ${provider.label}`}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {m.beta === true ? '  ·  BETA' : ''}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      {modelOverrideId != null && modelOverrideId !== conversationModelId && (
        <p className="mt-1 text-[11px] text-slate-500">
          Overriding conversation default · this turn only
          <button
            type="button"
            onClick={() => setModelOverride(null)}
            className="ml-1 text-indigo-600 hover:underline"
          >
            reset
          </button>
        </p>
      )}
      <ProviderBadge modelId={activeModelId} />
    </div>
  );
}

function groupByProvider(models: typeof MODELS): Record<string, typeof MODELS> {
  return models.reduce<Record<string, typeof MODELS>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});
}

export function ProviderBadge({ modelId }: { modelId: string }): React.ReactElement {
  const provider = providerOf(modelId);
  const classes = ACCENT_CLASSES[provider.accent] ?? ACCENT_CLASSES.indigo;
  return (
    <div className={`mt-1 inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${classes.chip}`}>
      <span>{provider.glyph}</span>
      <span>{provider.label}</span>
    </div>
  );
}
