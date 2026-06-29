import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon } from '@/components';
import { AuthLayout, ResetPasswordForm } from '@/features/auth';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  // TODO: confirm before implementing — validate the token and call the real
  // reset endpoint. For now this is a front-end shell that advances to success.
  const handleSubmit = () => setDone(true);

  // The reset link must carry a token; without one it's invalid or expired.
  if (!token) {
    return (
      <AuthLayout
        title="Link expired"
        subtitle="This password reset link is invalid or has expired."
        footer={
          <Link to="/signin" className="font-bold text-accent-ink hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-1 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-surface-2 text-warn">
            <Icon name="bell" size={24} />
          </span>
          <p className="text-[13.5px] text-ink-soft">
            Reset links are single-use and time-limited. Request a fresh one to continue.
          </p>
          <Button onClick={() => navigate('/forgot-password')} className="w-full">
            Request a new link
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Your password has been changed."
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
            You can now sign in with your new password.
          </p>
          <Button onClick={() => navigate('/signin')} className="w-full">
            Sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a new password for your account."
      footer={
        <>
          Remember it?{' '}
          <Link to="/signin" className="font-bold text-accent-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ResetPasswordForm onSubmit={handleSubmit} />
    </AuthLayout>
  );
}
