import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  /** compact = 32px, default = 40px (spec §5.1) */
  compact?: boolean;
};

export function Button({
  variant = 'primary',
  compact = false,
  className,
  type = 'button',
  ...rest
}: Props) {
  const cls = [styles.btn, styles[variant], compact ? styles.compact : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={cls} {...rest} />;
}
