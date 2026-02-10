/**
 * Client Check-In Page
 * Weekly check-in form for trainer communication
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { getWeekStart, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
  Badge,
  EmptyState,
} from '@/components/ui';
import type { CheckIn, ApiResponse } from '@/types';
import { ClipboardCheck, Check, AlertCircle } from 'lucide-react';

const checkInSchema = z.object({
  energy: z.coerce.number().int().min(1).max(10),
  sleepHours: z.coerce.number().min(0).max(24),
  stress: z.coerce.number().int().min(1).max(10),
  adherence: z.coerce.number().int().min(1).max(10),
  notes: z.string().optional(),
});

type CheckInForm = z.infer<typeof checkInSchema>;

export function CheckInPage() {
  const queryClient = useQueryClient();
  const weekStart = getWeekStart();
  const weekOf = weekStart.toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckInForm>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      energy: 7,
      sleepHours: 7,
      stress: 5,
      adherence: 8,
      notes: '',
    },
  });

  // Fetch check-ins
  const { data: checkIns, isLoading } = useQuery({
    queryKey: ['check-ins'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CheckIn[]>>('/progress/check-ins');
      return response.data.data;
    },
  });

  // Submit check-in mutation
  const submitMutation = useMutation({
    mutationFn: async (data: CheckInForm) => {
      const response = await api.post('/progress/check-ins', {
        ...data,
        weekOf,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
    },
  });

  const thisWeekCheckIn = checkIns?.find(
    (c) => new Date(c.weekOf).toISOString().split('T')[0] === weekOf
  );

  const onSubmit = (data: CheckInForm) => {
    submitMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Weekly Check-In"
        description="Let your trainer know how you're doing"
      />

      {/* This Week's Check-In */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Week of {formatDate(weekStart, 'short')}</CardTitle>
            {thisWeekCheckIn && (
              <Badge variant="success" className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                Submitted
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {thisWeekCheckIn ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricDisplay
                  label="Energy"
                  value={thisWeekCheckIn.energy}
                  max={10}
                />
                <MetricDisplay
                  label="Sleep"
                  value={thisWeekCheckIn.sleepHours}
                  suffix="hrs"
                />
                <MetricDisplay
                  label="Stress"
                  value={thisWeekCheckIn.stress}
                  max={10}
                  inverse
                />
                <MetricDisplay
                  label="Adherence"
                  value={thisWeekCheckIn.adherence}
                  max={10}
                />
              </div>
              {thisWeekCheckIn.notes && (
                <div className="p-3 bg-background-secondary rounded-lg">
                  <p className="text-sm text-text-secondary">{thisWeekCheckIn.notes}</p>
                </div>
              )}
              <p className="text-xs text-text-muted">
                Submitted on {formatDate(thisWeekCheckIn.createdAt, 'short')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Energy Level */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Energy Level (1-10)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      className="flex-1 h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-accent"
                      {...register('energy')}
                    />
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      className="w-16"
                      error={errors.energy?.message}
                      {...register('energy')}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    How energetic did you feel this week?
                  </p>
                </div>

                {/* Sleep Hours */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Average Sleep (hours)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    error={errors.sleepHours?.message}
                    {...register('sleepHours')}
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Average hours of sleep per night
                  </p>
                </div>

                {/* Stress Level */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Stress Level (1-10)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      className="flex-1 h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-accent"
                      {...register('stress')}
                    />
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      className="w-16"
                      error={errors.stress?.message}
                      {...register('stress')}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    1 = Very relaxed, 10 = Extremely stressed
                  </p>
                </div>

                {/* Adherence */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Program Adherence (1-10)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      className="flex-1 h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-accent"
                      {...register('adherence')}
                    />
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      className="w-16"
                      error={errors.adherence?.message}
                      {...register('adherence')}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    How well did you follow your workout & nutrition?
                  </p>
                </div>
              </div>

              <Textarea
                label="Additional Notes"
                placeholder="Anything else you want to share with your trainer? Questions, concerns, wins..."
                rows={4}
                {...register('notes')}
              />

              <Button type="submit" className="w-full md:w-auto" isLoading={submitMutation.isPending}>
                Submit Check-In
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Previous Check-Ins */}
      <Card>
        <CardHeader>
          <CardTitle>Previous Check-Ins</CardTitle>
        </CardHeader>
        <CardContent>
          {!checkIns || checkIns.length === 0 ? (
            <EmptyState
              title="No check-ins yet"
              description="Your check-in history will appear here"
              icon={<ClipboardCheck className="w-6 h-6 text-text-muted" />}
            />
          ) : (
            <div className="space-y-3">
              {checkIns
                .filter((c) => new Date(c.weekOf).toISOString().split('T')[0] !== weekOf)
                .slice(0, 10)
                .map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="p-4 bg-background-secondary rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-text-primary">
                        Week of {formatDate(checkIn.weekOf, 'short')}
                      </span>
                      <Badge variant="default" size="sm">
                        Adherence: {checkIn.adherence}/10
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-text-muted">Energy:</span>{' '}
                        <span className="text-text-secondary">{checkIn.energy}/10</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Sleep:</span>{' '}
                        <span className="text-text-secondary">{checkIn.sleepHours}h</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Stress:</span>{' '}
                        <span className="text-text-secondary">{checkIn.stress}/10</span>
                      </div>
                    </div>
                    {checkIn.notes && (
                      <p className="text-sm text-text-muted mt-2 line-clamp-2">
                        {checkIn.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricDisplay({
  label,
  value,
  max,
  suffix,
  inverse = false,
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  inverse?: boolean;
}) {
  const getColor = () => {
    if (!max) return 'text-text-primary';
    const ratio = value / max;
    if (inverse) {
      if (ratio <= 0.3) return 'text-success';
      if (ratio >= 0.7) return 'text-error';
    } else {
      if (ratio >= 0.7) return 'text-success';
      if (ratio <= 0.3) return 'text-error';
    }
    return 'text-warning';
  };

  return (
    <div className="text-center p-3 bg-background-secondary rounded-lg">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-xl font-bold ${getColor()}`}>
        {value}
        {max && <span className="text-text-muted text-sm">/{max}</span>}
        {suffix && <span className="text-text-muted text-sm ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
