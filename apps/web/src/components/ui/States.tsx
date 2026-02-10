/**
 * Empty and Error state components
 * Consistent UI for no data and error conditions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { FileQuestion, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-4">
        {icon || <FileQuestion className="w-6 h-6 text-text-muted" />}
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-error-muted flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-error" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
