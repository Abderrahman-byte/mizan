import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';

/** App shell: desktop sidebar, scrolling content area, mobile bottom tab bar. */
export function AppLayout() {
  return (
    <div className="flex h-full overflow-hidden bg-bg text-ink">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
