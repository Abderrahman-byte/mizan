"""Debt-ledger enums.

``DebtDirection`` is **stored** on the ``debts`` row (native PG enum ``debt_direction``).
``DebtStatus`` is **derived** (see ``engine.compute_status``) and never persisted — it only
ever appears in responses. Both use ``str`` values so they serialize to the literals documented
in ``docs/debts.md`` (e.g. ``"I_OWE"``, ``"partially_paid"``).
"""

from __future__ import annotations

import enum


class DebtDirection(str, enum.Enum):
    """Which way the money flows for a debt."""

    I_OWE = "I_OWE"  # the user owes the counterparty
    OWED_TO_ME = "OWED_TO_ME"  # the counterparty owes the user


class DebtStatus(str, enum.Enum):
    """Derived lifecycle of a debt. Computed from amounts + ``written_off_at``."""

    OPEN = "open"  # no repayments yet (outstanding == principal)
    PARTIALLY_PAID = "partially_paid"  # some repaid, still owing (0 < outstanding < principal)
    SETTLED = "settled"  # fully repaid or over-repaid (outstanding <= 0)
    WRITTEN_OFF = "written_off"  # forgiven/cancelled (written_off_at set); overrides amounts
