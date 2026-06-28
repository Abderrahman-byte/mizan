import type { ReactNode } from 'react';

/** Standard page content wrapper: responsive padding, vertical rhythm, and
 *  bottom space clearing the mobile tab bar. */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-[13px] px-[15px] pb-[96px] pt-3 lg:gap-[18px] lg:px-[34px] lg:pb-10 lg:pt-[18px]">
      {children}
    </div>
  );
}
