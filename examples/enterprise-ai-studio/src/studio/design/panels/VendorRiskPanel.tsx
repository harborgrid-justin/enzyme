import { useComplianceStore } from '../complianceStore';
import { SectionHeader, Badge, Card, Btn, Stat } from '../ui';
import { portfolioRisk, vendorReviewDue } from '../lib/compliance';
import type { RiskTier } from '../types.compliance';

const TIER_TONE: Record<RiskTier, 'slate' | 'sky' | 'amber' | 'rose'> = {
  low: 'slate',
  medium: 'sky',
  high: 'amber',
  critical: 'rose',
};

/** Feature #58 — third-party vendor risk. */
export function VendorRiskPanel(): React.ReactElement {
  const vendors = useComplianceStore((s) => s.vendors);
  const reviewVendor = useComplianceStore((s) => s.reviewVendor);
  const portfolio = portfolioRisk(vendors);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Vendor risk"
        subtitle="Score the third-party portfolio and keep security reviews on cadence"
      />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Portfolio risk" value={`${portfolio.score} / 100`} />
        <Stat label="Reviews due" value={portfolio.reviewsDue} />
        <Stat
          label="High / critical"
          value={portfolio.counts.high + portfolio.counts.critical}
        />
      </div>

      <div className="space-y-2">
        {vendors.map((v) => {
          const due = vendorReviewDue(v);
          return (
            <Card key={v.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-800">{v.name}</span>
                  <Badge tone={TIER_TONE[v.tier]}>{v.tier}</Badge>
                  {due && <Badge tone="amber">review due</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {v.category} · data access: {v.dataAccess}
                </div>
              </div>
              <Btn
                variant={due ? 'primary' : 'ghost'}
                onClick={() => reviewVendor(v.id)}
                title="Mark a security review as completed today"
              >
                Review
              </Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
