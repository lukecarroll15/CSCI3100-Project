import { useEffect, useRef, useState } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectMenuProps = {
  value: string;
  placeholder: string;
  options: SelectOption[];
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
};

export default function SelectMenu({
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  className = '',
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selected = options.find((option) => option.value === value) ?? null;
  const buttonLabel = selected?.label ?? placeholder;

  return (
    <div ref={menuRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-disabled={disabled}
      >
        <span className={selected ? 'text-neutral-700' : 'text-neutral-400'}>{buttonLabel}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-neutral-400" aria-hidden="true">
          <path
            d="M7 10l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && !disabled ? (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-hidden overflow-y-auto rounded-xl border border-neutral-200 bg-white text-xs shadow-lg"
        >
          {options.map((option) => {
            const isSelected = value === option.value;
            const isDisabled = option.disabled;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (isDisabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-neutral-900 text-white'
                    : isDisabled
                      ? 'cursor-not-allowed text-neutral-300'
                      : 'cursor-pointer text-neutral-700 hover:bg-neutral-50'
                }`}
                disabled={isDisabled}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
