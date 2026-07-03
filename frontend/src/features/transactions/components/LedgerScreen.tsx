import { useMemo, useState } from 'react';
import { Card, Eyebrow, Icon, Metric, ModeSpectrum, MonthNav } from '@/components';
import { MODE_LABELS, modeColor } from '@/config/modes';
import type { Category, Money, Transaction } from '@/types';
import { cn } from '@/utils/cn';
import { formatDH } from '@/utils/format';
import { formatMonthDay } from '@/utils/date';
import { TransactionRow } from './TransactionRow';

/** Feed direction filter: everything, expenses only, or income only. */
type DirectionFilter = 'all' | 'out' | 'in';

/** Everything the Ledger screen needs for the active (or a past) month. */
export interface LedgerViewModel {
  modeIdx: number;
  totals: Money[];
  totalActual: Money;
  incomeIn: Money;
  monthLabel: string;
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

  // Feed filters — a view over the loaded month only; the metrics and the mode
  // recap above always reflect the whole month.
  const [dirFilter, setDirFilter] = useState<DirectionFilter>('all');
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: view.transactions.length,
      out: view.transactions.filter((t) => t.direction === 'out').length,
      in: view.transactions.filter((t) => t.direction === 'in').length,
    }),
    [view.transactions],
  );

  const filtered = useMemo(
    () =>
      view.transactions.filter(
        (t) =>
          (dirFilter === 'all' || t.direction === dirFilter) &&
          (catFilter === null || t.category === catFilter),
      ),
    [view.transactions, dirFilter, catFilter],
  );

  const setDirection = (dir: DirectionFilter) => {
    setDirFilter(dir);
    if (dir === 'in') setCatFilter(null); // income entries carry no category
  };

  const groups = groupByDate(filtered);

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
              : 'A past month — amounts are read-only here'}
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
        {view.transactions.length > 0 && (
          <div className="pb-1 pt-3">
            <div className="flex gap-1.5">
              <FilterTab label="All" count={counts.all} active={dirFilter === 'all'} onClick={() => setDirection('all')} />
              <FilterTab label="Expenses" count={counts.out} active={dirFilter === 'out'} onClick={() => setDirection('out')} />
              <FilterTab label="Income" count={counts.in} active={dirFilter === 'in'} onClick={() => setDirection('in')} />
            </div>
            {dirFilter !== 'in' && (
              <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:-mx-6 lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterTab
                  label="All categories"
                  active={catFilter === null}
                  onClick={() => setCatFilter(null)}
                />
                {categories.map((c) => (
                  <FilterTab
                    key={c.name}
                    label={c.name}
                    icon={c.icon}
                    active={catFilter === c.name}
                    onClick={() => setCatFilter(catFilter === c.name ? null : c.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {groups.length ? (
          groups.map((g) => (
            <div key={g.date}>
              <div className="px-1 pb-[7px] pt-4 text-xs font-extrabold uppercase tracking-[0.05em] text-ink-faint first:pt-2">
                {formatMonthDay(g.date)}
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
        ) : view.transactions.length ? (
          // The month has entries but the active filter matches none of them.
          <div className="px-2 py-8 text-center text-[13px] text-ink-soft">
            No transactions match this filter.
          </div>
        ) : (
          <EmptyMonth label={view.monthLabel} />
        )}
      </Card>
    </>
  );
}

function EmptyMonth({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-5 text-center text-ink-soft">
      <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-accent-soft text-accent-ink">
        <Icon name="ledger" size={20} />
      </span>
      <div className="text-[15.5px] font-bold text-ink">No transactions in {label}</div>
      <div className="max-w-[38ch] text-[13.5px]">
        Nothing was recorded this month. Add a transaction, or switch months to review your
        history.
      </div>
    </div>
  );
}

/** Small filter pill — same look as the People list's tabs. */
function FilterTab({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon?: Category['icon'];
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-extrabold transition',
        active
          ? 'border-accent-tint bg-accent-soft text-accent-ink'
          : 'border-line text-ink-soft hover:bg-surface-2',
      )}
    >
      {icon && <Icon name={icon} size={14} />}
      {label}
      {count !== undefined && <span className="num text-ink-faint">{count}</span>}
    </button>
  );
}

interface DateGroup {
  date: string;
  items: Transaction[];
}

function groupByDate(transactions: Transaction[]): DateGroup[] {
  const sorted = [...transactions].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id,
  );
  const groups: DateGroup[] = [];
  for (const t of sorted) {
    let g = groups.find((x) => x.date === t.date);
    if (!g) {
      g = { date: t.date, items: [] };
      groups.push(g);
    }
    g.items.push(t);
  }
  return groups;
}
