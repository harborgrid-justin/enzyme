/**
 * Command palette (⌘K). Built on `cmdk` for the accessible combobox, list
 * filtering, and arrow-key nav semantics. Surfaces:
 *
 *   - Conversation jumps (every visible conversation, fuzzy-matched by title)
 *   - Model switches on the active conversation (every entry in the catalog)
 *   - Studio actions: new chat, toggle theme, toggle Azure console,
 *     show keyboard shortcuts
 *
 * Opening is bound to ⌘K globally — see `StudioShell.tsx`.
 */
import { Command } from 'cmdk';
import { theme } from '@missionfabric-js/enzyme';
import { useEffect } from 'react';
import { useConversations, useConversationMessages } from '../api/conversations';
import { useDuplicateConversation } from '../api/useDuplicateConversation';
import { useStudioStore } from '../store/studioStore';
import { useAzureStore } from '../azure/store';
import { MODELS, providerOf } from '../providers/catalog';
import {
  exportConversationJson,
  exportConversationMarkdown,
} from '../utils/exportConversation';
import { toast } from './toast';
import { cn } from './cn';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartNew: () => void;
  onShowShortcuts: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onStartNew,
  onShowShortcuts,
}: CommandPaletteProps): React.ReactElement {
  const { data: conversations } = useConversations();
  const setActiveConversation = useStudioStore((s) => s.setActiveConversation);
  const setModelOverride = useStudioStore((s) => s.setModelOverride);
  const activeConversationId = useStudioStore((s) => s.activeConversationId);
  const temperature = useStudioStore((s) => s.temperature);
  const setTemperature = useStudioStore((s) => s.setTemperature);
  const resetGenerationSettings = useStudioStore((s) => s.resetGenerationSettings);
  const toggleSettings = useStudioStore((s) => s.toggleSettings);
  const toggleUsage = useStudioStore((s) => s.toggleUsage);
  const isAzureConsoleOpen = useAzureStore((s) => s.isConsoleOpen);
  const setAzureConsoleOpen = useAzureStore((s) => s.setConsoleOpen);
  const { resolvedTheme, toggleTheme, darkModeEnabled } = theme.useThemeContext();
  const { duplicate } = useDuplicateConversation();
  const { data: activeMessages } = useConversationMessages(activeConversationId);
  const activeConversation = (conversations ?? []).find((c) => c.id === activeConversationId);

  // Esc handled by Command.Dialog. Reset filter on close so the next open
  // starts fresh.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  function run(action: () => void): void {
    action();
    onOpenChange(false);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 pt-[15vh]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none'
      )}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <Command.Input
          autoFocus
          placeholder="Type a command, conversation, or model…"
          className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none dark:border-slate-800 dark:text-slate-100"
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-1 text-sm">
          <Command.Empty className="px-3 py-6 text-center text-xs text-slate-400">
            No matches.
          </Command.Empty>

          <Command.Group
            heading="Actions"
            className="px-1 text-[11px] uppercase tracking-wider text-slate-500"
          >
            <PaletteItem onSelect={() => run(onStartNew)} icon="✏️" label="New conversation" hint="⌘N" />
            <PaletteItem
              onSelect={() => run(onShowShortcuts)}
              icon="⌨"
              label="Show keyboard shortcuts"
              hint="⌘?"
            />
            <PaletteItem
              onSelect={() => run(() => setAzureConsoleOpen(!isAzureConsoleOpen))}
              icon="⬢"
              label={isAzureConsoleOpen ? 'Close Azure console' : 'Open Azure console'}
            />
            {darkModeEnabled && (
              <PaletteItem
                onSelect={() => run(toggleTheme)}
                icon={resolvedTheme === 'dark' ? '☀' : '☾'}
                label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
              />
            )}
          </Command.Group>

          {(conversations ?? []).length > 0 && (
            <Command.Group
              heading="Jump to conversation"
              className="px-1 text-[11px] uppercase tracking-wider text-slate-500"
            >
              {(conversations ?? []).map((c) => {
                const provider = providerOf(c.modelId);
                return (
                  <PaletteItem
                    key={c.id}
                    onSelect={() => run(() => setActiveConversation(c.id))}
                    icon={provider.glyph}
                    label={c.title}
                    hint={c.id === activeConversationId ? 'current' : undefined}
                  />
                );
              })}
            </Command.Group>
          )}

          {activeConversation != null && (
            <Command.Group
              heading="Active conversation"
              className="px-1 text-[11px] uppercase tracking-wider text-slate-500"
            >
              <PaletteItem
                onSelect={() =>
                  run(() => {
                    exportConversationMarkdown(activeConversation, activeMessages ?? []);
                    toast.success('Exported as Markdown');
                  })
                }
                icon="⬇"
                label="Export conversation as Markdown"
              />
              <PaletteItem
                onSelect={() =>
                  run(() => {
                    exportConversationJson(activeConversation, activeMessages ?? []);
                    toast.success('Exported as JSON');
                  })
                }
                icon="{ }"
                label="Export conversation as JSON"
              />
              <PaletteItem
                onSelect={() => run(() => void duplicate(activeConversation))}
                icon="⧉"
                label="Duplicate conversation"
              />
            </Command.Group>
          )}

          <Command.Group
            heading="Settings"
            className="px-1 text-[11px] uppercase tracking-wider text-slate-500"
          >
            <PaletteItem
              onSelect={() => run(() => setTemperature(temperature + 0.1))}
              icon="🔥"
              label="Increase temperature (+0.1)"
            />
            <PaletteItem
              onSelect={() => run(() => setTemperature(temperature - 0.1))}
              icon="❄"
              label="Decrease temperature (−0.1)"
            />
            <PaletteItem
              onSelect={() => run(resetGenerationSettings)}
              icon="↺"
              label="Reset generation settings"
            />
            <PaletteItem
              onSelect={() => run(toggleSettings)}
              icon="⚙"
              label="Toggle Settings panel"
            />
            <PaletteItem onSelect={() => run(toggleUsage)} icon="📊" label="Toggle Usage panel" />
          </Command.Group>

          {activeConversationId != null && (
            <Command.Group
              heading="Switch model for next turn"
              className="px-1 text-[11px] uppercase tracking-wider text-slate-500"
            >
              {MODELS.map((m) => (
                <PaletteItem
                  key={m.id}
                  onSelect={() => run(() => setModelOverride(m.id))}
                  icon={providerOf(m.id).glyph}
                  label={m.label}
                  hint={m.id}
                />
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

interface PaletteItemProps {
  onSelect: () => void;
  icon: string;
  label: string;
  hint?: string;
}

function PaletteItem({ onSelect, icon, label, hint }: PaletteItemProps): React.ReactElement {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-slate-700 aria-selected:bg-indigo-50 aria-selected:text-indigo-900 dark:text-slate-200 dark:aria-selected:bg-indigo-950 dark:aria-selected:text-indigo-100"
    >
      <span className="flex items-center gap-2 truncate">
        <span aria-hidden className="w-4 text-center text-base">
          {icon}
        </span>
        <span className="truncate normal-case">{label}</span>
      </span>
      {hint != null && (
        <span className="ml-3 shrink-0 font-mono text-[10px] text-slate-400 normal-case">
          {hint}
        </span>
      )}
    </Command.Item>
  );
}
