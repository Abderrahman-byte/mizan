import { Icon } from '@/components';

/** Centered loading state for a page that is still fetching. */
export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-ink-soft">
      <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-line border-t-accent" />
      <div className="text-sm font-semibold">{label}</div>
    </div>
  );
}

/** Centered error state with the message surfaced to the user. */
export function PageError({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-24 text-center text-ink-soft">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-warn">
        <Icon name="bell" size={20} />
      </span>
      <div className="text-[15.5px] font-bold text-ink">Something went wrong</div>
      <div className="max-w-[36ch] text-[13.5px]">{message}</div>
    </div>
  );
}
