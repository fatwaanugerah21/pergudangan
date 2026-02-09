import * as React from 'react';
import { cn } from '../../lib/utils';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaClock } from 'react-icons/fa';

export interface DateTimePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string; // ISO datetime string: YYYY-MM-DDTHH:mm
  onChange?: (datetime: string) => void;
  /** Max selectable date (no dates after this can be chosen) */
  maxDate?: string | Date;
  /** Min selectable date (no dates before this can be chosen) */
  minDate?: string | Date;
  /** Max selectable date and time (e.g. new Date() to disallow future). When set, time on the max day is capped to this time. */
  maxDateTime?: string | Date;
}

function toStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

const DateTimePicker = React.forwardRef<HTMLInputElement, DateTimePickerProps>(
  ({ className, label, error, helperText, value, onChange, maxDate, minDate, maxDateTime, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | null>(
      value ? new Date(value) : null
    );
    const [currentMonth, setCurrentMonth] = React.useState(
      selectedDate || new Date()
    );
    const [timeValue, setTimeValue] = React.useState({
      hours: selectedDate ? String(selectedDate.getHours()).padStart(2, '0') : '00',
      minutes: selectedDate ? String(selectedDate.getMinutes()).padStart(2, '0') : '00',
    });
    const inputRef = React.useRef<HTMLInputElement>(null);
    const calendarRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const maxDt = React.useMemo(() => {
      if (!maxDateTime) return null;
      const d = typeof maxDateTime === 'string' ? new Date(maxDateTime) : maxDateTime;
      return !isNaN(d.getTime()) ? d : null;
    }, [maxDateTime]);

    React.useEffect(() => {
      if (value && value.trim()) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          let useDate = date;
          let hours = date.getHours();
          let minutes = date.getMinutes();
          if (maxDt && date.getTime() > maxDt.getTime()) {
            useDate = new Date(maxDt.getFullYear(), maxDt.getMonth(), maxDt.getDate());
            hours = maxDt.getHours();
            minutes = maxDt.getMinutes();
            const h = String(hours).padStart(2, '0');
            const m = String(minutes).padStart(2, '0');
            const clamped = `${useDate.getFullYear()}-${String(useDate.getMonth() + 1).padStart(2, '0')}-${String(useDate.getDate()).padStart(2, '0')}T${h}:${m}`;
            onChange?.(clamped);
          }
          setSelectedDate(useDate);
          setCurrentMonth(useDate);
          setTimeValue({
            hours: String(hours).padStart(2, '0'),
            minutes: String(minutes).padStart(2, '0'),
          });
        }
      } else {
        setSelectedDate(null);
        setTimeValue({ hours: '00', minutes: '00' });
      }
    }, [value]);

    const formatDateTime = (date: Date | null, hours: string, minutes: string): string => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const formatDisplayDateTime = (date: Date | null, hours: string, minutes: string): string => {
      if (!date) return '';
      const dateStr = date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return `${dateStr}, ${hours}:${minutes}`;
    };

    const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      let hours = timeValue.hours;
      let minutes = timeValue.minutes;
      if (maxDt && isSameCalendarDay(date, maxDt)) {
        const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0);
        if (candidate.getTime() > maxDt.getTime()) {
          hours = String(maxDt.getHours()).padStart(2, '0');
          minutes = String(maxDt.getMinutes()).padStart(2, '0');
          setTimeValue({ hours, minutes });
        }
      }
      const formatted = formatDateTime(date, hours, minutes);
      onChange?.(formatted);
    };

    const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
      const numValue = parseInt(value) || 0;
      let newValue = value;

      const maxH = maxDt && selectedDate && isSameCalendarDay(selectedDate, maxDt) ? maxDt.getHours() : 23;
      const maxM = maxDt && selectedDate && isSameCalendarDay(selectedDate, maxDt) && parseInt(timeValue.hours, 10) === maxDt.getHours() ? maxDt.getMinutes() : 59;
      if (type === 'hours') {
        if (numValue < 0) newValue = '00';
        else if (numValue > maxH) newValue = String(maxH).padStart(2, '0');
        else newValue = String(numValue).padStart(2, '0');
      } else {
        if (numValue < 0) newValue = '00';
        else if (numValue > maxM) newValue = String(maxM).padStart(2, '0');
        else newValue = String(numValue).padStart(2, '0');
      }

      const newTimeValue = { ...timeValue, [type]: newValue };
      let hours = newTimeValue.hours;
      let minutes = newTimeValue.minutes;
      if (selectedDate && maxDt && isSameCalendarDay(selectedDate, maxDt)) {
        const candidate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0);
        if (candidate.getTime() > maxDt.getTime()) {
          hours = String(maxDt.getHours()).padStart(2, '0');
          minutes = String(maxDt.getMinutes()).padStart(2, '0');
          newTimeValue.hours = hours;
          newTimeValue.minutes = minutes;
        }
      }
      setTimeValue(newTimeValue);

      if (selectedDate) {
        const formatted = formatDateTime(selectedDate, newTimeValue.hours, newTimeValue.minutes);
        onChange?.(formatted);
      }
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

    const maxFromDate = maxDate ? (typeof maxDate === 'string' ? new Date(maxDate + 'T23:59:59') : maxDate) : null;
    const max = maxDt ? toStartOfDay(maxDt) : maxFromDate;
    const min = minDate ? (typeof minDate === 'string' ? new Date(minDate + 'T00:00:00') : minDate) : null;
    const isDateDisabled = (date: Date) => {
      const dayStart = toStartOfDay(date).getTime();
      if (max && dayStart > toStartOfDay(max).getTime()) return true;
      if (min && dayStart < toStartOfDay(min).getTime()) return true;
      return false;
    };
    const isSameDayAsMax = maxDt && selectedDate ? isSameCalendarDay(selectedDate, maxDt) : false;
    const maxHour = isSameDayAsMax && maxDt ? maxDt.getHours() : 23;
    const maxMinute = isSameDayAsMax && maxDt && parseInt(timeValue.hours, 10) === maxDt.getHours() ? maxDt.getMinutes() : 59;

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
            value={selectedDate ? formatDisplayDateTime(selectedDate, timeValue.hours, timeValue.minutes) : ''}
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
            placeholder={props.placeholder || 'Pilih tanggal dan waktu'}
            {...(props as any)}
          />
          <input
            type="datetime-local"
            value={value || formatDateTime(selectedDate, timeValue.hours, timeValue.minutes)}
            onChange={(e) => {
              if (e.target.value) {
                const date = new Date(e.target.value);
                setSelectedDate(date);
                setCurrentMonth(date);
                setTimeValue({
                  hours: String(date.getHours()).padStart(2, '0'),
                  minutes: String(date.getMinutes()).padStart(2, '0'),
                });
                onChange?.(e.target.value);
              }
            }}
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
                  className="p-1.5 rounded-md hover:bg-slate-100 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
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

            <div className="grid grid-cols-7 gap-1 mb-4">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-9" />;
                }

                const disabled = isDateDisabled(date);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && handleDateSelect(date)}
                    className={cn(
                      'h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200',
                      'hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500/20',
                      isToday(date) && 'bg-primary-50 text-primary-700 font-semibold',
                      isSelected(date) &&
                        'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
                      !isSelected(date) && !isToday(date) && 'text-slate-700 hover:text-slate-900',
                      disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Time picker */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <FaClock className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Waktu</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Jam</label>
                  <input
                    type="number"
                    min="0"
                    max={maxHour}
                    value={timeValue.hours}
                    onChange={(e) => handleTimeChange('hours', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 transition-colors duration-200"
                  />
                </div>
                <div className="pt-6 text-slate-500">:</div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Menit</label>
                  <input
                    type="number"
                    min="0"
                    max={maxMinute}
                    value={timeValue.minutes}
                    onChange={(e) => handleTimeChange('minutes', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 transition-colors duration-200"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const nowHours = String(today.getHours()).padStart(2, '0');
                  const nowMinutes = String(today.getMinutes()).padStart(2, '0');
                  setSelectedDate(today);
                  setTimeValue({ hours: nowHours, minutes: nowMinutes });
                  const formatted = formatDateTime(today, nowHours, nowMinutes);
                  onChange?.(formatted);
                }}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 transition-colors duration-200"
              >
                Sekarang
              </button>
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
DateTimePicker.displayName = 'DateTimePicker';

export { DateTimePicker };
