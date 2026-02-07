import * as React from 'react';
import { cn } from '../../lib/utils';
import { FaChevronDown, FaPlus } from 'react-icons/fa';

interface CreatableSelectOption {
  value: string;
  label: string;
}

export interface CreatableSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: CreatableSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  onCreateOption?: (value: string) => Promise<string>; // Returns the new option's ID
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CreatableSelect: React.FC<CreatableSelectProps> = ({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  onCreateOption,
  placeholder = 'Pilih atau ketik untuk membuat baru',
  required,
  className,
  disabled,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchValue('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchValue('');
  };

  const handleCreate = async () => {
    if (!searchValue.trim() || !onCreateOption) return;

    setIsCreating(true);
    try {
      const newId = await onCreateOption(searchValue.trim());
      onChange?.(newId);
      setIsOpen(false);
      setSearchValue('');
    } catch (error) {
      console.error('Error creating option:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const showCreateOption =
    searchValue.trim() &&
    !filteredOptions.some((opt) => opt.label.toLowerCase() === searchValue.toLowerCase().trim());

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
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <FaChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
        {isFocused && !error && (
          <div className="absolute inset-0 rounded-lg ring-1 ring-primary-500/20 pointer-events-none animate-in fade-in duration-200" />
        )}

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-auto">
            <div className="p-2">
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Cari atau ketik untuk membuat baru..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 mb-2"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-auto pb-4">
              {filteredOptions.length > 0 && (
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
              )}
              {showCreateOption && onCreateOption && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-200',
                    'hover:bg-primary-50 focus:outline-none focus:bg-primary-50',
                    'flex items-center gap-2 text-primary-600 font-medium',
                    isCreating && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <FaPlus className="h-4 w-4" />
                  {isCreating ? 'Membuat...' : `Buat "${searchValue.trim()}"`}
                </button>
              )}
              {filteredOptions.length === 0 && !showCreateOption && (
                <div className="px-3 py-2 text-sm text-slate-500 text-center">
                  Tidak ada hasil ditemukan
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 animate-in fade-in duration-200">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
};
