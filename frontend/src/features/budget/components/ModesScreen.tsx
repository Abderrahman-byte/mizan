import { useState } from 'react';
import {
  Button,
  Card,
  CardHeading,
  Chip,
  EditableNumber,
  Eyebrow,
  Heading,
  Icon,
} from '@/components';
import { MODE_INDICES, MODE_LABELS, modeColor } from '@/config/modes';
import type { Money } from '@/types';
import { formatDH, formatNumber } from '@/utils/format';
import { useBudget } from '../stores/budget-store';

const GRID_COLS = 'minmax(170px, 1.4fr) repeat(5, 1fr)';

export interface ModesScreenProps {
  /** The mode this month is landing in (cross-feature, from live actuals). */
  currentModeIdx: number;
  onAddCategory: () => void;
}

export function ModesScreen({ currentModeIdx, onAddCategory }: ModesScreenProps) {
  const { categories, plan, monthlyIncome, totals, setPlanCell } = useBudget();

  return (
    <>
      {/* ---------- desktop grid editor ---------- */}
      <div className="hidden flex-col gap-[18px] lg:flex">
        <Card className="flex items-center justify-between gap-5">
          <div>
            <Heading>Shape your five modes</Heading>
            <div className="mt-1 max-w-[64ch] text-sm text-ink-soft">
              Each column is a spending tier, leanest to most indulgent. Edit any planned amount —
              totals and leftover update live. <b className="text-ink">{MODE_LABELS[currentModeIdx]}</b>{' '}
              is where you usually land.
            </div>
          </div>
          <Button onClick={onAddCategory}>
            <Icon name="plus" size={16} /> Add category
          </Button>
        </Card>

        <Card flush className="px-[22px] py-4">
          {/* header row */}
          <div
            className="grid items-end border-b border-line pb-3"
            style={{ gridTemplateColumns: GRID_COLS, gap: 14 }}
          >
            <CardHeading>Category</CardHeading>
            {MODE_INDICES.map((i) => (
              <div key={i} className="text-center">
                <span
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold"
                  style={{ color: modeColor(i) }}
                >
                  <span
                    className="h-[9px] w-[9px] rounded-full"
                    style={{ background: modeColor(i) }}
                  />
                  {MODE_LABELS[i]}
                </span>
              </div>
            ))}
          </div>

          {/* category rows */}
          {categories.map((c) => (
            <div
              key={c.name}
              className="grid items-center border-b border-line py-3 last:border-b-0"
              style={{ gridTemplateColumns: GRID_COLS, gap: 14 }}
            >
              <div className="flex min-w-0 items-center gap-3 text-[15px] font-bold">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-surface-2 text-ink-soft">
                  <Icon name={c.icon} size={18} />
                </span>
                {c.name}
              </div>
              {plan[c.name]?.map((v, i) => (
                <div key={i} className="text-center">
                  <EditableNumber
                    value={v}
                    suffix=""
                    width={52}
                    onCommit={(nv) => setPlanCell(c.name, i, nv)}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* totals row */}
          <div
            className="grid items-start border-t-2 border-line pt-3.5"
            style={{ gridTemplateColumns: GRID_COLS, gap: 14 }}
          >
            <div className="text-[14.5px] font-extrabold">
              Mode total
              <div className="text-[11.5px] font-bold text-ink-faint">
                leftover vs {formatDH(monthlyIncome)} income
              </div>
            </div>
            {MODE_INDICES.map((i) => (
              <ColumnTotal key={i} total={totals[i]} income={monthlyIncome} modeIdx={i} />
            ))}
          </div>
        </Card>
      </div>

      {/* ---------- mobile one-mode editor ---------- */}
      <div className="flex flex-col gap-[13px] lg:hidden">
        <MobileEditor onAddCategory={onAddCategory} />
      </div>
    </>
  );
}

function ColumnTotal({
  total,
  income,
  modeIdx,
}: {
  total: Money;
  income: Money;
  modeIdx: number;
}) {
  const leftover = income - total;
  const positive = leftover >= 0;
  return (
    <div className="text-center">
      <div
        className="num font-head text-base font-extrabold"
        style={{ color: modeColor(modeIdx) }}
      >
        {formatNumber(total)}
      </div>
      <div className="num mt-1.5">
        <Chip
          style={{
            background: `color-mix(in oklch, ${positive ? 'var(--good)' : 'var(--warn)'} 14%, transparent)`,
            color: positive ? 'var(--good)' : 'var(--warn)',
          }}
        >
          {positive ? '+' : '−'}
          {formatNumber(Math.abs(leftover))}
        </Chip>
      </div>
    </div>
  );
}

function MobileEditor({ onAddCategory }: { onAddCategory: () => void }) {
  const { categories, plan, monthlyIncome, totals, setPlanCell } = useBudget();
  const [sel, setSel] = useState(0);
  const leftover = monthlyIncome - totals[sel];
  const positive = leftover >= 0;

  return (
    <>
      <Card className="px-3.5 py-3.5">
        <Eyebrow className="mb-2.5">Editing mode</Eyebrow>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MODE_LABELS.map((label, i) => {
            const on = i === sel;
            return (
              <button
                key={i}
                onClick={() => setSel(i)}
                className="flex flex-none items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2.5 text-[13px] font-extrabold transition"
                style={
                  on
                    ? { background: modeColor(i), color: '#fff', borderColor: modeColor(i) }
                    : { background: 'var(--surface)', color: 'var(--ink-soft)', borderColor: 'var(--line)' }
                }
              >
                <span
                  className="h-[9px] w-[9px] rounded-full"
                  style={{ background: on ? '#fff' : modeColor(i) }}
                />
                {label}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-2.5">
        {categories.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-3.5 py-3"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-surface-2 text-ink-soft">
              <Icon name={c.icon} size={18} />
            </span>
            <div className="flex-1 text-[14.5px] font-bold">{c.name}</div>
            <div className="flex items-center gap-2">
              <StepButton onClick={() => setPlanCell(c.name, sel, Math.max(0, (plan[c.name]?.[sel] ?? 0) - 50))}>
                −
              </StepButton>
              <span
                className="num min-w-[62px] text-center text-[15px] font-extrabold"
                style={{ color: modeColor(sel) }}
              >
                {formatNumber(plan[c.name]?.[sel] ?? 0)}
              </span>
              <StepButton onClick={() => setPlanCell(c.name, sel, (plan[c.name]?.[sel] ?? 0) + 50)}>
                +
              </StepButton>
            </div>
          </div>
        ))}
      </div>

      <Button variant="ghost" className="w-full justify-center p-3" onClick={onAddCategory}>
        <Icon name="plus" size={16} /> Add category
      </Button>

      <Card
        className="sticky bottom-0 flex items-center justify-between px-4 py-3.5"
        style={{ border: `1.5px solid color-mix(in oklch, ${modeColor(sel)} 35%, var(--line))` }}
      >
        <div>
          <div className="text-xs font-extrabold text-ink-soft">{MODE_LABELS[sel]} total</div>
          <div className="num font-head text-[22px] font-extrabold" style={{ color: modeColor(sel) }}>
            {formatDH(totals[sel])}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-extrabold text-ink-soft">Leftover</div>
          <div
            className="num font-head text-[22px] font-extrabold"
            style={{ color: positive ? 'var(--good)' : 'var(--warn)' }}
          >
            {positive ? '+' : '−'}
            {formatNumber(Math.abs(leftover))}
          </div>
        </div>
      </Card>
    </>
  );
}

function StepButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border-[1.5px] border-line bg-surface text-[19px] leading-none text-ink hover:bg-surface-2"
    >
      {children}
    </button>
  );
}
