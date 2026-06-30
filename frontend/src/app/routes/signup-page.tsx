import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout, SignUpForm, authErrorMessage, useAuth } from '@/features/auth';
import type { SignUpValues } from '@/features/auth';

export function SignUpPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (values: SignUpValues) => {
    setSubmitting(true);
    setError(null);
    try {
      // The form collects `name`; the API expects `displayName`.
      await signUp({ email: values.email, displayName: values.name, password: values.password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your spending modes with Mizan."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/signin" className="font-bold text-accent-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm onSubmit={handleSignUp} submitting={submitting} error={error} />
    </AuthLayout>
  );
}
