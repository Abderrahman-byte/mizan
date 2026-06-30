import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth';
import { BudgetProvider } from '@/features/budget';
import { TransactionsProvider } from '@/features/transactions';
import { PeopleProvider } from '@/features/people';
import { SavingsProvider } from '@/features/savings';
import { HistoryProvider } from '@/features/history';
import { ThemeProvider } from './theme-provider';

/**
 * Composes the app-wide providers. Each feature owns its own context store;
 * the app layer wires them together here (cross-feature composition lives in
 * app/, never inside a feature).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BudgetProvider>
          <TransactionsProvider>
            <SavingsProvider>
              <PeopleProvider>
                <HistoryProvider>{children}</HistoryProvider>
              </PeopleProvider>
            </SavingsProvider>
          </TransactionsProvider>
        </BudgetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
