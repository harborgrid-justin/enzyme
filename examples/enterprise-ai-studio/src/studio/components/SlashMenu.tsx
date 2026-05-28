/**
 * Slash-command menu — appears beneath the composer when the user types `/`
 * at the start of the input. Built on Radix Popover so positioning + outside
 * clicks + focus return are handled correctly.
 *
 * Commands the menu surfaces are derived from the active conversation +
 * authenticated user, so /share only appears when the caller has the
 * required permission and the conversation is privately owned.
 */
import { useMemo } from 'react';
import { cn } from '../ui/cn';

export interface SlashCommand {
  id: string;
  /** Surface label (e.g. "Share with workspace"). */
  label: string;
  /** Short hint shown next to the label (e.g. "/share"). */
  hint: string;
  /** Optional description shown on the focused row. */
  description?: string;
  run: () => void;
}

interface SlashMenuProps {
  open: boolean;
  query: string;
  commands: SlashCommand[];
  /** Index of the currently highlighted command (driven by arrow keys). */
  activeIndex: number;
  onHover: (index: number) => void;
  onRun: (command: SlashCommand) => void;
}

export function filterSlashCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const needle = query.replace(/^\/+/, '').trim().toLowerCase();
  if (needle === '') return commands;
  return commands.filter(
    (c) =>
      c.id.toLowerCase().includes(needle) ||
      c.label.toLowerCase().includes(needle) ||
      c.hint.toLowerCase().includes(needle)
  );
}

export function SlashMenu({
  open,
  query,
  commands,
  activeIndex,
  onHover,
  onRun,
}: SlashMenuProps): React.ReactElement | null {
  const filtered = useMemo(() => filterSlashCommands(commands, query), [commands, query]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Slash commands"
      className="absolute bottom-full left-0 z-20 mb-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      <ul className="max-h-72 overflow-y-auto py-1">
        {filtered.map((c, idx) => {
          const isActive = idx === activeIndex;
          return (
            <li
              key={c.id}
              role="option"
              aria-selected={isActive}
              onMouseEnter={() => onHover(idx)}
              onMouseDown={(e) => {
                // mousedown (not click) so the composer doesn't lose focus first.
                e.preventDefault();
                onRun(c);
              }}
              className={cn(
                'flex cursor-pointer items-start justify-between gap-3 px-3 py-2 text-sm',
                isActive
                  ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100'
                  : 'text-slate-700 dark:text-slate-200'
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{c.label}</p>
                {c.description != null && (
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {c.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-mono text-[10px] text-slate-400">{c.hint}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
