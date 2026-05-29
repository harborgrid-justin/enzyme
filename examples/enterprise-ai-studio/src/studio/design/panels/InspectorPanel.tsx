import { useState, useCallback } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  PreviewFrame,
  TextInput,
  EmptyHint,
} from '../ui';
import { parseNodes, applyNodeEdit } from '../lib/inspector';
import type { InspectedNode } from '../types';

export function InspectorPanel(): React.ReactElement {
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);
  const updatePageBody = useDesignStore((s) => s.updatePageBody);

  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  const [selectedPath, setSelectedPath] = useState<number | null>(null);

  const nodes: InspectedNode[] = activePage != null ? parseNodes(activePage.body) : [];

  const selectedNode = nodes.find((n) => n.path === selectedPath) ?? null;

  const [localText, setLocalText] = useState('');
  const [localColor, setLocalColor] = useState('');
  const [localBackground, setLocalBackground] = useState('');
  const [localPadding, setLocalPadding] = useState('');

  const handleSelectNode = useCallback(
    (node: InspectedNode): void => {
      setSelectedPath(node.path);
      setLocalText(node.text);
      setLocalColor(node.style['color'] ?? '');
      setLocalBackground(node.style['background'] ?? '');
      setLocalPadding(node.style['padding'] ?? '');
    },
    []
  );

  const commitEdit = useCallback(
    (
      text: string,
      color: string,
      background: string,
      padding: string
    ): void => {
      if (activePage == null || selectedPath == null) return;
      const style: Record<string, string> = {};
      if (color.trim() !== '') style['color'] = color.trim();
      if (background.trim() !== '') style['background'] = background.trim();
      if (padding.trim() !== '') style['padding'] = padding.trim();
      const updated = applyNodeEdit(activePage.body, selectedPath, {
        text,
        style,
      });
      updatePageBody(activePage.id, updated);
    },
    [activePage, selectedPath, updatePageBody]
  );

  if (activePage == null) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Inspector" subtitle="Select a page to inspect elements" />
        <EmptyHint>No active page — open one from the Pages panel.</EmptyHint>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Inspector"
        subtitle={`${nodes.length} elements on "${activePage.name}"`}
      />

      <div className="flex gap-4">
        {/* Node list */}
        <div className="w-48 shrink-0 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2" style={{ maxHeight: '18rem' }}>
          {nodes.length === 0 && (
            <p className="text-xs text-slate-400 px-1">No elements found.</p>
          )}
          {nodes.map((node) => (
            <button
              key={node.path}
              type="button"
              onClick={() => handleSelectNode(node)}
              className={`w-full rounded px-2 py-1 text-left text-xs transition ${
                selectedPath === node.path
                  ? 'bg-indigo-100 text-indigo-800 font-semibold'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="font-mono text-indigo-500">&lt;{node.tag}&gt;</span>{' '}
              <span className="text-slate-500 truncate">
                {node.text.slice(0, 20) || '…'}
              </span>
            </button>
          ))}
        </div>

        {/* Editor + preview */}
        <div className="flex-1 space-y-3">
          {selectedNode != null ? (
            <>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  &lt;{selectedNode.tag}&gt; — path {selectedNode.path}
                </p>
                <TextInput
                  label="Text"
                  value={localText}
                  onChange={(v) => {
                    setLocalText(v);
                    commitEdit(v, localColor, localBackground, localPadding);
                  }}
                />
                <TextInput
                  label="color"
                  value={localColor}
                  placeholder="#f8fafc"
                  onChange={(v) => {
                    setLocalColor(v);
                    commitEdit(localText, v, localBackground, localPadding);
                  }}
                />
                <TextInput
                  label="background"
                  value={localBackground}
                  placeholder="#0f172a"
                  onChange={(v) => {
                    setLocalBackground(v);
                    commitEdit(localText, localColor, v, localPadding);
                  }}
                />
                <TextInput
                  label="padding"
                  value={localPadding}
                  placeholder="12px 20px"
                  onChange={(v) => {
                    setLocalPadding(v);
                    commitEdit(localText, localColor, localBackground, v);
                  }}
                />
              </div>
            </>
          ) : (
            <EmptyHint>Select an element from the list to edit it.</EmptyHint>
          )}
        </div>
      </div>

      <PreviewFrame body={activePage.body} className="h-64" />
    </div>
  );
}
