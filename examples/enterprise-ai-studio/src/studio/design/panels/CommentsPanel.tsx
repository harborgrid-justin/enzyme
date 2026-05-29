import { useState, useMemo } from 'react';
import type { DesignComment } from '../types';
import { useDesignStore, parseMentions } from '../store';
import {
  SectionHeader,
  Btn,
  TextArea,
  Badge,
  Card,
  EmptyHint,
} from '../ui';
import { toast } from '../../ui/toast';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MentionBody({ body }: { body: string }): React.ReactElement {
  const parts = body.split(/(@[A-Za-z][\w-]*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span
            key={i}
            className="inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function ReplyRow({
  commentId,
}: {
  commentId: string;
}): React.ReactElement {
  const [text, setText] = useState('');
  const addReply = useDesignStore((s) => s.addReply);

  function handleReply(): void {
    const trimmed = text.trim();
    if (trimmed === '') return;
    addReply(commentId, trimmed);
    setText('');
    toast.success('Reply posted');
  }

  return (
    <div className="mt-2 flex gap-2">
      <div className="flex-1">
        <TextArea
          value={text}
          onChange={setText}
          placeholder="Reply… (@mention someone)"
          rows={2}
        />
      </div>
      <div className="flex items-end">
        <Btn variant="primary" onClick={handleReply} disabled={text.trim() === ''}>
          Reply
        </Btn>
      </div>
    </div>
  );
}

function CommentCard({
  comment,
}: {
  comment: DesignComment;
}): React.ReactElement {
  const resolveComment = useDesignStore((s) => s.resolveComment);
  const deleteComment = useDesignStore((s) => s.deleteComment);

  return (
    <Card className={comment.resolved ? 'opacity-60' : ''}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-800">{comment.author}</span>
          <span className="text-[11px] text-slate-400">{relativeTime(comment.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          {comment.resolved && <Badge tone="emerald">resolved</Badge>}
          <Btn
            variant="ghost"
            onClick={() => {
              resolveComment(comment.id);
              toast.success(comment.resolved ? 'Reopened' : 'Resolved');
            }}
          >
            {comment.resolved ? 'Reopen' : 'Resolve'}
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              deleteComment(comment.id);
              toast.success('Deleted');
            }}
          >
            ×
          </Btn>
        </div>
      </div>

      <p className="mt-1 text-sm text-slate-700">
        <MentionBody body={comment.body} />
      </p>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2 space-y-1 border-l-2 border-slate-100 pl-3">
          {comment.replies.map((r) => (
            <div key={r.id} className="text-xs text-slate-600">
              <span className="font-semibold text-slate-700">{r.author}</span>{' '}
              <span className="text-slate-400">{relativeTime(r.createdAt)}</span>
              <p className="mt-0.5">
                <MentionBody body={r.body} />
              </p>
            </div>
          ))}
        </div>
      )}

      <ReplyRow commentId={comment.id} />
    </Card>
  );
}

export function CommentsPanel(): React.ReactElement {
  const comments = useDesignStore((s) => s.comments);
  const addComment = useDesignStore((s) => s.addComment);
  const pages = useDesignStore((s) => s.pages);
  const activePageId = useDesignStore((s) => s.activePageId);

  const [body, setBody] = useState('');
  const [hideResolved, setHideResolved] = useState(false);

  const activePage = useMemo(() => pages.find((p) => p.id === activePageId), [pages, activePageId]);

  const pageComments = useMemo(
    () =>
      comments.filter(
        (c) => c.targetId === activePageId && (!hideResolved || !c.resolved)
      ),
    [comments, activePageId, hideResolved]
  );

  function handlePost(): void {
    const trimmed = body.trim();
    if (trimmed === '' || activePage == null) return;
    void parseMentions(trimmed); // side-effect-free, just verifying import works
    addComment(activePage.id, trimmed, null);
    setBody('');
    toast.success('Comment posted');
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Comments"
        subtitle={activePage != null ? `Page: ${activePage.name}` : 'No active page'}
        action={
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hideResolved}
              onChange={(e) => setHideResolved(e.target.checked)}
              className="rounded border-slate-300"
            />
            Hide resolved
          </label>
        }
      />

      {/* Compose */}
      <Card>
        <TextArea
          value={body}
          onChange={setBody}
          placeholder="Add a comment… (@mention a teammate)"
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <Btn
            variant="primary"
            onClick={handlePost}
            disabled={body.trim() === '' || activePage == null}
          >
            Post
          </Btn>
        </div>
      </Card>

      {/* Comment list */}
      {pageComments.length === 0 ? (
        <EmptyHint>No comments yet on this page.</EmptyHint>
      ) : (
        <div className="space-y-3">
          {pageComments.map((c) => (
            <CommentCard key={c.id} comment={c} />
          ))}
        </div>
      )}
    </div>
  );
}
