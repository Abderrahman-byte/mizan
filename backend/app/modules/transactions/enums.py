"""Transactions-ledger enums.

``TransactionDirection`` is **stored** on the ``transactions`` row (native PG enum
``transaction_direction``). ``str`` values so it serializes to the literals documented in
``docs/transactions.md`` (``"IN"`` / ``"OUT"``).
"""

from __future__ import annotations

import enum


class TransactionDirection(str, enum.Enum):
    """Which way a ledger entry moves money for the user."""

    IN = "IN"  # income — money coming in
    OUT = "OUT"  # expense — money going out (counts toward the month's spend)
