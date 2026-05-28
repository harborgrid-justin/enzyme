import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

interface TooltipProps {
  /** Element that triggers the tooltip on hover/focus. */
  children: ReactNode;
  /** Tooltip body. */
  label: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Radix tooltip wrapper with project-default styling + delay. Pair with a
 * single `<TooltipProvider>` near the root.
 */
export function Tooltip({ children, label, side = 'top' }: TooltipProps): React.ReactElement {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow-md data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 motion-reduce:animate-none dark:bg-slate-100 dark:text-slate-900"
        >
          {label}
          <RadixTooltip.Arrow className="fill-slate-900 dark:fill-slate-100" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export { Provider as TooltipProvider } from '@radix-ui/react-tooltip';
