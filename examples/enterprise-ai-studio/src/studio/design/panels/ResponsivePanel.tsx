import { useState, useMemo } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  Card,
  EmptyHint,
  PreviewFrame,
} from '../ui';
import { toast } from '../../ui/toast';
import type { Breakpoint } from '../types';

export function ResponsivePanel(): React.ReactElement {
  const breakpoints = useDesignStore((s) => s.breakpoints);
  const addBreakpoint = useDesignStore((s) => s.addBreakpoint);
  const removeBreakpoint = useDesignStore((s) => s.removeBreakpoint);
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);

  const [newName, setNewName] = useState('');
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId),
    [pages, activePageId]
  );

  function handleAdd(): void {
    const w = parseInt(newWidth, 10);
    const h = parseInt(newHeight, 10);
    if (newName.trim() === '' || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;
    const bp: Breakpoint = {
      id: `bp-${crypto.randomUUID().slice(0, 8)}`,
      name: newName.trim(),
      width: w,
      height: h,
    };
    addBreakpoint(bp);
    setNewName('');
    setNewWidth('');
    setNewHeight('');
    toast.success(`Breakpoint "${bp.name}" added (${bp.width}×${bp.height})`);
  }

  if (activePage == null) {
    return (
      <div className="space-y-4">
        <SectionHeader
          title="Responsive Preview"
          subtitle="Preview the active page at each breakpoint"
        />
        <EmptyHint>No active page selected. Go to Pages and select one.</EmptyHint>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Responsive Preview"
        subtitle={`Active page: ${activePage.name} · ${breakpoints.length} breakpoint${breakpoints.length !== 1 ? 's' : ''}`}
      />

      {breakpoints.length === 0 ? (
        <EmptyHint>No breakpoints defined. Add one below.</EmptyHint>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {breakpoints.map((bp) => {
            const displayWidth = Math.min(bp.width, 420);
            return (
              <div key={bp.id} className="flex-shrink-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {bp.name} · {bp.width}×{bp.height}
                  </span>
                  <Btn
                    variant="danger"
                    onClick={() => {
                      removeBreakpoint(bp.id);
                      toast.info(`Breakpoint "${bp.name}" removed`);
                    }}
                    title={`Remove ${bp.name}`}
                  >
                    ×
                  </Btn>
                </div>
                <div
                  className="overflow-hidden rounded border-2 border-slate-300 bg-white"
                  style={{ width: displayWidth }}
                >
                  <PreviewFrame
                    body={activePage.body}
                    className="h-[520px]"
                  />
                </div>
                <p className="mt-1 text-center text-[10px] text-slate-400">
                  {bp.width}px viewport (scaled to {displayWidth}px)
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">Add breakpoint</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[100px]">
            <TextInput
              label="Name"
              value={newName}
              onChange={setNewName}
              placeholder="Laptop"
            />
          </div>
          <div className="w-24">
            <TextInput
              label="Width (px)"
              value={newWidth}
              onChange={setNewWidth}
              placeholder="1280"
              type="number"
            />
          </div>
          <div className="w-24">
            <TextInput
              label="Height (px)"
              value={newHeight}
              onChange={setNewHeight}
              placeholder="800"
              type="number"
            />
          </div>
          <div className="flex items-end">
            <Btn
              variant="primary"
              onClick={handleAdd}
              disabled={
                newName.trim() === '' ||
                newWidth.trim() === '' ||
                newHeight.trim() === ''
              }
            >
              Add
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
