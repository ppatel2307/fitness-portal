/**
 * Modal component
 * Dialog overlay for forms and confirmations
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={cn(
          'relative w-full mx-4 bg-background-secondary border border-border rounded-xl shadow-xl',
          'max-h-[90vh] overflow-y-auto',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="sticky top-0 bg-background-secondary px-6 py-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div>
                {title && (
                  <h2 className="text-lg font-semibold text-text-primary">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
