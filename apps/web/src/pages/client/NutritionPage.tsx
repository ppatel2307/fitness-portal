import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import type { MealPlan, NutritionTarget } from '@/types';
import { Apple, Sparkles, RefreshCw, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';

function MealCard({ title, section }: { title: string; section: { items: string[]; calories: number } }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          <span className="text-xs text-zinc-500">{section.calories} cal</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <ul className="space-y-1.5">
            {section.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-accent mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function NutritionPage() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTarget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [adjustment, setAdjustment] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [showGroceries, setShowGroceries] = useState(false);

  const load = async () => {
    try {
      const [planRes, targetRes] = await Promise.all([
        api.get('/nutrition/meal-plan').catch(() => ({ data: { success: false } })),
        api.get('/nutrition/my-targets').catch(() => ({ data: { success: false } })),
      ]);
      if (planRes.data.success) setMealPlan(planRes.data.data);
      if (targetRes.data.success) setNutritionTarget(targetRes.data.data);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generateMealPlan = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post('/ai/meal-plan/generate');
      if (res.data.success) {
        setMealPlan(res.data.data);
        toast.success('Meal plan generated!');
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsGenerating(false);
    }
  };

  const adjustMealPlan = async () => {
    if (!adjustment.trim()) return;
    setIsAdjusting(true);
    try {
      const res = await api.post('/ai/meal-plan/adjust', { adjustment });
      if (res.data.success) {
        setMealPlan(res.data.data);
        setAdjustment('');
        toast.success('Meal plan updated!');
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsAdjusting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Nutrition</h1>
        <button
          onClick={generateMealPlan}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isGenerating ? 'Generating...' : mealPlan ? 'Regenerate' : 'Generate Meal Plan'}
        </button>
      </div>

      {/* Nutrition targets */}
      {nutritionTarget && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Daily Targets</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Calories', value: nutritionTarget.calories, unit: 'kcal', color: 'text-yellow-400' },
              { label: 'Protein', value: nutritionTarget.protein, unit: 'g', color: 'text-blue-400' },
              { label: 'Carbs', value: nutritionTarget.carbs, unit: 'g', color: 'text-green-400' },
              { label: 'Fat', value: nutritionTarget.fat, unit: 'g', color: 'text-orange-400' },
            ].map(item => (
              <div key={item.label} className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-zinc-500">{item.label} ({item.unit})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No meal plan */}
      {!mealPlan && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Apple className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Meal Plan Yet</h2>
          <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
            Generate a personalized meal plan using AI based on your profile and nutrition goals.
          </p>
          <button
            onClick={generateMealPlan}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold rounded-xl mx-auto transition"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
      )}

      {/* Meal plan */}
      {mealPlan && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Weekly Meal Plan</p>
              <p className="text-sm text-zinc-300 mt-0.5">
                Week of {new Date(mealPlan.weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{mealPlan.calories}</p>
              <p className="text-xs text-zinc-500">calories/day</p>
            </div>
          </div>

          {/* Meals */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-semibold text-white mb-4">Daily Meals</h2>
            <MealCard title="Breakfast" section={mealPlan.breakfast} />
            <MealCard title="Lunch" section={mealPlan.lunch} />
            <MealCard title="Dinner" section={mealPlan.dinner} />
            <MealCard title="Snacks" section={mealPlan.snacks} />
          </div>

          {/* Notes */}
          {mealPlan.notes && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
              <p className="text-xs font-medium text-accent mb-1">Coach Notes</p>
              <p className="text-sm text-zinc-300">{mealPlan.notes}</p>
            </div>
          )}

          {/* Grocery list */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <button onClick={() => setShowGroceries(g => !g)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-zinc-400" />
                <h2 className="text-lg font-semibold text-white">Grocery List</h2>
                <span className="text-sm text-zinc-500">({(mealPlan.groceries as string[]).length} items)</span>
              </div>
              {showGroceries ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
            </button>
            {showGroceries && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(mealPlan.groceries as string[]).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg">
                    <span className="text-accent">•</span>
                    <span className="text-sm text-zinc-300">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Adjustments */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Request Changes</h2>
            <p className="text-sm text-zinc-400 mb-4">Ask the AI to adjust your meal plan (e.g., "Replace chicken with fish", "Make breakfast vegetarian", "Add more protein")</p>
            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Describe the change you want..."
                value={adjustment}
                onChange={e => setAdjustment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && adjustMealPlan()}
              />
              <button
                onClick={adjustMealPlan}
                disabled={isAdjusting || !adjustment.trim()}
                className="px-4 py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex items-center gap-2"
              >
                {isAdjusting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Adjust
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
