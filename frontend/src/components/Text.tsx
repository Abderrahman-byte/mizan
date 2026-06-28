import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Small uppercase eyebrow label above a heading. */
export function Eyebrow({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        'text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-ink-faint',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/** Uppercase card section heading (slightly larger tracking than Eyebrow). */
export function CardHeading({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        'text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-ink-faint',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/** Quicksand display heading used inside cards. */
export function Heading({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn('font-head text-lg font-bold', className)} style={style}>
      {children}
    </div>
  );
}
