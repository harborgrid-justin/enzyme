import { useState, useCallback } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextArea,
  EmptyHint,
  Card,
} from '../ui';
import { pageToFigma, figmaToPage, type FigmaDocument } from '../lib/figma';
import { toast } from '../../ui/toast';

export function FigmaPanel(): React.ReactElement {
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);
  const addPage = useDesignStore((s) => s.addPage);

  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  const [exportPageId, setExportPageId] = useState<string>(
    activePageId ?? pages[0]?.id ?? ''
  );
  const [importJson, setImportJson] = useState('');

  const exportPage = exportPageId !== '' ? (pages.find((p) => p.id === exportPageId) ?? null) : null;
  const exportDoc = exportPage != null ? pageToFigma(exportPage) : null;
  const exportStr = exportDoc != null ? JSON.stringify(exportDoc, null, 2) : '';

  const handleCopy = useCallback((): void => {
    if (exportStr === '') return;
    void navigator.clipboard.writeText(exportStr).then(() => {
      toast.success('Copied Figma JSON to clipboard');
    });
  }, [exportStr]);

  const handleDownload = useCallback((): void => {
    if (exportStr === '' || exportDoc == null) return;
    const blob = new Blob([exportStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${exportDoc.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [exportStr, exportDoc]);

  const handleImport = useCallback((): void => {
    if (importJson.trim() === '') {
      toast.error('Paste Figma JSON first');
      return;
    }
    let doc: FigmaDocument;
    try {
      doc = JSON.parse(importJson) as FigmaDocument;
    } catch {
      toast.error('Invalid JSON — could not parse Figma document');
      return;
    }
    const newId = `page-${crypto.randomUUID().slice(0, 8)}`;
    const page = figmaToPage(doc, newId);
    addPage(page);
    setImportJson('');
    toast.success(`Imported "${page.name}" as a new page`);
  }, [importJson, addPage]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Figma Import / Export"
        subtitle="Round-trip pages to Figma JSON"
      />

      {/* Export */}
      <Card>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Export page</p>

          {pages.length === 0 ? (
            <EmptyHint>No pages to export — create one first.</EmptyHint>
          ) : (
            <>
              <label className="block text-xs font-medium text-slate-600">
                Page
                <select
                  value={exportPageId}
                  onChange={(e) => setExportPageId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                >
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              {exportStr !== '' && (
                <>
                  <pre className="max-h-48 overflow-y-auto rounded-md bg-slate-900 p-3 text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
                    {exportStr}
                  </pre>
                  <div className="flex gap-2">
                    <Btn onClick={handleCopy}>Copy</Btn>
                    <Btn onClick={handleDownload} variant="primary">
                      Download .json
                    </Btn>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Import */}
      <Card>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Import Figma JSON</p>
          <TextArea
            value={importJson}
            onChange={setImportJson}
            placeholder={'{\n  "name": "My Frame",\n  "frame": { ... }\n}'}
            rows={6}
            mono
          />
          <Btn onClick={handleImport} variant="primary" disabled={importJson.trim() === ''}>
            Import
          </Btn>
          <p className="text-xs text-slate-400">
            Paste a Figma-style document JSON to add it as a new design page.
          </p>
        </div>
      </Card>

      {activePage == null && (
        <EmptyHint>No active page — select one from the Pages panel.</EmptyHint>
      )}
    </div>
  );
}
