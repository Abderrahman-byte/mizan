import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layout';
import { DashboardPage } from './dashboard-page';
import { SummaryPage } from './summary-page';
import { LedgerPage } from './ledger-page';
import { ModesPage } from './modes-page';
import { PeoplePage } from './people-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'summary', element: <SummaryPage /> },
      { path: 'ledger', element: <LedgerPage /> },
      { path: 'modes', element: <ModesPage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
