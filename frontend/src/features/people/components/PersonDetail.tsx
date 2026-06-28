import { Avatar, Button, Card, CardHeading, Heading, Icon, initials } from '@/components';
import type { Person, PersonEntry } from '@/types';
import { formatNumber } from '@/utils/format';
import { OWE_YOU, YOU_OWE, colorForBalance, signForBalance, statusForBalance } from './person-helpers';

export interface PersonDetailProps {
  person: Person;
  history: PersonEntry[];
  /** On mobile, a back link returns to the list. */
  onBack?: () => void;
}

/** A person's net balance, quick actions, and transaction history. */
export function PersonDetail({ person, history, onBack }: PersonDetailProps) {
  const color = colorForBalance(person.balance);
  return (
    <Card className="flex flex-col gap-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 self-start text-[14px] font-semibold text-ink-soft lg:hidden"
        >
          <Icon name="chevL" size={18} /> All people
        </button>
      )}

      <div className="flex items-center gap-3">
        <Avatar
          size={48}
          style={{
            background: `color-mix(in oklch, ${color} 16%, var(--surface-2))`,
            color,
            borderColor: 'transparent',
          }}
        >
          {initials(person.name)}
        </Avatar>
        <div className="flex-1">
          <Heading className="text-[19px]">{person.name}</Heading>
          <div className="text-[13px] font-extrabold" style={{ color }}>
            {statusForBalance(person.balance)}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius)] bg-surface-2 p-4 text-center">
        <div className="text-xs font-extrabold text-ink-soft">Net balance</div>
        <div
          className="num font-head text-[34px] font-bold tracking-[-0.5px]"
          style={{ color }}
        >
          {signForBalance(person.balance)}
          {formatNumber(Math.abs(person.balance))} DH
        </div>
      </div>

      <div className="flex gap-2.5">
        <Button className="flex-1">
          <Icon name="check" size={16} /> Settle up
        </Button>
        <Button variant="ghost" className="flex-1">
          <Icon name="bell" size={16} /> Remind
        </Button>
      </div>

      <div>
        <CardHeading className="mb-1">History</CardHeading>
        {history.map((entry, i) => {
          const entryColor = entry.direction === 'out' ? OWE_YOU : YOU_OWE;
          return (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
            >
              <span
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[11px]"
                style={{
                  background: `color-mix(in oklch, ${entryColor} 14%, var(--surface-2))`,
                  color: entryColor,
                }}
              >
                <Icon name={entry.direction === 'out' ? 'arrowOut' : 'arrowIn'} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{entry.label}</div>
                <div className="text-xs text-ink-faint">{entry.date}</div>
              </div>
              <div
                className="num whitespace-nowrap text-[14.5px] font-extrabold"
                style={{ color: entryColor }}
              >
                {entry.amount > 0 ? '+' : '−'}
                {formatNumber(Math.abs(entry.amount))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
