/**
 * Brand-kit guardrails (feature #9).
 *
 * Lints an artifact against the org brand kit: colors must come from the
 * approved palette, font families from the approved set. Returns concrete
 * violations the panel can surface (and, for colors, the nearest on-brand
 * swatch to snap to).
 */
import type { BrandKit } from '../types';
import { contrastRatio } from './a11y';

export interface BrandViolation {
  kind: 'color' | 'font';
  value: string;
  message: string;
  /** Closest approved value, when one can be suggested. */
  suggestion?: string;
}

export function checkBrand(html: string, kit: BrandKit): BrandViolation[] {
  const violations: BrandViolation[] = [];
  const palette = kit.palette.map((c) => c.toLowerCase());

  const seenColors = new Set<string>();
  for (const m of html.matchAll(/#[0-9a-f]{6}/gi)) {
    const color = m[0].toLowerCase();
    if (seenColors.has(color) || palette.includes(color)) continue;
    seenColors.add(color);
    violations.push({
      kind: 'color',
      value: color,
      message: `${color} is not in the brand palette`,
      suggestion: nearestColor(color, kit.palette),
    });
  }

  const seenFonts = new Set<string>();
  for (const m of html.matchAll(/font-family:\s*([^;"']+)/gi)) {
    const family = (m[1] ?? '').split(',')[0]!.trim().replace(/["']/g, '');
    if (family.length === 0 || seenFonts.has(family)) continue;
    seenFonts.add(family);
    const allowed = kit.fonts.some((f) => f.toLowerCase() === family.toLowerCase());
    if (!allowed) {
      violations.push({
        kind: 'font',
        value: family,
        message: `"${family}" is not an approved brand font`,
        suggestion: kit.fonts[0],
      });
    }
  }

  return violations;
}

/** Pick the palette entry with the highest contrast-similarity to `color`. */
export function nearestColor(color: string, palette: string[]): string | undefined {
  if (palette.length === 0) return undefined;
  let best = palette[0]!;
  let bestDelta = Infinity;
  for (const candidate of palette) {
    // Lower contrast ratio between the two = visually closer.
    const delta = contrastRatio(color, candidate);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate;
    }
  }
  return best;
}
