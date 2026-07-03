import { useCallback, useEffect, useState } from 'react';
import { Avatar, Button, Card, CardHeading, Heading, Icon, initials } from '@/components';
import { formatAmountDH } from '@/utils/format';
import * as api from '../api/people-api';
import { apiErrorMessage, usePeople } from '../stores/people-store';
import type { Counterparty, Debt, Repayment } from '../types/debts';
import { colorForBalance, signForBalance, statusForBalance } from './person-helpers';
import { DebtCard } from './DebtCard';
import { DebtFormModal, type DebtFormValues } from './DebtFormModal';
import { EditPersonModal } from './EditPersonModal';
import { RepaymentModal, type RepaymentFormValues } from './RepaymentModal';

type ModalState =
  | { type: 'addDebt' }
  | { type: 'editDebt'; debt: Debt }
  | { type: 'repay'; debt: Debt; repayment?: Repayment }
  | { type: 'editPerson' }
  | null;

export interface PersonDetailProps {
  person: Counterparty;
  /** On mobile, a back link returns to the list. */
  onBack?: () => void;
  /** Called after the person is deleted, so the parent can clear its selection. */
  onDeleted?: () => void;
}

/** A person's net balance, their debts (with repayments), and all debt/repayment actions. */
export function PersonDetail({ person, onBack, onDeleted }: PersonDetailProps) {
  const { refresh, updateCounterparty, removeCounterparty } = usePeople();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);

  const reload = useCallback(async () => {
    const summaries = await api.getDebts({ counterpartyId: person.id });
    // The list endpoint omits repayments; fetch each debt's detail for them.
    const full = await Promise.all(summaries.map((d) => api.getDebt(d.id)));
    setDebts(full);
  }, [person.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    reload()
      .catch(() => active && setLoadError('Could not load this person’s debts.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reload]);

  /** Run an inline (non-modal) mutation, then refresh debts + list balances. */
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await reload();
      await refresh();
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  /** Modal submit: mutate then refresh; errors propagate so the modal can show them. */
  const submit = async (fn: () => Promise<unknown>) => {
    await fn();
    await reload();
    await refresh();
  };

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const deletePerson = () => {
    if (debts.length > 0) return;
    if (!window.confirm(`Delete ${person.name}? This can’t be undone.`)) return;
    void run(async () => {
      await removeCounterparty(person.id);
      onDeleted?.();
    });
  };

  const color = colorForBalance(person.balance);

  return (
    <Card className="flex flex-col gap-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 self-start text-[14px] font-semibold text-ink-soft lg:hidden"
        >
          <Icon name="chevL" size={18} /> All people
        </button>
      )}

      <div className="flex items-center gap-3">
        <Avatar
          size={48}
          style={{
            background: `color-mix(in oklch, ${color} 16%, var(--surface-2))`,
            color,
            borderColor: 'transparent',
          }}
        >
          {initials(person.name)}
        </Avatar>
        <div className="min-w-0 flex-1">
          <Heading className="truncate text-[19px]">{person.name}</Heading>
          <div className="text-[13px] font-extrabold" style={{ color }}>
            {statusForBalance(person.balance)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: 'editPerson' })}
          aria-label="Edit person"
          className="rounded-full border border-line p-2 text-ink-soft transition hover:bg-surface-2"
        >
          <Icon name="edit" size={16} />
        </button>
      </div>

      <div className="rounded-[var(--radius)] bg-surface-2 p-4 text-center">
        <div className="text-xs font-extrabold text-ink-soft">Net balance</div>
        <div className="num font-head text-[34px] font-bold tracking-[-0.5px]" style={{ color }}>
          {signForBalance(person.balance)}
          {formatAmountDH(Math.abs(person.balance))}
        </div>
      </div>

      <div className="flex gap-2.5">
        <Button className="flex-1" onClick={() => setModal({ type: 'addDebt' })} disabled={busy}>
          <Icon name="plus" size={16} /> Add debt
        </Button>
        <Button
          variant="ghost"
          className="flex-1"
          onClick={deletePerson}
          disabled={busy || debts.length > 0}
          title={debts.length > 0 ? 'Delete or resolve their debts first' : undefined}
        >
          <Icon name="close" size={16} /> Delete person
        </Button>
      </div>

      {actionError && <div className="text-[13px] font-semibold text-warn">{actionError}</div>}

      <div>
        <CardHeading className="mb-1.5">Debts</CardHeading>
        {loading ? (
          <div className="py-6 text-center text-[13px] text-ink-soft">Loading…</div>
        ) : loadError ? (
          <div className="py-6 text-center text-[13px] text-warn">{loadError}</div>
        ) : debts.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-ink-soft">
            No debts with {person.name} yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {debts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                expanded={expanded.has(debt.id)}
                busy={busy}
                onToggle={() => toggle(debt.id)}
                onRepay={() => setModal({ type: 'repay', debt })}
                onSettle={() =>
                  run(() =>
                    api.addRepayment(debt.id, { amount: debt.outstanding.toFixed(2) }),
                  )
                }
                onEdit={() => setModal({ type: 'editDebt', debt })}
                onWriteOff={() => run(() => api.writeOffDebt(debt.id))}
                onRestore={() => run(() => api.restoreDebt(debt.id))}
                onDelete={() => {
                  if (!window.confirm('Delete this debt and its repayments?')) return;
                  void run(() => api.deleteDebt(debt.id));
                }}
                onEditRepayment={(r) => setModal({ type: 'repay', debt, repayment: r })}
                onDeleteRepayment={(r) => {
                  if (!window.confirm('Delete this repayment?')) return;
                  void run(() => api.deleteRepayment(debt.id, r.id));
                }}
              />
            ))}
          </div>
        )}
      </div>

      {modal?.type === 'addDebt' && (
        <DebtFormModal
          personName={person.name}
          onClose={() => setModal(null)}
          onSubmit={(v: DebtFormValues) =>
            submit(() =>
              api.createDebt({
                counterpartyId: person.id,
                direction: v.direction,
                principalAmount: v.amount,
                description: v.description.trim() || null,
                incurredOn: v.incurredOn,
              }),
            )
          }
        />
      )}

      {modal?.type === 'editDebt' && (
        <DebtFormModal
          personName={person.name}
          debt={modal.debt}
          onClose={() => setModal(null)}
          onSubmit={(v: DebtFormValues) =>
            submit(() =>
              api.updateDebt(modal.debt.id, {
                direction: v.direction,
                principalAmount: v.amount,
                description: v.description.trim() || null,
                incurredOn: v.incurredOn,
              }),
            )
          }
        />
      )}

      {modal?.type === 'repay' && (
        <RepaymentModal
          outstanding={modal.debt.outstanding}
          repayment={modal.repayment}
          onClose={() => setModal(null)}
          onSubmit={(v: RepaymentFormValues) =>
            submit(() => {
              const payload = { amount: v.amount, paidOn: v.paidOn, note: v.note.trim() || null };
              return modal.repayment
                ? api.updateRepayment(modal.debt.id, modal.repayment.id, payload)
                : api.addRepayment(modal.debt.id, payload);
            })
          }
        />
      )}

      {modal?.type === 'editPerson' && (
        <EditPersonModal
          person={person}
          onClose={() => setModal(null)}
          onSubmit={(patch) => updateCounterparty(person.id, patch).then(() => undefined)}
        />
      )}
    </Card>
  );
}
