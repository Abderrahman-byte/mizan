import { NavLink } from 'react-router-dom';
import { Avatar, Icon, initials } from '@/components';
import { useAuth } from '@/features/auth';
import { cn } from '@/utils/cn';
import { NAV_ITEMS } from './nav-items';

const itemBase =
  'flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-[15px] font-semibold transition';

/** Desktop left navigation rail. Hidden below the lg breakpoint. */
export function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside className="hidden h-full w-[246px] flex-none flex-col gap-1.5 border-r border-line bg-surface px-[18px] py-[26px] lg:flex">
      <div className="flex items-center gap-3 px-2 pb-6 pt-0.5">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[13px] bg-accent text-white">
          <Icon name="leaf" size={20} />
        </div>
        <div className="font-head text-xl font-bold tracking-[-0.2px]">Mizan</div>
      </div>

      {NAV_ITEMS.map((n) => (
        <NavLink
          key={n.path}
          to={n.path}
          end={n.path === '/'}
          className={({ isActive }) =>
            cn(
              itemBase,
              isActive
                ? 'bg-accent-soft text-accent-ink'
                : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          <Icon name={n.icon} size={20} />
          <span>{n.full}</span>
        </NavLink>
      ))}

      <div className="mt-auto">
        <button className={cn(itemBase, 'text-ink-soft hover:bg-surface-2 hover:text-ink')}>
          <Icon name="bell" size={20} />
          <span>Reminders</span>
        </button>
        <button
          onClick={signOut}
          className={cn(itemBase, 'text-ink-soft hover:bg-surface-2 hover:text-ink')}
        >
          <Icon name="arrowOut" size={20} />
          <span>Sign out</span>
        </button>
        {user && (
          <div className={cn(itemBase, 'mt-1')}>
            <Avatar size={30}>{initials(user.displayName)}</Avatar>
            <span className="truncate font-bold text-ink">{user.displayName}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
