import type { IconName } from '@/components';

export interface NavItem {
  /** Route path. */
  path: string;
  /** Short label for the mobile tab bar. */
  label: string;
  /** Full label for the desktop sidebar. */
  full: string;
  icon: IconName;
}

/** Primary navigation, shared by the sidebar and the mobile tab bar. */
export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Home', full: 'Dashboard', icon: 'home2' },
  { path: '/summary', label: 'Summary', full: 'Summary', icon: 'chart' },
  { path: '/ledger', label: 'Ledger', full: 'Ledger', icon: 'ledger' },
  { path: '/modes', label: 'Modes', full: 'Budget modes', icon: 'sliders' },
  { path: '/people', label: 'People', full: 'People', icon: 'handshake' },
];
