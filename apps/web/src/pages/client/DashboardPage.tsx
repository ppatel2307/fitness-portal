import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkoutPlan, WorkoutDay, WorkoutCompletion } from '@/types';
import { Dumbbell, Play, CheckCircle, Apple, Calendar, TrendingUp } from 'lucide-react';

interface PlanData {
  plan: WorkoutPlan | null;
  completions: WorkoutCompletion[];
  todayDayOfWeek: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/workouts/my-plan');
        if (res.data.success) setPlanData(res.data.data);
      } catch { /* silent */ } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date();
  const todayDOW = planData?.todayDayOfWeek ?? today.getDay();
  const todayWorkout: WorkoutDay | undefined = planData?.plan?.workoutDays.find(d => d.dayOfWeek === todayDOW);

  const isCompletedToday = (dayId: string) =>
    (planData?.completions || []).some(c => {
      const d = new Date(c.completedAt);
      return c.workoutDayId === dayId && d.toDateString() === today.toDateString();
    });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const weeklyCompletions = (planData?.completions || []).filter(
    c => new Date(c.completedAt) >= weekStart
  ).length;

  const totalWorkoutDays = planData?.plan?.workoutDays.filter(d => !d.isRestDay).length ?? 0;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-zinc-400 text-sm mt-0.5">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'This Week', value: `${weeklyCompletions}/${totalWorkoutDays}`, sublabel: 'workouts', color: 'text-green-400' },
          { label: 'Total Done', value: planData?.completions.length ?? 0, sublabel: 'sessions', color: 'text-blue-400' },
          { label: 'Streak', value: '—', sublabel: 'days', color: 'text-yellow-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            <p className="text-xs text-zinc-600">{stat.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Today's workout */}
      {planData?.plan ? (
        todayWorkout ? (
          todayWorkout.isRestDay ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <p className="text-2xl mb-2">😴</p>
              <h2 className="text-xl font-bold text-white">Rest Day</h2>
              <p className="text-zinc-400 mt-1 text-sm">Today is your scheduled rest day. Recover well!</p>
            </div>
          ) : isCompletedToday(todayWorkout.id) ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Workout Complete!</h2>
                <p className="text-zinc-400 text-sm">{todayWorkout.title} · {todayWorkout.exercises.length} exercises</p>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-accent/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-accent font-medium uppercase tracking-wide mb-1">Today's Workout</p>
                  <h2 className="text-xl font-bold text-white">{todayWorkout.title}</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">{todayWorkout.exercises.length} exercises</p>
                </div>
                <Link
                  to="/workouts"
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition"
                >
                  <Play className="w-4 h-4" />
                  Start
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayWorkout.exercises.slice(0, 4).map(ex => (
                  <span key={ex.id} className="text-sm bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full">{ex.name}</span>
                ))}
                {todayWorkout.exercises.length > 4 && (
                  <span className="text-sm text-zinc-500 py-1">+{todayWorkout.exercises.length - 4} more</span>
                )}
              </div>
            </div>
          )
        ) : null
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Dumbbell className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">No Workout Plan Yet</h2>
          <p className="text-zinc-400 text-sm">Your coach will assign a personalized workout plan soon.</p>
        </div>
      )}

      {/* Weekly progress bar */}
      {planData?.plan && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">This Week</h2>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {dayNames.map((day, i) => {
              const workoutDay = planData.plan!.workoutDays.find(d => d.dayOfWeek === i);
              const isToday = i === todayDOW;
              const completed = workoutDay && !workoutDay.isRestDay && isCompletedToday(workoutDay.id);
              const isPast = i < todayDOW;

              return (
                <div key={day} className={`p-2 rounded-lg text-center ${isToday ? 'ring-1 ring-accent' : ''}`}>
                  <p className={`text-xs ${isToday ? 'text-accent font-medium' : 'text-zinc-500'}`}>{day}</p>
                  <div className="mt-1">
                    {completed ? (
                      <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                    ) : workoutDay?.isRestDay ? (
                      <div className="w-4 h-4 mx-auto rounded-full bg-zinc-800" />
                    ) : workoutDay && isPast ? (
                      <div className="w-4 h-4 mx-auto rounded-full bg-red-500/30" />
                    ) : workoutDay ? (
                      <div className="w-4 h-4 mx-auto rounded-full bg-zinc-700" />
                    ) : (
                      <div className="w-4 h-4 mx-auto" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Workouts', icon: Dumbbell, link: '/workouts' },
          { label: 'Nutrition', icon: Apple, link: '/nutrition' },
          { label: 'Calendar', icon: Calendar, link: '/calendar' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.link}
              className="flex flex-col items-center gap-2 p-4 bg-card border border-border hover:border-zinc-600 rounded-xl transition"
            >
              <Icon className="w-5 h-5 text-zinc-400" />
              <span className="text-sm text-zinc-300">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
