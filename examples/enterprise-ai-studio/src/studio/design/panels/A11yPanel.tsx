import { useMemo } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  Badge,
  EmptyHint,
  Card,
} from '../ui';
import { auditHtml, applyAutofixes } from '../lib/a11y';

export function A11yPanel(): React.ReactElement {
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);
  const updatePageBody = useDesignStore((s) => s.updatePageBody);

  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  const report = useMemo(
    () => (activePage != null ? auditHtml(activePage.body) : null),
    [activePage]
  );

  const scoreColor =
    report == null
      ? 'text-slate-400'
      : report.score >= 90
        ? 'text-emerald-600'
        : report.score >= 70
          ? 'text-amber-500'
          : 'text-rose-600';

  function handleApplyFix(fix: (html: string) => string): void {
    if (activePage == null) return;
    const fixed = fix(activePage.body);
    updatePageBody(activePage.id, fixed);
  }

  function handleApplyAll(): void {
    if (activePage == null || report == null) return;
    const fixed = applyAutofixes(activePage.body, report);
    updatePageBody(activePage.id, fixed);
  }

  if (activePage == null) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Accessibility Audit" subtitle="WCAG 2.1 AA checker" />
        <EmptyHint>No active page — open one from the Pages panel.</EmptyHint>
      </div>
    );
  }

  const fixableCount = report?.issues.filter((i) => i.fix != null).length ?? 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Accessibility Audit"
        subtitle={`WCAG 2.1 AA · "${activePage.name}"`}
        action={
          fixableCount > 0 ? (
            <Btn variant="primary" onClick={handleApplyAll}>
              Apply all fixes ({fixableCount})
            </Btn>
          ) : undefined
        }
      />

      {/* Score */}
      <Card>
        <div className="flex items-center gap-4">
          <span className={`text-5xl font-bold tabular-nums ${scoreColor}`}>
            {report?.score ?? '—'}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-700">Accessibility score</p>
            <p className="text-xs text-slate-400">
              {report?.issues.length === 0
                ? 'No issues found'
                : `${report?.issues.length} issue${(report?.issues.length ?? 0) > 1 ? 's' : ''} detected`}
            </p>
          </div>
        </div>
      </Card>

      {/* Issues */}
      {report != null && report.issues.length === 0 && (
        <EmptyHint>All checks passed — great work!</EmptyHint>
      )}

      {report != null && report.issues.length > 0 && (
        <div className="space-y-2">
          {report.issues.map((issue) => (
            <Card key={issue.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={issue.severity === 'error' ? 'rose' : 'amber'}>
                      {issue.severity}
                    </Badge>
                    <span className="text-xs font-mono text-slate-500">{issue.rule}</span>
                  </div>
                  <p className="text-sm text-slate-800">{issue.message}</p>
                </div>
                {issue.fix != null && (
                  <Btn
                    variant="primary"
                    onClick={() => handleApplyFix(issue.fix!)}
                  >
                    Apply fix
                  </Btn>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
