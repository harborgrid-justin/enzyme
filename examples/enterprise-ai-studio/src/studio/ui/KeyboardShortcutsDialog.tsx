import { Dialog } from './Dialog';
import { modKeyLabel } from './useHotkey';

const SHORTCUTS: Array<{ section: string; rows: Array<{ combo: string; label: string }> }> = [
  {
    section: 'Navigation',
    rows: [
      { combo: 'MOD+K', label: 'Open command palette' },
      { combo: 'MOD+N', label: 'Start a new conversation' },
      { combo: 'MOD+/', label: 'Focus the message composer' },
      { combo: 'MOD+?', label: 'Show keyboard shortcuts' },
    ],
  },
  {
    section: 'Composer',
    rows: [
      { combo: 'Enter', label: 'Send the message' },
      { combo: 'MOD+Enter', label: 'Send the message (works in any field)' },
      { combo: 'Shift+Enter', label: 'Insert a newline' },
      { combo: 'Esc', label: 'Stop the streaming response' },
      { combo: '/', label: 'Open slash-command menu in composer' },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal listing every global + composer shortcut. Reads MOD on render so the
 * displayed key (⌘ vs Ctrl) matches the user's platform.
 */
export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps): React.ReactElement {
  const mod = modKeyLabel();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="All shortcuts work from anywhere in the studio."
      size="md"
    >
      <div className="space-y-4">
        {SHORTCUTS.map((section) => (
          <div key={section.section}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {section.section}
            </h3>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {section.rows.map((row) => (
                <li
                  key={row.combo}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-slate-700 dark:text-slate-300">{row.label}</span>
                  <kbd className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {row.combo.replace('MOD', mod)}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
