import { useState } from 'react';
import { Button, Icon } from '@/components';
import { AddPersonModal, PeopleScreen, usePeople } from '@/features/people';
import { PageContainer, PageHeader } from '../layout';
import { PageError, PageLoading } from './page-status';

export function PeoplePage() {
  const { addPerson, loading, error } = usePeople();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="People"
        subtitle="Money you’ve lent and money you owe."
        action={
          <Button onClick={() => setAdding(true)} className="max-lg:px-3">
            <Icon name="plus" size={16} />
            <span className="hidden lg:inline">New entry</span>
          </Button>
        }
      />
      <PageContainer>
        {error ? <PageError message={error} /> : loading ? <PageLoading /> : <PeopleScreen />}
      </PageContainer>
      {adding && <AddPersonModal onClose={() => setAdding(false)} onAdd={addPerson} />}
    </>
  );
}
