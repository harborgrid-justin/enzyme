/**
 * Inventory UI state — workspace, status filter, warehouse filter, audit stream.
 * Entry data itself is owned by React Query (see api/items.ts). The store is
 * mirrored across browser tabs by enzyme's `state.useBroadcastSync` in
 * `InventoryShell`.
 */
import { create } from 'zustand';
import type { StockStatus } from '../types';

export type StatusFilter = StockStatus | 'all';
export type WarehouseFilter = string | 'all';

export interface AuditEvent {
  id: string;
  message: string;
  /** ISO timestamp. */
  at: string;
}

export interface InventoryUiState {
  activeWorkspace: string;
  statusFilter: StatusFilter;
  warehouseFilter: WarehouseFilter;
  /** Recent stock / procurement events shown in the audit stream. */
  auditEvents: AuditEvent[];
  setWorkspace: (workspace: string) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  setWarehouseFilter: (filter: WarehouseFilter) => void;
  pushAuditEvent: (message: string) => void;
}

const seedAudit: AuditEvent[] = [
  { id: 'a1', message: 'RBAC policy loaded for warehouse operations', at: new Date().toISOString() },
  { id: 'a2', message: 'Predictive restock forecasts warmed', at: new Date().toISOString() },
  { id: 'a3', message: 'Cycle-count channel opened', at: new Date().toISOString() },
];

export const useInventoryStore = create<InventoryUiState>((set) => ({
  activeWorkspace: 'Acme Distribution',
  statusFilter: 'all',
  warehouseFilter: 'all',
  auditEvents: seedAudit,
  setWorkspace: (activeWorkspace) => set({ activeWorkspace }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setWarehouseFilter: (warehouseFilter) => set({ warehouseFilter }),
  pushAuditEvent: (message) =>
    set((s) => ({
      auditEvents: [
        { id: crypto.randomUUID(), message, at: new Date().toISOString() },
        ...s.auditEvents,
      ].slice(0, 12),
    })),
}));
