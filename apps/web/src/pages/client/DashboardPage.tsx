/**
 * Client Dashboard Page
 * Overview of today's workout, nutrition, and recent progress
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getDayName, getToday } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  SkeletonCard,
  EmptyState,
} from '@/components/ui';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { PageHeader } from '@/components/layout/PageHeader';
import type { WorkoutPlan, NutritionTarget, WeightLog, Announcement, ApiResponse, ClientStats } from '@/types';
import {
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Bell,
  Apple,
  Scale,
  ChevronRight,
  Check,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const today = new Date();
  const todayDayOfWeek = today.getDay();

  // Fetch workout plan
  const { data: workoutData, isLoading: workoutLoading } = useQuery({
    queryKey: ['my-workout-plan'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{
        plan: WorkoutPlan | null;
        todayCompletions: Array<{ workoutDayId: string }>;
        todayDayOfWeek: number;
      }>>('/workouts/my-plan');
      return response.data.data;
    },
  });

  // Fetch nutrition targets
  const { data: nutritionData } = useQuery({
    queryKey: ['my-nutrition-targets'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NutritionTarget>>('/nutrition/my-targets');
      return response.data.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['my-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ClientStats>>('/progress/stats');
      return response.data.data;
    },
  });

  // Fetch latest announcement
  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Announcement[]>>('/content/announcements');
      return response.data.data;
    },
  });

  const todayWorkout = workoutData?.plan?.workoutDays.find(
    (day) => day.dayOfWeek === todayDayOfWeek
  );
  const isTodayCompleted = workoutData?.todayCompletions?.some(
    (c) => todayWorkout && c.workoutDayId === todayWorkout.id
  );

  const latestWeight = statsData?.weightTrend?.[statsData.weightTrend.length - 1];
  const previousWeight = statsData?.weightTrend?.[statsData.weightTrend.length - 2];
  const weightChange = latestWeight && previousWeight
    ? latestWeight.weight - previousWeight.weight
    : null;

  const latestAnnouncement = announcements?.[0];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header with banner and profile */}
      <div className="space-y-4">
        <ImagePlaceholder
          type="banner"
          className="h-32 md:h-40"
          imageUrl={user?.clientProfile?.bannerPhotoUrl}
        />
        <div className="flex items-end gap-4 -mt-12 ml-4">
          <ImagePlaceholder
            type="profile"
            className="w-20 h-20 md:w-24 md:h-24 border-4 border-background"
            imageUrl={user?.clientProfile?.profilePhotoUrl}
          />
          <div className="pb-2">
            <h1 className="text-xl md:text-2xl font-bold text-text-primary">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-sm text-text-secondary">
              {formatDate(today, 'long')}
            </p>
          </div>
        </div>
      </div>

      {/* Today's Workout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-accent" />
            Today's Workout
          </CardTitle>
          <Link to="/workouts">
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {workoutLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-surface rounded w-1/3" />
              <div className="h-3 bg-surface rounded w-2/3" />
            </div>
          ) : todayWorkout ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-text-primary">
                    {todayWorkout.title}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {todayWorkout.exercises.length} exercises
                  </p>
                </div>
                {isTodayCompleted ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Completed
                  </Badge>
                ) : (
                  <Badge variant="info">Scheduled</Badge>
                )}
              </div>
              <div className="space-y-2">
                {todayWorkout.exercises.slice(0, 3).map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-secondary">{exercise.name}</span>
                    <span className="text-text-muted">
                      {exercise.sets}x{exercise.reps}
                    </span>
                  </div>
                ))}
                {todayWorkout.exercises.length > 3 && (
                  <p className="text-xs text-text-muted">
                    +{todayWorkout.exercises.length - 3} more exercises
                  </p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Rest Day"
              description="No workout scheduled for today. Enjoy your recovery!"
              icon={<Dumbbell className="w-6 h-6 text-text-muted" />}
            />
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Nutrition Summary */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Apple className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-text-secondary">
                Nutrition Targets
              </span>
            </div>
            {nutritionData ? (
              <div className="space-y-1">
                <p className="text-2xl font-bold text-text-primary">
                  {nutritionData.calories}
                </p>
                <p className="text-xs text-text-muted">calories daily</p>
                <div className="flex gap-2 mt-2 text-xs text-text-secondary">
                  <span>P: {nutritionData.protein}g</span>
                  <span>C: {nutritionData.carbs}g</span>
                  <span>F: {nutritionData.fat}g</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Not set</p>
            )}
          </CardContent>
        </Card>

        {/* Weight Trend */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-text-secondary">
                Current Weight
              </span>
            </div>
            {latestWeight ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-text-primary">
                    {latestWeight.weight.toFixed(1)}
                  </p>
                  <span className="text-sm text-text-muted">kg</span>
                </div>
                {weightChange !== null && (
                  <div className="flex items-center gap-1">
                    {weightChange > 0 ? (
                      <TrendingUp className="w-3 h-3 text-warning" />
                    ) : weightChange < 0 ? (
                      <TrendingDown className="w-3 h-3 text-success" />
                    ) : null}
                    <span
                      className={`text-xs ${
                        weightChange > 0
                          ? 'text-warning'
                          : weightChange < 0
                          ? 'text-success'
                          : 'text-text-muted'
                      }`}
                    >
                      {weightChange > 0 ? '+' : ''}
                      {weightChange.toFixed(1)} kg
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest Announcement */}
      {latestAnnouncement && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-text-primary">
                  {latestAnnouncement.title}
                </h3>
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                  {latestAnnouncement.body}
                </p>
                <p className="text-xs text-text-muted mt-2">
                  {formatDate(latestAnnouncement.createdAt, 'relative')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
