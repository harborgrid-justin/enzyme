import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Standard empty-state shell used by the sidebar (no conversations), the
 * message list (new conversation), and other surfaces. Single component keeps
 * the empty-state visual language consistent.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      {icon != null && (
        <div className="mb-3 text-3xl text-slate-300 dark:text-slate-600" aria-hidden>
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description != null && (
        <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action != null && <div className="mt-4">{action}</div>}
    </div>
  );
}
