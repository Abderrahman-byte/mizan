"""Application exception hierarchy.

Module-specific exceptions subclass ``APIException`` and set class-level defaults so
raise sites stay clean and error codes stay consistent.
"""

from __future__ import annotations


class APIException(Exception):
    status_code: int = 500
    code: str = "INTERNAL_SERVER_ERROR"
    message: str = "An unexpected error occurred."
    details: list | dict | str | None = None

    def __init__(
        self,
        message: str | None = None,
        details: list | dict | str | None = None,
        code: str | None = None,
        status_code: int | None = None,
    ) -> None:
        self.message = message or self.message
        self.details = details if details is not None else self.details
        self.code = code or self.code
        self.status_code = status_code or self.status_code
        super().__init__(self.message)
