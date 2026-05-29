import { useState, useMemo } from 'react';
import { useDesignStore } from '../store';
import { SectionHeader, Btn, Badge, Card, EmptyHint } from '../ui';
import { toast } from '../../ui/toast';
import { exportPage } from '../lib/exporters';
import type { ExportFormat } from '../types';

const FORMATS: ExportFormat[] = ['react', 'vue', 'web-component', 'storybook'];

export function ExportPanel(): React.ReactElement {
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);

  const [format, setFormat] = useState<ExportFormat>('react');

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId) ?? null,
    [pages, activePageId]
  );

  const exported = useMemo(
    () => (activePage != null ? exportPage(activePage, format) : null),
    [activePage, format]
  );

  function handleCopy(): void {
    if (exported == null) return;
    navigator.clipboard
      .writeText(exported.code)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Copy failed'));
  }

  function handleDownload(): void {
    if (exported == null) return;
    const blob = new Blob([exported.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exported.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${exported.filename}`);
  }

  if (activePage == null) {
    return (
      <div className="space-y-4">
        <SectionHeader
          title="Export"
          subtitle="Embed or hand off the active page as a framework component"
        />
        <EmptyHint>Select an active page to export.</EmptyHint>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Export"
        subtitle="Embed or hand off the active page as a framework component"
      />

      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">Format</div>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <Btn
              key={f}
              variant={format === f ? 'primary' : 'ghost'}
              onClick={() => setFormat(f)}
            >
              {f}
            </Btn>
          ))}
        </div>
      </Card>

      {exported != null && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge tone="slate">{exported.filename}</Badge>
            <div className="flex gap-2 ml-auto">
              <Btn onClick={handleCopy}>Copy</Btn>
              <Btn variant="primary" onClick={handleDownload}>
                Download
              </Btn>
            </div>
          </div>
          <pre className="overflow-auto max-h-96 rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-slate-200">
            {exported.code}
          </pre>
        </div>
      )}
    </div>
  );
}
