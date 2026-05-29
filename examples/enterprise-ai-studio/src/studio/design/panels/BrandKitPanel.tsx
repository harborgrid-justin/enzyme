import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  TextArea,
  Badge,
  Card,
  EmptyHint,
  PreviewFrame,
} from '../ui';
import { checkBrand, type BrandViolation } from '../lib/brand';
import type { BrandKit } from '../types';

export function BrandKitPanel(): React.ReactElement {
  const brand = useDesignStore((s) => s.brand);
  const updateBrand = useDesignStore((s) => s.updateBrand);
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);
  const updatePageBody = useDesignStore((s) => s.updatePageBody);

  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  const violations: BrandViolation[] =
    activePage != null ? checkBrand(activePage.body, brand) : [];

  function handleSnap(v: BrandViolation): void {
    if (activePage == null || v.suggestion == null) return;
    const updated = activePage.body.split(v.value).join(v.suggestion);
    updatePageBody(activePage.id, updated);
  }

  function handlePaletteChange(raw: string): void {
    const palette = raw
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    updateBrand({ palette } satisfies Partial<BrandKit>);
  }

  function handleFontsChange(raw: string): void {
    const fonts = raw
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
    updateBrand({ fonts } satisfies Partial<BrandKit>);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Brand Kit"
        subtitle="Guardrails and brand identity editor"
      />

      {/* Logo + name */}
      <Card>
        <div className="flex items-center gap-4">
          <PreviewFrame body={brand.logoSvg} kind="svg" className="h-24 w-24 shrink-0 rounded-md border border-slate-200" />
          <div className="flex-1 space-y-2">
            <TextInput
              label="Brand name"
              value={brand.name}
              onChange={(v) => updateBrand({ name: v })}
            />
          </div>
        </div>
      </Card>

      {/* Palette */}
      <Card>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Palette</p>
          <div className="flex flex-wrap gap-2">
            {brand.palette.map((hex) => (
              <div
                key={hex}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1"
              >
                <span
                  className="inline-block h-4 w-4 rounded-full border border-slate-300"
                  style={{ background: hex }}
                />
                <span className="text-xs font-mono text-slate-700">{hex}</span>
              </div>
            ))}
          </div>
          <TextInput
            label="Edit palette (comma-separated hex)"
            value={brand.palette.join(', ')}
            onChange={handlePaletteChange}
            placeholder="#6366f1, #0ea5e9"
          />
        </div>
      </Card>

      {/* Fonts */}
      <Card>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Fonts</p>
          <TextInput
            label="Approved fonts (comma-separated)"
            value={brand.fonts.join(', ')}
            onChange={handleFontsChange}
            placeholder="Inter, system-ui"
          />
        </div>
      </Card>

      {/* Voice */}
      <Card>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Voice & Tone</p>
          <TextArea
            value={brand.voice}
            onChange={(v) => updateBrand({ voice: v })}
            rows={3}
            placeholder="Describe your brand voice…"
          />
        </div>
      </Card>

      {/* Violations */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Brand lint
          {activePage != null ? ` — "${activePage.name}"` : ''}
        </p>

        {activePage == null && (
          <EmptyHint>No active page — select one to lint against brand rules.</EmptyHint>
        )}

        {activePage != null && violations.length === 0 && (
          <EmptyHint>No brand violations found on this page.</EmptyHint>
        )}

        {violations.map((v, i) => (
          <Card key={`${v.kind}-${v.value}-${i}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge tone={v.kind === 'color' ? 'indigo' : 'amber'}>{v.kind}</Badge>
                  <span className="text-xs font-mono text-slate-600">{v.value}</span>
                </div>
                <p className="text-sm text-slate-800">{v.message}</p>
                {v.suggestion != null && (
                  <p className="text-xs text-slate-400">
                    Suggestion: <span className="font-mono">{v.suggestion}</span>
                  </p>
                )}
              </div>
              {v.suggestion != null && (
                <Btn variant="primary" onClick={() => handleSnap(v)}>
                  Snap to {v.suggestion}
                </Btn>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
