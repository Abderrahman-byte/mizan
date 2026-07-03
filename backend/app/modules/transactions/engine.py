"""Pure helpers for the transactions ledger — no I/O, no DB (trivially unit-testable)."""

from __future__ import annotations

from datetime import date


def month_bounds(month: str) -> tuple[date, date]:
    """Half-open date range ``[first day, first day of next month)`` for a ``"YYYY-MM"`` key.

    The month string is validated at the API boundary (query-param regex), so this only parses.
    """
    year, month_number = int(month[:4]), int(month[5:7])
    start = date(year, month_number, 1)
    end = date(year + 1, 1, 1) if month_number == 12 else date(year, month_number + 1, 1)
    return start, end
