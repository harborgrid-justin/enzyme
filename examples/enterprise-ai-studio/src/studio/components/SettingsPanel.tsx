import { flags } from '@missionfabric-js/enzyme';
import { useStudioStore } from '../store/studioStore';
import { providerOf, modelOrDefault } from '../providers/catalog';
import type { ProviderOptions } from '../types';

/** Feature #48/#49: quick presets for the generation sliders. */
const TEMPERATURE_PRESETS: Array<{ label: string; value: number }> = [
  { label: 'Precise', value: 0.2 },
  { label: 'Balanced', value: 0.7 },
  { label: 'Creative', value: 1.2 },
];
const MAX_TOKEN_PRESETS = [512, 1024, 2048, 4096];

interface SettingsPanelProps {
  /** The model that will be used for the next turn (override or conversation default). */
  activeModelId: string;
}

/**
 * Right-rail Settings panel — generation knobs, provider-specific options
 * surfaced based on the active model's wire format, and feature-flag toggles.
 *
 * The provider-specific block is what makes the "five-provider" flow real:
 * Anthropic shows an Extended-thinking selector, OpenAI shows the service
 * tier + reasoning effort, Microsoft Foundry shows the API version +
 * deployment override, Hugging Face shows the routing policy, Google shows
 * the thinking budget + code-execution toggle.
 */
export function SettingsPanel({ activeModelId }: SettingsPanelProps): React.ReactElement {
  const temperature = useStudioStore((s) => s.temperature);
  const maxTokens = useStudioStore((s) => s.maxTokens);
  const setTemperature = useStudioStore((s) => s.setTemperature);
  const setMaxTokens = useStudioStore((s) => s.setMaxTokens);
  const providerOptions = useStudioStore((s) => s.providerOptions);
  const setProviderOption = useStudioStore((s) => s.setProviderOption);
  const resetGenerationSettings = useStudioStore((s) => s.resetGenerationSettings);
  const { flags: flagState, setFlag } = flags.useFeatureFlags();

  const provider = providerOf(activeModelId);

  // Feature #52: estimated worst-case cost of the next response, from the
  // active model's output pricing and the Max-tokens cap.
  const model = modelOrDefault(activeModelId);
  const estMaxResponseCost = (maxTokens / 1_000_000) * model.pricing.outputPer1M;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Generation</h3>
        {/* Feature #51: restore defaults. */}
        <button
          type="button"
          onClick={resetGenerationSettings}
          className="text-[11px] text-slate-500 hover:text-indigo-600 hover:underline"
          title="Reset temperature, max tokens, and provider options to defaults"
        >
          reset
        </button>
      </div>

      <Slider
        label="Temperature"
        value={temperature}
        min={0}
        max={2}
        step={0.1}
        onChange={setTemperature}
        hint="Lower = focused, higher = exploratory"
        format={(v) => v.toFixed(1)}
      />
      {/* Feature #48: temperature presets. */}
      <PresetRow
        options={TEMPERATURE_PRESETS.map((p) => ({
          label: p.label,
          active: Math.abs(temperature - p.value) < 0.001,
          onClick: () => setTemperature(p.value),
        }))}
      />

      <Slider
        label="Max tokens"
        value={maxTokens}
        min={32}
        max={4096}
        step={32}
        onChange={setMaxTokens}
        hint="Cap on the response length"
        format={(v) => v.toLocaleString()}
      />
      {/* Feature #49: max-token presets. */}
      <PresetRow
        options={MAX_TOKEN_PRESETS.map((value) => ({
          label: value >= 1024 ? `${value / 1024}k` : String(value),
          active: maxTokens === value,
          onClick: () => setMaxTokens(value),
        }))}
      />

      {/* Feature #52: estimated max response cost. */}
      <p className="mt-1 text-[11px] text-slate-400">
        Est. max response cost:{' '}
        <span className="font-mono text-slate-600">${estMaxResponseCost.toFixed(4)}</span>{' '}
        at {maxTokens.toLocaleString()} output tokens
      </p>

      <div className="mb-2 mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {provider.label} options
        </h3>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-indigo-600 hover:underline"
        >
          docs ↗
        </a>
      </div>

      <ProviderSpecificOptions
        formatId={provider.requestFormat}
        options={providerOptions}
        setOption={setProviderOption}
      />

      <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-900">Feature flags</h3>
      <div className="space-y-2">
        <FlagSwitch
          label="Beta models"
          description="Show preview / experimental models in the picker"
          enabled={flagState[flags.flagKeys.BETA_FEATURES] === true}
          onToggle={(value) => setFlag(flags.flagKeys.BETA_FEATURES, value)}
        />
        <FlagSwitch
          label="Dark mode"
          description="Toggle the dark theme"
          enabled={flagState[flags.flagKeys.DARK_MODE] === true}
          onToggle={(value) => setFlag(flags.flagKeys.DARK_MODE, value)}
        />
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Per-provider option blocks
// -----------------------------------------------------------------------------

interface ProviderSpecificProps {
  formatId: ReturnType<typeof providerOf>['requestFormat'];
  options: ProviderOptions;
  setOption: <K extends keyof ProviderOptions>(key: K, value: ProviderOptions[K]) => void;
}

function ProviderSpecificOptions({
  formatId,
  options,
  setOption,
}: ProviderSpecificProps): React.ReactElement {
  switch (formatId) {
    case 'anthropic':
      return (
        <div className="space-y-3">
          <Select
            label="Extended thinking"
            value={options.anthropic_thinking ?? 'off'}
            choices={[
              { value: 'off', label: 'Off' },
              { value: 'low', label: 'Low (1k token budget)' },
              { value: 'medium', label: 'Medium (4k token budget)' },
              { value: 'high', label: 'High (16k token budget)' },
            ]}
            onChange={(v) => setOption('anthropic_thinking', v as ProviderOptions['anthropic_thinking'])}
            hint="Allocates a thinking budget on Opus/Sonnet 4.x"
          />
        </div>
      );
    case 'openai':
      return (
        <div className="space-y-3">
          <Select
            label="Service tier"
            value={options.openai_service_tier ?? 'auto'}
            choices={[
              { value: 'auto', label: 'Auto' },
              { value: 'default', label: 'Default' },
              { value: 'flex', label: 'Flex (cheaper, slower)' },
              { value: 'priority', label: 'Priority (faster, +cost)' },
            ]}
            onChange={(v) =>
              setOption('openai_service_tier', v as ProviderOptions['openai_service_tier'])
            }
            hint="Maps to OpenAI's service_tier parameter"
          />
          <Select
            label="Reasoning effort"
            value={options.openai_reasoning_effort ?? 'medium'}
            choices={[
              { value: 'minimal', label: 'Minimal' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            onChange={(v) =>
              setOption('openai_reasoning_effort', v as ProviderOptions['openai_reasoning_effort'])
            }
            hint="GPT-5.x and o-series only"
          />
        </div>
      );
    case 'azure-openai':
      return (
        <div className="space-y-3">
          <TextInput
            label="API version"
            value={options.foundry_api_version ?? '2024-10-21'}
            onChange={(v) => setOption('foundry_api_version', v)}
            hint="?api-version=… query string"
          />
          <TextInput
            label="Deployment name override"
            value={options.foundry_deployment ?? ''}
            placeholder="use the catalog's default"
            onChange={(v) => setOption('foundry_deployment', v === '' ? undefined : v)}
            hint="Goes into the URL path"
          />
        </div>
      );
    case 'huggingface':
      return (
        <div className="space-y-3">
          <Select
            label="Provider routing"
            value={options.huggingface_provider ?? 'auto'}
            choices={[
              { value: 'auto', label: 'Auto (HF picks)' },
              { value: 'fastest', label: 'Fastest (highest tok/s)' },
              { value: 'cheapest', label: 'Cheapest (lowest $/tok)' },
              { value: 'preferred', label: 'Preferred (from HF settings)' },
              { value: 'together', label: 'Together AI' },
              { value: 'fireworks-ai', label: 'Fireworks AI' },
              { value: 'sambanova', label: 'SambaNova' },
              { value: 'groq', label: 'Groq' },
              { value: 'cerebras', label: 'Cerebras' },
            ]}
            onChange={(v) =>
              setOption('huggingface_provider', v as ProviderOptions['huggingface_provider'])
            }
            hint="Appended as a `:suffix` to the model id"
          />
        </div>
      );
    case 'gemini':
      return (
        <div className="space-y-3">
          <Slider
            label="Thinking budget"
            value={options.gemini_thinking_budget ?? -1}
            min={-1}
            max={32_768}
            step={512}
            onChange={(v) => setOption('gemini_thinking_budget', v)}
            format={(v) => (v < 0 ? 'dynamic' : v === 0 ? 'off' : `${v.toLocaleString()} tok`)}
            hint="-1 = dynamic, 0 = disabled, else token cap"
          />
          <FlagSwitch
            label="Code execution"
            description="Enable Gemini's built-in code execution tool"
            enabled={options.gemini_code_execution === true}
            onToggle={(value) => setOption('gemini_code_execution', value)}
          />
        </div>
      );
  }
}

// -----------------------------------------------------------------------------
// Reusable form controls
// -----------------------------------------------------------------------------

interface PresetRowProps {
  options: Array<{ label: string; active: boolean; onClick: () => void }>;
}

/** A row of small "quick set" preset buttons under a slider. */
function PresetRow({ options }: PresetRowProps): React.ReactElement {
  return (
    <div className="mb-3 mt-1 flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={opt.onClick}
          aria-pressed={opt.active}
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
            opt.active
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  hint,
  format,
  onChange,
}: SliderProps): React.ReactElement {
  const display = format != null ? format(value) : String(value);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-indigo-600"
      />
      {hint != null && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

interface SelectProps {
  label: string;
  value: string;
  choices: Array<{ value: string; label: string }>;
  hint?: string;
  onChange: (value: string) => void;
}

function Select({ label, value, choices, hint, onChange }: SelectProps): React.ReactElement {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        {choices.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      {hint != null && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  onChange: (value: string) => void;
}

function TextInput({
  label,
  value,
  placeholder,
  hint,
  onChange,
}: TextInputProps): React.ReactElement {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      {hint != null && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

interface FlagSwitchProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

function FlagSwitch({
  label,
  description,
  enabled,
  onToggle,
}: FlagSwitchProps): React.ReactElement {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded border border-slate-200 px-3 py-2 hover:bg-slate-50">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-[11px] text-slate-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 h-4 w-4 accent-indigo-600"
      />
    </label>
  );
}
