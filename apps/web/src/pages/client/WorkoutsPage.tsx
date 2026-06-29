import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { WorkoutPlan, WorkoutDay, Exercise, WorkoutCompletion } from '@/types';
import { Play, CheckCircle, ChevronLeft, ChevronRight, Pause, RotateCcw, X, Dumbbell, Clock, Target } from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface PlanData {
  plan: WorkoutPlan | null;
  completions: WorkoutCompletion[];
  todayDayOfWeek: number;
}

// ==================== GUIDED WORKOUT MODE ====================

function GuidedWorkout({
  workoutDay,
  onComplete,
  onClose,
}: {
  workoutDay: WorkoutDay;
  onComplete: (durationMinutes: number, feedback: string) => void;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const exercises = workoutDay.exercises;
  const current = exercises[currentIndex];

  useEffect(() => {
    if (isPaused || showSummary) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [isPaused, showSummary]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  if (showSummary) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Workout Complete!</h2>
          <p className="text-zinc-400 mb-1">{workoutDay.title}</p>
          <p className="text-3xl font-bold text-accent mb-6">{formatTime(elapsed)}</p>
          <div className="mb-6">
            <label className="block text-sm text-zinc-400 mb-2">How did it go? (optional)</label>
            <textarea
              className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent"
              rows={3}
              placeholder="Notes, feelings, modifications..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            />
          </div>
          <button
            onClick={() => onComplete(Math.floor(elapsed / 60), feedback)}
            className="w-full py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition"
          >
            Save Workout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">Guided Workout</p>
          <h2 className="font-semibold text-white">{workoutDay.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-accent font-mono font-bold">{formatTime(elapsed)}</span>
          <button onClick={() => setIsPaused(p => !p)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition">
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-500">Exercise {currentIndex + 1} of {exercises.length}</span>
          <span className="text-xs text-zinc-500">{Math.round((currentIndex / exercises.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise card */}
      <div className="px-4 pb-4 max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 mb-4">
          <h3 className="text-2xl font-bold text-white mb-4">{current.name}</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { icon: Target, label: 'Sets', value: `${current.sets}` },
              { icon: RotateCcw, label: 'Reps', value: current.reps },
              { icon: Clock, label: 'Rest', value: current.restSeconds ? `${current.restSeconds}s` : '—' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-zinc-800/50 rounded-xl p-3 text-center">
                  <Icon className="w-4 h-4 text-accent mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{item.value}</p>
                  <p className="text-xs text-zinc-500">{item.label}</p>
                </div>
              );
            })}
          </div>
          {current.notes && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4">
              <p className="text-sm text-zinc-300">{current.notes}</p>
            </div>
          )}
          {current.youtubeUrl && getYouTubeEmbedUrl(current.youtubeUrl) && (
            <div className="rounded-xl overflow-hidden aspect-video">
              <iframe
                src={`${getYouTubeEmbedUrl(current.youtubeUrl)}?autoplay=0&rel=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={current.name}
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            onClick={handleNext}
            className="flex-2 px-8 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl flex items-center gap-2 transition"
          >
            {currentIndex < exercises.length - 1 ? (
              <>Next <ChevronRight className="w-4 h-4" /></>
            ) : 'Finish Workout'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export function WorkoutsPage() {
  const [data, setData] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [guidedWorkout, setGuidedWorkout] = useState<WorkoutDay | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/workouts/my-plan');
      if (res.data.success) setData(res.data.data);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completeWorkout = async (workoutDayId: string, durationMinutes: number, feedback: string) => {
    try {
      await api.post('/workouts/complete', {
        workoutDayId,
        ...(durationMinutes > 0 && { durationMinutes }),
        ...(feedback && { feedback }),
      });
      toast.success('Workout saved! Great job!');
      setGuidedWorkout(null);
      setSelectedDay(null);
      await load();
    } catch {
      toast.error('Failed to save workout');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.plan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Dumbbell className="w-12 h-12 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Workout Plan Yet</h2>
        <p className="text-zinc-400 max-w-sm">Your coach will create a personalized workout plan for you soon. Check back later!</p>
      </div>
    );
  }

  const { plan, completions, todayDayOfWeek } = data;

  const isCompletedToday = (dayId: string) =>
    completions.some(c => {
      const d = new Date(c.completedAt);
      const today = new Date();
      return c.workoutDayId === dayId && d.toDateString() === today.toDateString();
    });

  const todayWorkout = plan.workoutDays.find(d => d.dayOfWeek === todayDayOfWeek);

  return (
    <>
      {guidedWorkout && (
        <GuidedWorkout
          workoutDay={guidedWorkout}
          onComplete={(duration, feedback) => completeWorkout(guidedWorkout.id, duration, feedback)}
          onClose={() => setGuidedWorkout(null)}
        />
      )}

      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Workouts</h1>

        {/* Today's Workout */}
        {todayWorkout && !todayWorkout.isRestDay && (
          <div className="bg-card border border-accent/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-accent font-medium uppercase tracking-wide mb-1">Today's Workout</p>
                <h2 className="text-xl font-bold text-white">{todayWorkout.title}</h2>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {todayWorkout.exercises.length} exercises · ~{Math.round(todayWorkout.exercises.length * 5)}min
                </p>
              </div>
              {isCompletedToday(todayWorkout.id) ? (
                <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Completed!</span>
                </div>
              ) : (
                <button
                  onClick={() => setGuidedWorkout(todayWorkout)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition"
                >
                  <Play className="w-4 h-4" />
                  Start Workout
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {todayWorkout.exercises.slice(0, 5).map(ex => (
                <span key={ex.id} className="text-sm bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full">{ex.name}</span>
              ))}
              {todayWorkout.exercises.length > 5 && (
                <span className="text-sm text-zinc-500">+{todayWorkout.exercises.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {todayWorkout?.isRestDay && (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">😴</p>
            <h2 className="text-xl font-bold text-white">Rest Day</h2>
            <p className="text-zinc-400 mt-1">Today is your scheduled rest day. Recover and recharge!</p>
          </div>
        )}

        {/* Weekly Schedule */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{plan.title} — Weekly Schedule</h2>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {DAY_SHORT.map((day, i) => {
              const workoutDay = plan.workoutDays.find(d => d.dayOfWeek === i);
              const isToday = i === todayDayOfWeek;
              const completed = workoutDay ? isCompletedToday(workoutDay.id) : false;

              return (
                <button
                  key={day}
                  onClick={() => workoutDay && setSelectedDay(workoutDay === selectedDay ? null : workoutDay)}
                  className={`p-2 rounded-xl text-center transition ${
                    isToday ? 'ring-1 ring-accent' : ''
                  } ${
                    workoutDay && !workoutDay.isRestDay
                      ? completed
                        ? 'bg-green-500/20 hover:bg-green-500/30'
                        : selectedDay?.id === workoutDay.id
                        ? 'bg-accent/20'
                        : 'bg-zinc-800 hover:bg-zinc-700'
                      : 'bg-zinc-900 opacity-50'
                  }`}
                >
                  <p className={`text-xs font-medium ${isToday ? 'text-accent' : 'text-zinc-400'}`}>{day}</p>
                  <div className="mt-1">
                    {completed ? (
                      <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                    ) : workoutDay?.isRestDay ? (
                      <span className="text-xs text-zinc-600">Rest</span>
                    ) : workoutDay ? (
                      <Dumbbell className="w-4 h-4 text-zinc-500 mx-auto" />
                    ) : (
                      <span className="text-xs text-zinc-700">—</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && !selectedDay.isRestDay && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">{DAY_NAMES[selectedDay.dayOfWeek]} — {selectedDay.title}</h3>
                {!isCompletedToday(selectedDay.id) && (
                  <button
                    onClick={() => setGuidedWorkout(selectedDay)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm rounded-lg transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {selectedDay.exercises.map((ex, i) => (
                  <div key={ex.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                    <span className="text-xs text-zinc-600 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{ex.name}</p>
                      {ex.notes && <p className="text-xs text-zinc-500 mt-0.5">{ex.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{ex.sets} × {ex.reps}</p>
                      {ex.restSeconds && <p className="text-xs text-zinc-500">{ex.restSeconds}s rest</p>}
                    </div>
                    {ex.youtubeUrl && (
                      <a href={ex.youtubeUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-accent hover:text-accent/80 transition">▶</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
