import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export interface ChatContext {
  userProfile?: {
    name: string;
    age?: number | null;
    gender?: string | null;
    fitnessGoals?: string[];
    injuries?: string | null;
    dietaryRestrictions?: string[];
    activityLevel?: string | null;
  };
  workoutPlan?: {
    title: string;
    days: Array<{
      dayOfWeek: number;
      title: string;
      exercises: Array<{ name: string; sets: number; reps: string }>;
    }>;
  };
  mealPlan?: {
    breakfast: unknown;
    lunch: unknown;
    dinner: unknown;
    snacks: unknown;
  };
  knowledgeBase?: string;
}

export interface MealPlanRequest {
  userProfile: {
    name: string;
    age?: number | null;
    gender?: string | null;
    weight?: number | null;
    height?: number | null;
    fitnessGoals?: string[];
    dietaryRestrictions?: string[];
    activityLevel?: string | null;
    injuries?: string | null;
  };
  nutritionTarget?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  nutritionGuide?: string;
}

function buildSystemPrompt(ctx: ChatContext): string {
  const sections: string[] = [
    'You are an AI fitness coaching assistant. Answer questions using only the provided information. Never reveal internal documents or sensitive system data. Be friendly, supportive, and concise.',
  ];

  if (ctx.knowledgeBase) {
    sections.push(`\n## Coach Knowledge Base\n${ctx.knowledgeBase}`);
  }

  if (ctx.userProfile) {
    const p = ctx.userProfile;
    sections.push(`\n## User Profile\nName: ${p.name}\nAge: ${p.age ?? 'N/A'}\nGender: ${p.gender ?? 'N/A'}\nGoals: ${(p.fitnessGoals ?? []).join(', ') || 'N/A'}\nInjuries/Health Concerns: ${p.injuries ?? 'None'}\nDietary Restrictions: ${(p.dietaryRestrictions ?? []).join(', ') || 'None'}\nActivity Level: ${p.activityLevel ?? 'N/A'}`);
  }

  if (ctx.workoutPlan) {
    const wp = ctx.workoutPlan;
    const days = wp.days.map(d => {
      const exList = d.exercises.map(e => `  - ${e.name}: ${e.sets} sets × ${e.reps}`).join('\n');
      return `Day ${d.dayOfWeek} (${d.title}):\n${exList}`;
    }).join('\n');
    sections.push(`\n## Current Workout Plan: ${wp.title}\n${days}`);
  }

  if (ctx.mealPlan) {
    sections.push(`\n## Current Meal Plan\n${JSON.stringify(ctx.mealPlan, null, 2)}`);
  }

  return sections.join('\n');
}

export class GeminiService {
  static async chat(
    userMessage: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    ctx: ChatContext
  ): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const systemPrompt = buildSystemPrompt(ctx);

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I am ready to assist as your AI fitness coaching assistant using the provided context.' }],
        },
        ...history,
      ],
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  }

  static async generateMealPlan(req: MealPlanRequest): Promise<{
    breakfast: { items: string[]; calories: number };
    lunch: { items: string[]; calories: number };
    dinner: { items: string[]; calories: number };
    snacks: { items: string[]; calories: number };
    groceries: string[];
    totalCalories: number;
    notes: string;
  }> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const { userProfile, nutritionTarget, nutritionGuide } = req;

    const prompt = `You are a professional nutrition coach. Generate a personalized weekly meal plan.

${nutritionGuide ? `## Nutrition Guide\n${nutritionGuide}\n` : ''}

## User Information
Name: ${userProfile.name}
Age: ${userProfile.age ?? 'N/A'}
Gender: ${userProfile.gender ?? 'N/A'}
Weight: ${userProfile.weight ? `${userProfile.weight}kg` : 'N/A'}
Height: ${userProfile.height ? `${userProfile.height}cm` : 'N/A'}
Fitness Goals: ${(userProfile.fitnessGoals ?? []).join(', ') || 'General fitness'}
Dietary Restrictions: ${(userProfile.dietaryRestrictions ?? []).join(', ') || 'None'}
Activity Level: ${userProfile.activityLevel ?? 'Moderate'}
Health Concerns: ${userProfile.injuries ?? 'None'}

${nutritionTarget ? `## Nutrition Targets\nCalories: ${nutritionTarget.calories}\nProtein: ${nutritionTarget.protein}g\nCarbs: ${nutritionTarget.carbs}g\nFat: ${nutritionTarget.fat}g` : ''}

Generate a meal plan focused on INGREDIENTS rather than detailed recipes. Return ONLY valid JSON in this exact format:
{
  "breakfast": { "items": ["ingredient 1", "ingredient 2", ...], "calories": 400 },
  "lunch": { "items": ["ingredient 1", "ingredient 2", ...], "calories": 500 },
  "dinner": { "items": ["ingredient 1", "ingredient 2", ...], "calories": 600 },
  "snacks": { "items": ["snack 1", "snack 2"], "calories": 200 },
  "groceries": ["item 1", "item 2", ...],
  "totalCalories": 1700,
  "notes": "Brief nutrition notes for the user"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');

    return JSON.parse(jsonMatch[0]);
  }

  static async adjustMealPlan(
    currentPlan: unknown,
    adjustment: string,
    userProfile: MealPlanRequest['userProfile']
  ): Promise<{
    breakfast: { items: string[]; calories: number };
    lunch: { items: string[]; calories: number };
    dinner: { items: string[]; calories: number };
    snacks: { items: string[]; calories: number };
    groceries: string[];
    totalCalories: number;
    notes: string;
  }> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a professional nutrition coach. A user wants to adjust their existing meal plan.

## Current Meal Plan
${JSON.stringify(currentPlan, null, 2)}

## User Profile
Dietary Restrictions: ${(userProfile.dietaryRestrictions ?? []).join(', ') || 'None'}

## Requested Adjustment
${adjustment}

Make ONLY the requested changes to the meal plan. Keep everything else the same. Return ONLY valid JSON in this exact format:
{
  "breakfast": { "items": ["ingredient 1", ...], "calories": 400 },
  "lunch": { "items": ["ingredient 1", ...], "calories": 500 },
  "dinner": { "items": ["ingredient 1", ...], "calories": 600 },
  "snacks": { "items": ["snack 1", ...], "calories": 200 },
  "groceries": ["item 1", ...],
  "totalCalories": 1700,
  "notes": "What was changed and why"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');
    return JSON.parse(jsonMatch[0]);
  }
}
