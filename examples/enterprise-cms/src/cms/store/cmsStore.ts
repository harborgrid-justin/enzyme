/**
 * CMS UI state — workspace, status filter, audit stream. Entry data itself is
 * owned by React Query (see api/entries.ts). The store is mirrored across
 * browser tabs by enzyme's `state.useBroadcastSync` in CmsShell.
 */
import { create } from 'zustand';
import type { WorkflowStatus } from '../types';

export type StatusFilter = WorkflowStatus | 'all';

export interface AuditEvent {
  id: string;
  message: string;
  /** ISO timestamp. */
  at: string;
}

export interface CmsUiState {
  activeWorkspace: string;
  statusFilter: StatusFilter;
  /** Recent governance / workflow events shown in the audit stream. */
  auditEvents: AuditEvent[];
  setWorkspace: (workspace: string) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  pushAuditEvent: (message: string) => void;
}

const seedAudit: AuditEvent[] = [
  { id: 'a1', message: 'RBAC policy loaded for editorial workflow', at: new Date().toISOString() },
  { id: 'a2', message: 'Predictive content prefetch enabled', at: new Date().toISOString() },
  { id: 'a3', message: 'Draft autosave channel opened', at: new Date().toISOString() },
];

export const useCmsStore = create<CmsUiState>((set) => ({
  activeWorkspace: 'Acme CMS',
  statusFilter: 'all',
  auditEvents: seedAudit,
  setWorkspace: (activeWorkspace) => set({ activeWorkspace }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  pushAuditEvent: (message) =>
    set((s) => ({
      auditEvents: [
        { id: crypto.randomUUID(), message, at: new Date().toISOString() },
        ...s.auditEvents,
      ].slice(0, 12),
    })),
}));
