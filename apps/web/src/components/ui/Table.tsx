/**
 * Table components
 * Styled table for data display
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">{children}</table>
    </div>
  );
}

export function TableHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <thead className={cn('border-b border-border', className)}>
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-border last:border-0',
        onClick && 'cursor-pointer hover:bg-surface-hover',
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider',
        className
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn('px-4 py-3 text-sm text-text-primary', className)}>
      {children}
    </td>
  );
}
