import { cn } from './cn';

interface SkeletonProps {
  className?: string;
}

/**
 * Pulsing rectangle for loading states. The animation is honored by Sonner /
 * the rest of the app's `motion-reduce` rule — when the user prefers reduced
 * motion the shimmer flatten to a steady tint.
 */
export function Skeleton({ className }: SkeletonProps): React.ReactElement {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none dark:bg-slate-800',
        className
      )}
    />
  );
}
