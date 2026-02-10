/**
 * Input component
 * Reusable text input with label and error states
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full px-3 py-2 bg-surface border border-border rounded-lg',
            'text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        {hint && !error && <p className="text-sm text-text-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
