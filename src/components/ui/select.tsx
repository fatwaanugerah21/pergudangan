import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { FaChevronDown } from 'react-icons/fa';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  /** When true, dropdown is rendered in a portal so it can overflow (e.g. inside scrollable tables) */
  dropdownInPortal?: boolean;
}

const Select = React.forwardRef<HTMLInputElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder,
      value,
      onChange,
      disabled,
      required,
      dropdownInPortal = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState('');
    const [dropdownStyle, setDropdownStyle] = React.useState<{ top: number; left: number; minWidth: number } | null>(null);
    const selectRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (selectRef.current?.contains(target)) return;
        if (dropdownInPortal && dropdownRef.current?.contains(target)) return;
        setIsOpen(false);
        setSearchValue('');
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        if (dropdownInPortal && selectRef.current) {
          const rect = selectRef.current.getBoundingClientRect();
          setDropdownStyle({
            top: rect.bottom + 8,
            left: rect.left,
            minWidth: rect.width,
          });
        }
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      } else {
        setDropdownStyle(null);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen, dropdownInPortal]);

    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    );

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchValue('');
    };

    const dropdownContent = isOpen ? (
      <div
        ref={dropdownRef}
        className={cn(
          'z-[100] rounded-xl border border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-auto',
          dropdownInPortal ? 'fixed' : 'absolute mt-2 w-full'
        )}
        style={dropdownInPortal && dropdownStyle ? dropdownStyle : undefined}
      >
        <div className="p-2">
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Cari..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 mb-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
                setSearchValue('');
              } else if (e.key === 'Enter' && filteredOptions.length === 1) {
                e.preventDefault();
                handleSelect(filteredOptions[0].value);
              }
            }}
          />
        </div>
        <div className="max-h-48 overflow-auto pb-2">
          {filteredOptions.length > 0 ? (
            <div className="p-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-200',
                    'hover:bg-slate-100 focus:outline-none focus:bg-slate-100',
                    value === option.value && 'bg-primary-50 text-primary-700 font-medium'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500 text-center">
              Tidak ada hasil ditemukan
            </div>
          )}
        </div>
      </div>
    ) : null;

    return (
      <div className="w-full relative">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div ref={selectRef} className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm',
              'placeholder:text-slate-400',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/20 focus-visible:border-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
              'transition-all duration-200 ease-in-out',
              error
                ? 'border-red-300 text-red-900 focus-visible:ring-red-500/20 focus-visible:border-red-500'
                : 'border-slate-300 text-slate-900 hover:border-slate-400',
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
              {selectedOption ? selectedOption.label : placeholder || 'Pilih...'}
            </span>
            <FaChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                error ? 'text-red-400' : 'text-slate-400',
                isOpen && 'rotate-180'
              )}
            />
          </button>
          {isFocused && !error && (
            <div className="absolute inset-0 rounded-lg ring-1 ring-primary-500/20 pointer-events-none animate-in fade-in duration-200" />
          )}

          {dropdownInPortal ? createPortal(dropdownContent, document.body) : dropdownContent}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 animate-in fade-in duration-200">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
