import { useState, useMemo } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  TextArea,
  Badge,
  Card,
  EmptyHint,
  PreviewFrame,
} from '../ui';
import { toast } from '../../ui/toast';
import { extractComponent, renderComponent } from '../lib/componentize';
import type { DesignComponent } from '../types';

export function ComponentsPanel(): React.ReactElement {
  const components = useDesignStore((s) => s.components);
  const addComponent = useDesignStore((s) => s.addComponent);
  const removeComponent = useDesignStore((s) => s.removeComponent);
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);

  const [newName, setNewName] = useState('');
  const [newMarkup, setNewMarkup] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [propOverrides, setPropOverrides] = useState<Record<string, string>>({});

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId),
    [pages, activePageId]
  );

  const selected = useMemo(
    (): DesignComponent | undefined => components.find((c) => c.id === selectedId),
    [components, selectedId]
  );

  const preview = useMemo(
    () => (selected != null ? renderComponent(selected, propOverrides) : ''),
    [selected, propOverrides]
  );

  function handlePrefill(): void {
    if (activePage == null) return;
    const match = activePage.body.match(/<a\b[^>]*>[\s\S]*?<\/a>/i);
    if (match != null) {
      setNewMarkup(match[0]);
      toast.info('Prefilled with first <a> from active page');
    } else {
      toast.error('No <a> element found in active page');
    }
  }

  function handleExtract(): void {
    if (newName.trim() === '' || newMarkup.trim() === '') return;
    const component = extractComponent(newName.trim(), newMarkup.trim());
    addComponent(component);
    setSelectedId(component.id);
    setPropOverrides({});
    setNewName('');
    setNewMarkup('');
    toast.success(`Component "${component.name}" extracted (${component.props.length} props)`);
  }

  function handleSelect(id: string): void {
    setSelectedId(id);
    setPropOverrides({});
  }

  function handleRemove(id: string): void {
    removeComponent(id);
    if (selectedId === id) {
      setSelectedId(null);
      setPropOverrides({});
    }
  }

  function handleOverride(propName: string, value: string): void {
    setPropOverrides((prev) => ({ ...prev, [propName]: value }));
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Component Library"
        subtitle={`${components.length} component${components.length !== 1 ? 's' : ''}`}
      />

      {components.length === 0 ? (
        <EmptyHint>No components yet. Extract one below.</EmptyHint>
      ) : (
        <div className="space-y-2">
          {components.map((c) => (
            <Card
              key={c.id}
              className={`flex cursor-pointer items-center gap-3 py-2 transition ${selectedId === c.id ? 'ring-2 ring-indigo-400' : ''}`}
            >
              <button
                type="button"
                className="flex flex-1 items-center gap-3 text-left"
                onClick={() => handleSelect(c.id)}
              >
                <span className="flex-1 text-sm font-medium text-slate-800">{c.name}</span>
                <Badge tone={c.origin === 'extracted' ? 'indigo' : 'emerald'}>{c.origin}</Badge>
                <span className="text-xs text-slate-400">{c.props.length} props</span>
              </button>
              <Btn variant="danger" onClick={() => handleRemove(c.id)} title="Delete component">
                ×
              </Btn>
            </Card>
          ))}
        </div>
      )}

      {selected != null && (
        <Card>
          <div className="mb-2 text-xs font-semibold text-slate-600">
            Props — {selected.name}
          </div>
          <div className="space-y-2">
            {selected.props.map((prop) => (
              <TextInput
                key={prop.name}
                label={prop.name}
                value={propOverrides[prop.name] ?? prop.defaultValue}
                onChange={(v) => handleOverride(prop.name, v)}
                placeholder={prop.defaultValue}
                type={prop.type === 'color' ? 'color' : prop.type === 'url' ? 'url' : 'text'}
              />
            ))}
          </div>
          <div className="mt-3">
            <div className="mb-1 text-xs font-semibold text-slate-500">Live preview</div>
            <PreviewFrame body={preview} className="h-28" />
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Extract component</span>
          <Btn variant="ghost" onClick={handlePrefill} disabled={activePage == null}>
            Use active page &lt;a&gt;
          </Btn>
        </div>
        <div className="space-y-2">
          <TextInput
            label="Name"
            value={newName}
            onChange={setNewName}
            placeholder="CTA Button"
          />
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-600">Markup</span>
            <TextArea
              value={newMarkup}
              onChange={setNewMarkup}
              placeholder='<a href="/signup" style="background:#6366f1">Get started</a>'
              rows={4}
              mono
            />
          </div>
          <Btn
            variant="primary"
            onClick={handleExtract}
            disabled={newName.trim() === '' || newMarkup.trim() === ''}
          >
            Extract
          </Btn>
        </div>
      </Card>
    </div>
  );
}
