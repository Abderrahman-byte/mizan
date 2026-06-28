import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'ghost';
  children: ReactNode;
}

/** Primary action button. `solid` is the accent fill; `ghost` is bordered. */
export function Button({ variant = 'solid', className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)]',
        'px-4 py-2.5 text-sm font-bold transition active:scale-[.98]',
        variant === 'solid' && 'bg-accent text-white hover:brightness-105',
        variant === 'ghost' &&
          'border-[1.5px] border-line bg-surface text-ink hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
