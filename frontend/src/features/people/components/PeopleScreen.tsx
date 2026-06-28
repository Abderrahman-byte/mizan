import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeading, Icon, Pill } from '@/components';
import type { Person } from '@/types';
import { formatDH, formatNumber } from '@/utils/format';
import { usePeople } from '../stores/people-store';
import { PersonRow } from './PersonRow';
import { PersonDetail } from './PersonDetail';
import { OWE_YOU, YOU_OWE } from './person-helpers';

/** People-list balance filter: everyone, only those who owe you, only those you owe. */
type BalanceFilter = 'all' | 'owed' | 'owe';

/** People shown per page in the list. */
const PAGE_SIZE = 8;

export function PeopleScreen() {
  const { people, historyFor } = usePeople();
  const [selected, setSelected] = useState<Person | null>(null);
  const [mobileOpen, setMobileOpen] = useState<Person | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BalanceFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (filter === 'owed' && p.balance <= 0) return false;
      if (filter === 'owe' && p.balance >= 0) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.note.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [people, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Reset to the first page whenever the result set changes.
  useEffect(() => setPage(1), [query, filter]);
  // Clamp if the list shrinks (e.g. people removed) below the current page.
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totals = useMemo(() => {
    const loans = people.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
    const debt = people.filter((p) => p.balance < 0).reduce((s, p) => s + p.balance, 0);
    return {
      loans,
      debt,
      net: loans + debt,
      oweCount: people.filter((p) => p.balance > 0).length,
      debtCount: people.filter((p) => p.balance < 0).length,
    };
  }, [people]);

  const activeDesktop = (selected && filtered.includes(selected) ? selected : null) ?? filtered[0];

  const netStr = `${totals.net >= 0 ? '+' : '−'}${formatNumber(Math.abs(totals.net))} DH`;

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };

  const list = (
    <Card flush className="px-2.5 py-3">
      {searchOpen ? (
        <div className="flex items-center gap-2 px-2 pb-2.5 pt-1">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
              <Icon name="search" size={16} />
            </span>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
              placeholder="Search by name or note…"
              aria-label="Search people"
              className="w-full rounded-[var(--radius)] border-[1.5px] border-line bg-surface py-2.5 pl-9 pr-3 text-[14px] font-semibold text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-tint)]"
            />
          </div>
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Close search"
            className="flex-none rounded-full border border-line p-2 text-ink-soft transition hover:bg-surface-2"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-2 pb-2.5 pt-1">
          <CardHeading>People · {people.length}</CardHeading>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search people"
            className="rounded-full"
          >
            <Pill className="px-2.5 py-1.5 text-xs">
              <Icon name="search" size={14} /> Search
            </Pill>
          </button>
        </div>
      )}
      <div className="flex gap-1.5 px-2 pb-2.5">
        <FilterTab label="All" count={people.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterTab label="Owed to you" count={totals.oweCount} color={OWE_YOU} active={filter === 'owed'} onClick={() => setFilter('owed')} />
        <FilterTab label="You owe" count={totals.debtCount} color={YOU_OWE} active={filter === 'owe'} onClick={() => setFilter('owe')} />
      </div>
      {filtered.length === 0 ? (
        <div className="px-2 py-8 text-center text-[13px] text-ink-soft">
          {query.trim() ? `No people match “${query.trim()}”.` : 'No people in this filter.'}
        </div>
      ) : (
        paged.map((person) => (
          <PersonRow
            key={person.name}
            person={person}
            active={activeDesktop?.name === person.name}
            onClick={() => {
              setSelected(person);
              setMobileOpen(person);
            }}
          />
        ))
      )}
      {totalPages > 1 && (
        <div className="mt-1 flex items-center justify-between gap-2 px-2 pt-2.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-extrabold text-ink-soft transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Icon name="chevL" size={14} /> Prev
          </button>
          <span className="text-[12.5px] font-bold text-ink-soft">
            Page <span className="num text-ink">{currentPage}</span> of{' '}
            <span className="num text-ink">{totalPages}</span>
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-extrabold text-ink-soft transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Next <Icon name="chevR" size={14} />
          </button>
        </div>
      )}
    </Card>
  );

  return (
    <>
      {/* summary cards — hidden on mobile while drilled into a person */}
      <div
        className={
          'grid grid-cols-1 gap-0 lg:grid-cols-3 lg:gap-4' +
          (mobileOpen ? ' hidden lg:grid' : '')
        }
      >
        {/* mobile: single combined card */}
        <Card
          className="flex flex-col gap-3 lg:hidden"
          style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-tint)' }}
        >
          <div>
            <CardHeading style={{ color: 'var(--accent-ink)' }}>Net position</CardHeading>
            <div className="num font-head text-3xl font-bold text-accent-ink">{netStr}</div>
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1 rounded-[var(--radius)] bg-surface px-3 py-2.5">
              <div className="text-[11.5px] font-extrabold text-ink-soft">Owed to you</div>
              <div className="num text-base font-black" style={{ color: OWE_YOU }}>
                {formatDH(totals.loans)}
              </div>
            </div>
            <div className="flex-1 rounded-[var(--radius)] bg-surface px-3 py-2.5">
              <div className="text-[11.5px] font-extrabold text-ink-soft">You owe</div>
              <div className="num text-base font-black" style={{ color: YOU_OWE }}>
                {formatDH(Math.abs(totals.debt))}
              </div>
            </div>
          </div>
        </Card>

        {/* desktop: three cards */}
        <SummaryCard className="hidden lg:flex" heading="Owed to you" value={formatDH(totals.loans)} valueColor={OWE_YOU} sub={`across ${totals.oweCount} people`} />
        <SummaryCard className="hidden lg:flex" heading="You owe" value={formatDH(Math.abs(totals.debt))} valueColor={YOU_OWE} sub={`across ${totals.debtCount} people`} />
        <SummaryCard
          className="hidden lg:flex"
          heading="Net position"
          value={netStr}
          valueColor="var(--accent-ink)"
          sub={totals.net >= 0 ? 'net positive — more is owed to you' : 'net negative — you owe more overall'}
          accent
        />
      </div>

      {/* mobile: drill into a person, else the list */}
      <div className="lg:hidden">
        {mobileOpen ? (
          <PersonDetail
            person={mobileOpen}
            history={historyFor(mobileOpen)}
            onBack={() => setMobileOpen(null)}
          />
        ) : (
          list
        )}
      </div>
      <div className="hidden grid-cols-[1.5fr_1fr] items-start gap-4 lg:grid">
        {list}
        {activeDesktop && (
          <PersonDetail person={activeDesktop} history={historyFor(activeDesktop)} />
        )}
      </div>
    </>
  );
}

function FilterTab({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-extrabold transition ' +
        (active
          ? 'border-accent-tint bg-accent-soft text-accent-ink'
          : 'border-line text-ink-soft hover:bg-surface-2')
      }
    >
      {color && (
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      )}
      {label}
      <span className="num text-ink-faint">{count}</span>
    </button>
  );
}

function SummaryCard({
  heading,
  value,
  valueColor,
  sub,
  accent,
  className,
}: {
  heading: string;
  value: string;
  valueColor: string;
  sub: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={'flex-col gap-2.5 ' + (className ?? '')}
      style={accent ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-tint)' } : undefined}
    >
      <CardHeading style={accent ? { color: 'var(--accent-ink)' } : undefined}>{heading}</CardHeading>
      <div
        className="num whitespace-nowrap font-head text-3xl font-bold"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      <div
        className="text-[12.5px]"
        style={accent ? { color: 'var(--accent-ink)', opacity: 0.8 } : { color: 'var(--ink-soft)' }}
      >
        {sub}
      </div>
    </Card>
  );
}
