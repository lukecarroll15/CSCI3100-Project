import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck } from './Icons';
import type { SelectOption } from './SelectMenu';

type MultiSelectMenuProps = {
  values: string[];
  placeholder: string;
  options: SelectOption[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
};

function buildLabel(values: string[], options: SelectOption[], placeholder: string) {
  if (values.length === 0) return placeholder;
  const optionMap = new Map(options.map((option) => [option.value, option.label]));
  const labels = values.map((value) => optionMap.get(value) ?? value).filter(Boolean);
  if (labels.length === 0) return placeholder;
  if (labels.length <= 2) return labels.join(', ');
  return `${labels[0]} +${labels.length - 1} more`;
}

export default function MultiSelectMenu({
  values,
  placeholder,
  options,
  onChange,
  disabled = false,
  className = '',
}: MultiSelectMenuProps) {
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

  const selectedSet = useMemo(() => new Set(values), [values]);
  const label = buildLabel(values, options, placeholder);

  const toggleValue = (value: string) => {
    if (disabled) return;
    const next = selectedSet.has(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
    const order = new Map(options.map((option, index) => [option.value, index]));
    next.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    onChange(next);
  };

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
        <span className={values.length > 0 ? 'text-neutral-700' : 'text-neutral-400'}>{label}</span>
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
            const isSelected = selectedSet.has(option.value);
            const isOptionDisabled = option.disabled;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (isOptionDisabled) return;
                  toggleValue(option.value);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                  isOptionDisabled
                    ? 'cursor-not-allowed text-neutral-300'
                    : 'cursor-pointer text-neutral-700 hover:bg-neutral-50'
                }`}
                aria-pressed={isSelected}
                disabled={isOptionDisabled}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 text-transparent'
                  }`}
                >
                  {isSelected ? <IconCheck className="h-3 w-3" /> : null}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
