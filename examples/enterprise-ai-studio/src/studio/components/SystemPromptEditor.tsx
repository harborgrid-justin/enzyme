import { useEffect, useState } from 'react';
import type { Conversation } from '../types';
import { useUpdateConversation } from '../api/conversations';

interface SystemPromptEditorProps {
  conversation: Conversation;
}

/** Feature #60: curated system-prompt presets to drop into the editor. */
const SYSTEM_PROMPT_PRESETS: Array<{ label: string; prompt: string }> = [
  {
    label: 'Concise',
    prompt:
      'You are a concise assistant. Answer in as few words as possible while staying correct. Prefer bullet points over prose.',
  },
  {
    label: 'Senior engineer',
    prompt:
      'You are a senior software engineer. Give production-grade, well-typed code with brief rationale. Call out edge cases and trade-offs.',
  },
  {
    label: 'Socratic tutor',
    prompt:
      'You are a patient tutor. Guide the user to the answer with leading questions and small steps rather than giving it away outright.',
  },
  {
    label: 'Product analyst',
    prompt:
      'You are a product analyst. Structure answers as problem, options, recommendation, and risks. Quantify impact wherever possible.',
  },
];

/**
 * Inline system-prompt editor. Saves on blur/Cmd-Enter via PATCH — the cache is
 * updated optimistically so the next turn picks up the new prompt without a
 * round-trip wait.
 */
export function SystemPromptEditor({ conversation }: SystemPromptEditorProps): React.ReactElement {
  const [draft, setDraft] = useState(conversation.systemPrompt);
  const [isEditing, setIsEditing] = useState(false);
  const update = useUpdateConversation();

  // Reset the draft when the user switches to a different conversation.
  useEffect(() => {
    setDraft(conversation.systemPrompt);
    setIsEditing(false);
  }, [conversation.id, conversation.systemPrompt]);

  function save(): void {
    if (draft === conversation.systemPrompt) {
      setIsEditing(false);
      return;
    }
    update.mutate(
      {
        pathParams: { id: conversation.id },
        body: { id: conversation.id, systemPrompt: draft },
      },
      { onSuccess: () => setIsEditing(false) }
    );
  }

  if (!isEditing) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            System prompt
          </label>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[11px] text-indigo-600 hover:underline"
          >
            edit
          </button>
        </div>
        <p className="line-clamp-4 rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
          {conversation.systemPrompt}
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        System prompt
      </label>
      {/* Feature #60: drop in a curated preset, then tweak. */}
      <div className="mb-2 flex flex-wrap gap-1">
        {SYSTEM_PROMPT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setDraft(preset.prompt)}
            className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          }
        }}
        rows={5}
        className="w-full resize-y rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      <div className="mt-1 flex justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setDraft(conversation.systemPrompt);
            setIsEditing(false);
          }}
          className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className="rounded bg-indigo-600 px-2 py-1 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">⌘/Ctrl + Enter to save</p>
    </div>
  );
}
