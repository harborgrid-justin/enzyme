/**
 * Feature #75: conversation insights.
 *
 * A compact right-rail panel that summarizes the active conversation: how many
 * turns each side took, tokens by role, and which models produced the assistant
 * replies. Everything is derived from the message history in the React Query
 * cache — no extra requests.
 */
import { useMemo } from 'react';
import { useConversationMessages } from '../api/conversations';

interface ConversationInsightsProps {
  conversationId: string;
}

export function ConversationInsights({
  conversationId,
}: ConversationInsightsProps): React.ReactElement | null {
  const { data } = useConversationMessages(conversationId);
  const messages = data ?? [];

  const insights = useMemo(() => {
    let userTurns = 0;
    let assistantTurns = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const models = new Map<string, number>();
    for (const m of messages) {
      if (m.role === 'user') userTurns += 1;
      if (m.role === 'assistant') {
        assistantTurns += 1;
        if (m.model != null) models.set(m.model.label, (models.get(m.model.label) ?? 0) + 1);
      }
      if (m.usage != null) {
        inputTokens += m.usage.inputTokens;
        outputTokens += m.usage.outputTokens;
      }
    }
    return {
      userTurns,
      assistantTurns,
      inputTokens,
      outputTokens,
      models: [...models.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Conversation insights</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Your turns" value={insights.userTurns.toString()} />
        <Stat label="Replies" value={insights.assistantTurns.toString()} />
        <Stat label="Input tokens" value={insights.inputTokens.toLocaleString()} />
        <Stat label="Output tokens" value={insights.outputTokens.toLocaleString()} />
      </div>
      {insights.models.length > 0 && (
        <>
          <h4 className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Models used
          </h4>
          <ul className="space-y-1">
            {insights.models.map(([label, count]) => (
              <li key={label} className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="truncate pr-2">{label}</span>
                <span className="font-mono text-slate-500">×{count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-mono text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
