import { flags } from '@missionfabric-js/enzyme';
import { useStudioStore } from '../store/studioStore';

/**
 * Right-rail Settings panel — generation knobs (temperature, max tokens) and
 * the feature-flag toggles that gate beta models / dark mode.
 */
export function SettingsPanel(): React.ReactElement {
  const temperature = useStudioStore((s) => s.temperature);
  const maxTokens = useStudioStore((s) => s.maxTokens);
  const setTemperature = useStudioStore((s) => s.setTemperature);
  const setMaxTokens = useStudioStore((s) => s.setMaxTokens);
  const { flags: flagState, setFlag } = flags.useFeatureFlags();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Generation</h3>

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

      <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-900">Feature flags</h3>
      <div className="space-y-2">
        <FlagSwitch
          label="Beta models"
          description="Show experimental models (Llama 4 405B)"
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
