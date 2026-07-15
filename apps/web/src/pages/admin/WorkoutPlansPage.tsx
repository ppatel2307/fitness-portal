/**
 * Admin Workout Plans Page
 * Create, edit, activate, and delete client workout plans.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import { getDayName } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  EmptyState,
  ErrorState,
  SkeletonCard,
} from '@/components/ui';
import type { WorkoutPlan, User, ApiResponse } from '@/types';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';

const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  sets: z.coerce.number().int().positive(),
  reps: z.string().min(1, 'Reps is required'),
  restSeconds: z.coerce.number().int().positive().optional().or(z.literal('')),
  videoUrl: z.string().url('Must be a URL').optional().or(z.literal('')),
});

const workoutDaySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  title: z.string().min(1, 'Day title is required'),
  exercises: z.array(exerciseSchema),
});

const planFormSchema = z.object({
  clientId: z.string().uuid('Select a client'),
  title: z.string().min(1, 'Plan title is required'),
  workoutDays: z.array(workoutDaySchema).min(1, 'Add at least one day'),
});

type PlanForm = z.infer<typeof planFormSchema>;

const emptyDay = (n: number) => ({ dayOfWeek: 1, title: `Day ${n}`, exercises: [] });

function toApiDays(days: PlanForm['workoutDays']) {
  return days.map(day => ({
    dayOfWeek: day.dayOfWeek,
    title: day.title,
    exercises: day.exercises.map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.restSeconds === '' ? undefined : ex.restSeconds,
      youtubeUrl: ex.videoUrl || undefined,
    })),
  }));
}

export function WorkoutPlansPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const form = useForm<PlanForm>({
    resolver: zodResolver(planFormSchema),
    defaultValues: { clientId: '', title: '', workoutDays: [emptyDay(1)] },
  });

  const { fields: dayFields, append: appendDay, remove: removeDay } = useFieldArray({
    control: form.control,
    name: 'workoutDays',
  });

  const clientsQuery = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<User[]>>('/admin/users?role=USER');
      return res.data.data ?? [];
    },
  });

  const plansQuery = useQuery({
    queryKey: ['workout-plans'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<WorkoutPlan[]>>('/workouts/plans');
      return res.data.data ?? [];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['workout-plans'] });

  const saveMutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      if (editingPlan) {
        await api.put(`/workouts/plans/${editingPlan.id}`, {
          title: data.title,
          workoutDays: toApiDays(data.workoutDays),
        });
      } else {
        await api.post('/workouts/plans', {
          userId: data.clientId,
          title: data.title,
          workoutDays: toApiDays(data.workoutDays),
        });
      }
    },
    onSuccess: () => {
      toast.success(editingPlan ? 'Plan updated — client notified' : 'Plan created — client notified');
      refresh();
      closeForm();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const setActiveMutation = useMutation({
    mutationFn: async ({ planId, active }: { planId: string; active: boolean }) => {
      await api.patch(`/workouts/plans/${planId}`, { active });
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.active ? 'Plan set active' : 'Plan deactivated');
      refresh();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      await api.delete(`/workouts/plans/${planId}`);
    },
    onSuccess: () => {
      toast.success('Plan deleted');
      refresh();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const openCreate = () => {
    setEditingPlan(null);
    form.reset({ clientId: '', title: '', workoutDays: [emptyDay(1)] });
    setFormOpen(true);
  };

  const openEdit = (plan: WorkoutPlan) => {
    setEditingPlan(plan);
    form.reset({
      clientId: plan.user?.id ?? plan.userId,
      title: plan.title,
      workoutDays: plan.workoutDays.map(day => ({
        dayOfWeek: day.dayOfWeek,
        title: day.title,
        exercises: day.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds ?? '',
          videoUrl: ex.youtubeUrl ?? '',
        })),
      })),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingPlan(null);
    form.reset({ clientId: '', title: '', workoutDays: [emptyDay(1)] });
  };

  const clients = clientsQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  const clientOptions = clients.map(c => ({ value: c.id, label: `${c.name} (${c.email})` }));

  const dayOptions = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Workout Plans"
        description="Create and manage client workout programs"
        actions={
          <Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Create Plan
          </Button>
        }
      />

      {plansQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : plansQuery.isError ? (
        <ErrorState
          title="Couldn't load workout plans"
          message={getErrorMessage(plansQuery.error)}
          onRetry={() => plansQuery.refetch()}
        />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No workout plans"
          description="Create your first workout plan for a client"
          action={{ label: 'Create Plan', onClick: openCreate }}
          icon={<Dumbbell className="w-6 h-6 text-text-muted" />}
        />
      ) : (
        <div className="space-y-4">
          {plans.map(plan => (
            <Card key={plan.id}>
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-text-primary truncate">{plan.title}</h3>
                      <Badge variant={plan.active ? 'success' : 'default'}>
                        {plan.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {plan.user?.name} • {plan.workoutDays.length} days
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${plan.title}`}
                      onClick={e => {
                        e.stopPropagation();
                        openEdit(plan);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        setActiveMutation.mutate({ planId: plan.id, active: !plan.active });
                      }}
                      className="text-xs"
                    >
                      {plan.active ? 'Deactivate' : 'Set Active'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${plan.title}`}
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete "${plan.title}"? This also removes its workout history.`)) {
                          deleteMutation.mutate(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </Button>
                    {expandedPlan === plan.id ? (
                      <ChevronUp className="w-5 h-5 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-text-muted" />
                    )}
                  </div>
                </div>
              </div>

              {expandedPlan === plan.id && (
                <div className="px-4 pb-4 border-t border-border">
                  <div className="space-y-4 mt-4">
                    {plan.workoutDays.map(day => (
                      <div key={day.id} className="p-4 bg-background-secondary rounded-lg">
                        <h4 className="font-medium text-text-primary mb-3">
                          {getDayName(day.dayOfWeek)} — {day.title}
                        </h4>
                        {day.exercises.length === 0 ? (
                          <p className="text-sm text-text-muted">No exercises (rest day)</p>
                        ) : (
                          <div className="space-y-2">
                            {day.exercises.map((exercise, idx) => (
                              <div key={exercise.id} className="flex items-center justify-between text-sm">
                                <span className="text-text-secondary">
                                  {idx + 1}. {exercise.name}
                                </span>
                                <span className="text-text-muted">
                                  {exercise.sets}x{exercise.reps}
                                  {exercise.restSeconds ? ` • ${exercise.restSeconds}s rest` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit plan */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingPlan ? `Edit Plan — ${editingPlan.user?.name ?? ''}` : 'Create Workout Plan'}
        size="xl"
      >
        <form onSubmit={form.handleSubmit(data => saveMutation.mutate(data))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Client"
              options={clientOptions}
              placeholder="Select client..."
              error={form.formState.errors.clientId?.message}
              disabled={!!editingPlan}
              {...form.register('clientId')}
            />
            <Input
              label="Plan Title"
              placeholder="e.g., Push/Pull/Legs"
              error={form.formState.errors.title?.message}
              {...form.register('title')}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-text-primary">Workout Days</h4>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => appendDay(emptyDay(dayFields.length + 1))}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Day
              </Button>
            </div>

            {form.formState.errors.workoutDays?.message && (
              <p className="text-sm text-error">{form.formState.errors.workoutDays.message}</p>
            )}

            {dayFields.map((day, dayIndex) => (
              <WorkoutDayForm
                key={day.id}
                dayIndex={dayIndex}
                form={form}
                dayOptions={dayOptions}
                onRemove={() => removeDay(dayIndex)}
                canRemove={dayFields.length > 1}
              />
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function WorkoutDayForm({
  dayIndex,
  form,
  dayOptions,
  onRemove,
  canRemove,
}: {
  dayIndex: number;
  form: UseFormReturn<PlanForm>;
  dayOptions: { value: string; label: string }[];
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { fields: exerciseFields, append: appendExercise, remove: removeExercise } = useFieldArray({
    control: form.control,
    name: `workoutDays.${dayIndex}.exercises`,
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="grid grid-cols-2 gap-4 flex-1">
          <Select
            label="Day"
            options={dayOptions}
            {...form.register(`workoutDays.${dayIndex}.dayOfWeek`)}
          />
          <Input
            label="Title"
            placeholder="e.g., Push Day"
            error={form.formState.errors.workoutDays?.[dayIndex]?.title?.message}
            {...form.register(`workoutDays.${dayIndex}.title`)}
          />
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="ml-2 mt-6"
            aria-label="Remove day"
          >
            <Trash2 className="w-4 h-4 text-error" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {exerciseFields.length > 0 && (
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-text-muted uppercase tracking-wide px-1">
            <span className="col-span-3">Exercise</span>
            <span className="col-span-1">Sets</span>
            <span className="col-span-2">Reps</span>
            <span className="col-span-2">Rest (s)</span>
            <span className="col-span-3">Video URL</span>
            <span className="col-span-1" />
          </div>
        )}
        {exerciseFields.map((exercise, exIndex) => (
          <div key={exercise.id} className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-3">
              <Input
                placeholder="Exercise name"
                error={form.formState.errors.workoutDays?.[dayIndex]?.exercises?.[exIndex]?.name?.message}
                {...form.register(`workoutDays.${dayIndex}.exercises.${exIndex}.name`)}
              />
            </div>
            <div className="col-span-1">
              <Input
                type="number"
                placeholder="3"
                aria-label="Sets"
                {...form.register(`workoutDays.${dayIndex}.exercises.${exIndex}.sets`)}
              />
            </div>
            <div className="col-span-2">
              <Input
                placeholder="8-12"
                aria-label="Reps"
                {...form.register(`workoutDays.${dayIndex}.exercises.${exIndex}.reps`)}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="90"
                aria-label="Rest seconds"
                {...form.register(`workoutDays.${dayIndex}.exercises.${exIndex}.restSeconds`)}
              />
            </div>
            <div className="col-span-3">
              <Input
                placeholder="https://youtube.com/..."
                aria-label="Video URL"
                error={form.formState.errors.workoutDays?.[dayIndex]?.exercises?.[exIndex]?.videoUrl?.message}
                {...form.register(`workoutDays.${dayIndex}.exercises.${exIndex}.videoUrl`)}
              />
            </div>
            <div className="col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeExercise(exIndex)}
                aria-label="Remove exercise"
              >
                <Trash2 className="w-4 h-4 text-text-muted" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            appendExercise({ name: '', sets: 3, reps: '8-12', restSeconds: '', videoUrl: '' })
          }
        >
          <Plus className="w-4 h-4 mr-1" /> Add Exercise
        </Button>
      </div>
    </Card>
  );
}
