/**
 * Format number with thousand separators
 * @param value - Number or string to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with thousand separators
 */
export const formatNumber = (value: number | string | undefined | null, decimals: number = 0): string => {
  if (value === undefined || value === null || value === '') return '0';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  return num.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format number with unit (kg/ton)
 * @param value - Number to format
 * @param unit - Unit string (default: 'kg')
 * @returns Formatted string with unit
 */
export const formatNumberWithUnit = (value: number | string | undefined | null, unit: string = 'kg'): string => {
  if (value === undefined || value === null || value === '') return `0 ${unit}`;

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `0 ${unit}`;

  // Convert to ton if >= 1000 and unit is kg
  if (unit === 'kg' && num >= 1000) {
    const tons = num / 1000;
    // Only show decimals if there are significant decimal places
    const formattedTons = Number.isInteger(tons)
      ? formatNumber(tons, 0)
      : formatNumber(tons, 2);
    const result = `${formattedTons} ton`;
    return result;
  }

  // Only show decimals if there are significant decimal places
  const formattedNum = Number.isInteger(num)
    ? formatNumber(num, 0)
    : formatNumber(num, 2);

  return `${formattedNum} ${unit}`;
};

/**
 * Format number as currency (IDR)
 * @param value - Number to format
 * @returns Formatted string with Rp prefix
 */
export const formatCurrency = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') return '-';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';

  return `Rp ${num.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

/**
 * Format a Date to YYYY-MM-DDTHH:mm in the user's local timezone (for datetime inputs).
 * @param date - Date to format; defaults to now if omitted
 * @returns String suitable for input[type="datetime-local"] value
 */
export const toLocalDateTimeString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
};

/**
 * Format date to Indonesian format (e.g., "16 Januari 2025")
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string in Indonesian format
 */
export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format datetime to Indonesian format with time (e.g., "16 Januari 2025, 14:30")
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted datetime string in Indonesian format with time
 */
export const formatDateTime = (date: string | Date | undefined | null): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  const dateStr = dateObj.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${dateStr}, ${timeStr}`;
};
