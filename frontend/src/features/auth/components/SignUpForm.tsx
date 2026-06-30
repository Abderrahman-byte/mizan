import { useState } from 'react';
import { Button, FieldLabel, TextField } from '@/components';
import { cn } from '@/utils/cn';
import { PasswordField } from './PasswordField';

export interface SignUpValues {
  name: string;
  email: string;
  password: string;
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const MIN_PASSWORD = 8;

export interface SignUpFormProps {
  onSubmit: (values: SignUpValues) => void;
  submitting?: boolean;
  error?: string | null;
}

export function SignUpForm({ onSubmit, submitting = false, error }: SignUpFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);

  const passwordOk = password.length >= MIN_PASSWORD;
  const passwordsMatch = confirm.length > 0 && confirm === password;
  const valid =
    name.trim().length > 0 && isEmail(email) && passwordOk && passwordsMatch && agree;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    onSubmit({ name: name.trim(), email, password });
  };

  return (
    <form onSubmit={submit} className="flex flex-col" noValidate>
      <FieldLabel>Full name</FieldLabel>
      <TextField
        type="text"
        autoComplete="name"
        placeholder="e.g. Yassine Alami"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <FieldLabel>Email</FieldLabel>
      <TextField
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <FieldLabel>Password</FieldLabel>
      <PasswordField
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="Create a password"
      />
      <p
        className={cn(
          'mt-1.5 text-[12px]',
          password.length > 0 && !passwordOk ? 'text-warn' : 'text-ink-faint',
        )}
      >
        At least {MIN_PASSWORD} characters.
      </p>

      <FieldLabel>Confirm password</FieldLabel>
      <PasswordField
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        placeholder="Re-enter your password"
      />
      {confirm.length > 0 && !passwordsMatch && (
        <p className="mt-1.5 text-[12px] text-warn">Passwords don't match.</p>
      )}

      <label className="mt-4 flex items-start gap-2.5 text-[13px] text-ink-soft">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-none accent-[var(--accent)]"
        />
        <span>
          I agree to the <span className="font-semibold text-accent-ink">Terms</span> and{' '}
          <span className="font-semibold text-accent-ink">Privacy Policy</span>.
        </span>
      </label>

      {error && (
        <p className="mt-4 rounded-[var(--radius)] border-[1.5px] border-line bg-surface-2 px-3 py-2 text-[13px] font-semibold text-warn">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={!valid || submitting}
        className="mt-5 w-full disabled:pointer-events-none disabled:opacity-50"
      >
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
