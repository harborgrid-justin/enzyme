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
} from '../ui';
import { toast } from '../../ui/toast';
import { retrieve, groundingPreamble } from '../lib/rag';
import type { KnowledgeDoc } from '../types';

export function KnowledgePanel(): React.ReactElement {
  const knowledge = useDesignStore((s) => s.knowledge);
  const addDoc = useDesignStore((s) => s.addDoc);
  const removeDoc = useDesignStore((s) => s.removeDoc);

  const [query, setQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newContent, setNewContent] = useState('');

  const chunks = useMemo(
    () => (query.trim().length > 0 ? retrieve(query, knowledge) : []),
    [query, knowledge]
  );

  const preamble = useMemo(() => groundingPreamble(chunks), [chunks]);

  function handleAdd(): void {
    if (newTitle.trim() === '' || newContent.trim() === '') {
      toast.error('Title and content are required');
      return;
    }
    const doc: KnowledgeDoc = {
      id: `kb-${crypto.randomUUID()}`,
      title: newTitle.trim(),
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      content: newContent.trim(),
    };
    addDoc(doc);
    setNewTitle('');
    setNewTags('');
    setNewContent('');
    toast.success(`Added "${doc.title}"`);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Knowledge Base"
        subtitle="RAG-grounded retrieval over org docs"
      />

      {/* Query box */}
      <Card>
        <div className="space-y-3">
          <TextInput
            value={query}
            onChange={setQuery}
            placeholder="Search knowledge base…"
            label="Query"
          />
          {chunks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Ranked chunks
              </p>
              {chunks.map((chunk) => (
                <div
                  key={chunk.docId}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {chunk.docTitle}
                    </span>
                    <Badge tone="indigo">score {chunk.score}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {chunk.snippet}
                  </p>
                </div>
              ))}
            </div>
          )}
          {query.trim().length > 0 && chunks.length === 0 && (
            <p className="text-xs text-slate-400">No matching documents.</p>
          )}
          {preamble.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Injected grounding
              </p>
              <pre className="text-xs text-slate-700 bg-slate-100 rounded p-2 whitespace-pre-wrap overflow-auto max-h-32">
                {preamble}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Docs list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Documents ({knowledge.length})
        </p>
        {knowledge.length === 0 && (
          <EmptyHint>No documents yet. Add one below.</EmptyHint>
        )}
        {knowledge.map((doc) => (
          <Card key={doc.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">{doc.title}</span>
              <Btn variant="danger" onClick={() => removeDoc(doc.id)}>
                Delete
              </Btn>
            </div>
            <div className="flex flex-wrap gap-1">
              {doc.tags.map((tag) => (
                <Badge key={tag} tone="slate">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{doc.content}</p>
          </Card>
        ))}
      </div>

      {/* Add doc form */}
      <Card>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Add Document
        </p>
        <div className="space-y-3">
          <TextInput
            value={newTitle}
            onChange={setNewTitle}
            placeholder="Document title"
            label="Title"
          />
          <TextInput
            value={newTags}
            onChange={setNewTags}
            placeholder="brand, a11y, layout"
            label="Tags (comma-separated)"
          />
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Content</p>
            <TextArea
              value={newContent}
              onChange={setNewContent}
              placeholder="Document content…"
              rows={3}
            />
          </div>
          <Btn variant="primary" onClick={handleAdd}>
            Add document
          </Btn>
        </div>
      </Card>
    </div>
  );
}
