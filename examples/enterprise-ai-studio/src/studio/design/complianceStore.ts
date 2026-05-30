/**
 * Compliance & risk store — features 56–61.
 *
 * Kept separate from the core and advanced stores so the compliance domain
 * stays reviewable in isolation. Seeded from `seed.compliance.ts`, persisted to
 * localStorage, and delegating all real logic to the pure helpers in
 * `lib/compliance.ts`.
 *
 * Mutating actions append to the **shared** advanced audit log via
 * `useAdvancedStore.getState().audit_(...)`, so compliance changes land on the
 * same tamper-evident trail (feature #26) as every other governance action.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAdvancedStore } from './advancedStore';
import type {
  ComplianceControl,
  ControlStatus,
  DsarRequest,
  DsarStatus,
  EvidenceItem,
  Incident,
  Risk,
  RiskStatus,
  Vendor,
} from './types.compliance';
import {
  SEED_CONTROLS,
  SEED_DSARS,
  SEED_EVIDENCE,
  SEED_INCIDENTS,
  SEED_RISKS,
  SEED_VENDORS,
} from './seed.compliance';

function audit(action: string, target: string): void {
  useAdvancedStore.getState().audit_(action, target);
}

export interface ComplianceState {
  controls: ComplianceControl[];
  evidence: EvidenceItem[];
  vendors: Vendor[];
  risks: Risk[];
  incidents: Incident[];
  dsars: DsarRequest[];

  // --- actions -------------------------------------------------------------
  // 56 frameworks
  setControlStatus: (id: string, status: ControlStatus) => void;
  // 57 evidence
  recollectEvidence: (id: string) => void;
  // 58 vendor risk
  reviewVendor: (id: string) => void;
  // 59 risk register
  setRiskStatus: (id: string, status: RiskStatus) => void;
  setMitigation: (id: string, mitigation: number) => void;
  // 60 incidents
  resolveIncident: (id: string) => void;
  // 61 dsar
  setDsarStatus: (id: string, status: DsarStatus) => void;
}

export const useComplianceStore = create<ComplianceState>()(
  persist(
    (set) => ({
      controls: SEED_CONTROLS,
      evidence: SEED_EVIDENCE,
      vendors: SEED_VENDORS,
      risks: SEED_RISKS,
      incidents: SEED_INCIDENTS,
      dsars: SEED_DSARS,

      setControlStatus: (id, status) =>
        set((s) => {
          audit('control.status', `${id}:${status}`);
          return { controls: s.controls.map((c) => (c.id === id ? { ...c, status } : c)) };
        }),

      recollectEvidence: (id) =>
        set((s) => {
          audit('evidence.collect', id);
          return {
            evidence: s.evidence.map((e) =>
              e.id === id ? { ...e, collectedAt: new Date().toISOString() } : e
            ),
          };
        }),

      reviewVendor: (id) =>
        set((s) => {
          audit('vendor.review', id);
          return {
            vendors: s.vendors.map((v) =>
              v.id === id ? { ...v, lastReviewed: new Date().toISOString() } : v
            ),
          };
        }),

      setRiskStatus: (id, status) =>
        set((s) => {
          audit('risk.status', `${id}:${status}`);
          return { risks: s.risks.map((r) => (r.id === id ? { ...r, status } : r)) };
        }),
      setMitigation: (id, mitigation) =>
        set((s) => {
          const clamped = Math.min(1, Math.max(0, mitigation));
          audit('risk.mitigate', `${id}:${clamped.toFixed(2)}`);
          return { risks: s.risks.map((r) => (r.id === id ? { ...r, mitigation: clamped } : r)) };
        }),

      resolveIncident: (id) =>
        set((s) => {
          audit('incident.resolve', id);
          return {
            incidents: s.incidents.map((i) =>
              i.id === id ? { ...i, resolvedAt: new Date().toISOString() } : i
            ),
          };
        }),

      setDsarStatus: (id, status) =>
        set((s) => {
          audit('dsar.status', `${id}:${status}`);
          return { dsars: s.dsars.map((d) => (d.id === id ? { ...d, status } : d)) };
        }),
    }),
    {
      name: 'enzyme-design-compliance',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
