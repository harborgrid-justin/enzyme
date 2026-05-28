/**
 * Accessible modal dialog built on Radix. Provides:
 *
 *   - Focus trapping + focus return to the trigger on close
 *   - Escape key + backdrop click dismissal
 *   - Animated overlay that respects `prefers-reduced-motion`
 *   - Themed surface that follows the host's light/dark setting
 *
 * Used in place of `window.prompt` / `window.confirm` everywhere in the studio
 * (see audit items #7 and "rename dialog uses window.prompt").
 */
import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from './cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Optional footer slot (typically action buttons). */
  footer?: ReactNode;
  /** Max-width preset. Defaults to "sm". */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<Required<DialogProps>['size'], string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'sm',
}: DialogProps): React.ReactElement {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 motion-reduce:animate-none',
            'dark:bg-slate-900 dark:ring-slate-800',
            SIZE_CLASSES[size]
          )}
        >
          <RadixDialog.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </RadixDialog.Title>
          {description != null && (
            <RadixDialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </RadixDialog.Description>
          )}
          <div className="mt-4">{children}</div>
          {footer != null && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Convenience subcomponents for consistent button styling inside dialogs. */
interface ActionButtonProps {
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  children: ReactNode;
}

export function DialogPrimaryButton({
  onClick,
  type = 'button',
  disabled,
  children,
}: ActionButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function DialogDangerButton({
  onClick,
  type = 'button',
  disabled,
  children,
}: ActionButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function DialogSecondaryButton({
  onClick,
  type = 'button',
  disabled,
  children,
}: ActionButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}
