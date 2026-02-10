/**
 * Admin Workout Plans Page
 * Create and manage workout plans for clients
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { getDayName } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Badge,
  EmptyState,
  SkeletonCard,
} from '@/components/ui';
import type { WorkoutPlan, User, ApiResponse } from '@/types';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';

const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  sets: z.coerce.number().int().positive(),
  reps: z.string().min(1, 'Reps is required'),
  rpe: z.coerce.number().min(1).max(10).optional().or(z.literal('')),
  restSeconds: z.coerce.number().int().positive().optional().or(z.literal('')),
  notes: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
});

const workoutDaySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  title: z.string().min(1, 'Day title is required'),
  exercises: z.array(exerciseSchema),
});

const createPlanSchema = z.object({
  clientId: z.string().uuid('Select a client'),
  title: z.string().min(1, 'Plan title is required'),
  workoutDays: z.array(workoutDaySchema),
});

type CreatePlanForm = z.infer<typeof createPlanSchema>;

export function WorkoutPlansPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const form = useForm<CreatePlanForm>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      clientId: '',
      title: '',
      workoutDays: [
        { dayOfWeek: 1, title: 'Day 1', exercises: [] },
      ],
    },
  });

  const { fields: dayFields, append: appendDay, remove: removeDay } = useFieldArray({
    control: form.control,
    name: 'workoutDays',
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<User[]>>('/users/clients');
      return response.data.data;
    },
  });

  // Fetch workout plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<WorkoutPlan[]>>('/workouts/plans');
      return response.data.data;
    },
  });

  // Create plan mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePlanForm) => {
      const response = await api.post('/workouts/plans', {
        ...data,
        workoutDays: data.workoutDays.map((day) => ({
          ...day,
          exercises: day.exercises.map((ex, idx) => ({
            ...ex,
            rpe: ex.rpe || undefined,
            restSeconds: ex.restSeconds || undefined,
            videoUrl: ex.videoUrl || undefined,
            orderIndex: idx,
          })),
        })),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      setCreateModalOpen(false);
      form.reset();
    },
  });

  // Delete plan mutation
  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await api.delete(`/workouts/plans/${planId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
    },
  });

  const onSubmit = (data: CreatePlanForm) => {
    createMutation.mutate(data);
  };

  const clientOptions = clients?.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.email})`,
  })) || [];

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
          <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Create Plan
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !plans || plans.length === 0 ? (
        <EmptyState
          title="No workout plans"
          description="Create your first workout plan for a client"
          action={{
            label: 'Create Plan',
            onClick: () => setCreateModalOpen(true),
          }}
          icon={<Dumbbell className="w-6 h-6 text-text-muted" />}
        />
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <div
                className="p-4 cursor-pointer"
                onClick={() =>
                  setExpandedPlan(expandedPlan === plan.id ? null : plan.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-text-primary">{plan.title}</h3>
                      <Badge variant={plan.active ? 'success' : 'default'}>
                        {plan.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {plan.client?.name} • {plan.workoutDays.length} days
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this workout plan?')) {
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
                    {plan.workoutDays.map((day) => (
                      <div
                        key={day.id}
                        className="p-4 bg-background-secondary rounded-lg"
                      >
                        <h4 className="font-medium text-text-primary mb-3">
                          {getDayName(day.dayOfWeek)} - {day.title}
                        </h4>
                        <div className="space-y-2">
                          {day.exercises.map((exercise, idx) => (
                            <div
                              key={exercise.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-text-secondary">
                                {idx + 1}. {exercise.name}
                              </span>
                              <span className="text-text-muted">
                                {exercise.sets}x{exercise.reps}
                                {exercise.rpe && ` @RPE ${exercise.rpe}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          form.reset();
        }}
        title="Create Workout Plan"
        size="xl"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Client"
              options={clientOptions}
              placeholder="Select client..."
              error={form.formState.errors.clientId?.message}
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
                onClick={() =>
                  appendDay({
                    dayOfWeek: 1,
                    title: `Day ${dayFields.length + 1}`,
                    exercises: [],
                  })
                }
              >
                <Plus className="w-4 h-4 mr-1" /> Add Day
              </Button>
            </div>

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
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateModalOpen(false);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Plan
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
  form: ReturnType<typeof useForm<CreatePlanForm>>;
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
          >
            <Trash2 className="w-4 h-4 text-error" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {exerciseFields.map((exercise, exIndex) => (
          <div key={exercise.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4">
              <Input
                placeholder="Exercise name"
                {...form.register(`workoutDays.${dayIndex}.exercises.${exIndex}.name`)}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="Sets"
                {...form.register(`workoutDays.${dayIndex}.exercises.${exIndex}.sets`)}
              />
            </div>
            <div className="col-span-2">
              <Input
                placeholder="Reps"
                {...form.register(`workoutDays.${dayIndex}.exercises.${exIndex}.reps`)}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="RPE"
                {...form.register(`workoutDays.${dayIndex}.exercises.${exIndex}.rpe`)}
              />
            </div>
            <div className="col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeExercise(exIndex)}
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
            appendExercise({
              name: '',
              sets: 3,
              reps: '8-12',
              rpe: '',
              restSeconds: '',
              notes: '',
              videoUrl: '',
            })
          }
        >
          <Plus className="w-4 h-4 mr-1" /> Add Exercise
        </Button>
      </div>
    </Card>
  );
}
