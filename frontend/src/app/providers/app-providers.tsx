import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/features/auth';
import { BudgetProvider } from '@/features/budget';
import { LedgerProvider, TransactionsProvider } from '@/features/transactions';
import { PeopleProvider } from '@/features/people';
import { SavingsProvider } from '@/features/savings';
import { HistoryProvider } from '@/features/history';
import { ThemeProvider } from './theme-provider';

/**
 * Composes the app-wide providers. Each feature owns its own context store;
 * the app layer wires them together here (cross-feature composition lives in
 * app/, never inside a feature).
 */

/** Feeds the live ledger store its auth facts (features must not import each other). */
function LiveLedgerProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  return (
    <LedgerProvider
      enabled={status === 'authenticated'}
      floorMonth={user?.createdAt.slice(0, 7)}
    >
      {children}
    </LedgerProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BudgetProvider>
          <TransactionsProvider>
            <LiveLedgerProvider>
              <SavingsProvider>
                <PeopleProvider>
                  <HistoryProvider>{children}</HistoryProvider>
                </PeopleProvider>
              </SavingsProvider>
            </LiveLedgerProvider>
          </TransactionsProvider>
        </BudgetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
