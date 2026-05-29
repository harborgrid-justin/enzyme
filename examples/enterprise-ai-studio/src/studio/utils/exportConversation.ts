/**
 * Feature #41/#42: conversation export.
 *
 * Pure builders that turn a conversation + its messages into a portable
 * Markdown transcript or a JSON document, plus a small browser download helper.
 * Used by the conversation actions menu, the `/export` slash command, and the
 * command palette — all share these so the output stays consistent.
 */
import type { Conversation, StudioMessage } from '../types';

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'conversation'
  );
}

/** Render a conversation as a Markdown transcript. */
export function conversationToMarkdown(
  conversation: Conversation,
  messages: StudioMessage[]
): string {
  const ordered = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lines: string[] = [];
  lines.push(`# ${conversation.title}`, '');
  lines.push(`- **Model:** ${conversation.modelId}`);
  lines.push(
    `- **Tokens:** ${(conversation.totals.inputTokens + conversation.totals.outputTokens).toLocaleString()}` +
      ` · **Cost:** $${conversation.totals.costUsd.toFixed(4)}`
  );
  lines.push(`- **Exported:** ${new Date().toISOString()}`, '');
  if (conversation.systemPrompt.trim() !== '') {
    lines.push('## System prompt', '', '> ' + conversation.systemPrompt.replace(/\n/g, '\n> '), '');
  }
  lines.push('## Transcript', '');
  for (const m of ordered) {
    if (m.role === 'system') continue;
    const who =
      m.role === 'assistant' ? (m.model?.label ?? 'Assistant') : 'You';
    const time = new Date(m.createdAt).toLocaleString();
    lines.push(`### ${who} · ${time}`, '', m.content, '');
  }
  return lines.join('\n');
}

/** Render a conversation + messages as a pretty-printed JSON document. */
export function conversationToJson(
  conversation: Conversation,
  messages: StudioMessage[]
): string {
  const ordered = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), conversation, messages: ordered },
    null,
    2
  );
}

/** Trigger a client-side file download for the given text content. */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Defer revocation so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportConversationMarkdown(
  conversation: Conversation,
  messages: StudioMessage[]
): void {
  downloadTextFile(
    `${slugify(conversation.title)}.md`,
    conversationToMarkdown(conversation, messages),
    'text/markdown;charset=utf-8'
  );
}

export function exportConversationJson(
  conversation: Conversation,
  messages: StudioMessage[]
): void {
  downloadTextFile(
    `${slugify(conversation.title)}.json`,
    conversationToJson(conversation, messages),
    'application/json;charset=utf-8'
  );
}
