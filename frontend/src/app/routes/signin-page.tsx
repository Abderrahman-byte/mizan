import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout, SignInForm, authErrorMessage, useAuth } from '@/features/auth';
import type { SignInValues } from '@/features/auth';

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Where to land after sign-in: the page the guard bounced us from, or the dashboard.
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSignIn = async (values: SignInValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(values);
      navigate(from, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Mizan account."
      footer={
        <>
          New to Mizan?{' '}
          <Link to="/signup" className="font-bold text-accent-ink hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm onSubmit={handleSignIn} submitting={submitting} error={error} />
    </AuthLayout>
  );
}
