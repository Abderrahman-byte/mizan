# Mizan Frontend — Design System (Bloom)

The settled visual direction, imported from the **"Mizan — Bloom Prototype"** Claude Design
project and rebuilt as the internal component library. The prototype's design-exploration
"tweaks panel" (accent / label-set / badge-style switchers, phone frame) was **dropped**; this
is the settled default state.

## Tokens (`src/styles/theme.css`)

Semantic values are CSS custom properties on `:root` (light) with a `.dark` override block, so
dark mode is a single class flip on `<html>`. They are surfaced to Tailwind utilities through
`@theme`, and consumed either as utilities (`bg-surface`, `text-ink-soft`, `border-line`,
`text-accent-ink`, `font-head`) or directly via `var(--…)` where `color-mix`/`oklch` is needed.

- **Surfaces:** `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--line`.
- **Ink:** `--ink`, `--ink-soft`, `--ink-faint`.
- **Accent:** `--accent` (purple `#7b61d6` light / `#9d83f0` dark) plus derived
  `--accent-ink`, `--accent-soft`, `--accent-tint` (recompute against the active accent).
- **Status:** `--good` (green), `--warn` (orange), `--cool` (blue).
- **Mode colors:** `--m0…--m4` (oklch), one per spending tier — use `modeColor(idx)` from
  `src/config/modes.ts` which returns `var(--mN)`. Also exposed as Tailwind `--color-mode-N`.
- **Shape/elevation:** `--radius-sm|--radius|--radius-lg`, `--shadow`/`--shadow-sm`
  (used as `rounded-[var(--radius-lg)]`, `shadow-[var(--shadow-sm)]`).
- **Fonts:** `--font-head` (Quicksand, display) and `--font-body` (Nunito, default), loaded from
  Google Fonts.

## Spending modes

Five tiers, leanest → most indulgent, defined once in `src/config/modes.ts`:
**Bare · Basics · Comfort · Treat · Feast** (`MODE_LABELS`). `ModeSpectrum` renders the settled
**growth** badge style (sprout → bloom glyphs; the abundance variant was dropped).

## Internal component library (`src/components`)

Generic, presentational primitives — feature/app code imports UI from here:

`Icon` (typed SVG registry, `IconName`) · `Button` (solid/ghost) · `Card` · `Pill` · `Chip` ·
`Avatar` (+ `initials`) · `ProgressBar` · `Metric` · `EditableNumber` (click-to-edit number) ·
`Modal` (+ `FieldLabel`, `TextField`; centered dialog ↔ mobile bottom sheet) · `ModeSpectrum` ·
`MonthNav` · `Eyebrow` / `CardHeading` / `Heading` text helpers.

## Dark mode

`src/app/providers/theme-provider.tsx` toggles the `dark` class on `<html>`, persists the choice
to `localStorage` (`mizan-theme`), and defaults to the OS `prefers-color-scheme`. The top-bar
`ThemeToggle` (sun/moon) flips it.

## Responsive

Real Tailwind breakpoints replace the prototype's JS width measurement and phone frame. The
`lg:` breakpoint is the desktop/mobile switch: the left **Sidebar** shows at `lg`, the bottom
**TabBar** shows below it. Mobile-specific layouts: Budget Modes switches from the side-by-side
grid to a one-mode-at-a-time editor; People switches from list+detail to a list with drill-in.
The People list header has a **Search** toggle that swaps in an inline search field, filtering
the list client-side by name or note (Escape or the close button exits), plus a **balance
filter** row (All / Owed to you / You owe, each with a count) that narrows the list by sign of
balance. Search and balance filter combine. The list is **paginated** at 8 people per page with a
Prev / "Page N of M" / Next bar (hidden when it fits on one page); changing the search or filter
resets to page 1.
All money is in Dirham, formatted via `formatDH` in `src/utils/format.ts`.
