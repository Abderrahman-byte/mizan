import { cn } from '@/utils/cn';

export interface ProgressBarProps {
  /** Fill fraction, 0–100. */
  percent: number;
  /** CSS color for the fill (defaults to the accent). */
  color?: string;
  /** Track height in px. */
  height?: number;
  className?: string;
}

/** Rounded progress track + fill, used for budgets, goals, and category bars. */
export function ProgressBar({ percent, color, height = 10, className }: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-surface-2', className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${width}%`, background: color ?? 'var(--accent)' }}
      />
    </div>
  );
}
