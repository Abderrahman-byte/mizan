import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

export interface PageHeaderProps {
  /** Full title shown on desktop. */
  title: string;
  /** Shorter title shown on mobile (falls back to `title`). */
  mobileTitle?: string;
  subtitle: string;
  /** Optional page-specific action (e.g. an Add button or a status pill). */
  action?: ReactNode;
}

/** Sticky page header: title + subtitle on the left, actions + theme toggle right. */
export function PageHeader({ title, mobileTitle, subtitle, action }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-[4] flex items-start justify-between gap-4 bg-[linear-gradient(var(--bg),color-mix(in_oklch,var(--bg)_70%,transparent))] px-[15px] pb-1.5 pt-[18px] backdrop-blur-[6px] lg:px-[34px] lg:pt-[26px]">
      <div className="min-w-0">
        <h1 className="font-head text-2xl font-bold tracking-[-0.5px] lg:text-[28px]">
          <span className="lg:hidden">{mobileTitle ?? title}</span>
          <span className="hidden lg:inline">{title}</span>
        </h1>
        <p className="mt-0.5 text-[14.5px] text-ink-soft">{subtitle}</p>
      </div>
      <div className="flex flex-none items-center gap-2.5">
        {action}
        <ThemeToggle />
      </div>
    </div>
  );
}
