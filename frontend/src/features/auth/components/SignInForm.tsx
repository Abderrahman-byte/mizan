import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, FieldLabel, TextField } from '@/components';
import { PasswordField } from './PasswordField';

export interface SignInValues {
  email: string;
  password: string;
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function SignInForm({ onSubmit }: { onSubmit: (values: SignInValues) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const valid = isEmail(email) && password.length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({ email, password });
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

      <FieldLabel>Password</FieldLabel>
      <PasswordField
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        placeholder="Your password"
      />
      <div className="mt-2 text-right">
        <Link
          to="/forgot-password"
          className="text-[13px] font-semibold text-accent-ink hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        disabled={!valid}
        className="mt-4 w-full disabled:pointer-events-none disabled:opacity-50"
      >
        Sign in
      </Button>
    </form>
  );
}
