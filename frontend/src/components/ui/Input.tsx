// login-styling-and-structure-Input.tsx
import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  containerClassName?: string;
};

export default function Input({ label, containerClassName = '', className = '', ...props }: Props) {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label ? (
        <label className="mb-2 block text-sm font-medium text-neutral-900">{label}</label>
      ) : null}
      <input
        className={[
          'h-12 w-full rounded-lg border border-neutral-200 bg-white px-4 text-sm text-neutral-900',
          'placeholder:text-neutral-400',
          'focus:border-neutral-300 focus:outline-none focus:ring-4 focus:ring-neutral-100',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  );
}
