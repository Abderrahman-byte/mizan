import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface ChipProps {
  children: ReactNode;
  className?: string;
  /** Inline style — used to pass tinted background/foreground colors. */
  style?: CSSProperties;
}

/** A small status chip (percentages, deltas). Colors are passed via `style`. */
export function Chip({ children, className, style }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-extrabold',
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
