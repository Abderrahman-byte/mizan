# Mizan Backend — Conventions

The module structure, API conventions, and error-handling patterns for the Mizan backend.
Stack: **FastAPI · SQLAlchemy (async) · Alembic · PostgreSQL · Pydantic v2 · loguru**.

> **Scope note:** This document defines *how* we build — layering, envelopes, error handling,
> logging, DB hygiene. It deliberately does **not** define the database schema or the API
> endpoint surface; those are open decisions recorded in `decisions.md` once the user confirms
> them. The error-code catalogue and module list below are starters to be filled in per the
> user's decisions — do not treat the examples as final.

---

## 1. Module Structure

### Layering rule (the core idea)

Every feature is a **module** with four strictly-separated layers. Each layer may only call
the one below it. This is the single most important convention — everything else follows from it.

```
router  → routing, dependency injection, schema ⇄ ORM mapping. NO business logic, NO DB queries.
service → business logic. Calls repositories. NO direct DB session, NO route handling.
repository → DB queries only (async). NO business logic, NO HTTP calls.
models  → SQLAlchemy ORM classes only. NO business logic, NO HTTP.
```

Pure computational logic (formulas, decision functions) lives in a separate `engine.py` /
pure-function module with **no DB access and no side effects**, so it is trivially unit-testable.
DB writes happen in the service layer *after* calling the pure functions.

### Directory layout

```
app/
├── main.py                  # App init, router registration, lifespan, exception-handler wiring
├── api/
│   ├── router.py            # Mounts /api; includes sub-routers
│   ├── deps.py              # Shared dependencies: DB session, auth, pagination
│   └── v1/
│       ├── router.py        # Mounts /v1; includes per-resource routers
│       └── <resource>.py    # Route handlers for one resource
├── core/                    # Cross-cutting infrastructure (no feature logic)
│   ├── config.py            # Pydantic BaseSettings + module-level constants
│   ├── security.py          # Auth / token verification
│   ├── context.py           # Request-identity envelope + dependency
│   ├── permissions.py       # Role guards
│   ├── error_handlers.py    # Centralized exception handlers
│   ├── exceptions.py        # Base APIException + ExternalServiceError
│   ├── pagination.py        # PaginationParams, pagination meta builder
│   ├── responses.py         # SuccessResponse / ErrorResponse envelopes
│   └── logging.py           # loguru setup (structured JSON sink)
├── db/
│   ├── session.py           # Async engine + session factory + get_db dependency
│   └── base.py              # Declarative base + id/created_at/updated_at mixin
├── modules/
│   └── <feature>/
│       ├── models.py        # ORM classes
│       ├── schemas.py       # Pydantic request/response models
│       ├── repository.py    # DB queries
│       ├── service.py       # Business logic
│       ├── engine.py        # (optional) pure functions, no I/O
│       ├── enums.py         # Python enums for this module
│       └── exceptions.py    # Module-specific exceptions (subclass APIException)
└── alembic/                 # Migrations
```

### Per-file responsibility matrix

| File | Contains | Does NOT contain |
|---|---|---|
| `models.py` | SQLAlchemy ORM classes | Business logic, HTTP calls |
| `schemas.py` | Pydantic request/response models | ORM models, DB queries |
| `repository.py` | DB query functions (async) | Business logic, HTTP calls |
| `service.py` | Business logic (calls repository) | Direct DB session, route handling |
| `router.py` | Routes, DI, schema mapping | Business logic, DB queries |
| `enums.py` | Python `Enum` classes | Anything else |
| `exceptions.py` | Module-specific exceptions | Exception handlers |

### Config rules

- All environment variables centralized in `core/config.py` via Pydantic `BaseSettings`.
- Access through a **module-level instance** (`settings = Settings()`) — not `@lru_cache` +
  `get_settings()`.
- Constants that are *not* env-configurable (formulas, intervals, TTLs) are plain
  module-level constants, not `BaseSettings` fields. Never hardcode them elsewhere — no magic numbers.

---

## 2. API Conventions

### URL & versioning

- Versioned base path: `/api/v1/<resource>`. Don't bump the version without a real reason.
- Path param IDs are integers: `GET /matches/42`.
- Query params: `snake_case`. JSON body fields: `camelCase`.
- All timestamps in/out are ISO 8601 UTC strings (`"2026-06-11T15:00:00Z"`).

### Response envelope (always)

Success — single resource:
```json
{ "data": { ... } }
```

Success — list, with pagination:
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1, "pageSize": 20, "totalItems": 100,
    "totalPages": 5, "hasNext": true, "hasPrevious": false
  }
}
```

Error:
```json
{
  "error": {
    "code": "UPPER_SNAKE_CASE_CODE",
    "message": "Human-readable English description.",
    "details": null
  }
}
```

Rules:
- Never return raw exceptions or stack traces to the client.
- `error.code` is a **stable, machine-readable** string. Pick one casing convention and keep it
  (`UPPER_SNAKE_CASE` recommended) — clients switch on it.
- `error.message` is human-readable English.
- `error.details` is `null` by default; a list of field-level errors for validation failures.

### HTTP status codes

| Situation | Status |
|---|---|
| Successful GET | 200 |
| Successful POST (created) | 201 |
| Successful PATCH | 200 |
| Successful action, no body | 204 |
| Validation error | 400 |
| Auth token missing / invalid | 401 |
| Permission denied | 403 |
| Resource not found | 404 |
| Business rule violation | 409 |
| External dependency unavailable | 503 |

> Note: return **400** (not FastAPI's default 422) for request validation, for a consistent
> client contract.

### Pagination

- Query: `?page=1&page_size=20`. Default page 1 (1-indexed), default size 20, max size 100.
- A shared `PaginationParams` dependency exposes `.offset` and `.page_size` for repositories.
- A `build_pagination_meta(page, page_size, total_items)` helper builds the `pagination` block.

### Field naming

- JSON: `camelCase`. Python / DB columns / query params: `snake_case`.
- Pydantic v2 bridges them:
  ```python
  from pydantic import BaseModel, ConfigDict
  from pydantic.alias_generators import to_camel

  class MySchema(BaseModel):
      model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
  ```
- **Separate request and response schemas** — never reuse one model for both.
- Response schemas must never leak internal fields (raw join keys, internal status strings).

### Response shape rules

- Embed nested related objects directly; don't expose flat foreign-key IDs in responses.
- **N+1 rule:** any list endpoint must eager-load relationships (`joinedload`/`selectinload`)
  in the same query. Never issue per-row queries for related objects.

### Idempotency

- Design write endpoints to be safely retryable where it makes sense: upserts replace prior
  state; re-sync/re-process endpoints reset then recompute. Document which endpoints are idempotent.

### Headers

- Echo a correlation ID on every response: `X-Request-ID: <request_id>`.

---

## 3. Error Handling

### Principles

- **Never expose internal errors or stack traces to clients.**
- **Never propagate a third-party/external API's error message to clients.** Translate it.
- All errors return the standard error envelope.
- All errors are logged with structured fields + the request correlation ID.

### Response models — `core/responses.py`

```python
from typing import Generic, TypeVar
from pydantic import BaseModel

DataT = TypeVar("DataT")

class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None

class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] | dict | str | None = None

class ErrorResponse(BaseModel):
    error: ErrorBody

class SuccessResponse(BaseModel, Generic[DataT]):
    data: DataT
```

### Base exception — `core/exceptions.py`

```python
class APIException(Exception):
    status_code: int = 500
    code: str = "INTERNAL_SERVER_ERROR"
    message: str = "An unexpected error occurred."
    details: list | dict | str | None = None

    def __init__(self, message=None, details=None, code=None, status_code=None):
        self.message = message or self.message
        self.details = details if details is not None else self.details
        self.code = code or self.code
        self.status_code = status_code or self.status_code
        super().__init__(self.message)
```

Module-specific exceptions subclass it and set class-level defaults — this keeps raise sites
clean and error codes consistent:

```python
class ResourceNotFoundException(APIException):
    status_code = 404
    code = "RESOURCE_NOT_FOUND"
    message = "Resource not found."

# Raise with defaults or override the message:
raise ResourceNotFoundException()
raise ResourceNotFoundException(message=f"Resource {id} not found.")
```

Use a separate `ExternalServiceError` (e.g. 503) for failed third-party dependencies.

### Centralized handlers — `core/error_handlers.py`

Register a small, ordered set of handlers once at app startup. Order matters — most specific first.

1. **External service errors** (highest priority) → 503 with the exception's code/message.
2. **`APIException`** → `exc.status_code` with the standard envelope.
3. **Framework HTTP errors** (routing 404/405) → mapped into the envelope (`code="HTTP_ERROR"`).
4. **Request validation errors** → **400** `code="VALIDATION_ERROR"` with a `details` list, mapping
   each framework/Pydantic error type to a stable code (see map below).
5. **Catch-all `Exception`** → log full traceback with a short random `error_id`
   (`secrets.token_hex(4)`); return 500 with *only* that `error_id` in the message, so incidents
   are correlatable without leaking internals.

Validation error → stable code mapping:
```python
PYDANTIC_ERROR_CODE_MAP = {
    "missing":            "REQUIRED_FIELD",
    "string_too_short":   "STRING_TOO_SHORT",
    "string_too_long":    "STRING_TOO_LONG",
    "enum":               "INVALID_ENUM",
    "int_parsing":        "INVALID_INTEGER",
    "float_parsing":      "INVALID_FLOAT",
    "bool_parsing":       "INVALID_BOOLEAN",
    "datetime_parsing":   "INVALID_DATETIME",
    "date_parsing":       "INVALID_DATE",
    "greater_than":       "VALUE_TOO_SMALL",
    "greater_than_equal": "VALUE_TOO_SMALL",
    "less_than":          "VALUE_TOO_LARGE",
    "less_than_equal":    "VALUE_TOO_LARGE",
}
# Unknown types fall back to "INVALID_FIELD".
```

Validation error response example:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload.",
    "details": [
      { "field": "score", "code": "REQUIRED_FIELD", "message": "Field required" }
    ]
  }
}
```

### Error code catalogue

Maintain a per-project table of `UPPER_SNAKE_CASE` codes → HTTP status → meaning. Generic
starters:

| HTTP | Code | Situation |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Payload failed schema validation |
| 400 | `REQUIRED_FIELD` | Required field missing |
| 400 | `INVALID_ENUM` | Value not in allowed set |
| 401 | `AUTH_TOKEN_EXPIRED` | Token expired |
| 403 | `PERMISSION_DENIED` | Insufficient role |
| 404 | `RESOURCE_NOT_FOUND` | Entity not found |
| 409 | `<RULE>_VIOLATION` | Business rule blocked the action |
| 500 | `INTERNAL_SERVER_ERROR` | Unhandled exception |
| 503 | `<DEPENDENCY>_UNAVAILABLE` | External dependency unreachable |

### Translating external failures

```python
try:
    data = await some_client.fetch(...)
except SomeClientError as e:
    logger.bind(endpoint="...", error=str(e)).error("upstream call failed")
    raise APIException(
        status_code=503,
        code="UPSTREAM_UNAVAILABLE",
        message="External data source is currently unavailable.",
    )
```

---

## 4. Logging

- Use a structured logger (loguru here). Import one shared `logger`; never use ad-hoc stdlib
  `logging`.
- Emit **flat structured JSON**. Every entry carries `timestamp`, `level`, `service`, and
  `request_id`.
- Bind `request_id` per request in middleware (`logger.contextualize(request_id=...)`); add
  context with `logger.bind(key=value)`.
- **Never log** tokens, secrets, passwords, or PII beyond stable entity IDs.

---

## 5. Database

- Every entity has `id` (BigInteger auto-increment PK — not UUID), `created_at`, `updated_at`.
- `created_at`: `server_default=func.now()`. `updated_at`: `onupdate=func.now()`.
- All schema changes go through migrations (Alembic). Never alter tables manually. Always write
  `downgrade()`.
- Index every foreign-key column. Enforce uniqueness at the DB level, not just in the app.
- Use the ORM for queries; drop to raw SQL only where the ORM is genuinely impractical, and
  comment why.

---

## 6. Guardrails / philosophy

- **Don't over-engineer.** No queues, event buses, or speculative abstractions until actually needed.
- **Don't add dependencies** casually — stick to the chosen stack.
- Keep business logic in the backend, never in clients.
- When requirements are missing: ask focused questions, don't invent; mark blocked spots with
  `# TODO: confirm before implementing`; distinguish confirmed vs. assumed.

---

## Mizan-specific status

- The **module list** for Mizan is not finalized. Create a module only after the user confirms
  the feature and its schema/endpoints. Record confirmed modules in `decisions.md`.
- The **error-code catalogue** above is generic. Add Mizan's `<RULE>_VIOLATION` and
  `<DEPENDENCY>_UNAVAILABLE` codes to `decisions.md` as they are decided — don't invent business
  rules to justify codes.
- When a task needs a schema or endpoint that isn't in `decisions.md`: **ask the user**, then
  record the answer there before implementing.
