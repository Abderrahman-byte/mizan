import type { ReactNode } from 'react';
import { Card, Icon } from '@/components';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Cross-link row beneath the card (e.g. "New here? Create an account"). */
  footer: ReactNode;
}

/** Centered, full-screen frame for the auth screens: brand mark + card + footer. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-ink">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px] bg-accent text-white">
              <Icon name="leaf" size={22} />
            </div>
            <span className="font-head text-2xl font-bold tracking-[-0.2px]">Mizan</span>
          </div>
          <div>
            <h1 className="font-head text-[24px] font-bold tracking-[-0.4px]">{title}</h1>
            <p className="mt-1 text-[14px] text-ink-soft">{subtitle}</p>
          </div>
        </div>
        <Card className="flex flex-col">{children}</Card>
        <div className="mt-5 text-center text-[13.5px] text-ink-soft">{footer}</div>
      </div>
    </div>
  );
}
