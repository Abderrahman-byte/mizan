import type { ReactNode } from 'react';
import { Icon } from './icon';
import { useEscapeKey } from '@/hooks/use-escape-key';

export interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Sticky footer (typically the primary action button). */
  footer?: ReactNode;
}

/**
 * Centered dialog on desktop, bottom sheet on mobile. Closes on overlay click,
 * the × button, or Escape. Matches the prototype's add-* modals.
 */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  useEscapeKey(onClose);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(28,20,46,0.44)] p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92%] w-full max-w-full overflow-y-auto border border-line bg-surface p-5 pb-[26px] shadow-[var(--shadow)] rounded-t-[26px] sm:w-[460px] sm:rounded-[var(--radius-lg)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="whitespace-nowrap font-head text-xl font-bold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border-[1.5px] border-line bg-surface text-ink-soft hover:bg-surface-2"
          >
            <Icon name="plus" size={18} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

/** Uppercase field label used inside modals/forms. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 mt-[18px] text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-ink-faint">
      {children}
    </div>
  );
}

/** Full-width text input matching the Bloom form style. */
export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        'w-full rounded-[var(--radius)] border-[1.5px] border-line bg-surface px-3.5 py-3 text-[14.5px] font-semibold text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-tint)]' +
        (props.className ? ' ' + props.className : '')
      }
    />
  );
}
