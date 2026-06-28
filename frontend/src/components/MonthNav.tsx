import { Icon } from './icon';

export interface MonthNavProps {
  label: string;
  /** Show the "This month" badge. */
  isCurrent?: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/** Centered previous / current-month / next control used on the Ledger. */
export function MonthNav({ label, isCurrent, canPrev, canNext, onPrev, onNext }: MonthNavProps) {
  return (
    <div className="mb-0.5 flex items-center justify-center gap-3.5">
      <NavButton ariaLabel="Previous month" disabled={!canPrev} onClick={onPrev}>
        <Icon name="chevL" size={20} />
      </NavButton>
      <div className="flex min-w-0 items-center justify-center gap-2.5 font-head text-[19px] font-bold tracking-[-0.3px] lg:min-w-[200px]">
        {label}
        {isCurrent && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.04em] text-accent-ink">
            This month
          </span>
        )}
      </div>
      <NavButton ariaLabel="Next month" disabled={!canNext} onClick={onNext}>
        <Icon name="chevR" size={20} />
      </NavButton>
    </div>
  );
}

function NavButton({
  children,
  ariaLabel,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl border-[1.5px] border-line bg-surface text-ink-soft transition enabled:hover:border-[color-mix(in_oklch,var(--accent)_45%,var(--line))] enabled:hover:text-accent-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}
