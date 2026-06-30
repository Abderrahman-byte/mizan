/* Presentation helpers for an AuthUser's display name (the backend stores a single
   `displayName`; the UI sometimes wants just a first name). Initials come from the
   shared `initials()` primitive in components/Avatar. */
import type { AuthUser } from '../types/auth';

/** First word of the display name (e.g. "Ali Z." → "Ali"). */
export function firstNameOf(user: AuthUser): string {
  return user.displayName.trim().split(/\s+/)[0] ?? user.displayName;
}
