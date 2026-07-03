import { useState } from 'react';
import { Button, Icon } from '@/components';
import { useBudget } from '@/features/budget';
import {
  AddTransactionModal,
  LedgerScreen,
  useLedger,
  type LedgerViewModel,
} from '@/features/transactions';
import { computeMode } from '@/utils/budget';
import { PageContainer, PageHeader } from '../layout';
import { PageError, PageLoading } from './page-status';

/* The Ledger runs on the live transactions backend (real calendar months, fetched per month);
   the mode recap still joins the mock budget plan (`useBudget().totals`) by category name until
   the budget contract lands — see docs/decisions.md (2026-07-03). */
export function LedgerPage() {
  const { totals, loading: budgetLoading, error: budgetError } = useBudget();
  const ledger = useLedger();
  const [adding, setAdding] = useState(false);

  const monthName = ledger.monthLabel.split(' ')[0];
  const header = (
    <PageHeader
      title={`${monthName} ledger`}
      mobileTitle={monthName}
      subtitle="Every transaction this month — tap any amount to edit and your month-mode updates live."
      action={
        <Button onClick={() => setAdding(true)} className="max-lg:px-3">
          <Icon name="plus" size={16} />
          <span className="hidden lg:inline">Add transaction</span>
        </Button>
      }
    />
  );

  const loading = budgetLoading || ledger.loading;
  const error = budgetError || ledger.error;

  if (loading || error) {
    return (
      <>
        {header}
        <PageContainer>
          {error ? <PageError message={error} /> : <PageLoading />}
        </PageContainer>
      </>
    );
  }

  const view: LedgerViewModel = {
    modeIdx: computeMode(ledger.totalOut, totals).idx,
    totals,
    totalActual: ledger.totalOut,
    incomeIn: ledger.totalIn,
    monthLabel: ledger.monthLabel,
    isCurrent: ledger.isCurrent,
    canPrev: ledger.canPrev,
    canNext: ledger.canNext,
    onPrev: ledger.goPrev,
    onNext: ledger.goNext,
    transactions: ledger.transactions,
  };

  return (
    <>
      {header}
      <PageContainer>
        <LedgerScreen
          view={view}
          categories={ledger.categories}
          onAmountChange={ledger.setTransactionAmount}
        />
      </PageContainer>
      {adding && (
        <AddTransactionModal
          categories={ledger.categories}
          onClose={() => setAdding(false)}
          onAdd={ledger.addTransaction}
        />
      )}
    </>
  );
}
