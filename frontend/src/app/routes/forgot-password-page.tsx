import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon } from '@/components';
import { AuthLayout, ForgotPasswordForm } from '@/features/auth';

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  // TODO: confirm before implementing — call the real password-reset endpoint.
  // For now this is a front-end shell that just advances to the confirmation.
  const handleSubmit = (email: string) => setSentTo(email);

  if (sentTo) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle={`If an account exists for ${sentTo}, a reset link is on its way.`}
        footer={
          <Link to="/signin" className="font-bold text-accent-ink hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-1 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
            <Icon name="check" size={24} />
          </span>
          <p className="text-[13.5px] text-ink-soft">
            Didn't get it? Check your spam folder, or try a different email.
          </p>
          <Button variant="ghost" onClick={() => setSentTo(null)} className="w-full">
            Use a different email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remember your password?{' '}
          <Link to="/signin" className="font-bold text-accent-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm onSubmit={handleSubmit} />
    </AuthLayout>
  );
}
