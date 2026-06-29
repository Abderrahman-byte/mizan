import { NavLink } from 'react-router-dom';
import { Icon } from '@/components';
import { cn } from '@/utils/cn';

/** Gear button in the top bar linking to the Settings screen. */
export function SettingsButton() {
  return (
    <NavLink
      to="/settings"
      aria-label="Settings"
      className={({ isActive }) =>
        cn(
          'flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl border-[1.5px] transition',
          isActive
            ? 'border-accent bg-accent-soft text-accent-ink'
            : 'border-line bg-surface text-ink-soft hover:text-accent-ink',
        )
      }
    >
      <Icon name="cog" size={18} />
    </NavLink>
  );
}
