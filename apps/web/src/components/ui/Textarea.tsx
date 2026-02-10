/**
 * Textarea component
 * Multi-line text input
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'w-full px-3 py-2 bg-surface border border-border rounded-lg',
            'text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-y min-h-[100px]',
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
