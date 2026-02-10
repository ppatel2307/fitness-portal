/**
 * Admin Check-ins Page
 * View all client check-ins
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardContent,
  Badge,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  SkeletonTable,
} from '@/components/ui';
import type { CheckIn, ApiResponse } from '@/types';
import { ClipboardCheck } from 'lucide-react';

export function AdminCheckInsPage() {
  const { data: checkIns, isLoading } = useQuery({
    queryKey: ['admin-check-ins'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CheckIn[]>>('/progress/check-ins');
      return response.data.data;
    },
  });

  const getAdherenceBadge = (adherence: number) => {
    if (adherence >= 8) return { variant: 'success' as const, label: 'Great' };
    if (adherence >= 5) return { variant: 'warning' as const, label: 'OK' };
    return { variant: 'error' as const, label: 'Needs Attention' };
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Client Check-ins"
        description="Review weekly check-ins from your clients"
      />

      <Card padding="none">
        {isLoading ? (
          <SkeletonTable rows={10} />
        ) : !checkIns || checkIns.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No check-ins yet"
              description="Client check-ins will appear here"
              icon={<ClipboardCheck className="w-6 h-6 text-text-muted" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Week Of</TableHead>
                <TableHead>Energy</TableHead>
                <TableHead>Sleep</TableHead>
                <TableHead>Stress</TableHead>
                <TableHead>Adherence</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkIns.map((checkIn) => {
                const badge = getAdherenceBadge(checkIn.adherence);
                return (
                  <TableRow key={checkIn.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-text-primary">
                          {checkIn.client?.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {checkIn.client?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(checkIn.weekOf, 'short')}</TableCell>
                    <TableCell>
                      <span className={checkIn.energy >= 7 ? 'text-success' : checkIn.energy >= 4 ? 'text-warning' : 'text-error'}>
                        {checkIn.energy}/10
                      </span>
                    </TableCell>
                    <TableCell>{checkIn.sleepHours.toFixed(1)}h</TableCell>
                    <TableCell>
                      <span className={checkIn.stress <= 3 ? 'text-success' : checkIn.stress <= 6 ? 'text-warning' : 'text-error'}>
                        {checkIn.stress}/10
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-text-secondary truncate max-w-[200px] block">
                        {checkIn.notes || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
