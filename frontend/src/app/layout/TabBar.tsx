import { NavLink } from 'react-router-dom';
import { Icon } from '@/components';
import { cn } from '@/utils/cn';
import { NAV_ITEMS } from './nav-items';

/** Mobile bottom navigation. Hidden at the lg breakpoint and up. */
export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[74px] items-start justify-around border-t border-line bg-surface px-1.5 pt-2.5 lg:hidden">
      {NAV_ITEMS.map((n) => (
        <NavLink
          key={n.path}
          to={n.path}
          end={n.path === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-bold',
              isActive ? 'text-accent-ink' : 'text-ink-faint',
            )
          }
        >
          <Icon name={n.icon} size={22} />
          <span>{n.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
