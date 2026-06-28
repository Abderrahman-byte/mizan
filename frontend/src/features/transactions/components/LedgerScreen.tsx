import { Card, Eyebrow, Icon, Metric, ModeSpectrum, MonthNav } from '@/components';
import { MODE_LABELS, modeColor } from '@/config/modes';
import type { Category, Money, Transaction } from '@/types';
import { formatDH } from '@/utils/format';
import { TransactionRow } from './TransactionRow';

/** Everything the Ledger screen needs for the active (or a past) month. */
export interface LedgerViewModel {
  modeIdx: number;
  totals: Money[];
  totalActual: Money;
  incomeIn: Money;
  monthLabel: string;
  /** Short month name for day group headers, e.g. "Jun". */
  shortMonth: string;
  isCurrent: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Transactions for the month (empty for closed past months). */
  transactions: Transaction[];
}

export interface LedgerScreenProps {
  view: LedgerViewModel;
  categories: Category[];
  onAmountChange: (id: number, amount: number) => void;
}

export function LedgerScreen({ view, categories, onAmountChange }: LedgerScreenProps) {
  const idx = view.modeIdx;
  const over = view.totalActual - view.totals[idx];
  const net = view.incomeIn - view.totalActual;

  const groups = groupByDay(view.transactions);

  return (
    <>
      <MonthNav
        label={view.monthLabel}
        isCurrent={view.isCurrent}
        canPrev={view.canPrev}
        canNext={view.canNext}
        onPrev={view.onPrev}
        onNext={view.onNext}
      />

      {/* mode recap */}
      <Card className="grid items-center gap-4 lg:grid-cols-[1fr_1.1fr] lg:gap-[26px]">
        <div>
          <Eyebrow>{view.isCurrent ? 'This month lands in' : 'This month landed in'}</Eyebrow>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
            <span
              className="font-head text-[30px] font-bold leading-none tracking-[-0.5px] lg:text-[40px]"
              style={{ color: modeColor(idx) }}
            >
              {MODE_LABELS[idx]}
            </span>
            <span
              className="num rounded-full px-2.5 py-1 text-[13px] font-extrabold"
              style={{
                background: `color-mix(in oklch, ${modeColor(idx)} 16%, transparent)`,
                color: modeColor(idx),
              }}
            >
              {formatDH(view.totalActual)}
            </span>
          </div>
          <div className="mt-2 text-sm text-ink-soft">
            {formatDH(Math.abs(over))} {over >= 0 ? 'above' : 'below'} the{' '}
            <b className="text-ink">{MODE_LABELS[idx]}</b> plan
            {idx < 4 && (
              <>
                , {formatDH(Math.abs(view.totals[idx + 1] - view.totalActual))} under{' '}
                {MODE_LABELS[idx + 1]}
              </>
            )}
            .
          </div>
        </div>
        <div>
          <ModeSpectrum idx={idx} labels={MODE_LABELS} size="md" />
          <div className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
            <Icon name={view.isCurrent ? 'spark' : 'check'} size={14} />{' '}
            {view.isCurrent
              ? 'Recalculates live as you edit a transaction'
              : 'A closed month — switch to June to edit'}
          </div>
        </div>
      </Card>

      {/* in / out / net */}
      <div className="flex gap-3">
        <Metric
          className="flex-1"
          label="Money in"
          icon="arrowIn"
          value={formatDH(view.incomeIn)}
          valueColor="var(--good)"
          iconStyle={{
            background: 'color-mix(in oklch, var(--good) 14%, var(--surface-2))',
            color: 'var(--good)',
          }}
        />
        <Metric className="flex-1" label="Money out" icon="arrowOut" value={formatDH(view.totalActual)} />
        <Metric
          className="hidden flex-1 sm:flex"
          label="Net this month"
          icon="spark"
          value={`${net >= 0 ? '+' : '−'}${formatDH(Math.abs(net))}`}
          valueColor={net >= 0 ? 'var(--accent-ink)' : 'var(--warn)'}
        />
      </div>

      {/* feed */}
      <Card flush className="px-4 lg:px-6">
        {groups.length ? (
          groups.map((g) => (
            <div key={g.day}>
              <div className="px-1 pb-[7px] pt-4 text-xs font-extrabold uppercase tracking-[0.05em] text-ink-faint first:pt-2">
                {view.shortMonth} {g.day}
              </div>
              {g.items.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  categories={categories}
                  editable={view.isCurrent}
                  onAmountChange={onAmountChange}
                />
              ))}
            </div>
          ))
        ) : (
          <ClosedMonthEmpty label={view.monthLabel} />
        )}
      </Card>
    </>
  );
}

function ClosedMonthEmpty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-5 text-center text-ink-soft">
      <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-accent-soft text-accent-ink">
        <Icon name="ledger" size={20} />
      </span>
      <div className="text-[15.5px] font-bold text-ink">{label} is closed</div>
      <div className="max-w-[38ch] text-[13.5px]">
        Per-transaction detail isn't kept for past months — the totals above are this month's
        summary. Jump back to June to edit live.
      </div>
    </div>
  );
}

interface DayGroup {
  day: number;
  items: Transaction[];
}

function groupByDay(transactions: Transaction[]): DayGroup[] {
  const sorted = [...transactions].sort((a, b) => b.day - a.day || b.id - a.id);
  const groups: DayGroup[] = [];
  for (const t of sorted) {
    let g = groups.find((x) => x.day === t.day);
    if (!g) {
      g = { day: t.day, items: [] };
      groups.push(g);
    }
    g.items.push(t);
  }
  return groups;
}
