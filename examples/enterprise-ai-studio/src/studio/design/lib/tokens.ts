/**
 * Design-token helpers (feature #1).
 *
 * Tokens are the single source of truth for color/type/spacing. We compile a
 * token set into CSS custom properties so any artifact can be re-skinned from
 * one set, and we can rewrite an artifact's literal hex colors to token
 * references so it inherits future palette changes.
 */
import type { DesignToken, TokenSet } from '../types';

/** `color.brand.primary` → `--color-brand-primary`. */
export function tokenCssVar(token: Pick<DesignToken, 'id'>): string {
  return `--${token.id.replace(/[.\s]+/g, '-').toLowerCase()}`;
}

/** Compile a token set into a `:root { … }` CSS block. */
export function tokensToCss(set: TokenSet): string {
  const lines = set.tokens.map((t) => `  ${tokenCssVar(t)}: ${t.value};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

/** A `<style>` element string ready to inject into an artifact's <head>. */
export function tokensToStyleTag(set: TokenSet): string {
  return `<style data-tokens="${set.id}">\n${tokensToCss(set)}\n</style>`;
}

/**
 * Rewrite literal hex colors in `html` to `var(--token)` references when they
 * match a color token's value. Returns the rewritten html and the count of
 * substitutions made.
 */
export function applyColorTokens(
  html: string,
  set: TokenSet
): { html: string; replaced: number } {
  let replaced = 0;
  let out = html;
  for (const token of set.tokens) {
    if (token.category !== 'color') continue;
    const hex = token.value.trim();
    if (!/^#[0-9a-f]{3,8}$/i.test(hex)) continue;
    const pattern = new RegExp(escapeRegExp(hex), 'gi');
    out = out.replace(pattern, () => {
      replaced += 1;
      return `var(${tokenCssVar(token)})`;
    });
  }
  return { html: out, replaced };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
