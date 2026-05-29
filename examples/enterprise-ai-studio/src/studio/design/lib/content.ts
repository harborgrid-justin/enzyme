/**
 * Content & localization logic (features 38–43).
 *
 * Pure helpers for i18n coverage + interpolation, SEO auditing, brand-voice
 * tone rewriting, deterministic image-prompt synthesis, CMS revisioning, and
 * readability scoring.
 */
import type {
  ContentEntry,
  ContentRevision,
  ImageStyle,
  LocaleCatalog,
  SeoIssue,
  SeoMeta,
} from '../types.advanced';

// --- 38. Localization --------------------------------------------------------

/** Translation coverage per non-base locale (0..1). */
export function localeCoverage(catalog: LocaleCatalog): Record<string, number> {
  const out: Record<string, number> = {};
  const total = catalog.strings.length;
  for (const locale of catalog.locales) {
    if (locale === catalog.base) continue;
    const done = catalog.strings.filter((s) => {
      const v = s.values[locale];
      return v != null && v.trim() !== '';
    }).length;
    out[locale] = total === 0 ? 1 : Number((done / total).toFixed(2));
  }
  return out;
}

/** Keys missing a translation in a given locale. */
export function missingKeys(catalog: LocaleCatalog, locale: string): string[] {
  return catalog.strings
    .filter((s) => {
      const v = s.values[locale];
      return v == null || v.trim() === '';
    })
    .map((s) => s.key);
}

/** Interpolate `{name}` placeholders in a localized string. */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}

// --- 39. SEO -----------------------------------------------------------------

/** Audit SEO metadata against common best-practice rules; returns a 0..100 score. */
export function auditSeo(meta: SeoMeta): { issues: SeoIssue[]; score: number } {
  const issues: SeoIssue[] = [];
  const titleLen = meta.title.trim().length;
  if (titleLen === 0) issues.push({ field: 'title', message: 'Title is empty', severity: 'high' });
  else if (titleLen > 60)
    issues.push({ field: 'title', message: 'Title exceeds 60 chars', severity: 'medium' });
  else if (titleLen < 15)
    issues.push({ field: 'title', message: 'Title is very short', severity: 'low' });

  const descLen = meta.description.trim().length;
  if (descLen === 0)
    issues.push({ field: 'description', message: 'Meta description is empty', severity: 'high' });
  else if (descLen > 160)
    issues.push({ field: 'description', message: 'Description exceeds 160 chars', severity: 'medium' });

  if (meta.canonical.trim() === '')
    issues.push({ field: 'canonical', message: 'Missing canonical URL', severity: 'medium' });
  if (meta.ogImage.trim() === '')
    issues.push({ field: 'ogImage', message: 'Missing social share image', severity: 'low' });
  if (meta.keywords.length === 0)
    issues.push({ field: 'keywords', message: 'No target keywords set', severity: 'low' });

  const penalty = issues.reduce(
    (sum, i) => sum + (i.severity === 'high' ? 30 : i.severity === 'medium' ? 15 : 5),
    0
  );
  return { issues, score: Math.max(0, 100 - penalty) };
}

// --- 40. Tone rewriting ------------------------------------------------------

export type Tone = 'concise' | 'confident' | 'friendly';

const HYPE_WORDS = [
  'very',
  'really',
  'super',
  'amazing',
  'incredible',
  'revolutionary',
  'game-changing',
  'cutting-edge',
];

/** Rule-based brand-voice rewrite (deterministic stand-in for an LLM pass). */
export function rewriteTone(text: string, tone: Tone): string {
  let out = text.trim().replace(/\s+/g, ' ');
  if (tone === 'concise' || tone === 'confident') {
    for (const w of HYPE_WORDS) {
      out = out.replace(new RegExp(`\\b${w}\\b ?`, 'gi'), '');
    }
    out = out.replace(/\s+/g, ' ').trim();
  }
  if (tone === 'confident') {
    out = out
      .replace(/\b(I think|we think|maybe|perhaps|might|could possibly)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (tone === 'friendly' && !/[!?]$/.test(out)) {
    out = out.replace(/\.?$/, '!');
  }
  return out;
}

// --- 41. Image synthesis -----------------------------------------------------

const STYLE_HINT: Record<ImageStyle, string> = {
  photographic: 'photorealistic, natural lighting, 50mm',
  illustration: 'flat vector illustration, bold shapes',
  isometric: 'isometric 3D, soft shadows',
  minimal: 'minimal, lots of negative space',
};

/** Compose a richer generation prompt from a brief + style. */
export function buildImagePrompt(brief: string, style: ImageStyle): string {
  return `${brief.trim()} — ${STYLE_HINT[style]}, on-brand palette`;
}

/** Deterministic SVG placeholder (data-URI) so jobs render without a model. */
export function svgPlaceholder(seed: string, style: ImageStyle): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  const hue2 = (hue + 60) % 360;
  const label = style[0]!.toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 70% 55%)"/>` +
    `<stop offset="1" stop-color="hsl(${hue2} 70% 45%)"/></linearGradient></defs>` +
    `<rect width="160" height="120" fill="url(#g)"/>` +
    `<text x="80" y="68" font-family="sans-serif" font-size="40" fill="white" ` +
    `text-anchor="middle" opacity="0.85">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// --- 42. CMS versioning ------------------------------------------------------

/** Commit the current body as a new revision and bump the version. */
export function commitRevision(entry: ContentEntry, body: string, author: string, at: string): ContentEntry {
  const revision: ContentRevision = { version: entry.version, body: entry.body, at, author };
  return {
    ...entry,
    body,
    version: entry.version + 1,
    history: [revision, ...entry.history],
  };
}

/** Line-level change counts between two bodies. */
export function revisionDelta(a: string, b: string): { added: number; removed: number } {
  const al = a.split('\n');
  const bl = b.split('\n');
  const aSet = new Set(al);
  const bSet = new Set(bl);
  return {
    added: bl.filter((l) => !aSet.has(l)).length,
    removed: al.filter((l) => !bSet.has(l)).length,
  };
}

// --- 43. Readability ---------------------------------------------------------

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

export interface Readability {
  /** Flesch Reading Ease (higher = easier; ~60–70 is plain English). */
  ease: number;
  grade: string;
  words: number;
  sentences: number;
}

/** Flesch Reading Ease + a coarse grade label. */
export function readability(text: string): Readability {
  const words = text.match(/[A-Za-z]+/g) ?? [];
  const sentences = (text.match(/[.!?]+/g) ?? []).length || 1;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const wc = Math.max(1, words.length);
  const ease = Number(
    (206.835 - 1.015 * (wc / sentences) - 84.6 * (syllables / wc)).toFixed(1)
  );
  const grade =
    ease >= 70 ? 'Easy' : ease >= 50 ? 'Plain' : ease >= 30 ? 'Difficult' : 'Very difficult';
  return { ease, grade, words: words.length, sentences };
}
