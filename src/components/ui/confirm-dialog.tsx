import * as React from 'react';
import { Modal } from './modal';
import { cn } from '../../lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/20 text-white',
    icon: 'text-red-600',
  },
  warning: {
    confirmButton: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/20 text-white',
    icon: 'text-amber-600',
  },
  info: {
    confirmButton: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500/20 text-white',
    icon: 'text-primary-600',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  isLoading = false,
}) => {
  const config = variantConfig[variant];

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" closeOnOverlayClick={!isLoading}>
      <div className="py-4">
        <p className="text-slate-700 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all duration-200',
              'border border-slate-300 text-slate-700 hover:bg-slate-50',
              'focus:outline-none focus:ring-2 focus:ring-slate-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all duration-200',
              'focus:outline-none focus:ring-2',
              config.confirmButton,
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isLoading && 'cursor-wait'
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Memproses...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
