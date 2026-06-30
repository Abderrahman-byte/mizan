/* Route guards. These live in the app layer (which owns routing and composes
   features) and read the auth session via `useAuth`.

   - `RequireAuth` gates the authenticated app: unauthenticated visitors are sent
     to /signin, remembering where they were headed so sign-in can return them.
   - `RedirectIfAuthenticated` keeps a signed-in user off the auth pages. */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';

/** Full-screen centered spinner shown while the session is bootstrapping. */
function AuthSplash() {
  return (
    <div className="flex h-full items-center justify-center bg-bg text-ink-soft">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-accent" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <AuthSplash />;
  if (status === 'unauthenticated') {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') return <AuthSplash />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <>{children}</>;
}
