import { Icon } from '@/components';
import { cn } from '@/utils/cn';
import { formatAmountDH } from '@/utils/format';
import type { Debt, Repayment } from '../types/debts';
import {
  colorForDirection,
  colorForStatus,
  labelForDirection,
  labelForStatus,
  signForDirection,
} from './person-helpers';

export interface DebtCardProps {
  debt: Debt;
  expanded: boolean;
  busy?: boolean;
  onToggle: () => void;
  onRepay: () => void;
  onSettle: () => void;
  onEdit: () => void;
  onWriteOff: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onEditRepayment: (repayment: Repayment) => void;
  onDeleteRepayment: (repayment: Repayment) => void;
}

/** One debt: heading + derived outstanding/status, with an expandable repayments + actions panel. */
export function DebtCard({
  debt,
  expanded,
  busy,
  onToggle,
  onRepay,
  onSettle,
  onEdit,
  onWriteOff,
  onRestore,
  onDelete,
  onEditRepayment,
  onDeleteRepayment,
}: DebtCardProps) {
  const writtenOff = debt.status === 'written_off';
  const color = writtenOff ? 'var(--ink-faint)' : colorForDirection(debt.direction);
  const sign = signForDirection(debt.direction) > 0 ? '+' : '−';
  const repayments = debt.repayments ?? [];
  const title = debt.description || labelForDirection(debt.direction);

  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-line bg-surface transition',
        writtenOff && 'opacity-65',
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3 text-left"
        aria-expanded={expanded}
      >
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px]"
          style={{
            background: `color-mix(in oklch, ${color} 14%, var(--surface-2))`,
            color,
          }}
        >
          <Icon name={debt.direction === 'OWED_TO_ME' ? 'arrowOut' : 'arrowIn'} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn('truncate text-[14px] font-bold', writtenOff && 'line-through')}>
            {title}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-faint">
            <span>{debt.incurredOn}</span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.03em]"
              style={{
                color: colorForStatus(debt.status),
                background: `color-mix(in oklch, ${colorForStatus(debt.status)} 14%, transparent)`,
              }}
            >
              {labelForStatus(debt.status)}
            </span>
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="num whitespace-nowrap text-[14.5px] font-black" style={{ color }}>
            {sign}
            {formatAmountDH(debt.outstanding < 0 ? -debt.outstanding : debt.outstanding)}
          </div>
          {debt.outstanding !== debt.principalAmount && (
            <div className="text-[11px] text-ink-faint">of {formatAmountDH(debt.principalAmount)}</div>
          )}
        </div>
        <Icon
          name="chevD"
          size={16}
          className="flex-none text-ink-faint transition"
          style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {expanded && (
        <div className="border-t border-line px-3 pb-3 pt-2.5">
          {repayments.length > 0 ? (
            <div className="mb-2.5">
              {repayments.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 py-1.5">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-surface-2 text-good">
                    <Icon name="check" size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="num text-[13px] font-bold text-good">
                      {formatAmountDH(r.amount)}
                    </div>
                    <div className="truncate text-[11.5px] text-ink-faint">
                      {r.paidOn}
                      {r.note ? ` · ${r.note}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditRepayment(r)}
                    disabled={busy}
                    aria-label="Edit repayment"
                    className="rounded-full p-1.5 text-ink-soft hover:bg-surface-2 disabled:opacity-40"
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRepayment(r)}
                    disabled={busy}
                    aria-label="Delete repayment"
                    className="rounded-full p-1.5 text-ink-soft hover:bg-surface-2 disabled:opacity-40"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-2.5 text-[12.5px] text-ink-faint">No repayments yet.</div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {!writtenOff && debt.outstanding > 0 && (
              <Action icon="plus" onClick={onRepay} busy={busy}>
                Repay
              </Action>
            )}
            {!writtenOff && debt.outstanding > 0 && (
              <Action icon="check" onClick={onSettle} busy={busy}>
                Settle
              </Action>
            )}
            <Action icon="edit" onClick={onEdit} busy={busy}>
              Edit
            </Action>
            {writtenOff ? (
              <Action icon="arrowUp" onClick={onRestore} busy={busy}>
                Restore
              </Action>
            ) : (
              <Action icon="leaf" onClick={onWriteOff} busy={busy}>
                Write off
              </Action>
            )}
            <Action icon="close" onClick={onDelete} busy={busy} danger>
              Delete
            </Action>
          </div>
        </div>
      )}
    </div>
  );
}

function Action({
  icon,
  onClick,
  busy,
  danger,
  children,
}: {
  icon: 'plus' | 'check' | 'edit' | 'leaf' | 'arrowUp' | 'close';
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-[12px] font-extrabold transition hover:bg-surface-2 disabled:opacity-40',
        danger ? 'text-warn' : 'text-ink-soft',
      )}
    >
      <Icon name={icon} size={13} /> {children}
    </button>
  );
}
