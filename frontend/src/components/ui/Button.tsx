import React from 'react';

const variants = {
  primary: 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700',
  secondary: 'bg-white text-gray-800 border-gray-800 hover:bg-gray-100',
  outline: 'bg-white text-gray-600 border-gray-500 hover:bg-gray-100',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
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
      className={`cursor-pointer rounded-lg border-2 font-bold transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
