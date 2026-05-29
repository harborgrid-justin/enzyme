import { useState, useMemo } from 'react';
import type { ApprovalStatus } from '../types';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  Badge,
  Card,
  EmptyHint,
  Stat,
} from '../ui';
import { toast } from '../../ui/toast';

function statusTone(
  status: ApprovalStatus
): 'slate' | 'amber' | 'rose' | 'emerald' {
  if (status === 'draft') return 'slate';
  if (status === 'in-review') return 'amber';
  if (status === 'changes-requested') return 'rose';
  return 'emerald';
}

export function ApprovalsPanel(): React.ReactElement {
  const approvals = useDesignStore((s) => s.approvals);
  const requestApproval = useDesignStore((s) => s.requestApproval);
  const decideApproval = useDesignStore((s) => s.decideApproval);
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);
  const workspace = useDesignStore((s) => s.workspace);
  const activeTeamId = useDesignStore((s) => s.activeTeamId);
  const actor = useDesignStore((s) => s.actor);

  const activePage = useMemo(() => pages.find((p) => p.id === activePageId), [pages, activePageId]);
  const members: string[] = useMemo(
    () => workspace.teams.find((t) => t.id === activeTeamId)?.members ?? [],
    [workspace, activeTeamId]
  );

  const approval = useMemo(
    () => approvals.find((a) => a.targetId === activePageId),
    [approvals, activePageId]
  );

  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [required, setRequired] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  function toggleReviewer(member: string): void {
    setSelectedReviewers((prev) =>
      prev.includes(member) ? prev.filter((m) => m !== member) : [...prev, member]
    );
  }

  function handleRequest(): void {
    if (activePage == null || selectedReviewers.length === 0) return;
    const req = required.trim() !== '' ? parseInt(required, 10) : selectedReviewers.length;
    requestApproval(activePage.id, selectedReviewers, req);
    setSelectedReviewers([]);
    setRequired('');
    toast.success('Approval requested');
  }

  function handleDecide(decision: 'approved' | 'changes-requested'): void {
    if (approval == null) return;
    decideApproval(approval.id, decision, decisionNote.trim());
    setDecisionNote('');
    toast.success(decision === 'approved' ? 'Approved!' : 'Changes requested');
  }

  if (activePage == null) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Approvals" subtitle="Sign-off workflow" />
        <EmptyHint>No active page selected.</EmptyHint>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Approvals"
        subtitle={`Page: ${activePage.name}`}
      />

      {approval == null ? (
        /* Request form */
        <Card>
          <div className="mb-3 text-sm font-medium text-slate-700">Request review</div>

          <div className="mb-3 space-y-1">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Reviewers
            </div>
            {members.length === 0 ? (
              <p className="text-xs text-slate-400">No team members found.</p>
            ) : (
              members.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedReviewers.includes(m)}
                    onChange={() => toggleReviewer(m)}
                    className="rounded border-slate-300"
                  />
                  {m}
                </label>
              ))
            )}
          </div>

          <div className="mb-3 w-32">
            <TextInput
              label="Required approvals"
              type="number"
              value={required}
              onChange={setRequired}
              placeholder={String(selectedReviewers.length || 1)}
            />
          </div>

          <Btn
            variant="primary"
            onClick={handleRequest}
            disabled={selectedReviewers.length === 0}
          >
            Request approval
          </Btn>
        </Card>
      ) : (
        /* Approval status view */
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge tone={statusTone(approval.status)}>{approval.status}</Badge>
            <Stat
              label="Progress"
              value={`${approval.decisions.filter((d) => d.decision === 'approved').length} / ${approval.requiredApprovals}`}
            />
          </div>

          <Card>
            <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Reviewers
            </div>
            <div className="flex flex-wrap gap-1">
              {approval.reviewers.map((r) => {
                const dec = approval.decisions.find((d) => d.reviewer === r);
                return (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700"
                  >
                    {r}
                    {dec != null && (
                      <span
                        className={
                          dec.decision === 'approved'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }
                      >
                        {dec.decision === 'approved' ? ' ✓' : ' ✕'}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </Card>

          {approval.decisions.length > 0 && (
            <Card>
              <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Decisions
              </div>
              <div className="space-y-2">
                {approval.decisions.map((d) => (
                  <div key={d.reviewer} className="text-xs">
                    <span className="font-semibold text-slate-700">{d.reviewer}</span>
                    {' — '}
                    <Badge
                      tone={d.decision === 'approved' ? 'emerald' : 'rose'}
                    >
                      {d.decision}
                    </Badge>
                    {d.note !== '' && (
                      <p className="mt-0.5 text-slate-500 italic">{d.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Actor decision controls */}
          {approval.reviewers.includes(actor) && (
            <Card>
              <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Your decision ({actor})
              </div>
              <TextInput
                value={decisionNote}
                onChange={setDecisionNote}
                placeholder="Optional note…"
              />
              <div className="mt-2 flex gap-2">
                <Btn variant="primary" onClick={() => handleDecide('approved')}>
                  Approve
                </Btn>
                <Btn variant="danger" onClick={() => handleDecide('changes-requested')}>
                  Request changes
                </Btn>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
