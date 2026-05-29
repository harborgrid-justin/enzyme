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
import type { DesignPage } from '../types';

export function PagesPanel(): React.ReactElement {
  const pages = useDesignStore((s) => s.pages);
  const pageLinks = useDesignStore((s) => s.pageLinks);
  const activePageId = useDesignStore((s) => s.activePageId);
  const setActivePage = useDesignStore((s) => s.setActivePage);
  const addPage = useDesignStore((s) => s.addPage);
  const updatePageBody = useDesignStore((s) => s.updatePageBody);
  const removePage = useDesignStore((s) => s.removePage);
  const addPageLink = useDesignStore((s) => s.addPageLink);
  const removePageLink = useDesignStore((s) => s.removePageLink);

  const [newName, setNewName] = useState('');
  const [newRoute, setNewRoute] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [previewedPageId, setPreviewedPageId] = useState<string | null>(null);

  const activePage: DesignPage | undefined = useMemo(
    () => pages.find((p) => p.id === activePageId),
    [pages, activePageId]
  );

  const previewedPage: DesignPage | undefined = useMemo(() => {
    const targetId = previewedPageId ?? activePageId;
    return pages.find((p) => p.id === targetId);
  }, [pages, previewedPageId, activePageId]);

  const activeLinks = useMemo(
    () => pageLinks.filter((l) => l.fromPageId === activePageId),
    [pageLinks, activePageId]
  );

  const previewedLinks = useMemo(
    () => pageLinks.filter((l) => l.fromPageId === previewedPage?.id),
    [pageLinks, previewedPage]
  );

  function handleAddPage(): void {
    if (newName.trim() === '' || newRoute.trim() === '') return;
    const name = newName.trim();
    const route = newRoute.trim().startsWith('/') ? newRoute.trim() : `/${newRoute.trim()}`;
    const id = `page-${crypto.randomUUID().slice(0, 8)}`;
    addPage({
      id,
      name,
      route,
      body: `<main style="padding:24px;font-family:system-ui"><h1>${name}</h1></main>`,
    });
    setNewName('');
    setNewRoute('');
    setPreviewedPageId(id);
    toast.success(`Page "${name}" added`);
  }

  function handleAddLink(): void {
    if (activePageId == null || linkTargetId === '' || linkLabel.trim() === '') return;
    addPageLink({
      id: `link-${crypto.randomUUID().slice(0, 8)}`,
      fromPageId: activePageId,
      toPageId: linkTargetId,
      label: linkLabel.trim(),
    });
    setLinkLabel('');
    toast.success('Link added');
  }

  function handleBodyChange(body: string): void {
    if (activePage == null) return;
    updatePageBody(activePage.id, body);
  }

  const otherPages = useMemo(
    () => pages.filter((p) => p.id !== activePageId),
    [pages, activePageId]
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Pages"
        subtitle={`${pages.length} page${pages.length !== 1 ? 's' : ''} · multi-page prototype`}
      />

      {/* Page list */}
      <div className="space-y-1">
        {pages.length === 0 && <EmptyHint>No pages yet. Add one below.</EmptyHint>}
        {pages.map((page) => (
          <div
            key={page.id}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              page.id === activePageId
                ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <button
              type="button"
              className="flex flex-1 items-center gap-2 text-left"
              onClick={() => {
                setActivePage(page.id);
                setPreviewedPageId(null);
              }}
            >
              <span className="flex-1 font-medium">{page.name}</span>
              <Badge tone="slate">{page.route}</Badge>
            </button>
            <Btn
              variant="danger"
              onClick={() => {
                removePage(page.id);
                toast.info(`Page "${page.name}" removed`);
              }}
              title="Delete page"
            >
              ×
            </Btn>
          </div>
        ))}
      </div>

      {/* Add page form */}
      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">Add page</div>
        <div className="flex gap-2">
          <div className="flex-1">
            <TextInput label="Name" value={newName} onChange={setNewName} placeholder="About" />
          </div>
          <div className="flex-1">
            <TextInput label="Route" value={newRoute} onChange={setNewRoute} placeholder="/about" />
          </div>
          <div className="flex items-end">
            <Btn
              variant="primary"
              onClick={handleAddPage}
              disabled={newName.trim() === '' || newRoute.trim() === ''}
            >
              Add
            </Btn>
          </div>
        </div>
      </Card>

      {/* Active page body editor */}
      {activePage != null && (
        <Card>
          <div className="mb-2 text-xs font-semibold text-slate-600">
            Edit body — {activePage.name}
          </div>
          <TextArea
            value={activePage.body}
            onChange={handleBodyChange}
            rows={6}
            mono
            placeholder="<main>…</main>"
          />
        </Card>
      )}

      {/* Links section */}
      {activePage != null && (
        <Card>
          <div className="mb-2 text-xs font-semibold text-slate-600">
            Links from {activePage.name}
          </div>
          {activeLinks.length === 0 && (
            <p className="mb-2 text-xs text-slate-400">No outgoing links.</p>
          )}
          {activeLinks.map((link) => {
            const target = pages.find((p) => p.id === link.toPageId);
            return (
              <div key={link.id} className="mb-1 flex items-center gap-2 text-xs">
                <span className="flex-1 text-slate-700">
                  "{link.label}" → {target?.name ?? link.toPageId}
                </span>
                <Btn variant="danger" onClick={() => removePageLink(link.id)} title="Remove link">
                  ×
                </Btn>
              </div>
            );
          })}
          {otherPages.length > 0 && (
            <div className="mt-2 flex gap-2">
              <select
                value={linkTargetId}
                onChange={(e) => setLinkTargetId(e.target.value)}
                className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:outline-none"
              >
                <option value="">Target page…</option>
                {otherPages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.route})
                  </option>
                ))}
              </select>
              <div className="flex-1">
                <input
                  type="text"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Link label"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <Btn
                variant="primary"
                onClick={handleAddLink}
                disabled={linkTargetId === '' || linkLabel.trim() === ''}
              >
                Add link
              </Btn>
            </div>
          )}
        </Card>
      )}

      {/* Prototype preview */}
      {pages.length > 0 && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Prototype preview — {previewedPage?.name ?? '—'}
            </span>
            <Badge tone="indigo">{previewedPage?.route ?? ''}</Badge>
          </div>
          {previewedPage != null ? (
            <PreviewFrame body={previewedPage.body} className="h-72" />
          ) : (
            <EmptyHint>Select a page to preview</EmptyHint>
          )}
          {previewedLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs text-slate-400">Navigate:</span>
              {previewedLinks.map((link) => {
                const target = pages.find((p) => p.id === link.toPageId);
                return (
                  <Btn
                    key={link.id}
                    variant="ghost"
                    onClick={() => setPreviewedPageId(link.toPageId)}
                  >
                    {link.label} → {target?.name ?? link.toPageId}
                  </Btn>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
