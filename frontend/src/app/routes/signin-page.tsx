import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout, SignInForm } from '@/features/auth';

export function SignInPage() {
  const navigate = useNavigate();

  // TODO: confirm before implementing — wire real authentication (call the API,
  // store the token, set the Axios interceptor). For now this is a front-end
  // shell: a valid submit drops straight into the app.
  const handleSignIn = () => navigate('/');

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
      <SignInForm onSubmit={handleSignIn} />
    </AuthLayout>
  );
}
