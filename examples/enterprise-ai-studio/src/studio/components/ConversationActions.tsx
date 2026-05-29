/**
 * Feature #44: conversation actions menu.
 *
 * A single overflow (⋯) button in the conversation header that consolidates the
 * less-frequent per-conversation actions behind an accessible Radix dropdown:
 *   - Pin / unpin (#43-adjacent)
 *   - Duplicate (#40)
 *   - Export as Markdown / JSON (#41 / #42)
 *   - Archive / unarchive (#43)
 *
 * Mutations reuse the existing optimistic conversation hooks; export reads the
 * message history from the React Query cache via `useConversationMessages`.
 */
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Conversation } from '../types';
import { useConversationMessages, useUpdateConversation } from '../api/conversations';
import { useDuplicateConversation } from '../api/useDuplicateConversation';
import { useStudioStore } from '../store/studioStore';
import {
  exportConversationJson,
  exportConversationMarkdown,
} from '../utils/exportConversation';
import { toast } from '../ui/toast';

interface ConversationActionsProps {
  conversation: Conversation;
  /** Whether the caller may pin (gated on chat permission for shared threads). */
  canManage: boolean;
}

export function ConversationActions({
  conversation,
  canManage,
}: ConversationActionsProps): React.ReactElement {
  const { data: messagesData } = useConversationMessages(conversation.id);
  const update = useUpdateConversation();
  const { duplicate } = useDuplicateConversation();
  const setActiveConversation = useStudioStore((s) => s.setActiveConversation);
  const activeConversationId = useStudioStore((s) => s.activeConversationId);

  const messages = messagesData ?? [];
  const isPinned = conversation.pinned === true;
  const isArchived = conversation.archived === true;

  function patch(body: Partial<Conversation>, successMsg: string): void {
    update.mutate(
      { pathParams: { id: conversation.id }, body: { id: conversation.id, ...body } },
      {
        onSuccess: () => toast.success(successMsg),
        onError: (err) => toast.error(`Action failed: ${err.message}`),
      }
    );
  }

  function archive(): void {
    const willArchive = !isArchived;
    // Stepping away from a conversation we just archived keeps the list tidy.
    if (willArchive && activeConversationId === conversation.id) {
      setActiveConversation(null);
    }
    patch({ archived: willArchive }, willArchive ? 'Conversation archived' : 'Conversation restored');
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Conversation actions"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <span aria-hidden>⋯</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          {canManage && (
            <ActionItem
              icon="📌"
              label={isPinned ? 'Unpin' : 'Pin to top'}
              onSelect={() => patch({ pinned: !isPinned }, isPinned ? 'Unpinned' : 'Pinned to top')}
            />
          )}
          {canManage && (
            <ActionItem icon="⧉" label="Duplicate" onSelect={() => void duplicate(conversation)} />
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          <ActionItem
            icon="⬇"
            label="Export as Markdown"
            onSelect={() => {
              exportConversationMarkdown(conversation, messages);
              toast.success('Exported as Markdown');
            }}
          />
          <ActionItem
            icon="{ }"
            label="Export as JSON"
            onSelect={() => {
              exportConversationJson(conversation, messages);
              toast.success('Exported as JSON');
            }}
          />
          {canManage && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
              <ActionItem
                icon={isArchived ? '♻' : '🗄'}
                label={isArchived ? 'Unarchive' : 'Archive'}
                onSelect={archive}
              />
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ActionItem({
  icon,
  label,
  onSelect,
}: {
  icon: string;
  label: string;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-slate-700 outline-none data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-900 dark:text-slate-200 dark:data-[highlighted]:bg-indigo-950 dark:data-[highlighted]:text-indigo-100"
    >
      <span aria-hidden className="w-4 text-center font-mono text-[11px]">
        {icon}
      </span>
      <span>{label}</span>
    </DropdownMenu.Item>
  );
}
