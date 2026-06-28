import { Icon } from '@/components';
import { useTheme } from '../providers/theme-provider';

/** Light/dark theme toggle button, shown in the top bar. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl border-[1.5px] border-line bg-surface text-ink-soft transition hover:text-accent-ink"
    >
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
