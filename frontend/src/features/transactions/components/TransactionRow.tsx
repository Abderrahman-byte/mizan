import { EditableNumber, Icon } from '@/components';
import type { Category, Transaction } from '@/types';
import { formatDH } from '@/utils/format';

export interface TransactionRowProps {
  transaction: Transaction;
  categories: Category[];
  /** When true, the (expense) amount is inline-editable. */
  editable?: boolean;
  onAmountChange?: (id: number, amount: number) => void;
}

/** One transaction line: category icon, description + category, signed amount. */
export function TransactionRow({
  transaction: t,
  categories,
  editable,
  onAmountChange,
}: TransactionRowProps) {
  const isIncome = t.direction === 'in';
  const cat = categories.find((c) => c.name === t.category);
  const icon = isIncome ? 'wallet' : (cat?.icon ?? 'wallet');

  return (
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <span
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-surface-2 text-ink-soft"
        style={
          isIncome
            ? {
                background: 'color-mix(in oklch, var(--good) 14%, var(--surface-2))',
                color: 'var(--good)',
              }
            : undefined
        }
      >
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-[14.5px] font-bold">{t.description}</div>
        <div className="mt-0.5 text-[12.5px] font-semibold text-ink-soft">{t.category}</div>
      </div>
      <div className="num ml-auto whitespace-nowrap text-[15px] font-extrabold">
        {isIncome ? (
          <span className="text-good">+{formatDH(t.amount)}</span>
        ) : editable && onAmountChange ? (
          <EditableNumber
            value={t.amount}
            prefix="−"
            bare
            hideIcon
            onCommit={(v) => onAmountChange(t.id, v)}
          />
        ) : (
          <span>−{formatDH(t.amount)}</span>
        )}
      </div>
    </div>
  );
}
