// login-styling-and-structure-Button.tsx
import React from 'react';

const variants = {
  primary:
    'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-800 focus-visible:ring-neutral-200',
  secondary:
    'border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:ring-neutral-100',
  outline:
    'border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:ring-neutral-100',
} as const;

const sizes = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-12 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: Props) {
  return (
    <button
      className={[
        'inline-flex cursor-pointer items-center justify-center rounded-lg border font-medium',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-4',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
