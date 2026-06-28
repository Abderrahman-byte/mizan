import { useState } from 'react';
import { FieldLabel, Icon, Modal, TextField } from '@/components';
import type { IconName } from '@/components';
import type { Category } from '@/types';
import { cn } from '@/utils/cn';

const ICON_CHOICES: IconName[] = [
  'cup', 'fork', 'car', 'home', 'heart', 'spark', 'shirt', 'play', 'dumbbell', 'piggy',
  'bolt', 'wifi', 'cart', 'smoke', 'target', 'wallet', 'bell', 'leaf', 'sun', 'flame',
];

export interface AddCategoryModalProps {
  existing: Category[];
  onClose: () => void;
  onAdd: (category: Category) => void;
}

/** Create a budget category; it starts at 0 DH across all five modes. */
export function AddCategoryModal({ existing, onClose, onAdd }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('cup');

  const duplicate = existing.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim().length > 0 && !duplicate;

  const submit = () => {
    if (!valid) return;
    onAdd({ name: name.trim(), icon });
    onClose();
  };

  return (
    <Modal
      title="Add category"
      onClose={onClose}
      footer={
        <button
          className="mt-[22px] flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent p-[13px] text-[15px] font-bold text-white disabled:pointer-events-none disabled:opacity-50"
          disabled={!valid}
          onClick={submit}
        >
          <Icon name="check" size={17} /> Add category
        </button>
      }
    >
      <FieldLabel>Name</FieldLabel>
      <TextField
        autoFocus
        type="text"
        placeholder="e.g. Books, Pets, Travel"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {duplicate && (
        <div className="mt-[7px] text-[12.5px] font-bold text-warn">
          A category with that name already exists.
        </div>
      )}

      <FieldLabel>Icon</FieldLabel>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
        {ICON_CHOICES.map((ic) => (
          <button
            key={ic}
            aria-label={ic}
            onClick={() => setIcon(ic)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-xl border-[1.5px] transition',
              icon === ic
                ? 'border-accent bg-accent-soft text-accent-ink'
                : 'border-line bg-surface text-ink-soft hover:bg-surface-2',
            )}
          >
            <Icon name={ic} size={20} />
          </button>
        ))}
      </div>

      <div className="mt-4 text-[13px] leading-relaxed text-ink-soft">
        New categories start at <b className="text-ink">0 DH</b> across all five modes — set each
        tier's amount right in the grid.
      </div>
    </Modal>
  );
}
