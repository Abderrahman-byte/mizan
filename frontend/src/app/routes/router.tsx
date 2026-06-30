import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layout';
import { DashboardPage } from './dashboard-page';
import { SummaryPage } from './summary-page';
import { LedgerPage } from './ledger-page';
import { ModesPage } from './modes-page';
import { PeoplePage } from './people-page';
import { SettingsPage } from './settings-page';
import { SignInPage } from './signin-page';
import { SignUpPage } from './signup-page';
import { ForgotPasswordPage } from './forgot-password-page';
import { ResetPasswordPage } from './reset-password-page';
import { RedirectIfAuthenticated, RequireAuth } from './auth-guards';

export const router = createBrowserRouter([
  {
    path: '/signin',
    element: (
      <RedirectIfAuthenticated>
        <SignInPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: '/signup',
    element: (
      <RedirectIfAuthenticated>
        <SignUpPage />
      </RedirectIfAuthenticated>
    ),
  },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'summary', element: <SummaryPage /> },
      { path: 'ledger', element: <LedgerPage /> },
      { path: 'modes', element: <ModesPage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
