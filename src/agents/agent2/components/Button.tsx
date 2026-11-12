import type { ButtonHTMLAttributes } from 'react';

/**
 * DESIGN_SPEC section 5.1. Primary: dark teal, hover teal. Secondary: transparent, hover grey, with a 1px border
 * because every button here sits on a white surface (the spec's open item about same-colour surfaces). Ghost is the
 * spec's borderless secondary, for compact row actions. Heights: 40px default, 32px compact.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
const styles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-neu-200 disabled:text-neu-500',
  secondary:
    'border border-line text-heading hover:bg-secondary-hover disabled:text-neu-400 disabled:hover:bg-transparent',
  ghost:
    'text-heading hover:bg-secondary-hover disabled:text-neu-400 disabled:hover:bg-transparent',
  danger:
    'bg-error text-white hover:brightness-90 disabled:bg-neu-200 disabled:text-neu-500 disabled:hover:brightness-100',
  'danger-ghost':
    'text-error hover:bg-error-faint disabled:text-neu-400 disabled:hover:bg-transparent',
};
const sizes = { md: 'h-10 px-4', sm: 'h-8 px-3' } as const;

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <button
      type={type}
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium transition-colors disabled:cursor-not-allowed ${sizes[size]} ${styles[variant]} ${className}`}
    />
  );
}
