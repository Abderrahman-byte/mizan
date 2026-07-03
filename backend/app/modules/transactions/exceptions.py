"""Transactions-ledger module exceptions.

Subclass ``APIException`` with class-level defaults so raise sites stay clean and error codes
stay stable (see ``docs/conventions.md`` §3). Catalogued in ``docs/transactions.md``.
"""

from app.core.exceptions import APIException


class CategoryNameTakenException(APIException):
    """Raised when a category name collides with an existing one for the same user (409)."""

    status_code = 409
    code = "CATEGORY_NAME_TAKEN"
    message = "A category with this name already exists."


class CategoryHasTransactionsException(APIException):
    """Raised when deleting a category that transactions still reference (409)."""

    status_code = 409
    code = "CATEGORY_HAS_TRANSACTIONS"
    message = "This category still has transactions; reassign or delete them first."


class CategoryDirectionMismatchException(APIException):
    """Raised when the category↔direction rule is violated (409).

    Expenses (``OUT``) must carry a category; income (``IN``) must not.
    """

    status_code = 409
    code = "CATEGORY_DIRECTION_MISMATCH"
    message = "Expense transactions require a category; income transactions must not have one."


class CategoryNotFoundException(APIException):
    """Raised when no category with the given id exists for this user (404)."""

    status_code = 404
    code = "CATEGORY_NOT_FOUND"
    message = "Category not found."


class TransactionNotFoundException(APIException):
    """Raised when no transaction with the given id exists for this user (404)."""

    status_code = 404
    code = "TRANSACTION_NOT_FOUND"
    message = "Transaction not found."
