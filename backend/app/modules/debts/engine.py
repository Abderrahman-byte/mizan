"""Pure debt math — no I/O, no DB, no HTTP. Trivially unit-testable (see ``conventions.md`` §1).

These functions express the derived parts of the model documented in ``docs/debts.md``:

    outstanding = principal_amount - Σ repayments.amount
    status      = written_off? -> WRITTEN_OFF
                  outstanding == principal -> OPEN
                  outstanding <= 0         -> SETTLED   (over-repayment allowed -> may be < 0)
                  otherwise                -> PARTIALLY_PAID
    signed balance = +outstanding for OWED_TO_ME, -outstanding for I_OWE
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.modules.debts.enums import DebtDirection, DebtStatus


def outstanding(principal_amount: Decimal, repaid_total: Decimal) -> Decimal:
    """Amount still owed on a debt. May be negative if over-repaid (allowed by design)."""
    return principal_amount - repaid_total


def compute_status(
    principal_amount: Decimal,
    outstanding_amount: Decimal,
    written_off_at: date | None,
) -> DebtStatus:
    """Derive a debt's lifecycle status. ``written_off_at`` overrides the amounts."""
    if written_off_at is not None:
        return DebtStatus.WRITTEN_OFF
    if outstanding_amount >= principal_amount:
        # No repayments (outstanding == principal). Guards against a stray negative repayment
        # total by treating >= as "untouched".
        return DebtStatus.OPEN
    if outstanding_amount <= 0:
        return DebtStatus.SETTLED
    return DebtStatus.PARTIALLY_PAID


def signed_balance(direction: DebtDirection, outstanding_amount: Decimal) -> Decimal:
    """Outstanding signed from the user's perspective: positive = owed to the user."""
    if direction == DebtDirection.I_OWE:
        return -outstanding_amount
    return outstanding_amount
