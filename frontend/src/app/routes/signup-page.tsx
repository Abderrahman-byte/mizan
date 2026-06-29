import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout, SignUpForm } from '@/features/auth';

export function SignUpPage() {
  const navigate = useNavigate();

  // TODO: confirm before implementing — wire real authentication (create the
  // account via the API, store the token, set the Axios interceptor). For now
  // this is a front-end shell: a valid submit drops straight into the app.
  const handleSignUp = () => navigate('/');

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
      <SignUpForm onSubmit={handleSignUp} />
    </AuthLayout>
  );
}
