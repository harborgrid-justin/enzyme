import { useState } from 'react';
import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card, EmptyHint, Stat } from '../ui';
import { verifyAuditChain } from '../lib/governance';
import { toast } from '../../ui/toast';

/** Feature #26 — tamper-evident, hash-chained audit trail. */
export function AuditLogPanel(): React.ReactElement {
  const audit = useAdvancedStore((s) => s.audit);
  const [intact, setIntact] = useState<boolean | null>(null);

  function verify(): void {
    const ok = verifyAuditChain(audit);
    setIntact(ok);
    if (ok) toast.success('Chain verified — no tampering detected');
    else toast.error('Chain broken — an entry was altered');
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Audit log"
        subtitle="Hash-chained, tamper-evident trail of every privileged action"
        action={<Btn variant="primary" onClick={verify}>Verify integrity</Btn>}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Entries" value={audit.length} />
        <Stat label="Head hash" value={<code className="text-xs">{audit[0]?.hash ?? '—'}</code>} />
        <Stat
          label="Integrity"
          value={intact == null ? 'Unverified' : intact ? '✓ Intact' : '✗ Broken'}
        />
      </div>
      {audit.length === 0 && <EmptyHint>No audited actions yet.</EmptyHint>}
      <div className="space-y-2">
        {audit.map((e) => (
          <Card key={e.id} className="flex items-center gap-3">
            <Badge tone="indigo">{e.action}</Badge>
            <span className="text-sm text-slate-700">
              <span className="font-medium">{e.actor}</span> → <code className="text-xs">{e.target}</code>
            </span>
            <span className="ml-auto font-mono text-[10px] text-slate-400" title={`prev ${e.prevHash}`}>
              {e.hash}
            </span>
            <span className="text-[11px] text-slate-400">{new Date(e.at).toLocaleString()}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
