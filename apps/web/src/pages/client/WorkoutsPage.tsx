/**
 * Client Workouts Page
 * Weekly schedule view with workout details
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { getDayName, getDayShortName, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  EmptyState,
  Modal,
  Textarea,
  SkeletonCard,
} from '@/components/ui';
import type { WorkoutPlan, WorkoutDay, Exercise, ApiResponse } from '@/types';
import { Check, Clock, Dumbbell, Play, ChevronDown, ChevronUp } from 'lucide-react';

export function WorkoutsPage() {
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [comment, setComment] = useState('');
  const today = new Date();
  const todayDayOfWeek = today.getDay();

  // Fetch workout plan
  const { data: workoutData, isLoading } = useQuery({
    queryKey: ['my-workout-plan'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{
        plan: WorkoutPlan | null;
        todayCompletions: Array<{ workoutDayId: string; completedAt: string }>;
        todayDayOfWeek: number;
      }>>('/workouts/my-plan');
      return response.data.data;
    },
  });

  // Fetch all completions
  const { data: completions } = useQuery({
    queryKey: ['workout-completions'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Array<{ workoutDayId: string; completedAt: string }>>>('/workouts/completions');
      return response.data.data;
    },
  });

  // Complete workout mutation
  const completeMutation = useMutation({
    mutationFn: async (data: { workoutDayId: string; comment?: string }) => {
      const response = await api.post('/workouts/complete', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-workout-plan'] });
      queryClient.invalidateQueries({ queryKey: ['workout-completions'] });
      setCompleteModalOpen(false);
      setComment('');
      setSelectedDay(null);
    },
  });

  const plan = workoutData?.plan;
  const todayCompletions = workoutData?.todayCompletions || [];

  // Create week schedule
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + i);
    const workoutDay = plan?.workoutDays.find((d) => d.dayOfWeek === i);
    const isCompleted = todayCompletions.some(
      (c) => workoutDay && c.workoutDayId === workoutDay.id
    );
    return {
      dayOfWeek: i,
      date,
      workoutDay,
      isToday: i === todayDayOfWeek,
      isPast: i < todayDayOfWeek,
      isCompleted,
    };
  });

  const handleComplete = (day: WorkoutDay) => {
    setSelectedDay(day);
    setCompleteModalOpen(true);
  };

  const submitCompletion = () => {
    if (selectedDay) {
      completeMutation.mutate({
        workoutDayId: selectedDay.id,
        comment: comment || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader title="Workouts" description="Your weekly training schedule" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Workouts"
        description={plan ? plan.title : 'Your weekly training schedule'}
      />

      {!plan ? (
        <EmptyState
          title="No Workout Plan"
          description="Your trainer hasn't assigned a workout plan yet. Check back soon!"
          icon={<Dumbbell className="w-6 h-6 text-text-muted" />}
        />
      ) : (
        <>
          {/* Week Calendar View */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {weekDays.map((day) => (
                  <button
                    key={day.dayOfWeek}
                    onClick={() => day.workoutDay && setSelectedDay(day.workoutDay)}
                    className={`p-2 md:p-3 rounded-lg text-center transition-colors ${
                      day.isToday
                        ? 'bg-accent text-white'
                        : day.workoutDay
                        ? 'bg-surface hover:bg-surface-hover'
                        : 'bg-transparent'
                    }`}
                  >
                    <div className="text-xs font-medium">
                      {getDayShortName(day.dayOfWeek)}
                    </div>
                    <div className="text-lg font-semibold mt-1">
                      {day.date.getDate()}
                    </div>
                    {day.workoutDay && (
                      <div className="mt-1">
                        {day.isCompleted ? (
                          <Check className="w-4 h-4 mx-auto text-success" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-accent mx-auto" />
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Workout List */}
          <div className="space-y-4">
            {weekDays.map((day) => {
              if (!day.workoutDay) return null;
              const isExpanded = selectedDay?.id === day.workoutDay.id;

              return (
                <Card key={day.dayOfWeek}>
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      setSelectedDay(isExpanded ? null : day.workoutDay!)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            day.isToday
                              ? 'bg-accent'
                              : day.isCompleted
                              ? 'bg-success-muted'
                              : 'bg-surface'
                          }`}
                        >
                          {day.isCompleted ? (
                            <Check className="w-5 h-5 text-success" />
                          ) : (
                            <Dumbbell
                              className={`w-5 h-5 ${
                                day.isToday ? 'text-white' : 'text-text-secondary'
                              }`}
                            />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-text-primary">
                            {day.workoutDay.title}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {getDayName(day.dayOfWeek)} •{' '}
                            {day.workoutDay.exercises.length} exercises
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {day.isToday && !day.isCompleted && (
                          <Badge variant="info">Today</Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-text-muted" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border">
                      <div className="space-y-3 mt-4">
                        {day.workoutDay.exercises.map((exercise, idx) => (
                          <ExerciseItem key={exercise.id} exercise={exercise} index={idx + 1} />
                        ))}
                      </div>

                      {!day.isCompleted && (
                        <Button
                          className="w-full mt-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComplete(day.workoutDay!);
                          }}
                          leftIcon={<Check className="w-4 h-4" />}
                        >
                          Mark as Completed
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Complete Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Complete Workout"
        description={`Mark "${selectedDay?.title}" as completed`}
      >
        <div className="space-y-4">
          <Textarea
            label="Notes (optional)"
            placeholder="How did the workout go? Any notes for your trainer..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setCompleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={submitCompletion}
              isLoading={completeMutation.isPending}
            >
              Complete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ExerciseItem({ exercise, index }: { exercise: Exercise; index: number }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-background-secondary rounded-lg">
      <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-medium text-text-secondary">{index}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-text-primary">{exercise.name}</h4>
        <div className="flex flex-wrap gap-2 mt-1 text-sm text-text-secondary">
          <span>{exercise.sets} sets</span>
          <span>×</span>
          <span>{exercise.reps} reps</span>
          {exercise.rpe && <span>@ RPE {exercise.rpe}</span>}
        </div>
        {exercise.restSeconds && (
          <div className="flex items-center gap-1 mt-1 text-xs text-text-muted">
            <Clock className="w-3 h-3" />
            <span>{exercise.restSeconds}s rest</span>
          </div>
        )}
        {exercise.notes && (
          <p className="text-xs text-text-muted mt-2 italic">{exercise.notes}</p>
        )}
        {exercise.videoUrl && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-2"
          >
            <Play className="w-3 h-3" />
            Watch demo
          </a>
        )}
      </div>
    </div>
  );
}
