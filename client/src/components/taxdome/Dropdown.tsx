import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaxDomeDropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface TaxDomeDropdownProps {
  options: TaxDomeDropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const TaxDomeDropdown: React.FC<TaxDomeDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  error,
  disabled,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-2 text-left border rounded-lg',
            'flex items-center justify-between',
            'text-gray-900 bg-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'transition-colors duration-150',
            error
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            className
          )}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-150',
              isOpen && 'transform rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (!option.disabled) {
                    onChange?.(option.value);
                    setIsOpen(false);
                  }
                }}
                disabled={option.disabled}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm',
                  'hover:bg-gray-50 transition-colors',
                  value === option.value && 'bg-blue-50 text-blue-700',
                  option.disabled && 'opacity-50 cursor-not-allowed',
                  'first:rounded-t-lg last:rounded-b-lg'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

