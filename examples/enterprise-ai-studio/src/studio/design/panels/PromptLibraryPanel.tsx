import { useState } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  TextArea,
  Badge,
  Card,
  EmptyHint,
} from '../ui';
import { toast } from '../../ui/toast';
import { renderPrompt, extractVariables, addVersion } from '../lib/prompts';
import type { PromptTemplate } from '../types';

export function PromptLibraryPanel(): React.ReactElement {
  const prompts = useDesignStore((s) => s.prompts);
  const upsertPrompt = useDesignStore((s) => s.upsertPrompt);
  const removePrompt = useDesignStore((s) => s.removePrompt);

  const [selectedId, setSelectedId] = useState<string | null>(
    prompts[0]?.id ?? null
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [editBody, setEditBody] = useState('');
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState('');

  const selected: PromptTemplate | undefined = prompts.find(
    (p) => p.id === selectedId
  );
  const latestVersion = selected?.versions[selected.versions.length - 1];

  function handleSelect(prompt: PromptTemplate): void {
    setSelectedId(prompt.id);
    const latest = prompt.versions[prompt.versions.length - 1];
    setEditBody(latest?.template ?? '');
    setValues({});
  }

  function handleValueChange(name: string, value: string): void {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSaveVersion(): void {
    if (selected == null || editBody.trim() === '') return;
    const updated = addVersion(selected, editBody.trim());
    upsertPrompt(updated);
    toast.success(`Saved version ${updated.versions[updated.versions.length - 1]?.version}`);
  }

  function handleAddPrompt(): void {
    if (newName.trim() === '' || newTemplate.trim() === '') {
      toast.error('Name and template are required');
      return;
    }
    const prompt: PromptTemplate = {
      id: `prompt-${crypto.randomUUID()}`,
      name: newName.trim(),
      variables: extractVariables(newTemplate.trim()),
      versions: [
        {
          version: 1,
          template: newTemplate.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    };
    upsertPrompt(prompt);
    setNewName('');
    setNewTemplate('');
    toast.success(`Created prompt "${prompt.name}"`);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Prompt Library"
        subtitle="Versioned org prompt templates with variable interpolation"
      />

      {/* Prompt list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Templates ({prompts.length})
        </p>
        {prompts.length === 0 && (
          <EmptyHint>No prompts yet. Create one below.</EmptyHint>
        )}
        {prompts.map((prompt) => {
          const latest = prompt.versions[prompt.versions.length - 1];
          return (
            <Card
              key={prompt.id}
              className={`cursor-pointer transition ${
                selectedId === prompt.id
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="flex-1 text-left space-y-1"
                  onClick={() => handleSelect(prompt)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {prompt.name}
                    </span>
                    <Badge tone="indigo">
                      v{latest?.version ?? 1}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prompt.variables.map((v) => (
                      <Badge key={v} tone="amber">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </button>
                <Btn
                  variant="danger"
                  onClick={() => {
                    removePrompt(prompt.id);
                    if (selectedId === prompt.id) setSelectedId(null);
                  }}
                >
                  Delete
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected prompt editor */}
      {selected != null && latestVersion != null && (
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Edit: {selected.name}
          </p>
          <div className="space-y-3">
            {/* Variable inputs */}
            {selected.variables.length > 0 && (
              <div className="space-y-2">
                {selected.variables.map((v) => (
                  <TextInput
                    key={v}
                    label={v}
                    value={values[v] ?? ''}
                    onChange={(val) => handleValueChange(v, val)}
                    placeholder={`Value for {{${v}}}`}
                  />
                ))}
              </div>
            )}
            {/* Live rendered output */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Preview</p>
              <pre className="text-xs text-slate-700 bg-slate-100 rounded p-2 whitespace-pre-wrap overflow-auto max-h-28">
                {renderPrompt(selected, values)}
              </pre>
            </div>
            {/* Edit body */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Template body</p>
              <TextArea
                value={editBody}
                onChange={setEditBody}
                rows={3}
                mono
              />
            </div>
            <Btn variant="primary" onClick={handleSaveVersion}>
              Save as new version
            </Btn>
          </div>
        </Card>
      )}

      {/* New prompt form */}
      <Card>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          New Prompt
        </p>
        <div className="space-y-3">
          <TextInput
            value={newName}
            onChange={setNewName}
            placeholder="Prompt name"
            label="Name"
          />
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Template</p>
            <TextArea
              value={newTemplate}
              onChange={setNewTemplate}
              placeholder="Use {{variable}} placeholders…"
              rows={3}
              mono
            />
          </div>
          <Btn variant="primary" onClick={handleAddPrompt}>
            Create prompt
          </Btn>
        </div>
      </Card>
    </div>
  );
}
