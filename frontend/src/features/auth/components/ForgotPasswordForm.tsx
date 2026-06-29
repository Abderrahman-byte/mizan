import { useState } from 'react';
import { Button, FieldLabel, TextField } from '@/components';

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function ForgotPasswordForm({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const valid = isEmail(email);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit(email);
  };

  return (
    <form onSubmit={submit} className="flex flex-col" noValidate>
      <FieldLabel>Email</FieldLabel>
      <TextField
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button
        type="submit"
        disabled={!valid}
        className="mt-5 w-full disabled:pointer-events-none disabled:opacity-50"
      >
        Send reset link
      </Button>
    </form>
  );
}
