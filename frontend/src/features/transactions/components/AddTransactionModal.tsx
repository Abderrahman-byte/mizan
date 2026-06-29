import { useState } from 'react';
import { FieldLabel, Icon, Modal, TextField } from '@/components';
import type { Category, TransactionDirection } from '@/types';
import { cn } from '@/utils/cn';
import type { NewTransaction } from '../api/transactions-api';

/** Today within the app's fixed demo timeline (June 2026). */
const TODAY = '2026-06-29';

export interface AddTransactionModalProps {
  categories: Category[];
  onClose: () => void;
  onAdd: (tx: NewTransaction) => void;
}

/** Add an expense or income to the current month's ledger. */
export function AddTransactionModal({ categories, onClose, onAdd }: AddTransactionModalProps) {
  const [direction, setDirection] = useState<TransactionDirection>('out');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(TODAY);

  const valid = Number(amount) > 0;
  // expense categories with Savings pushed to the end
  const expenseCats = [
    ...categories.filter((c) => c.name !== 'Savings'),
    ...categories.filter((c) => c.name === 'Savings'),
  ];

  const submit = () => {
    if (!valid) return;
    onAdd({
      date,
      description: description.trim() || (direction === 'in' ? 'Income' : category),
      category: direction === 'in' ? 'Income' : category,
      amount: Math.round(Number(amount)),
      direction,
    });
    onClose();
  };

  const amtColor = direction === 'in' ? 'var(--good)' : 'var(--ink)';

  return (
    <Modal
      title="Add transaction"
      onClose={onClose}
      footer={
        <button
          className="mt-[22px] flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent p-[13px] text-[15px] font-bold text-white disabled:pointer-events-none disabled:opacity-50"
          disabled={!valid}
          onClick={submit}
        >
          <Icon name="check" size={17} /> Add {direction === 'in' ? 'income' : 'expense'}
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
                key={c.name}
                on={category === c.name}
                onClick={() => setCategory(c.name)}
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
        max={TODAY}
        onChange={(e) => setDate(e.target.value)}
        className="[&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
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
