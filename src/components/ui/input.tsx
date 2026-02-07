import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

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
            type={type}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm',
              'placeholder:text-slate-400',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/20 focus-visible:border-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
              'transition-all duration-200 ease-in-out',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              error
                ? 'border-red-300 text-red-900 focus-visible:ring-red-500/20 focus-visible:border-red-500'
                : 'border-slate-300 text-slate-900 hover:border-slate-400',
              className
            )}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
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
Input.displayName = 'Input';

export { Input };
