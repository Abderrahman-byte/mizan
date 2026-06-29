import { useState } from 'react';
import { TextField } from '@/components';

export interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

/** Password input with a Show/Hide toggle. */
export function PasswordField({ value, onChange, placeholder, autoComplete }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField
        type={show ? 'text' : 'password'}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="pr-16"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] font-bold text-ink-faint hover:text-accent-ink"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
