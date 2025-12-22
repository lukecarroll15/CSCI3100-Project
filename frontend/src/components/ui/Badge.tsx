import React from 'react';

const variants = {
  high: 'border-red-600 bg-red-100 text-red-600',
  medium: 'border-orange-500 bg-orange-100 text-orange-500',
  low: 'border-green-600 bg-green-100 text-green-600',
  admin: 'border-green-600 bg-green-100 text-green-600',
  default: 'border-gray-500 bg-gray-100 text-gray-600',
} as const;

type Variant = keyof typeof variants;

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
};

export default function Badge({ children, variant = 'default', className = '', ...props }: Props) {
  return (
    <span
      className={`inline-block rounded-md border-2 px-3 py-1 text-xs font-bold ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
