/**
 * Prompt template rendering (feature #23).
 *
 * Versioned org prompts with `{{variable}}` interpolation. Pure helpers for
 * extracting variables and rendering a template with supplied values.
 */
import type { PromptTemplate } from '../types';

/** Distinct `{{var}}` names referenced in a template body. */
export function extractVariables(template: string): string[] {
  const names = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)) {
    if (m[1] != null) names.add(m[1]);
  }
  return [...names];
}

/** Render the latest version of a template with the supplied variable values. */
export function renderPrompt(
  template: PromptTemplate,
  values: Record<string, string>
): string {
  const latest = template.versions[template.versions.length - 1];
  if (latest == null) return '';
  return latest.template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, name: string) => values[name] ?? `{{${name}}}`);
}

/** Append a new version to a template, bumping the version number. */
export function addVersion(template: PromptTemplate, body: string): PromptTemplate {
  const nextVersion = (template.versions[template.versions.length - 1]?.version ?? 0) + 1;
  return {
    ...template,
    variables: extractVariables(body),
    versions: [
      ...template.versions,
      { version: nextVersion, template: body, createdAt: new Date().toISOString() },
    ],
  };
}
