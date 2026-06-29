import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/api';

const FITNESS_GOALS = ['Lose weight', 'Build muscle', 'Improve endurance', 'Increase flexibility', 'General fitness', 'Athletic performance', 'Stress relief'];
const EQUIPMENT = ['No equipment', 'Dumbbells', 'Barbell', 'Pull-up bar', 'Resistance bands', 'Bench', 'Cable machine', 'Full gym access'];
const DIETARY = ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Keto', 'Paleo', 'Halal', 'Kosher'];

interface FormData {
  height: string;
  weight: string;
  age: string;
  gender: string;
  fitnessExperience: string;
  dailyWorkoutMinutes: string;
  fitnessGoals: string[];
  injuries: string;
  dietaryRestrictions: string[];
  equipment: string[];
  activityLevel: string;
}

const STEPS = ['Personal Info', 'Fitness Level', 'Goals', 'Nutrition & Health'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    height: '',
    weight: '',
    age: '',
    gender: '',
    fitnessExperience: '',
    dailyWorkoutMinutes: '',
    fitnessGoals: [],
    injuries: '',
    dietaryRestrictions: [],
    equipment: [],
    activityLevel: '',
  });

  const toggleArrayItem = (key: 'fitnessGoals' | 'dietaryRestrictions' | 'equipment', item: string) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter(i => i !== item) : [...prev[key], item],
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/onboarding/submit', {
        height: form.height ? parseFloat(form.height) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender || undefined,
        fitnessExperience: form.fitnessExperience || undefined,
        dailyWorkoutMinutes: form.dailyWorkoutMinutes ? parseInt(form.dailyWorkoutMinutes) : undefined,
        fitnessGoals: form.fitnessGoals,
        injuries: form.injuries || undefined,
        dietaryRestrictions: form.dietaryRestrictions,
        equipment: form.equipment,
        activityLevel: form.activityLevel || undefined,
      });

      toast.success('Welcome! Your profile has been set up. Your coach will create a personalized plan for you.');
      navigate('/dashboard');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent";
  const selectClass = "w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white">Welcome to <span className="text-accent neon-text">VEGGI CHIKN</span></h1>
          <p className="text-text-secondary mt-2">Let's personalize your experience. This takes about 2 minutes.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition ${i <= step ? 'bg-accent text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-xs text-zinc-500 mt-1 hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition ${i < step ? 'bg-accent' : 'bg-zinc-700'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Height (cm)</label>
                  <input type="number" className={inputClass} placeholder="175" value={form.height}
                    onChange={e => setForm(p => ({ ...p, height: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Weight (kg)</label>
                  <input type="number" className={inputClass} placeholder="75" value={form.weight}
                    onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Age</label>
                  <input type="number" className={inputClass} placeholder="25" value={form.age}
                    onChange={e => setForm(p => ({ ...p, age: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Gender</label>
                  <select className={selectClass} value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Fitness Level */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Fitness Level & Availability</h2>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Fitness Experience</label>
                <select className={selectClass} value={form.fitnessExperience} onChange={e => setForm(p => ({ ...p, fitnessExperience: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="beginner">Beginner (less than 1 year)</option>
                  <option value="intermediate">Intermediate (1-3 years)</option>
                  <option value="advanced">Advanced (3+ years)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Activity Level</label>
                <select className={selectClass} value={form.activityLevel} onChange={e => setForm(p => ({ ...p, activityLevel: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="sedentary">Sedentary (desk job, little movement)</option>
                  <option value="lightly_active">Lightly active (light exercise 1-3 days/week)</option>
                  <option value="moderately_active">Moderately active (moderate exercise 3-5 days/week)</option>
                  <option value="very_active">Very active (hard exercise 6-7 days/week)</option>
                  <option value="extremely_active">Extremely active (physical job + training)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Daily Workout Availability (minutes)</label>
                <select className={selectClass} value={form.dailyWorkoutMinutes} onChange={e => setForm(p => ({ ...p, dailyWorkoutMinutes: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">2 hours+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Available Equipment</label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT.map(eq => (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleArrayItem('equipment', eq)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition ${form.equipment.includes(eq) ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Goals */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Your Fitness Goals</h2>
              <p className="text-zinc-400 text-sm">Select all that apply</p>
              <div className="grid grid-cols-2 gap-2">
                {FITNESS_GOALS.map(goal => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleArrayItem('fitnessGoals', goal)}
                    className={`px-4 py-3 rounded-xl text-sm text-left transition ${form.fitnessGoals.includes(goal) ? 'bg-accent text-white border border-accent' : 'bg-zinc-800 text-zinc-300 border border-border hover:border-zinc-600'}`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Nutrition & Health */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Nutrition & Health</h2>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Dietary Restrictions</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleArrayItem('dietaryRestrictions', d)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition ${form.dietaryRestrictions.includes(d) ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Injuries or Health Concerns</label>
                <textarea
                  className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  rows={4}
                  placeholder="e.g., Lower back pain, knee injury, high blood pressure... (or leave blank if none)"
                  value={form.injuries}
                  onChange={e => setForm(p => ({ ...p, injuries: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition"
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 py-3 px-4 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold rounded-xl transition"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : 'Complete Setup'}
              </button>
            )}
          </div>

          {step === 0 && (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full mt-3 py-2 text-zinc-500 hover:text-zinc-300 text-sm transition"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
