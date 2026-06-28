/* The internal component library — shared, design-system-level primitives.
   Feature and app code should import UI primitives from here. */
export { Icon, ICON_NAMES } from './icon';
export type { IconName, IconProps } from './icon';

export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Card } from './Card';
export type { CardProps } from './Card';
export { Pill } from './Pill';
export type { PillProps } from './Pill';
export { Chip } from './Chip';
export type { ChipProps } from './Chip';
export { Avatar, initials } from './Avatar';
export type { AvatarProps } from './Avatar';
export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';
export { Metric } from './Metric';
export type { MetricProps } from './Metric';
export { EditableNumber } from './EditableNumber';
export type { EditableNumberProps } from './EditableNumber';
export { Modal, FieldLabel, TextField } from './Modal';
export type { ModalProps } from './Modal';
export { ModeSpectrum } from './ModeSpectrum';
export type { ModeSpectrumProps } from './ModeSpectrum';
export { MonthNav } from './MonthNav';
export type { MonthNavProps } from './MonthNav';
export { Eyebrow, CardHeading, Heading } from './Text';
