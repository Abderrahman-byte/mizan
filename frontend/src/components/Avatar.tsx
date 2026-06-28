import type { CSSProperties } from 'react';
import { cn } from '@/utils/cn';

export interface AvatarProps {
  /** Initials or short label to render. */
  children: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/** Circular initials avatar. Default colors come from the surface palette;
 *  pass `style` to tint (e.g. owed-to-you green). */
export function Avatar({ children, size = 40, className, style }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex flex-none items-center justify-center rounded-full border border-line',
        'bg-surface-2 font-extrabold text-ink-soft',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.35, ...style }}
    >
      {children}
    </div>
  );
}

/** Build up-to-two-letter initials from a person's name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
