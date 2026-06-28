import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface PillProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A rounded outline pill, typically an icon + short label in the top bar. */
export function Pill({ children, className, style }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface',
        'px-3.5 py-2 text-[13px] font-bold text-ink-soft',
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
