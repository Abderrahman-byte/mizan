import type { CSSProperties, ReactNode } from 'react';
import { Card } from './Card';
import { Icon, type IconName } from './icon';
import { cn } from '@/utils/cn';

export interface MetricProps {
  label: ReactNode;
  icon: IconName;
  value: ReactNode;
  /** Optional delta / sub-line under the value. */
  delta?: ReactNode;
  /** Tone of the delta text. `neutral` is muted ink-soft. */
  deltaTone?: 'up' | 'down' | 'neutral';
  /** Override the value color (e.g. green for income). */
  valueColor?: string;
  /** Override the icon-badge colors. */
  iconStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
}

/** A labelled metric card: icon badge + label, big value, optional delta line. */
export function Metric({
  label,
  icon,
  value,
  delta,
  deltaTone = 'neutral',
  valueColor,
  iconStyle,
  className,
  style,
}: MetricProps) {
  return (
    <Card className={cn('flex flex-col gap-2.5', className)} style={style}>
      <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-ink-soft">
        <span
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[10px] bg-accent-soft text-accent-ink"
          style={iconStyle}
        >
          <Icon name={icon} size={17} />
        </span>
        {label}
      </div>
      <div
        className="num whitespace-nowrap font-head text-[22px] font-bold leading-none tracking-[-0.5px] lg:text-[27px]"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {delta != null && (
        <div
          className={cn(
            'text-[12.5px] font-bold',
            deltaTone === 'up' && 'text-good',
            deltaTone === 'down' && 'text-warn',
            deltaTone === 'neutral' && 'text-ink-soft',
          )}
        >
          {delta}
        </div>
      )}
    </Card>
  );
}
