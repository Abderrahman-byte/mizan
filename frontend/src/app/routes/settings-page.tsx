import { initials } from '@/components';
import { useAuth } from '@/features/auth';
import { useSavings } from '@/features/savings';
import { SettingsScreen } from '@/features/settings';
import { PageContainer, PageHeader } from '../layout';
import { PageError, PageLoading } from './page-status';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { savings, update, loading, error } = useSavings();

  const header = (
    <PageHeader
      title="Settings"
      mobileTitle="Settings"
      subtitle="Manage your profile and savings goal."
    />
  );

  if (loading || error || !savings || !user) {
    return (
      <>
        {header}
        <PageContainer>{error ? <PageError message={error} /> : <PageLoading />}</PageContainer>
      </>
    );
  }

  return (
    <>
      {header}
      <PageContainer>
        <SettingsScreen
          profile={{
            name: user.displayName,
            email: user.email,
            initials: initials(user.displayName),
          }}
          savings={savings}
          onSaveSavings={update}
          onSignOut={signOut}
        />
      </PageContainer>
    </>
  );
}
