/**
 * Tool use / function calling (feature #22).
 *
 * A registry of tools the assistant can "call" during generation, plus a
 * deterministic executor that stands in for real side-effects in the
 * no-backend studio. Swapping `executeTool` for real handlers is the only
 * change needed to go live.
 */
import type { DesignTool, ToolInvocation } from '../types';

let invocationCounter = 0;

/** Validate that the supplied args satisfy the tool's declared params. */
export function validateArgs(tool: DesignTool, args: Record<string, string>): string[] {
  const errors: string[] = [];
  for (const param of tool.params) {
    const raw = args[param.name];
    if (raw == null || raw.trim() === '') {
      errors.push(`Missing argument: ${param.name}`);
      continue;
    }
    if (param.type === 'number' && Number.isNaN(Number(raw))) {
      errors.push(`${param.name} must be a number`);
    }
    if (param.type === 'boolean' && raw !== 'true' && raw !== 'false') {
      errors.push(`${param.name} must be true or false`);
    }
  }
  return errors;
}

/** Deterministic stand-in execution for each known tool. */
export function executeTool(tool: DesignTool, args: Record<string, string>): ToolInvocation {
  invocationCounter += 1;
  let result: string;
  switch (tool.id) {
    case 'fetch-data':
      result = `Fetched 12 rows from ${args.url ?? '(url)'} (cached 30s).`;
      break;
    case 'query-db':
      result = `Query OK — 3 rows: [{"id":1},{"id":2},{"id":3}] for "${args.sql ?? ''}".`;
      break;
    case 'palette-from-image':
      result = `Extracted palette: #0f172a, #6366f1, #f8fafc from ${args.url ?? 'image'}.`;
      break;
    default:
      result = `Tool "${tool.name}" executed with ${Object.keys(args).length} args.`;
  }
  return {
    id: `inv-${Date.now().toString(36)}-${invocationCounter}`,
    toolId: tool.id,
    args,
    result,
    createdAt: new Date().toISOString(),
  };
}
