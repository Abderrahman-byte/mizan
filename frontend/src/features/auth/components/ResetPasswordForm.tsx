import { useState } from 'react';
import { Button, FieldLabel } from '@/components';
import { cn } from '@/utils/cn';
import { PasswordField } from './PasswordField';

const MIN_PASSWORD = 8;

export function ResetPasswordForm({ onSubmit }: { onSubmit: (password: string) => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const passwordOk = password.length >= MIN_PASSWORD;
  const passwordsMatch = confirm.length > 0 && confirm === password;
  const valid = passwordOk && passwordsMatch;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit(password);
  };

  return (
    <form onSubmit={submit} className="flex flex-col" noValidate>
      <FieldLabel>New password</FieldLabel>
      <PasswordField
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="Create a new password"
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
        placeholder="Re-enter your new password"
      />
      {confirm.length > 0 && !passwordsMatch && (
        <p className="mt-1.5 text-[12px] text-warn">Passwords don't match.</p>
      )}

      <Button
        type="submit"
        disabled={!valid}
        className="mt-5 w-full disabled:pointer-events-none disabled:opacity-50"
      >
        Update password
      </Button>
    </form>
  );
}
