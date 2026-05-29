/**
 * Component extraction + rendering (feature #2).
 *
 * Turns a repeated block of markup into a reusable component by detecting
 * obvious "slots" (the visible text of leaf elements, hrefs, and the first
 * color) and parameterizing them as `{{prop}}` placeholders.
 */
import type { ComponentProp, DesignComponent } from '../types';

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/**
 * Derive a parameterized component body + prop list from a raw markup block.
 * The first visible text run becomes `{{label}}`, the first href `{{href}}`,
 * and the first inline hex color `{{color}}`.
 */
export function extractComponent(name: string, markup: string): DesignComponent {
  const props: ComponentProp[] = [];
  let body = markup.trim();

  const textMatch = body.match(/>([^<>{][^<>]*?)</);
  if (textMatch?.[1] != null && textMatch[1].trim().length > 0) {
    props.push({ name: 'label', type: 'text', defaultValue: textMatch[1].trim() });
    body = body.replace(textMatch[1], '{{label}}');
  }

  const hrefMatch = body.match(/href="([^"]*)"/);
  if (hrefMatch?.[1] != null) {
    props.push({ name: 'href', type: 'url', defaultValue: hrefMatch[1] });
    body = body.replace(`href="${hrefMatch[1]}"`, 'href="{{href}}"');
  }

  const colorMatch = body.match(/#[0-9a-f]{6}/i);
  if (colorMatch?.[0] != null) {
    props.push({ name: 'color', type: 'color', defaultValue: colorMatch[0] });
    body = body.split(colorMatch[0]).join('{{color}}');
  }

  return {
    id: uid('cmp'),
    name,
    body,
    props,
    origin: 'extracted',
    createdAt: new Date().toISOString(),
  };
}

/** Fill a component's placeholders with concrete prop values. */
export function renderComponent(
  component: DesignComponent,
  overrides: Record<string, string> = {}
): string {
  let out = component.body;
  for (const prop of component.props) {
    const value = overrides[prop.name] ?? prop.defaultValue;
    out = out.split(`{{${prop.name}}}`).join(value);
  }
  return out;
}

/** Extract the list of `{{placeholder}}` names referenced in a body. */
export function placeholderNames(body: string): string[] {
  const names = new Set<string>();
  const re = /\{\{\s*([\w-]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) != null) {
    if (match[1] != null) names.add(match[1]);
  }
  return [...names];
}
