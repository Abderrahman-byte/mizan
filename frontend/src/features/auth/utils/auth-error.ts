/* Map a rejected auth API call (the normalized `{ code, message }` from api-client)
   to a friendly, user-facing message for the sign-in / sign-up forms. */

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  EMAIL_TAKEN: 'An account with this email already exists.',
  VALIDATION_ERROR: 'Please check your details and try again.',
};

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  if (code && MESSAGES[code]) {
    return MESSAGES[code];
  }
  const message = (err as { message?: string } | null)?.message;
  return message || 'Something went wrong. Please try again.';
}
