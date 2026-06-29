import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { WorkoutPlan, WorkoutCompletion } from '@/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';

interface CalendarData {
  plan: WorkoutPlan | null;
  completions: WorkoutCompletion[];
  todayDayOfWeek: number;
}

export default function CalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/workouts/my-plan');
        if (res.data.success) setData(res.data.data);
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

  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));

  const getDayStatus = (date: Date) => {
    if (!data?.plan) return null;

    const dayOfWeek = getDay(date);
    const workoutDay = data.plan.workoutDays.find(d => d.dayOfWeek === dayOfWeek);

    if (!workoutDay || workoutDay.isRestDay) return 'rest';

    const isCompleted = data.completions.some(c => isSameDay(new Date(c.completedAt), date));
    if (isCompleted) return 'completed';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateNorm = new Date(date);
    dateNorm.setHours(0, 0, 0, 0);

    if (dateNorm < today) return 'missed';
    if (isSameDay(date, today)) return 'today';
    return 'upcoming';
  };

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    missed: 'bg-red-500/20 text-red-400 border-red-500/30',
    rest: 'bg-zinc-800 text-zinc-600 border-zinc-700',
    today: 'bg-accent/20 text-accent border-accent/30 ring-1 ring-accent',
    upcoming: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Workout Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            ‹
          </button>
          <span className="text-white font-medium w-36 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <button
            onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            ›
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {[
          { color: 'bg-green-500', label: 'Completed' },
          { color: 'bg-red-500', label: 'Missed' },
          { color: 'bg-accent', label: 'Today' },
          { color: 'bg-zinc-600', label: 'Rest day' },
          { color: 'bg-zinc-700', label: 'Upcoming' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-sm text-zinc-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {monthDays.map(date => {
            const status = getDayStatus(date);
            const isToday = isSameDay(date, new Date());
            const dayOfWeek = getDay(date);
            const workoutDay = data?.plan?.workoutDays.find(d => d.dayOfWeek === dayOfWeek);

            return (
              <div
                key={date.toISOString()}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl border text-sm transition ${status ? statusColors[status] : 'bg-zinc-900 text-zinc-700 border-zinc-800'}`}
              >
                <span className={`font-medium ${isToday ? 'font-bold' : ''}`}>{date.getDate()}</span>
                {workoutDay && !workoutDay.isRestDay && (
                  <span className="text-xs mt-0.5 opacity-70 hidden sm:block truncate w-full text-center px-1">
                    {workoutDay.title.split(' ')[0]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* This month stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Completed',
              value: data.completions.filter(c => {
                const d = new Date(c.completedAt);
                return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
              }).length,
              color: 'text-green-400',
            },
            {
              label: 'Workout Days',
              value: monthDays.filter(d => {
                const dw = getDay(d);
                return data.plan?.workoutDays.some(wd => wd.dayOfWeek === dw && !wd.isRestDay);
              }).length,
              color: 'text-blue-400',
            },
            {
              label: 'Rest Days',
              value: monthDays.filter(d => {
                const dw = getDay(d);
                const wd = data.plan?.workoutDays.find(w => w.dayOfWeek === dw);
                return !wd || wd.isRestDay;
              }).length,
              color: 'text-zinc-400',
            },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-zinc-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
