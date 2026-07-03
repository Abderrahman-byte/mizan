"""Debts feature module: counterparties + debt/loan ledger with repayments.

Holds the non-routing layers (enums, models, schemas, repository, service, engine, exceptions)
for the debt/loan ledger. HTTP routes live in ``app/api/v1/counterparties.py`` and
``app/api/v1/debts.py`` (routers are never inside module folders). Design is recorded in
``docs/debts.md``.

This module owns three tables: ``counterparties`` (reusable per-user contacts), ``debts``
(discrete loans, each with a direction + principal), and ``repayments`` (partial repayments of a
debt). A debt's ``outstanding`` and ``status`` are **derived**, never stored (see ``engine.py``).
"""
