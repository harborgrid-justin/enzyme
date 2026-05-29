import { useState, useRef, useCallback } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  Badge,
  Card,
  EmptyHint,
} from '../ui';
import type { Asset, AssetKind } from '../types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function inferKind(mimeType: string): AssetKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('font')) return 'font';
  return 'icon';
}

const KIND_OPTIONS: AssetKind[] = ['image', 'icon', 'font', 'video'];

export function AssetsPanel(): React.ReactElement {
  const assets = useDesignStore((s) => s.assets);
  const addAsset = useDesignStore((s) => s.addAsset);
  const removeAsset = useDesignStore((s) => s.removeAsset);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<AssetKind>('image');
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = useCallback((): void => {
    if (name.trim() === '' || url.trim() === '') return;
    const asset: Asset = {
      id: `asset-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      kind,
      url: url.trim(),
      size: url.trim().length,
      createdAt: new Date().toISOString(),
    };
    addAsset(asset);
    setName('');
    setUrl('');
  }, [name, kind, url, addAsset]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (file == null) return;
      const reader = new FileReader();
      reader.onload = (): void => {
        const dataUrl = reader.result as string;
        const asset: Asset = {
          id: `asset-${crypto.randomUUID().slice(0, 8)}`,
          name: file.name,
          kind: inferKind(file.type),
          url: dataUrl,
          size: file.size,
          createdAt: new Date().toISOString(),
        };
        addAsset(asset);
      };
      reader.readAsDataURL(file);
      // Reset so the same file can be re-selected if needed.
      if (fileInputRef.current != null) fileInputRef.current.value = '';
    },
    [addAsset]
  );

  const handleCopyUrl = useCallback((assetUrl: string): void => {
    void navigator.clipboard.writeText(assetUrl);
  }, []);

  const kindTone = (k: AssetKind): 'indigo' | 'emerald' | 'amber' | 'sky' => {
    if (k === 'image') return 'indigo';
    if (k === 'icon') return 'sky';
    if (k === 'font') return 'amber';
    return 'emerald';
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Assets"
        subtitle={`${assets.length} asset${assets.length !== 1 ? 's' : ''} in library`}
      />

      {/* Add via URL */}
      <Card>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Add asset</p>
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              label="Name"
              value={name}
              onChange={setName}
              placeholder="hero.png"
            />
            <label className="block text-xs font-medium text-slate-600">
              Kind
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as AssetKind)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <TextInput
            label="URL"
            value={url}
            onChange={setUrl}
            placeholder="https://example.com/asset.png"
          />
          <div className="flex items-center gap-2">
            <Btn
              variant="primary"
              onClick={handleAdd}
              disabled={name.trim() === '' || url.trim() === ''}
            >
              Add
            </Btn>
            <span className="text-xs text-slate-400">or</span>
            <Btn variant="ghost" onClick={() => fileInputRef.current?.click()}>
              Upload file
            </Btn>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </Card>

      {/* Asset list */}
      {assets.length === 0 ? (
        <EmptyHint>No assets yet — add one above or upload a file.</EmptyHint>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <Card key={asset.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge tone={kindTone(asset.kind)}>{asset.kind}</Badge>
                    <span className="truncate text-sm font-medium text-slate-800">{asset.name}</span>
                  </div>
                  <p className="text-xs text-slate-400">{formatSize(asset.size)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Btn
                    variant="ghost"
                    onClick={() => handleCopyUrl(asset.url)}
                    title="Copy URL"
                  >
                    Copy URL
                  </Btn>
                  <Btn
                    variant="danger"
                    onClick={() => removeAsset(asset.id)}
                    title="Delete asset"
                  >
                    Delete
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
