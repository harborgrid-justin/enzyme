/**
 * @file Slot Hooks
 * @description Hooks for working with module slots
 */

import { useEffect, type ReactNode } from 'react';
import { useModuleContext, useOptionalModuleContext } from '../ModuleBoundary';

/**
 * Hook to fill a slot with content.
 * Automatically clears the slot on unmount.
 * @param name - Slot name
 * @param content - Content to fill the slot with
 */
export function useFillSlot(name: string, content: ReactNode): void {
  const context = useModuleContext();

  useEffect(() => {
    context.setSlot(name, content);

    return () => {
      // Clear slot on unmount
      context.setSlot(name, null);
    };
  }, [context, name, content]);
}

/**
 * Hook to get slot content.
 * @param name - Slot name
 * @returns Slot content or null
 */
export function useSlotContent(name: string): ReactNode | null {
  const context = useOptionalModuleContext();
  return context?.getSlot(name) ?? null;
}

/**
 * Hook to check if a slot is filled.
 * @param name - Slot name
 * @returns Whether slot is filled
 */
export function useIsSlotFilled(name: string): boolean {
  const content = useSlotContent(name);
  return content !== null && content !== undefined;
}
