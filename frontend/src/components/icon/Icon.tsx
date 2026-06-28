import type { CSSProperties } from 'react';
import { iconSvg, type IconName } from './icons';

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a stroke icon from the Bloom icon set. Color follows `currentColor`,
 * so set text color on a parent (or via className) to tint it.
 */
export function Icon({ name, size = 20, className, style }: IconProps) {
  return (
    <span
      className={'inline-flex items-center justify-center [&>svg]:block [&>svg]:h-full [&>svg]:w-full' + (className ? ' ' + className : '')}
      style={{ width: size, height: size, ...style }}
      // SVG markup is from our own static, typed registry — never user input.
      dangerouslySetInnerHTML={{ __html: iconSvg(name) }}
    />
  );
}
