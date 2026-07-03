import { useState } from 'react';
import { FieldLabel, Icon, Modal, TextField } from '@/components';
import type { Counterparty, UpdateCounterpartyPayload } from '../types/debts';

export interface EditPersonModalProps {
  person: Counterparty;
  onClose: () => void;
  onSubmit: (patch: UpdateCounterpartyPayload) => Promise<void>;
}

/** Edit a person's name and note. */
export function EditPersonModal({ person, onClose, onSubmit }: EditPersonModalProps) {
  const [name, setName] = useState(person.name);
  const [note, setNote] = useState(person.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), note: note.trim() || null });
      onClose();
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit person"
      onClose={onClose}
      footer={
        <button
          className="mt-[22px] flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent p-[13px] text-[15px] font-bold text-white disabled:pointer-events-none disabled:opacity-50"
          disabled={!valid || saving}
          onClick={submit}
        >
          <Icon name="check" size={17} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      }
    >
      <FieldLabel>Name</FieldLabel>
      <TextField
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

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
