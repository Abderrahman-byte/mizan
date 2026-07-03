"""Debt-ledger module exceptions.

Subclass ``APIException`` with class-level defaults so raise sites stay clean and error codes
stay stable (see ``docs/conventions.md`` §3). Catalogued in ``docs/debts.md``.
"""

from app.core.exceptions import APIException


class CounterpartyNameTakenException(APIException):
    """Raised when a counterparty name collides with an existing one for the same user (409)."""

    status_code = 409
    code = "COUNTERPARTY_NAME_TAKEN"
    message = "A counterparty with this name already exists."


class CounterpartyHasDebtsException(APIException):
    """Raised when deleting a counterparty that still has debts attached (409)."""

    status_code = 409
    code = "COUNTERPARTY_HAS_DEBTS"
    message = "This counterparty still has debts; resolve or delete them first."


class CounterpartyNotFoundException(APIException):
    """Raised when no counterparty with the given id exists for this user (404)."""

    status_code = 404
    code = "COUNTERPARTY_NOT_FOUND"
    message = "Counterparty not found."


class DebtNotFoundException(APIException):
    """Raised when no debt with the given id exists for this user (404)."""

    status_code = 404
    code = "DEBT_NOT_FOUND"
    message = "Debt not found."


class RepaymentNotFoundException(APIException):
    """Raised when no repayment with the given id exists under this debt (404)."""

    status_code = 404
    code = "REPAYMENT_NOT_FOUND"
    message = "Repayment not found."


class UnsupportedExportVersionException(APIException):
    """Raised when an imported ledger file declares a version this server can't read (400)."""

    status_code = 400
    code = "UNSUPPORTED_EXPORT_VERSION"
    message = "Unsupported export file version."
