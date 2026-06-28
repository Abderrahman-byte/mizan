/** Join class names, dropping falsy values. Keeps component markup readable
 *  without pulling in a dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
