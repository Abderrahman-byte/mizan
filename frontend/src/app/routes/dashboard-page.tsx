import {
  Card,
  Chip,
  Eyebrow,
  Heading,
  Icon,
  Metric,
  ModeSpectrum,
  Pill,
  ProgressBar,
} from '@/components';
import { MODE_LABELS, modeColor } from '@/config/modes';
import { useTransactions } from '@/features/transactions';
import { useSavings } from '@/features/savings';
import { useHistory } from '@/features/history';
import type { MonthHistory, SavingsGoal } from '@/types';
import { formatDH } from '@/utils/format';
import { firstNameOf, useAuth } from '@/features/auth';
import { PageContainer, PageHeader } from '../layout';
import { useMonthMode } from '../hooks/use-month-mode';
import { PageError, PageLoading } from './page-status';

export function DashboardPage() {
  const { user } = useAuth();
  const { mode, totals, totalActual, monthlyIncome } = useMonthMode();
  const { actuals, loading: txLoading, error: txError } = useTransactions();
  const { savings, loading: savingsLoading, error: savingsError } = useSavings();
  const { history, monthLabel, loading: histLoading, error: histError } = useHistory();

  const loading = txLoading || savingsLoading || histLoading;
  const error = txError || savingsError || histError;

  const header = (
    <PageHeader
      title={user ? `Hi, ${firstNameOf(user)}` : 'Hi'}
      mobileTitle="June"
      subtitle="Here's how June is shaping up."
      action={
        <Pill>
          <Icon name="home2" size={15} /> {monthLabel}
        </Pill>
      }
    />
  );

  if (loading || error || !savings) {
    return (
      <>
        {header}
        <PageContainer>{error ? <PageError message={error} /> : <PageLoading />}</PageContainer>
      </>
    );
  }

  const idx = mode.idx;
  const leftover = monthlyIncome - totalActual;
  const savingsRate = Math.round(
    (((actuals['Savings'] ?? 0) + Math.max(0, leftover)) / monthlyIncome) * 100,
  );
  const over = totalActual - totals[idx];
  const spentPct = Math.min(100, Math.round((totalActual / monthlyIncome) * 100));

  return (
    <>
      {header}
      <PageContainer>
        {/* hero */}
        <Card className="grid items-center gap-4 p-[18px] lg:grid-cols-[1.4fr_1fr] lg:gap-7 lg:p-7">
          <div className="flex flex-col gap-4 lg:gap-6">
            <div>
              <Eyebrow>{monthLabel} · tracking toward</Eyebrow>
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <span
                  className="font-head text-[34px] font-bold leading-none tracking-[-0.5px] lg:text-[50px]"
                  style={{ color: modeColor(idx) }}
                >
                  {MODE_LABELS[idx]}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[13px] font-extrabold"
                  style={{
                    background: `color-mix(in oklch, ${modeColor(idx)} 18%, transparent)`,
                    color: modeColor(idx),
                  }}
                >
                  {over >= 0 ? 'on plan' : 'under plan'}
                </span>
              </div>
              <div className="mt-2 max-w-[46ch] text-sm text-ink-soft lg:text-[15px]">
                You've spent a touch above <b className="text-ink">{MODE_LABELS[idx]}</b>
                {idx < 4 && (
                  <>
                    {' '}
                    but well under <b className="text-ink">{MODE_LABELS[idx + 1]}</b>
                  </>
                )}
                . A comfortable, sustainable month so far.
              </div>
            </div>
            <div className="lg:hidden">
              <ModeSpectrum idx={idx} labels={MODE_LABELS} size="md" />
            </div>
            <div className="hidden lg:block">
              <ModeSpectrum idx={idx} labels={MODE_LABELS} size="lg" />
            </div>
          </div>

          <div className="flex flex-col justify-center gap-1.5 rounded-[var(--radius-lg)] bg-surface-2 p-[18px] lg:p-6">
            <div className="text-[12.5px] font-extrabold uppercase tracking-[0.05em] text-ink-faint">
              Left to spend
            </div>
            <div className="num whitespace-nowrap font-head text-[34px] font-bold leading-none tracking-[-1px] text-accent-ink lg:text-[44px]">
              {formatDH(leftover)}
            </div>
            <div className="my-1.5 mb-3 text-sm text-ink-soft">
              {formatDH(totalActual)} spent of {formatDH(monthlyIncome)} income
            </div>
            <ProgressBar percent={spentPct} />
          </div>
        </Card>

        {/* metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Metric label="Monthly income" icon="wallet" value={formatDH(monthlyIncome)} delta="Salary + freelance" />
          <Metric
            label="Spent so far"
            icon="cart"
            value={formatDH(totalActual)}
            delta={`${Math.round((totalActual / monthlyIncome) * 100)}% of income`}
            deltaTone="down"
          />
          <Metric label="Savings rate" icon="piggy" value={`${savingsRate}%`} delta="▲ 2 pts vs May" deltaTone="up" />
          <Metric label="Leftover" icon="spark" value={formatDH(leftover)} delta="Free to allocate" deltaTone="up" />
        </div>

        {/* trend + fund */}
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr] lg:gap-4">
          <Card className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div>
                <Heading>Your last 6 months</Heading>
                <div className="mt-0.5 text-[13.5px] text-ink-soft">
                  Which mode each month landed in
                </div>
              </div>
              <Pill>
                <Icon name="trend" size={15} /> Mostly {MODE_LABELS[2]}
              </Pill>
            </div>
            <ModeTrend history={history} currentModeIdx={idx} />
          </Card>

          <FundCard savings={savings} />
        </div>
      </PageContainer>
    </>
  );
}

function ModeTrend({ history, currentModeIdx }: { history: MonthHistory[]; currentModeIdx: number }) {
  const last6 = history.slice(-6).map((h, i, arr) => (i === arr.length - 1 ? { ...h, mode: currentModeIdx } : h));
  return (
    <div className="flex h-[120px] items-end gap-2.5 pt-5 lg:h-[150px]">
      {last6.map((h, i) => {
        const heightPct = 12 + (h.mode / 4) * 80;
        return (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className="relative w-full rounded-[9px_9px_5px_5px]"
              style={{ height: `${heightPct}%`, background: modeColor(h.mode) }}
            >
              <div
                className="absolute -top-[18px] left-0 right-0 whitespace-nowrap text-center text-[10.5px] font-extrabold"
                style={{ color: modeColor(h.mode) }}
              >
                {MODE_LABELS[h.mode]}
              </div>
            </div>
            <div className="text-[11.5px] font-bold text-ink-faint">{h.month}</div>
          </div>
        );
      })}
    </div>
  );
}

function FundCard({ savings }: { savings: SavingsGoal }) {
  const pct = Math.round((savings.saved / savings.goal) * 100);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-ink-soft">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[10px] bg-accent-soft text-accent-ink">
            <Icon name="target" size={17} />
          </span>
          {savings.label}
        </div>
        <Chip
          style={{ background: 'color-mix(in oklch, var(--good) 16%, transparent)', color: 'var(--good)' }}
        >
          {pct}%
        </Chip>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="num whitespace-nowrap font-head text-[28px] font-bold tracking-[-0.5px]">
          {formatDH(savings.saved)}
        </div>
        <div className="whitespace-nowrap text-sm font-bold text-ink-faint">
          / {formatDH(savings.goal)}
        </div>
      </div>
      <ProgressBar percent={pct} color="var(--good)" />
      <div className="text-[13.5px] text-ink-soft">
        {formatDH(savings.goal - savings.saved)} to go — about 4 months at your pace. You've got
        this. 🌱
      </div>
    </Card>
  );
}
