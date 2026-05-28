import { state } from '@missionfabric-js/enzyme';
import { useConversations } from '../api/conversations';
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

/**
 * Top-level studio layout — sidebar + main pane + right rail. The selected
 * conversation id is mirrored across browser tabs by `state.useBroadcastSync`,
 * so switching conversations in one tab also switches it in another.
 */
export function StudioShell(): React.ReactElement {
  const activeConversationId = useStudioStore((s) => s.activeConversationId);
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);
  const { data: conversations } = useConversations();
  const { artifact: openArtifact } = useOpenArtifact();
  const isAzureConsoleOpen = useAzureStore((s) => s.isConsoleOpen);
  const liveDeployment = useAzureStore((s) => s.liveDeployment);
  const setAzureConsoleOpen = useAzureStore((s) => s.setConsoleOpen);

  state.useBroadcastSync(useStudioStore, {
    channelName: 'enzyme-ai-studio-sync',
    syncKeys: ['activeConversationId', 'temperature', 'maxTokens'],
    conflictStrategy: 'last-write-wins',
  });

  const activeConversation =
    activeConversationId != null
      ? (conversations ?? []).find((c) => c.id === activeConversationId)
      : undefined;

  // When an artifact is open, collapse the settings rail to give the artifact
  // pane room — the right-side panels stay accessible via the toolbar above.
  const artifactOpen = openArtifact != null && openArtifact.conversationId === activeConversationId;

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-indigo-600">⚛ Enzyme AI Studio</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            Multi-provider · enterprise
          </span>
        </div>
        <div className="flex items-center gap-4">
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
            <span>Azure</span>
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
        <aside className="w-72 shrink-0 border-r border-slate-200 bg-white">
          <ConversationSidebar />
        </aside>

        {activeConversation ? (
          <ConversationView conversation={activeConversation} />
        ) : (
          <WelcomeScreen />
        )}

        {isAzureConsoleOpen && <AzureConsole />}

        {!isAzureConsoleOpen && activeConversation && artifactOpen && <ArtifactPanel />}

        {!isAzureConsoleOpen && activeConversation && !artifactOpen && (
          <aside className="hidden w-80 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 lg:block">
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <SystemPromptEditor conversation={activeConversation} />
            </section>
            <SettingsPanel
              activeModelId={modelOverrideId ?? activeConversation.modelId}
            />
            <RequestPreview conversation={activeConversation} />
            <UsageMeter />
          </aside>
        )}
      </div>
    </div>
  );
}
