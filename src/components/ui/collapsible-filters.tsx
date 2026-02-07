import * as React from 'react';
import { cn } from '../../lib/utils';
import { FaFilter, FaChevronDown } from 'react-icons/fa';

export interface CollapsibleFiltersProps {
  children: React.ReactNode;
  activeCount?: number;
  defaultOpen?: boolean;
  className?: string;
  /** Compact trigger label when collapsed */
  label?: string;
}

export function CollapsibleFilters({
  children,
  activeCount = 0,
  defaultOpen = false,
  className,
  label = 'Filters',
}: CollapsibleFiltersProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen || activeCount > 0);

  React.useEffect(() => {
    if (activeCount > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [activeCount]);

  return (
    <div
      className={cn(
        'rounded-xl',
        'border border-slate-200/90',
        'bg-gradient-to-br from-white via-white to-slate-50/30',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        'hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]',
        'transition-all duration-300 ease-out',
        isOpen ? 'overflow-visible' : 'overflow-hidden',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3.5 text-left',
          'transition-all duration-200',
          'hover:bg-slate-50/70',
          'active:bg-slate-100/80',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-inset',
          isOpen && 'border-b border-slate-100'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300',
              activeCount > 0
                ? 'bg-primary-500/12 text-primary-600 shadow-sm'
                : 'bg-slate-100/80 text-slate-500'
            )}
          >
            <FaFilter className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            {activeCount > 0 && (
              <span className="ml-2.5 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-2 rounded-full text-xs font-bold bg-primary-500 text-white shadow-sm">
                {activeCount}
              </span>
            )}
          </div>
        </div>
        <FaChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform duration-300 ease-out',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100 overflow-visible' : 'grid-rows-[0fr] opacity-0 overflow-hidden'
        )}
      >
        <div className="min-h-0 overflow-visible">
          <div className="px-4 pb-4 pt-3 bg-slate-50/20 overflow-visible">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Wrapper for filter action buttons (e.g. Clear) - aligns to bottom of filter row */
export function FilterActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-end gap-2', className)}>
      {children}
    </div>
  );
}
