import { useState } from 'react';
import { Button, Icon } from '@/components';
import { useBudget } from '@/features/budget';
import { useHistory } from '@/features/history';
import {
  AddTransactionModal,
  LedgerScreen,
  useTransactions,
  type LedgerViewModel,
} from '@/features/transactions';
import { computeMode } from '@/utils/budget';
import { PageContainer, PageHeader } from '../layout';
import { useMonthMode } from '../hooks/use-month-mode';
import { PageError, PageLoading } from './page-status';

const FULL_MONTH: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
  Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
};

export function LedgerPage() {
  const { categories, loading: budgetLoading, error: budgetError } = useBudget();
  const {
    transactions,
    addTransaction,
    setTransactionAmount,
    loading: txLoading,
    error: txError,
  } = useTransactions();
  const { history, loading: histLoading, error: histError } = useHistory();
  const { totals, totalActual, mode, incomeIn } = useMonthMode();
  const [adding, setAdding] = useState(false);
  const [monthIdx, setMonthIdx] = useState<number | null>(null);

  const header = (
    <PageHeader
      title="June ledger"
      mobileTitle="June"
      subtitle="Every transaction this month — tap any amount to edit and your month-mode updates live."
      action={
        <Button onClick={() => setAdding(true)} className="max-lg:px-3">
          <Icon name="plus" size={16} />
          <span className="hidden lg:inline">Add transaction</span>
        </Button>
      }
    />
  );

  const loading = budgetLoading || txLoading || histLoading;
  const error = budgetError || txError || histError;

  if (loading || error || history.length === 0) {
    return (
      <>
        {header}
        <PageContainer>
          {error ? <PageError message={error} /> : <PageLoading />}
        </PageContainer>
      </>
    );
  }

  const last = history.length - 1;
  const cur = Math.min(monthIdx ?? last, last);
  const hm = history[cur];
  const isCurrent = cur === last;
  const monthActual = isCurrent ? totalActual : hm.spent;

  const view: LedgerViewModel = {
    modeIdx: (isCurrent ? mode : computeMode(monthActual, totals)).idx,
    totals,
    totalActual: monthActual,
    incomeIn: isCurrent ? incomeIn : hm.income,
    monthLabel: `${FULL_MONTH[hm.month]} 20${hm.year}`,
    shortMonth: hm.month,
    isCurrent,
    canPrev: cur > 0,
    canNext: cur < last,
    onPrev: () => setMonthIdx(Math.max(0, cur - 1)),
    onNext: () => setMonthIdx(Math.min(last, cur + 1)),
    transactions: isCurrent ? transactions : [],
  };

  return (
    <>
      {header}
      <PageContainer>
        <LedgerScreen view={view} categories={categories} onAmountChange={setTransactionAmount} />
      </PageContainer>
      {adding && (
        <AddTransactionModal
          categories={categories}
          onClose={() => setAdding(false)}
          onAdd={addTransaction}
        />
      )}
    </>
  );
}
