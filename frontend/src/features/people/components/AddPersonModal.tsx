import { useState } from 'react';
import { FieldLabel, Icon, Modal, TextField } from '@/components';
import type { Person } from '@/types';
import { cn } from '@/utils/cn';

export interface AddPersonModalProps {
  onClose: () => void;
  onAdd: (person: Person) => void;
}

/** Record a new loan (they owe you) or debt (you owe them). */
export function AddPersonModal({ onClose, onAdd }: AddPersonModalProps) {
  const [name, setName] = useState('');
  const [direction, setDirection] = useState<'owe' | 'debt'>('owe');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const valid = name.trim().length > 0 && Number(amount) > 0;
  const color = direction === 'owe' ? 'var(--good)' : 'var(--cool)';

  const submit = () => {
    if (!valid) return;
    const value = Math.round(Number(amount));
    onAdd({
      name: name.trim(),
      balance: direction === 'owe' ? value : -value,
      note: note.trim() || (direction === 'owe' ? 'Loan' : 'Debt'),
    });
    onClose();
  };

  return (
    <Modal
      title="New entry"
      onClose={onClose}
      footer={
        <button
          className="mt-[22px] flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent p-[13px] text-[15px] font-bold text-white disabled:pointer-events-none disabled:opacity-50"
          disabled={!valid}
          onClick={submit}
        >
          <Icon name="check" size={17} /> Save entry
        </button>
      }
    >
      <FieldLabel>Who</FieldLabel>
      <TextField
        autoFocus
        type="text"
        placeholder="e.g. Sara Idrissi"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      <FieldLabel>Direction</FieldLabel>
      <div className="flex gap-2.5">
        <DirButton on={direction === 'owe'} tone="owe" onClick={() => setDirection('owe')}>
          <Icon name="arrowOut" size={17} /> They owe you
        </DirButton>
        <DirButton on={direction === 'debt'} tone="debt" onClick={() => setDirection('debt')}>
          <Icon name="arrowIn" size={17} /> You owe them
        </DirButton>
      </div>

      <FieldLabel>Amount</FieldLabel>
      <div
        className="flex items-center justify-center gap-2 rounded-[var(--radius)] border-[1.5px] border-line bg-surface-2 p-3.5"
        style={{ color }}
      >
        <span className="font-head text-3xl font-bold">{direction === 'owe' ? '+' : '−'}</span>
        <input
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

      <FieldLabel>Note</FieldLabel>
      <TextField
        type="text"
        placeholder="e.g. Dinner split, loan for rent"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
    </Modal>
  );
}

function DirButton({
  on,
  tone,
  onClick,
  children,
}: {
  on: boolean;
  tone: 'owe' | 'debt';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border-[1.5px] p-3 text-sm font-extrabold transition',
        !on && 'border-line bg-surface text-ink-soft',
        on && tone === 'owe' && 'border-good text-good',
        on && tone === 'debt' && 'border-cool text-cool',
      )}
      style={
        on
          ? {
              background: `color-mix(in oklch, ${tone === 'owe' ? 'var(--good)' : 'var(--cool)'} 12%, transparent)`,
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}
