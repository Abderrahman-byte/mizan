import { useState } from 'react';
import { AddCategoryModal, ModesScreen, useBudget } from '@/features/budget';
import { PageContainer, PageHeader } from '../layout';
import { useMonthMode } from '../hooks/use-month-mode';
import { PageError, PageLoading } from './page-status';

export function ModesPage() {
  const { categories, addCategory, loading, error } = useBudget();
  const { mode } = useMonthMode();
  const [addingCategory, setAddingCategory] = useState(false);

  const header = (
    <PageHeader
      title="Budget modes"
      mobileTitle="Modes"
      subtitle="Your five spending tiers, side by side."
    />
  );

  return (
    <>
      {header}
      <PageContainer>
        {error ? (
          <PageError message={error} />
        ) : loading ? (
          <PageLoading />
        ) : (
          <ModesScreen currentModeIdx={mode.idx} onAddCategory={() => setAddingCategory(true)} />
        )}
      </PageContainer>
      {addingCategory && (
        <AddCategoryModal
          existing={categories}
          onClose={() => setAddingCategory(false)}
          onAdd={addCategory}
        />
      )}
    </>
  );
}
