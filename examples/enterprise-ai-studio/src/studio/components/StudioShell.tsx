import { state } from '@missionfabric-js/enzyme';
import * as RadixDialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { useConversations } from '../api/conversations';
import { useStartNewConversation } from '../api/useStartNewConversation';
import { useStudioStore } from '../store/studioStore';
import { useOpenArtifact } from '../artifacts/store';
import { useAzureStore } from '../azure/store';
import { ConversationSidebar } from './ConversationSidebar';
import { ConversationView } from './ConversationView';
import { WelcomeScreen } from './WelcomeScreen';
import { UserSwitcher } from './UserSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { SystemPromptEditor } from './SystemPromptEditor';
import { SettingsPanel } from './SettingsPanel';
import { RequestPreview } from './RequestPreview';
import { UsageMeter } from './UsageMeter';
import { ArtifactPanel } from './ArtifactPanel';
import { AzureConsole } from './azure/AzureConsole';
import { CommandPalette } from '../ui/CommandPalette';
import { KeyboardShortcutsDialog } from '../ui/KeyboardShortcutsDialog';
import { OfflineBanner } from '../ui/OfflineBanner';
import { useHotkey, modKeyLabel } from '../ui/useHotkey';
import { COMPOSER_INPUT_ID } from '../ui/composerInputId';
import { toast } from '../ui/toast';

const FIRST_LOAD_HINT_KEY = 'enzyme-studio-saw-command-palette-hint';

/**
 * Top-level studio layout — sidebar + main pane + right rail. The selected
 * conversation id is mirrored across browser tabs by `state.useBroadcastSync`,
 * so switching conversations in one tab also switches it in another.
 */
export function StudioShell(): React.ReactElement {
  const activeConversationId = useStudioStore((s) => s.activeConversationId);
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);
  const isSettingsOpen = useStudioStore((s) => s.isSettingsOpen);
  const isUsageOpen = useStudioStore((s) => s.isUsageOpen);
  const toggleSettings = useStudioStore((s) => s.toggleSettings);
  const toggleUsage = useStudioStore((s) => s.toggleUsage);
  const { data: conversations } = useConversations();
  const { artifact: openArtifact } = useOpenArtifact();
  const isAzureConsoleOpen = useAzureStore((s) => s.isConsoleOpen);
  const liveDeployment = useAzureStore((s) => s.liveDeployment);
  const setAzureConsoleOpen = useAzureStore((s) => s.setConsoleOpen);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Feature #30: mobile sidebar drawer state. The desktop layout keeps the
  // sidebar always-visible — this only opens on screens narrower than the
  // `md` breakpoint.
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { start: startNew } = useStartNewConversation();

  useHotkey('mod+k', () => setPaletteOpen((v) => !v), { allowInInput: true });
  useHotkey('mod+n', () => void startNew());
  useHotkey('mod+/', () => {
    document.getElementById(COMPOSER_INPUT_ID)?.focus();
  });
  useHotkey('mod+shift+/', () => setShortcutsOpen((v) => !v), { allowInInput: true });
  // Feature #58: toggle the right-rail Settings panel from the keyboard.
  useHotkey('mod+.', () => toggleSettings());

  state.useBroadcastSync(useStudioStore, {
    channelName: 'enzyme-ai-studio-sync',
    syncKeys: ['activeConversationId', 'temperature', 'maxTokens'],
    conflictStrategy: 'last-write-wins',
  });

  // Feature #29: on first load (per browser), nudge the user toward ⌘K. The
  // hint becomes an interactive toast — clicking it opens the palette.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(FIRST_LOAD_HINT_KEY) === '1') return;
    const timer = window.setTimeout(() => {
      toast.info(`Tip: press ${modKeyLabel()}K to jump anywhere in the studio.`, {
        duration: 8000,
        action: {
          label: 'Try it',
          onClick: () => setPaletteOpen(true),
        },
      });
      window.localStorage.setItem(FIRST_LOAD_HINT_KEY, '1');
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const activeConversation =
    activeConversationId != null
      ? (conversations ?? []).find((c) => c.id === activeConversationId)
      : undefined;

  // Feature #59: reflect the active conversation in the browser/tab title.
  useEffect(() => {
    const base = 'Enzyme AI Studio';
    document.title = activeConversation != null ? `${activeConversation.title} · ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [activeConversation]);

  // When an artifact is open, collapse the settings rail to give the artifact
  // pane room — the right-side panels stay accessible via the toolbar above.
  const artifactOpen = openArtifact != null && openArtifact.conversationId === activeConversationId;

  // Closing the mobile drawer on conversation change so the picked thread
  // takes the full viewport.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeConversationId]);

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <OfflineBanner />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          {/* Feature #30: hamburger to open the mobile drawer. Hidden on md+. */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open conversation sidebar"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 md:hidden"
          >
            <span aria-hidden>☰</span>
          </button>
          <span className="text-lg font-bold text-indigo-600">⚛ Enzyme AI Studio</span>
          <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline">
            Multi-provider · enterprise
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 sm:inline-flex"
            aria-label="Open command palette"
          >
            <span aria-hidden>⌘K</span>
            <span className="text-xs">Search</span>
          </button>
          <button
            type="button"
            onClick={() => setAzureConsoleOpen(!isAzureConsoleOpen)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              isAzureConsoleOpen
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="Open Azure console: Foundry deployments + budget"
          >
            <span>⬢</span>
            <span className="hidden sm:inline">Azure</span>
            {liveDeployment != null && (
              <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                LIVE
              </span>
            )}
          </button>
          <UserSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar — always rendered above md. */}
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white md:block">
          <ConversationSidebar />
        </aside>

        {/* Mobile sidebar drawer — opens via the header hamburger. */}
        <RadixDialog.Root open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm motion-reduce:animate-none md:hidden" />
            <RadixDialog.Content
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-left motion-reduce:animate-none md:hidden"
              aria-describedby={undefined}
            >
              <RadixDialog.Title className="sr-only">Conversations</RadixDialog.Title>
              <ConversationSidebar />
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>

        {activeConversation ? (
          <ConversationView conversation={activeConversation} />
        ) : (
          <WelcomeScreen />
        )}

        {isAzureConsoleOpen && <AzureConsole />}

        {!isAzureConsoleOpen && activeConversation && artifactOpen && <ArtifactPanel />}

        {!isAzureConsoleOpen && activeConversation && !artifactOpen && (
          <aside className="hidden w-80 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 lg:block">
            {/* Feature #57: collapsible right-rail panels. */}
            <div className="flex items-center justify-end gap-1">
              <PanelToggle
                label="Settings"
                icon="⚙"
                open={isSettingsOpen}
                onClick={toggleSettings}
              />
              <PanelToggle label="Usage" icon="📊" open={isUsageOpen} onClick={toggleUsage} />
            </div>
            {isSettingsOpen && (
              <>
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <SystemPromptEditor conversation={activeConversation} />
                </section>
                <SettingsPanel activeModelId={modelOverrideId ?? activeConversation.modelId} />
                <RequestPreview conversation={activeConversation} />
              </>
            )}
            {isUsageOpen && <UsageMeter />}
          </aside>
        )}
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onStartNew={() => void startNew()}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

interface PanelToggleProps {
  label: string;
  icon: string;
  open: boolean;
  onClick: () => void;
}

/** A pill toggle for collapsing/expanding a right-rail panel group. */
function PanelToggle({ label, icon, open, onClick }: PanelToggleProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={open}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        open
          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
          : 'border-slate-300 text-slate-500 hover:bg-slate-100'
      }`}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </button>
  );
}
