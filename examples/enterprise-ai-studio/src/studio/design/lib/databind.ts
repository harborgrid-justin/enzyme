/**
 * Data binding (feature #18).
 *
 * Resolves `{{bind:token}}` placeholders in a page body against connected data
 * sources, giving the dashboards/admin UIs the live data layer Claude Design
 * explicitly omits. Bindings map a token to a dot-path into a source's sample
 * payload.
 */
import type { DataBinding, DataSource } from '../types';

/** Read a dot-path (`user.name`, `items.0.title`) out of an object. */
export function readPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) return acc[Number(key)];
    if (typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export interface BindingResolution {
  html: string;
  resolved: number;
  unresolved: string[];
}

/** Replace `{{bind:token}}` placeholders with values from the bound sources. */
export function resolveBindings(
  html: string,
  bindings: DataBinding[],
  sources: DataSource[]
): BindingResolution {
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  let resolved = 0;
  const unresolved: string[] = [];
  let out = html;

  // Resolve known bindings.
  for (const binding of bindings) {
    const source = sourceById.get(binding.sourceId);
    const placeholder = `{{bind:${binding.token}}}`;
    if (!out.includes(placeholder)) continue;
    const value = source != null ? readPath(source.sample, binding.path) : undefined;
    if (value === undefined) {
      unresolved.push(binding.token);
      continue;
    }
    out = out.split(placeholder).join(String(value));
    resolved += 1;
  }

  // Flag any remaining unbound placeholders.
  for (const m of out.matchAll(/\{\{bind:([\w.-]+)\}\}/g)) {
    if (m[1] != null) unresolved.push(m[1]);
  }

  return { html: out, resolved, unresolved: [...new Set(unresolved)] };
}
