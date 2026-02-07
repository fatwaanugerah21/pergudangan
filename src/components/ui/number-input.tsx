import * as React from 'react';
import { cn } from '../../lib/utils';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string | number;
  onChange?: (value: string) => void;
}

const formatNumber = (value: string | number | undefined): string => {
  if (value === '' || value === undefined || value === null) return '';
  const numStr = String(value).replace(/[^\d.]/g, '');
  if (numStr === '' || numStr === '.') return '';

  // Handle decimal numbers
  const parts = numStr.split('.');
  const integerPart = parts[0] || '';
  const decimalPart = parts[1] !== undefined ? '.' + parts[1] : '';

  // Format integer part with thousand separators
  if (integerPart === '') return decimalPart;
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return formattedInteger + decimalPart;
};

const parseNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, label, error, helperText, value, onChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState(
      value !== undefined && value !== '' ? formatNumber(value) : ''
    );
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (value !== undefined && value !== '') {
        setDisplayValue(formatNumber(value));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Remove all non-numeric characters except decimal point
      const cleaned = inputValue.replace(/[^\d.]/g, '');

      // Prevent multiple decimal points
      const parts = cleaned.split('.');
      const sanitized = parts.length > 2
        ? parts[0] + '.' + parts.slice(1).join('')
        : cleaned;

      // Format the number
      const formatted = formatNumber(sanitized);
      setDisplayValue(formatted);

      // Pass the unformatted value to onChange
      onChange?.(sanitized);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const cleaned = parseNumber(displayValue);
      if (cleaned) {
        setDisplayValue(formatNumber(cleaned));
      }
      props.onBlur?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm',
              'placeholder:text-slate-400',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/20 focus-visible:border-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
              'transition-all duration-200 ease-in-out',
              error
                ? 'border-red-300 text-red-900 placeholder-red-300 focus-visible:ring-red-500/20 focus-visible:border-red-500'
                : 'border-slate-300 text-slate-900 hover:border-slate-400',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            {...props}
          />
          {isFocused && !error && (
            <div className="absolute inset-0 rounded-lg ring-1 ring-primary-500/20 pointer-events-none animate-in fade-in duration-200" />
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 animate-in fade-in duration-200">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);
NumberInput.displayName = 'NumberInput';

export { NumberInput };
