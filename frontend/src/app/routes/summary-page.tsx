import { useMemo } from 'react';
import { Card, CardHeading, Chip, Eyebrow, Heading, Icon, Metric, Pill, ProgressBar } from '@/components';
import { MODE_LABELS, modeColor } from '@/config/modes';
import { useBudget } from '@/features/budget';
import { useTransactions } from '@/features/transactions';
import { useSavings } from '@/features/savings';
import { usePeople, type Counterparty } from '@/features/people';
import { useHistory } from '@/features/history';
import type { MonthHistory, SavingsGoal } from '@/types';
import { formatDH, formatShort } from '@/utils/format';
import { PageContainer, PageHeader } from '../layout';
import { buildSummaryInsights, type SummaryInsights } from './summary-insights';
import { PageError, PageLoading } from './page-status';

export function SummaryPage() {
  const { categories, loading: budgetLoading, error: budgetError } = useBudget();
  const { actuals, loading: txLoading, error: txError } = useTransactions();
  const { savings, loading: savingsLoading, error: savingsError } = useSavings();
  const { counterparties, loading: peopleLoading, error: peopleError } = usePeople();
  const { history, trackingSince, loading: histLoading, error: histError } = useHistory();

  const insights = useMemo(
    () => buildSummaryInsights(history, categories, actuals),
    [history, categories, actuals],
  );

  const loading = budgetLoading || txLoading || savingsLoading || peopleLoading || histLoading;
  const error = budgetError || txError || savingsError || peopleError || histError;

  const header = (
    <PageHeader
      title="All-time summary"
      mobileTitle="Summary"
      subtitle="Your whole journey so far, at a glance."
      action={
        <Pill>
          <Icon name="chart" size={15} /> Since {trackingSince}
        </Pill>
      }
    />
  );

  if (loading || error || !savings || history.length === 0) {
    return (
      <>
        {header}
        <PageContainer>{error ? <PageError message={error} /> : <PageLoading />}</PageContainer>
      </>
    );
  }

  return (
    <>
      {header}
      <PageContainer>
        <Hero insights={insights} savings={savings} trackingSince={trackingSince} months={history.length} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Metric label="Total income" icon="wallet" value={formatDH(insights.lifeIncome)} delta="all-time" />
          <Metric label="Total spent" icon="cart" value={formatDH(insights.lifeSpent)} delta={`avg ${formatDH(insights.avgSpent)}/mo`} />
          <Metric label="Months on plan" icon="check" value={`${insights.monthsOnPlan} / ${history.length}`} delta={`${insights.onPlanPct}% of the time`} deltaTone="up" />
          <Metric label="Avg savings rate" icon="piggy" value={`${insights.avgRate}%`} delta="▲ trending up" deltaTone="up" />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr] lg:gap-4">
          <Card className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div>
                <Heading>Your mode timeline</Heading>
                <div className="mt-0.5 text-[13.5px] text-ink-soft">Every month since you started</div>
              </div>
              <Pill>
                <Icon name="chart" size={15} /> {history.length} months
              </Pill>
            </div>
            <div className="pt-3.5">
              <Timeline history={history} />
            </div>
          </Card>
          <Milestones insights={insights} />
        </div>

        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          <TopCategories insights={insights} />
          <SavingsGrowth history={history} savings={savings} />
        </div>

        <Outstanding people={counterparties} />
      </PageContainer>
    </>
  );
}

function Hero({
  insights,
  savings,
  trackingSince,
  months,
}: {
  insights: SummaryInsights;
  savings: SavingsGoal;
  trackingSince: string;
  months: number;
}) {
  const savedPct = Math.round((savings.saved / savings.goal) * 100);
  return (
    <Card className="grid items-center gap-4 p-[18px] lg:grid-cols-[1.4fr_1fr] lg:gap-7 lg:p-7">
      <div className="flex flex-col gap-4 lg:gap-[22px]">
        <div>
          <Eyebrow>
            Tracking since {trackingSince} · {months} months
          </Eyebrow>
          <div className="mt-2 font-head text-2xl font-bold leading-[1.18] tracking-[-0.5px] lg:text-[30px]">
            Most months land in{' '}
            <span style={{ color: modeColor(insights.topMode) }}>{MODE_LABELS[insights.topMode]}</span>
          </div>
          <div className="mt-1.5 max-w-[48ch] text-sm text-ink-soft lg:text-[15px]">
            {insights.monthsOnPlan} of your {months} months came in at {MODE_LABELS[2]} or leaner.
            Steady, sustainable spending — and your safety net keeps growing. 🌱
          </div>
        </div>
        <Distribution insights={insights} />
      </div>

      <div className="flex flex-col justify-center gap-1.5 rounded-[var(--radius-lg)] bg-surface-2 p-[18px] lg:p-6">
        <CardHeading>Saved all-time</CardHeading>
        <div className="num whitespace-nowrap font-head text-[34px] font-bold leading-none tracking-[-1px] text-good lg:text-[44px]">
          {formatDH(savings.saved)}
        </div>
        <div className="my-1.5 mb-3 text-sm text-ink-soft">into your emergency fund</div>
        <ProgressBar percent={savedPct} color="var(--good)" />
      </div>
    </Card>
  );
}

function Distribution({ insights }: { insights: SummaryInsights }) {
  return (
    <div>
      <div className="flex h-[18px] gap-0.5 overflow-hidden rounded-full">
        {insights.modeCounts.map((count, i) =>
          count > 0 ? (
            <div
              key={i}
              title={`${MODE_LABELS[i]}: ${count} months`}
              style={{ flex: count, background: modeColor(i), minWidth: 4 }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2">
        {MODE_LABELS.map((label, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 text-[13px] font-bold"
            style={{ color: insights.modeCounts[i] ? 'var(--ink)' : 'var(--ink-faint)' }}
          >
            <span
              className="h-2.5 w-2.5 rounded"
              style={{ background: modeColor(i), opacity: insights.modeCounts[i] ? 1 : 0.4 }}
            />
            {label}
            <span className="font-extrabold text-ink-faint">{insights.modeCounts[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline({ history }: { history: MonthHistory[] }) {
  return (
    <div className="overflow-x-auto pb-1 lg:overflow-x-visible">
      <div className="flex h-[118px] items-end gap-2 lg:h-[150px]" style={{ minWidth: history.length * 38 }}>
        {history.map((h, i) => {
          const heightPct = 12 + (h.mode / 4) * 80;
          const isCurrent = i === history.length - 1;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" style={{ minWidth: 30 }}>
              <div
                className="w-full max-w-[34px] rounded-[8px_8px_4px_4px]"
                style={{
                  height: `${heightPct}%`,
                  background: modeColor(h.mode),
                  outline: isCurrent ? '2px solid var(--ink)' : 'none',
                  outlineOffset: 2,
                }}
              />
              <div
                className="text-[10.5px] font-extrabold"
                style={{ color: isCurrent ? 'var(--ink)' : 'var(--ink-faint)' }}
              >
                {h.month}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Milestones({ insights }: { insights: SummaryInsights }) {
  const items = [
    {
      icon: 'leaf' as const,
      color: 'var(--good)',
      big: `${insights.leanStreak} months`,
      label: `Lean streak — at ${MODE_LABELS[2]} or below right now`,
    },
    {
      icon: 'arrowDn' as const,
      color: 'var(--cool)',
      big: formatDH(insights.leanMonth.spent),
      label: `Leanest month — ${insights.leanMonth.month} ’${insights.leanMonth.year}`,
    },
    {
      icon: 'flame' as const,
      color: 'var(--warn)',
      big: formatDH(insights.bigMonth.spent),
      label: `Biggest month — ${insights.bigMonth.month} ’${insights.bigMonth.year}`,
    },
  ];
  return (
    <Card className="flex flex-col gap-1">
      <Heading className="mb-2">Milestones</Heading>
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2.5"
          style={{ borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}
        >
          <span
            className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px]"
            style={{ background: `color-mix(in oklch, ${it.color} 15%, var(--surface-2))`, color: it.color }}
          >
            <Icon name={it.icon} size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="num font-head text-[19px] font-bold" style={{ color: it.color }}>
              {it.big}
            </div>
            <div className="text-[12.5px] font-semibold text-ink-soft">{it.label}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

function TopCategories({ insights }: { insights: SummaryInsights }) {
  const top = insights.catLifetime.slice(0, 6);
  const max = top[0]?.total || 1;
  return (
    <Card className="flex flex-col gap-3.5">
      <div>
        <Heading>Where it all went</Heading>
        <div className="mt-0.5 text-[13.5px] text-ink-soft">Top categories, all-time</div>
      </div>
      <div className="flex flex-col gap-3">
        {top.map((c, i) => (
          <div key={c.name} className="flex items-center gap-3">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[11px] bg-surface-2 text-ink-soft">
              <Icon name={c.icon} size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex justify-between">
                <span className="text-sm font-bold">{c.name}</span>
                <span className="num text-sm font-extrabold">{formatDH(c.total)}</span>
              </div>
              <ProgressBar
                percent={Math.round((c.total / max) * 100)}
                height={7}
                color={modeColor(Math.min(4, Math.round(i * 0.8)))}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SavingsGrowth({ history, savings }: { history: MonthHistory[]; savings: SavingsGoal }) {
  const goal = savings.goal;
  const W = 300;
  const H = 116;
  const points = history.map((h, i) => [(i / (history.length - 1)) * W, H - (h.fund / goal) * H]);
  const line = points.map((p) => p.join(',')).join(' ');
  const area = `0,${H} ${line} ${W},${H}`;
  const pct = Math.round((savings.saved / goal) * 100);
  const lastPoint = points[points.length - 1];
  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div>
          <Heading>Savings growth</Heading>
          <div className="mt-0.5 text-[13.5px] text-ink-soft">
            Emergency fund over {history.length} months
          </div>
        </div>
        <Chip style={{ background: 'color-mix(in oklch, var(--good) 16%, transparent)', color: 'var(--good)' }}>
          {pct}% to goal
        </Chip>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[130px] w-full overflow-visible">
          <defs>
            <linearGradient id="mzfund" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--good)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--good)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line x1="0" y1="2" x2={W} y2="2" stroke="var(--ink-faint)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" vectorEffect="non-scaling-stroke" />
          <polygon points={area} fill="url(#mzfund)" />
          <polyline points={line} fill="none" stroke="var(--good)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3.5" fill="var(--good)" stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="absolute -top-1.5 right-0 text-[11.5px] font-extrabold text-ink-faint">
          Goal {formatShort(goal)}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="num whitespace-nowrap font-head text-[26px] font-bold text-good">
          {formatDH(savings.saved)}
        </div>
        <div className="text-[13.5px] font-bold text-ink-soft">
          saved so far · {formatDH(goal - savings.saved)} to go
        </div>
      </div>
    </Card>
  );
}

function Outstanding({ people }: { people: Counterparty[] }) {
  const loans = people.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const debt = Math.abs(people.filter((p) => p.balance < 0).reduce((s, p) => s + p.balance, 0));
  const net = loans - debt;
  const denom = loans + debt || 1;
  const oweCount = people.filter((p) => p.balance > 0).length;
  const debtCount = people.filter((p) => p.balance < 0).length;
  const OWE_YOU = 'var(--good)';
  const YOU_OWE = 'var(--cool)';

  return (
    <Card className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div>
          <Heading>Outstanding with people</Heading>
          <div className="mt-0.5 text-[13.5px] text-ink-soft">Money lent and borrowed, right now</div>
        </div>
        <Pill>
          <Icon name="handshake" size={15} /> {people.length} people
        </Pill>
      </div>
      <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:gap-[22px]">
        <OutstandingStat label="Total loans out" value={formatDH(loans)} color={OWE_YOU} sub={`owed to you · ${oweCount} people`} />
        <div className="hidden w-px self-stretch bg-line lg:block" />
        <OutstandingStat label="Total debt" value={formatDH(debt)} color={YOU_OWE} sub={`you owe · ${debtCount} people`} />
        <div className="hidden w-px self-stretch bg-line lg:block" />
        <OutstandingStat
          label="Net position"
          value={`${net >= 0 ? '+' : '−'}${formatDH(Math.abs(net))}`}
          color="var(--accent-ink)"
          sub={net >= 0 ? 'net positive — more owed to you' : 'net negative — you owe more'}
        />
      </div>
      <div>
        <div className="flex h-3 gap-[3px] overflow-hidden rounded-full">
          <div style={{ flex: loans, background: OWE_YOU, minWidth: 4 }} title={`Loans out: ${formatDH(loans)}`} />
          <div style={{ flex: debt, background: YOU_OWE, minWidth: 4 }} title={`Debts: ${formatDH(debt)}`} />
        </div>
        <div className="mt-2.5 flex justify-between text-[12.5px] font-bold">
          <span style={{ color: OWE_YOU }}>{Math.round((loans / denom) * 100)}% lent out</span>
          <span style={{ color: YOU_OWE }}>{Math.round((debt / denom) * 100)}% owed</span>
        </div>
      </div>
    </Card>
  );
}

function OutstandingStat({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <CardHeading>{label}</CardHeading>
      <div
        className="num mt-1.5 whitespace-nowrap font-head text-2xl font-bold tracking-[-0.5px] lg:text-[28px]"
        style={{ color }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[12.5px] font-semibold text-ink-soft">{sub}</div>
    </div>
  );
}
