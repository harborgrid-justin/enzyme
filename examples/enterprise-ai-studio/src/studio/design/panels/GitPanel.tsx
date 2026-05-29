import { useState } from 'react';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  Badge,
  Card,
  EmptyHint,
} from '../ui';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const PR_STATUS_TONE = {
  open: 'sky',
  merged: 'indigo',
  closed: 'slate',
} as const satisfies Record<string, 'sky' | 'indigo' | 'slate'>;

export function GitPanel(): React.ReactElement {
  const git = useDesignStore((s) => s.git);
  const connectRepo = useDesignStore((s) => s.connectRepo);
  const commit = useDesignStore((s) => s.commit);
  const openPullRequest = useDesignStore((s) => s.openPullRequest);
  const mergePullRequest = useDesignStore((s) => s.mergePullRequest);
  const pages = useDesignStore((s) => s.pages);

  const [repoInput, setRepoInput] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prBranch, setPrBranch] = useState('design/update');

  function handleConnect(): void {
    const trimmed = repoInput.trim();
    if (trimmed === '') return;
    connectRepo(trimmed);
    setRepoInput('');
  }

  function handleCommit(): void {
    const msg = commitMsg.trim();
    if (msg === '') return;
    const files = pages.map((p) => {
      const slug = p.route === '/' ? 'home' : p.route.replace(/^\//, '');
      return `pages/${slug}.html`;
    });
    commit(msg, files);
    setCommitMsg('');
  }

  function handleOpenPR(): void {
    const title = prTitle.trim();
    const branch = prBranch.trim();
    if (title === '' || branch === '') return;
    openPullRequest(title, branch);
    setPrTitle('');
  }

  if (git.repo == null) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Git Sync" subtitle="Connect a repository to enable version control" />
        <Card>
          <div className="mb-2 text-xs font-semibold text-slate-600">Connect repository</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <TextInput
                value={repoInput}
                onChange={setRepoInput}
                placeholder="org/repo"
              />
            </div>
            <div className="flex items-end">
              <Btn variant="primary" onClick={handleConnect} disabled={repoInput.trim() === ''}>
                Connect
              </Btn>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Git Sync"
        subtitle="Version control for your prototype"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-mono">{git.repo}</span>
            <Badge tone="indigo">{git.branch}</Badge>
          </div>
        }
      />

      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">Commit prototype</div>
        <div className="flex gap-2">
          <div className="flex-1">
            <TextInput
              value={commitMsg}
              onChange={setCommitMsg}
              placeholder="feat(design): update hero layout"
            />
          </div>
          <div className="flex items-end">
            <Btn variant="primary" onClick={handleCommit} disabled={commitMsg.trim() === ''}>
              Commit prototype
            </Btn>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">Open pull request</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[160px]">
            <TextInput value={prTitle} onChange={setPrTitle} placeholder="Design update" />
          </div>
          <div className="w-40">
            <TextInput value={prBranch} onChange={setPrBranch} placeholder="design/update" />
          </div>
          <div className="flex items-end">
            <Btn
              variant="primary"
              onClick={handleOpenPR}
              disabled={prTitle.trim() === '' || prBranch.trim() === ''}
            >
              Open PR
            </Btn>
          </div>
        </div>
      </Card>

      {git.pullRequests.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pull requests
          </div>
          <div className="space-y-2">
            {git.pullRequests.map((pr) => (
              <Card key={pr.id}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">#{pr.number}</span>
                  <span className="text-sm font-medium text-slate-800 flex-1">{pr.title}</span>
                  <Badge tone={PR_STATUS_TONE[pr.status]}>{pr.status}</Badge>
                  <span className="text-xs text-slate-400">{relativeTime(pr.createdAt)}</span>
                  {pr.status === 'open' && (
                    <Btn variant="primary" onClick={() => mergePullRequest(pr.id)}>
                      Merge
                    </Btn>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {git.commits.length === 0 ? (
        <EmptyHint>No commits yet. Commit the prototype above.</EmptyHint>
      ) : (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Commits
          </div>
          <div className="space-y-2">
            {git.commits.map((c) => (
              <Card key={c.id}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                    {c.message}
                  </span>
                  <Badge tone="slate">{c.author}</Badge>
                  <Badge tone="indigo">{c.branch}</Badge>
                  <span className="text-xs text-slate-400">
                    {c.files.length} file{c.files.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-slate-400">{relativeTime(c.createdAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
