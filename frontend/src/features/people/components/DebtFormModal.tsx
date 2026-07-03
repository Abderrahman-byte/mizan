import { useState } from 'react';
import { FieldLabel, Icon, Modal, TextField } from '@/components';
import { cn } from '@/utils/cn';
import type { Debt, DebtDirection } from '../types/debts';

/** Whole or 2-decimal positive amount. */
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const today = () => new Date().toISOString().slice(0, 10);

export interface DebtFormValues {
  direction: DebtDirection;
  /** Decimal string. */
  amount: string;
  description: string;
  incurredOn: string;
}

export interface DebtFormModalProps {
  /** Person's name, shown in the title. */
  personName: string;
  /** Prefilled debt when editing; omitted when adding. */
  debt?: Debt;
  onClose: () => void;
  onSubmit: (values: DebtFormValues) => Promise<void>;
}

/** Add a new debt to a person, or edit an existing one. */
export function DebtFormModal({ personName, debt, onClose, onSubmit }: DebtFormModalProps) {
  const editing = debt != null;
  const [direction, setDirection] = useState<DebtDirection>(debt?.direction ?? 'OWED_TO_ME');
  const [amount, setAmount] = useState(debt ? String(debt.principalAmount) : '');
  const [description, setDescription] = useState(debt?.description ?? '');
  const [incurredOn, setIncurredOn] = useState(debt?.incurredOn ?? today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = AMOUNT_RE.test(amount) && Number(amount) > 0 && incurredOn.length === 10;
  const color = direction === 'OWED_TO_ME' ? 'var(--good)' : 'var(--cool)';

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ direction, amount, description, incurredOn });
      onClose();
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit debt' : `New debt · ${personName}`}
      onClose={onClose}
      footer={
        <button
          className="mt-[22px] flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent p-[13px] text-[15px] font-bold text-white disabled:pointer-events-none disabled:opacity-50"
          disabled={!valid || saving}
          onClick={submit}
        >
          <Icon name="check" size={17} /> {saving ? 'Saving…' : editing ? 'Save changes' : 'Add debt'}
        </button>
      }
    >
      <FieldLabel>Direction</FieldLabel>
      <div className="flex gap-2.5">
        <DirButton on={direction === 'OWED_TO_ME'} tone="owe" onClick={() => setDirection('OWED_TO_ME')}>
          <Icon name="arrowOut" size={17} /> They owe you
        </DirButton>
        <DirButton on={direction === 'I_OWE'} tone="debt" onClick={() => setDirection('I_OWE')}>
          <Icon name="arrowIn" size={17} /> You owe them
        </DirButton>
      </div>

      <FieldLabel>Amount</FieldLabel>
      <div
        className="flex items-center justify-center gap-2 rounded-[var(--radius)] border-[1.5px] border-line bg-surface-2 p-3.5"
        style={{ color }}
      >
        <span className="font-head text-3xl font-bold">{direction === 'OWED_TO_ME' ? '+' : '−'}</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-[150px] border-0 bg-transparent text-center font-head text-[34px] font-bold text-inherit outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-lg font-extrabold text-ink-soft">DH</span>
      </div>
      {editing && (
        <div className="mt-1.5 text-[12px] text-ink-faint">
          Editing the amount recomputes what's still outstanding against existing repayments.
        </div>
      )}

      <FieldLabel>What for</FieldLabel>
      <TextField
        type="text"
        placeholder="e.g. Car repair, rent loan"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      <FieldLabel>Date</FieldLabel>
      <TextField
        type="date"
        value={incurredOn}
        max={today()}
        onChange={(e) => setIncurredOn(e.target.value)}
      />

      {error && <div className="mt-3 text-[13px] font-semibold text-warn">{error}</div>}
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
