import { useSavings } from '@/features/savings';
import { SettingsScreen } from '@/features/settings';
import { currentUser } from '@/lib/mock/db';
import { PageContainer, PageHeader } from '../layout';
import { PageError, PageLoading } from './page-status';

export function SettingsPage() {
  const { savings, update, loading, error } = useSavings();

  const header = (
    <PageHeader
      title="Settings"
      mobileTitle="Settings"
      subtitle="Manage your profile and savings goal."
    />
  );

  if (loading || error || !savings) {
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
            name: currentUser.name,
            email: currentUser.email,
            initials: currentUser.initials,
          }}
          savings={savings}
          onSaveSavings={update}
        />
      </PageContainer>
    </>
  );
}
