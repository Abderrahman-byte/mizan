import type { ModeIndex } from '@/types';

/** Number of spending modes (tiers). */
export const MODE_COUNT = 5;

/** The five spending-mode labels, leanest → most indulgent (settled "Bloom" set). */
export const MODE_LABELS = ['Bare', 'Basics', 'Comfort', 'Treat', 'Feast'] as const;

export type ModeLabel = (typeof MODE_LABELS)[number];

/** All mode indices, handy for mapping. */
export const MODE_INDICES: ModeIndex[] = [0, 1, 2, 3, 4];

/**
 * CSS color for a mode index, e.g. `modeColor(2)` → `var(--m2)`.
 * The underlying `--m0…--m4` custom properties are defined in styles/theme.css.
 */
export function modeColor(idx: number): string {
  return `var(--m${Math.max(0, Math.min(MODE_COUNT - 1, idx))})`;
}
