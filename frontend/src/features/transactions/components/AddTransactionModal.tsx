import { useState } from 'react';
import { FieldLabel, Icon, Modal, TextField } from '@/components';
import type { TransactionDirection } from '@/types';
import { cn } from '@/utils/cn';
import { todayISO } from '@/utils/date';
import type { LedgerCategory, NewLedgerTransaction } from '../types/ledger';

export interface AddTransactionModalProps {
  categories: LedgerCategory[];
  onClose: () => void;
  /** Create the entry against the backend. Rejects with the normalized API error. */
  onAdd: (tx: NewLedgerTransaction) => Promise<void>;
}

/** Add an expense or income to the ledger (dated today by default). */
export function AddTransactionModal({ categories, onClose, onAdd }: AddTransactionModalProps) {
  const today = todayISO();
  // Expense categories with Savings pushed to the end.
  const expenseCats = [
    ...categories.filter((c) => c.name !== 'Savings'),
    ...categories.filter((c) => c.name === 'Savings'),
  ];

  const [direction, setDirection] = useState<TransactionDirection>('out');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(expenseCats[0]?.id ?? null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = categories.find((c) => c.id === categoryId);
  const valid = Number(amount) > 0 && (direction === 'in' || category != null);

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        direction,
        amount: Math.round(Number(amount)),
        description:
          description.trim() || (direction === 'in' ? 'Income' : (category?.name ?? '')),
        categoryId: direction === 'out' ? (categoryId as number) : null,
        date,
      });
      onClose();
    } catch (err) {
      setError(
        (err as { message?: string })?.message ??
          'Could not save this transaction. Please try again.',
      );
      setSaving(false);
    }
  };

  const amtColor = direction === 'in' ? 'var(--good)' : 'var(--ink)';

  return (
    <Modal
      title="Add transaction"
      onClose={onClose}
      footer={
        <button
          className="mt-[22px] flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent p-[13px] text-[15px] font-bold text-white disabled:pointer-events-none disabled:opacity-50"
          disabled={!valid || saving}
          onClick={submit}
        >
          <Icon name="check" size={17} />{' '}
          {saving ? 'Saving…' : `Add ${direction === 'in' ? 'income' : 'expense'}`}
        </button>
      }
    >
      <div className="mt-[18px] flex gap-2.5">
        <SegButton on={direction === 'out'} onClick={() => setDirection('out')} tone="out">
          <Icon name="arrowOut" size={17} /> Expense
        </SegButton>
        <SegButton on={direction === 'in'} onClick={() => setDirection('in')} tone="in">
          <Icon name="arrowIn" size={17} /> Income
        </SegButton>
      </div>

      <FieldLabel>Amount</FieldLabel>
      <div
        className="flex items-center justify-center gap-2 rounded-[var(--radius)] border-[1.5px] border-line bg-surface-2 p-3.5"
        style={{ color: amtColor }}
      >
        <span className="font-head text-3xl font-bold">{direction === 'in' ? '+' : '−'}</span>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="w-[150px] border-0 bg-transparent text-center font-head text-[34px] font-bold text-inherit outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-lg font-extrabold text-ink-soft">DH</span>
      </div>

      {direction === 'out' ? (
        <>
          <FieldLabel>Category</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {expenseCats.map((c) => (
              <CategoryChip
                key={c.id}
                on={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
              >
                <Icon name={c.icon} size={16} /> {c.name}
              </CategoryChip>
            ))}
          </div>
        </>
      ) : (
        <>
          <FieldLabel>Category</FieldLabel>
          <span className="inline-flex cursor-default items-center gap-1.5 rounded-full border-[1.5px] border-accent bg-accent-soft px-3 py-2.5 text-[13px] font-bold text-accent-ink">
            <Icon name="wallet" size={16} /> Income
          </span>
        </>
      )}

      <FieldLabel>Description</FieldLabel>
      <TextField
        type="text"
        placeholder={direction === 'in' ? 'e.g. Freelance project' : 'e.g. Marjane groceries'}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      <FieldLabel>Date</FieldLabel>
      <TextField
        type="date"
        value={date}
        max={today}
        onChange={(e) => setDate(e.target.value)}
        className="[&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />

      {error && <div className="mt-3 text-[13px] font-semibold text-warn">{error}</div>}
    </Modal>
  );
}

function SegButton({
  on,
  tone,
  onClick,
  children,
}: {
  on: boolean;
  tone: 'in' | 'out';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border-[1.5px] p-3 text-sm font-extrabold transition',
        !on && 'border-line bg-surface text-ink-soft',
        on && tone === 'out' && 'border-ink bg-surface-2 text-ink',
        on && tone === 'in' && 'border-good text-good',
      )}
      style={
        on && tone === 'in'
          ? { background: 'color-mix(in oklch, var(--good) 12%, transparent)' }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function CategoryChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-2.5 text-[13px] font-bold transition',
        on ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-soft',
      )}
    >
      {children}
    </button>
  );
}
