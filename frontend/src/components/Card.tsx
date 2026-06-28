import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Drop the default inner padding (for tables/lists that pad their own rows). */
  flush?: boolean;
}

/** The Bloom surface card: rounded, hairline border, soft shadow. */
export function Card({ children, className, style, flush }: CardProps) {
  return (
    <div
      className={cn(
        'border border-line bg-surface shadow-[var(--shadow-sm)]',
        'rounded-[var(--radius)] lg:rounded-[var(--radius-lg)]',
        !flush && 'p-[17px] lg:p-[22px]',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
