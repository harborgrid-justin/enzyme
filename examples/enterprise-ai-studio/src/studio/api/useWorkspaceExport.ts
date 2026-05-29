/**
 * Feature #83: export the entire workspace as a single JSON document.
 *
 * Walks every conversation the caller can see, fetches its message history via
 * the API layer, and downloads a combined backup file.
 */
import { api } from '@missionfabric-js/enzyme';
import { useConversations } from './conversations';
import { downloadTextFile } from '../utils/exportConversation';
import type { StudioMessage } from '../types';

export interface UseWorkspaceExportResult {
  exportAll: () => Promise<void>;
}

export function useWorkspaceExport(): UseWorkspaceExportResult {
  const { data: conversations } = useConversations();

  async function exportAll(): Promise<void> {
    const list = conversations ?? [];
    const entries: unknown[] = [];
    for (const conversation of list) {
      const res = await api.apiClient.request<StudioMessage[]>({
        method: 'GET',
        url: `/conversations/${conversation.id}/messages`,
      });
      entries.push({ conversation, messages: res.data ?? [] });
    }
    const json = JSON.stringify(
      { exportedAt: new Date().toISOString(), conversationCount: list.length, conversations: entries },
      null,
      2
    );
    downloadTextFile('enzyme-ai-studio-workspace.json', json, 'application/json;charset=utf-8');
  }

  return { exportAll };
}
