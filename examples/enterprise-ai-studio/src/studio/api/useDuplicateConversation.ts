/**
 * Feature #40: duplicate a conversation.
 *
 * Creates a fresh thread that inherits the source conversation's model and
 * system prompt (a "fork" you can take in a new direction), then activates it.
 * Message history is intentionally not copied — the new thread starts clean.
 */
import { auth, monitoring } from '@missionfabric-js/enzyme';
import { useCreateConversation } from './conversations';
import { useStudioStore } from '../store/studioStore';
import { toast } from '../ui/toast';
import type { Conversation } from '../types';

export interface UseDuplicateConversationResult {
  duplicate: (source: Conversation) => Promise<void>;
  isPending: boolean;
}

export function useDuplicateConversation(): UseDuplicateConversationResult {
  const { user } = auth.useAuth();
  const create = useCreateConversation();
  const setActiveConversation = useStudioStore((s) => s.setActiveConversation);

  async function duplicate(source: Conversation): Promise<void> {
    if (user == null) {
      toast.error('Sign in before duplicating a conversation');
      return;
    }
    try {
      const created = await create.mutateAsync({
        body: {
          title: `${source.title} (copy)`,
          modelId: source.modelId,
          ownerId: user.id,
          systemPrompt: source.systemPrompt,
          shared: false,
        },
      });
      setActiveConversation(created.id);
      toast.success('Duplicated conversation');
    } catch (err) {
      toast.error(`Couldn't duplicate: ${monitoring.normalizeError(err).message}`);
    }
  }

  return { duplicate, isPending: create.isPending };
}
