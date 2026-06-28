import { useEffect, useRef, useState } from 'react';
import { Icon } from './icon';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';

export interface EditableNumberProps {
  value: number;
  onCommit: (value: number) => void;
  /** Text after the number, e.g. " DH". */
  suffix?: string;
  /** Text before the number, e.g. "−". */
  prefix?: string;
  /** Input width in px while editing. */
  width?: number;
  /** Larger type, for hero figures. */
  big?: boolean;
  /** Borderless until hover/focus, for inline use inside rows. */
  bare?: boolean;
  /** Hide the small pencil affordance. */
  hideIcon?: boolean;
  /** Override text color. */
  color?: string;
}

/**
 * A number that turns into an input on click and commits on blur/Enter.
 * Commits a non-negative rounded integer. Ported from the prototype's EditableNum.
 */
export function EditableNumber({
  value,
  onCommit,
  suffix = ' DH',
  prefix = '',
  width = 70,
  big,
  bare,
  hideIcon,
  color,
}: EditableNumberProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    setEditing(false);
    onCommit(Math.max(0, Math.round(Number(draft) || 0)));
  };

  const baseStyle = {
    ...(big ? { fontSize: 24, padding: '8px 14px' } : null),
    ...(color ? { color } : null),
  };

  const shellClass = cn(
    'num inline-flex cursor-text items-center gap-1.5 whitespace-nowrap rounded-[11px]',
    'text-[15px] font-extrabold text-ink transition',
    bare
      ? 'border-[1.5px] border-transparent bg-transparent px-[7px] py-[5px] hover:border-line hover:bg-surface-2'
      : 'border-[1.5px] border-line bg-surface-2 px-[11px] py-1.5 hover:border-[color-mix(in_oklch,var(--accent)_40%,var(--line))]',
    editing && 'border-accent! bg-surface shadow-[0_0_0_3px_var(--accent-tint)]',
  );

  if (!editing) {
    return (
      <button
        type="button"
        className={shellClass}
        style={baseStyle}
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
      >
        {prefix}
        {formatNumber(value)}
        {suffix}
        {!hideIcon && (
          <Icon name="edit" size={big ? 16 : 13} style={{ opacity: 0.4, marginLeft: 2 }} />
        )}
      </button>
    );
  }

  return (
    <span className={shellClass} style={baseStyle}>
      {prefix}
      <input
        ref={inputRef}
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="border-0 bg-transparent text-right text-inherit outline-none [appearance:textfield] [font:inherit] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        style={{ width: big ? 110 : width }}
      />
      {suffix}
    </span>
  );
}
