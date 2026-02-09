import * as React from 'react';
import { cn } from '../../lib/utils';
import { FaTimes } from 'react-icons/fa';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  /** When true, overlay click and close button do not close the modal (e.g. while submitting) */
  preventClose?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  preventClose = false,
}) => {
  const [_, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!preventClose && closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-none',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden
      />

      {/* Center wrapper: min height so modal is centered when short; when modal is tall, this grows and the outer scrolls */}
      <div
        className="min-h-[calc(100vh-2rem)] flex items-center justify-center"
        onClick={handleOverlayClick}
      >
        {/* Modal box: no max-height; entire modal scrolls with the overlay */}
        <div
          className={cn(
            'relative w-full bg-white rounded-2xl shadow-2xl',
            'transform transition-all duration-300 ease-out',
            sizeClasses[size],
            isOpen
              ? 'scale-100 opacity-100 translate-y-0'
              : 'scale-95 opacity-0 translate-y-4'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={preventClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
};
