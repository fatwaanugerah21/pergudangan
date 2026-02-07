import * as React from 'react';
import { cn } from '../../lib/utils';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string;
  onChange?: (date: string) => void;
  /** Max selectable date (YYYY-MM-DD or Date); e.g. use today for "End Date" filters */
  maxDate?: string | Date;
  /** Min selectable date (YYYY-MM-DD or Date) */
  minDate?: string | Date;
}

function toDateOnly(d: string | Date): Date {
  const date = typeof d === 'string' ? new Date(d + 'T12:00:00') : new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, helperText, value, onChange, maxDate, minDate, ...props }, ref) => {
    const max = maxDate ? toDateOnly(maxDate) : null;
    const min = minDate ? toDateOnly(minDate) : null;
    const [isFocused, setIsFocused] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | null>(
      value ? new Date(value) : null
    );
    const [currentMonth, setCurrentMonth] = React.useState(
      selectedDate || new Date()
    );
    const inputRef = React.useRef<HTMLInputElement>(null);
    const calendarRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (value) {
        const date = new Date(value);
        setSelectedDate(date);
        setCurrentMonth(date);
      }
    }, [value]);

    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatDisplayDate = (date: Date | null): string => {
      if (!date) return '';
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      const formatted = formatDate(date);
      onChange?.(formatted);
      setIsOpen(false);
      inputRef.current?.blur();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let dateValue = e.target.value;
      if (dateValue) {
        const date = toDateOnly(new Date(dateValue + 'T12:00:00'));
        if (max !== null && date > max) {
          dateValue = formatDate(max);
          setSelectedDate(max);
          setCurrentMonth(max);
        } else if (min !== null && date < min) {
          dateValue = formatDate(min);
          setSelectedDate(min);
          setCurrentMonth(min);
        } else {
          setSelectedDate(date);
          setCurrentMonth(date);
        }
      }
      onChange?.(dateValue);
    };

    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const days: (Date | null)[] = [];
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
      }
      return days;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
      setCurrentMonth((prev) => {
        const newDate = new Date(prev);
        if (direction === 'prev') {
          newDate.setMonth(prev.getMonth() - 1);
        } else {
          newDate.setMonth(prev.getMonth() + 1);
        }
        return newDate;
      });
    };

    const isToday = (date: Date) => {
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    const isSelected = (date: Date) => {
      if (!selectedDate) return false;
      return (
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()
      );
    };

    const isDisabled = (date: Date) => {
      const d = toDateOnly(date);
      if (max && d > max) return true;
      if (min && d < min) return true;
      return false;
    };

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          calendarRef.current &&
          !calendarRef.current.contains(event.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(event.target as Node)
        ) {
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

    const days = getDaysInMonth(currentMonth);
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return (
      <div className="w-full relative">
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
            readOnly
            value={selectedDate ? formatDisplayDate(selectedDate) : ''}
            onClick={() => {
              setIsOpen(true);
              setIsFocused(true);
              inputRef.current?.blur();
            }}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm cursor-pointer',
              'placeholder:text-slate-400',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/20 focus-visible:border-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
              'transition-all duration-200 ease-in-out',
              error
                ? 'border-red-300 text-red-900 focus-visible:ring-red-500/20 focus-visible:border-red-500'
                : 'border-slate-300 text-slate-900 hover:border-slate-400',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              setIsOpen(true);
              e.target.blur();
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            placeholder={props.placeholder || 'Pilih tanggal'}
            {...(props as any)}
          />
          <input
            type="date"
            value={value || formatDate(selectedDate)}
            onChange={handleInputChange}
            max={max ? formatDate(max) : undefined}
            min={min ? formatDate(min) : undefined}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors duration-200',
              'hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500/20',
              error ? 'text-red-400' : 'text-slate-400'
            )}
          >
            <FaCalendarAlt className="h-4 w-4" />
          </button>
          {isFocused && !error && (
            <div className="absolute inset-0 rounded-lg ring-1 ring-primary-500/20 pointer-events-none animate-in fade-in duration-200" />
          )}
        </div>

        {isOpen && (
          <div
            ref={calendarRef}
            className="absolute z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ top: '100%', left: 0 }}
          >
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigateMonth('prev')}
                  className="p-1.5 rounded-md hover:bg-slate-100 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                >
                  <FaChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                <div className="flex items-center gap-2">
                  <select
                    value={currentMonth.getMonth()}
                    onChange={(e) => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(parseInt(e.target.value));
                      setCurrentMonth(newDate);
                    }}
                    className="px-2 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-900 bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 transition-colors duration-200"
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={currentMonth.getFullYear()}
                    onChange={(e) => {
                      const newDate = new Date(currentMonth);
                      newDate.setFullYear(parseInt(e.target.value));
                      setCurrentMonth(newDate);
                    }}
                    className="px-2 py-1 rounded-md border border-slate-300 text-sm font-medium text-slate-900 bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 transition-colors duration-200"
                  >
                    {Array.from({ length: 50 }, (_, i) => {
                      const year = new Date().getFullYear() - 10 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => navigateMonth('next')}
                  disabled={max !== null && (() => {
                    const next = new Date(currentMonth);
                    next.setMonth(next.getMonth() + 1);
                    return toDateOnly(next) > max;
                  })()}
                  className="p-1.5 rounded-md hover:bg-slate-100 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary-500/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <FaChevronRight className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-xs font-medium text-slate-500 text-center py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-9" />;
                }

                const disabled = isDisabled(date);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && handleDateSelect(date)}
                    className={cn(
                      'h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200',
                      'hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500/20',
                      'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                      isToday(date) && !disabled && 'bg-primary-50 text-primary-700 font-semibold',
                      isSelected(date) &&
                      'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
                      !isSelected(date) && !isToday(date) && !disabled && 'text-slate-700 hover:text-slate-900',
                      disabled && 'text-slate-400'
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end gap-2">
              {(() => {
                const today = new Date();
                const todayDisabled = isDisabled(today);
                return (
                  <button
                    type="button"
                    disabled={todayDisabled}
                    onClick={() => !todayDisabled && handleDateSelect(today)}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hari Ini
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 transition-colors duration-200"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

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
DatePicker.displayName = 'DatePicker';

export { DatePicker };
