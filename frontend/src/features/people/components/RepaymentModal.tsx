import { useState } from 'react';
import { FieldLabel, Icon, Modal, TextField } from '@/components';
import { formatAmountDH } from '@/utils/format';
import type { Repayment } from '../types/debts';

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const today = () => new Date().toISOString().slice(0, 10);

export interface RepaymentFormValues {
  amount: string;
  paidOn: string;
  note: string;
}

export interface RepaymentModalProps {
  /** Current outstanding on the debt, shown as a hint (over-repayment is allowed). */
  outstanding: number;
  /** Prefilled repayment when editing; omitted when adding. */
  repayment?: Repayment;
  onClose: () => void;
  onSubmit: (values: RepaymentFormValues) => Promise<void>;
}

/** Add or edit a (partial) repayment against a debt. */
export function RepaymentModal({ outstanding, repayment, onClose, onSubmit }: RepaymentModalProps) {
  const editing = repayment != null;
  const [amount, setAmount] = useState(repayment ? String(repayment.amount) : '');
  const [paidOn, setPaidOn] = useState(repayment?.paidOn ?? today());
  const [note, setNote] = useState(repayment?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = AMOUNT_RE.test(amount) && Number(amount) > 0 && paidOn.length === 10;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ amount, paidOn, note });
      onClose();
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit repayment' : 'Record repayment'}
      onClose={onClose}
      footer={
        <button
          className="mt-[22px] flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent p-[13px] text-[15px] font-bold text-white disabled:pointer-events-none disabled:opacity-50"
          disabled={!valid || saving}
          onClick={submit}
        >
          <Icon name="check" size={17} /> {saving ? 'Saving…' : editing ? 'Save changes' : 'Record'}
        </button>
      }
    >
      <FieldLabel>Amount</FieldLabel>
      <div className="flex items-center justify-center gap-2 rounded-[var(--radius)] border-[1.5px] border-line bg-surface-2 p-3.5 text-good">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="w-[150px] border-0 bg-transparent text-center font-head text-[34px] font-bold text-inherit outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-lg font-extrabold text-ink-soft">DH</span>
      </div>
      {outstanding > 0 && (
        <div className="mt-1.5 text-[12px] text-ink-faint">
          {formatAmountDH(outstanding)} still outstanding.
        </div>
      )}

      <FieldLabel>Date</FieldLabel>
      <TextField type="date" value={paidOn} max={today()} onChange={(e) => setPaidOn(e.target.value)} />

      <FieldLabel>Note</FieldLabel>
      <TextField
        type="text"
        placeholder="optional"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      {error && <div className="mt-3 text-[13px] font-semibold text-warn">{error}</div>}
    </Modal>
  );
}
