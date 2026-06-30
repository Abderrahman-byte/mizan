"""Auth feature module: identity + registration / login / refresh-session flow logic.

Holds the non-routing layers (models, schemas, repository, service, exceptions) for
authentication. The HTTP routes live in ``app/api/v1/auth.py`` (routers are never inside
module folders). This module owns both the ``User`` identity entity (the ``users`` table) and
the ``refresh_tokens`` session table.
"""
