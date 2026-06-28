import { cn } from '@/utils/cn';
import { modeColor } from '@/config/modes';

/** Growth-themed glyphs (sprout → bloom) for each of the five modes. */
const GROWTH_GLYPHS = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="3.2"/><path d="M12 11V9"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-8"/><path d="M12 13c0-3 2-4.5 5-4.5 0 3-2 4.5-5 4.5Z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9"/><path d="M12 14c0-2.6 1.8-4 4.5-4 0 2.6-1.8 4-4.5 4Z"/><path d="M12 16.5c0-2.6-1.8-4-4.5-4 0 2.6 1.8 4 4.5 4Z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-6"/><circle cx="12" cy="9" r="2.3"/><path d="M12 9c0-2.5-1.4-4-3.4-4-.4 2.2.8 3.6 3.4 4Z"/><path d="M12 9c0-2.5 1.4-4 3.4-4 .4 2.2-.8 3.6-3.4 4Z"/><path d="M12 9c-2 1.3-2.6 3-2 5 1.8-.4 2.6-2 2-5Z"/><path d="M12 9c2 1.3 2.6 3 2 5-1.8-.4-2.6-2-2-5Z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="2.6"/><path d="M12 10c0-3-1.7-4.8-4.2-4.6-.4 2.7 1 4.4 4.2 4.6Z"/><path d="M12 10c0-3 1.7-4.8 4.2-4.6.4 2.7-1 4.4-4.2 4.6Z"/><path d="M12 10c-2.6 1.4-3.4 3.6-2.6 6.2 2.4-.4 3.4-2.6 2.6-6.2Z"/><path d="M12 10c2.6 1.4 3.4 3.6 2.6 6.2-2.4-.4-3.4-2.6-2.6-6.2Z"/><path d="M12 21v-3"/></svg>',
];

const DISC_SIZE = { sm: 30, md: 46, lg: 60 } as const;
const GLYPH_SIZE = { sm: 17, md: 26, lg: 32 } as const;

export interface ModeSpectrumProps {
  /** The active mode index, 0–4. */
  idx: number;
  /** The five mode labels. */
  labels: readonly string[];
  size?: 'sm' | 'md' | 'lg';
  /** If provided, each disc becomes a button calling this with its index. */
  onSelect?: (idx: number) => void;
}

/**
 * The growth-badge spectrum: five plant glyphs from sprout to bloom, with the
 * active mode enlarged and color-filled. The settled "growth" badge style
 * (the prototype's abundance variant was dropped with the tweaks panel).
 */
export function ModeSpectrum({ idx, labels, size = 'md', onSelect }: ModeSpectrumProps) {
  const disc = DISC_SIZE[size];
  const glyph = GLYPH_SIZE[size];
  return (
    <div className={cn('flex items-end', size === 'sm' ? 'gap-1.5' : 'gap-2.5')}>
      {labels.map((label, i) => {
        const on = i === idx;
        const StepTag = onSelect ? 'button' : 'div';
        return (
          <StepTag
            key={i}
            type={onSelect ? 'button' : undefined}
            onClick={onSelect ? () => onSelect(i) : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-2 border-0 bg-transparent p-0',
              onSelect && 'cursor-pointer',
            )}
          >
            <span
              className="flex items-center justify-center rounded-full transition [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
              style={{
                width: disc,
                height: disc,
                background: on ? modeColor(i) : 'var(--surface-2)',
                color: on ? '#fff' : 'var(--ink-faint)',
                transform: on ? 'scale(1.16)' : undefined,
                boxShadow: on
                  ? `0 6px 16px -2px ${modeColor(i)}, 0 0 0 5px color-mix(in oklch, ${modeColor(i)} 28%, transparent)`
                  : undefined,
                padding: Math.round((disc - glyph) / 2),
              }}
              dangerouslySetInnerHTML={{ __html: GROWTH_GLYPHS[i] }}
            />
            {size !== 'sm' && (
              <span
                className={cn(
                  'font-extrabold',
                  size === 'lg' ? 'text-[13.5px]' : 'text-xs',
                  on ? 'text-ink' : 'text-ink-faint',
                )}
              >
                {label}
              </span>
            )}
          </StepTag>
        );
      })}
    </div>
  );
}
