/**
 * Hook that wraps "create + activate" into a single callable. Used by:
 *   - The sidebar's "+ New conversation" button
 *   - The ⌘N global hotkey (StudioShell)
 *   - The command palette "New conversation" action
 *
 * Returns `{ start, isPending }`. `start()` resolves silently on success and
 * surfaces failures via toast so callers don't have to duplicate that.
 */
import { auth } from '@missionfabric-js/enzyme';
import { useCreateConversation } from './conversations';
import { useStudioStore } from '../store/studioStore';
import { DEFAULT_MODEL_ID } from '../providers/catalog';
import { DEFAULT_SYSTEM_PROMPT } from '../mocks/seed';
import { toast } from '../ui/toast';
import { emitComposerDraft } from '../ui/composerDraftBus';

/** Feature #89: a conversation can be started from a template preset. */
export interface StartConversationOptions {
  title?: string;
  modelId?: string;
  systemPrompt?: string;
  /** Prefill the composer with this text once the new thread opens. */
  draft?: string;
}

export interface UseStartNewConversationResult {
  start: (options?: StartConversationOptions) => Promise<void>;
  isPending: boolean;
}

export function useStartNewConversation(): UseStartNewConversationResult {
  const { user } = auth.useAuth();
  const create = useCreateConversation();
  const setActiveConversation = useStudioStore((s) => s.setActiveConversation);

  async function start(options: StartConversationOptions = {}): Promise<void> {
    if (user == null) {
      toast.error('Sign in before starting a conversation');
      return;
    }
    try {
      const created = await create.mutateAsync({
        body: {
          title: options.title ?? 'New conversation',
          modelId: options.modelId ?? DEFAULT_MODEL_ID,
          ownerId: user.id,
          systemPrompt: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
          shared: false,
        },
      });
      setActiveConversation(created.id);
      if (options.draft != null && options.draft !== '') {
        const draft = options.draft;
        // Defer until the composer for the new thread has mounted.
        setTimeout(() => emitComposerDraft(draft), 60);
      }
      toast.success('Started a new conversation');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Couldn't create conversation: ${message}`);
    }
  }

  return { start, isPending: create.isPending };
}
