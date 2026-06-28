import { Avatar, initials } from '@/components';
import type { Person } from '@/types';
import { cn } from '@/utils/cn';
import { formatDH } from '@/utils/format';
import { colorForBalance, signForBalance, statusForBalance } from './person-helpers';

export interface PersonRowProps {
  person: Person;
  active?: boolean;
  onClick: () => void;
}

/** A selectable person row in the people list. */
export function PersonRow({ person, active, onClick }: PersonRowProps) {
  const color = colorForBalance(person.balance);
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--radius)] border border-transparent p-3 text-left transition hover:bg-surface-2',
        active && 'border-accent-tint bg-accent-soft',
      )}
    >
      <Avatar
        style={{
          background: `color-mix(in oklch, ${color} 16%, var(--surface-2))`,
          color,
          borderColor: 'transparent',
        }}
      >
        {initials(person.name)}
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-bold">{person.name}</div>
        <div className="text-[12.5px] text-ink-soft">{person.note}</div>
      </div>
      <div className="flex-none text-right">
        <div className="num whitespace-nowrap text-[15px] font-black" style={{ color }}>
          {signForBalance(person.balance)}
          {person.balance === 0 ? '0 DH' : formatDH(Math.abs(person.balance))}
        </div>
        <div className="text-[11.5px] font-extrabold" style={{ color }}>
          {statusForBalance(person.balance)}
        </div>
      </div>
    </button>
  );
}
