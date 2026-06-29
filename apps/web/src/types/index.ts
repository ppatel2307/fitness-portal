export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
  clientProfile?: ClientProfile;
  onboarding?: OnboardingQuestionnaire;
  accountabilitySubscription?: AccountabilitySubscription;
}

export interface ClientProfile {
  id: string;
  userId: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: string;
  goal?: string;
  notes?: string;
  profilePhotoUrl?: string;
  timezone?: string;
  stripeCustomerId?: string;
}

export interface OnboardingQuestionnaire {
  id: string;
  userId: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: string;
  fitnessExperience?: string;
  dailyWorkoutMinutes?: number;
  fitnessGoals: string[];
  injuries?: string;
  dietaryRestrictions: string[];
  equipment: string[];
  activityLevel?: string;
  completed: boolean;
  completedAt?: string;
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  title: string;
  weekStart?: string;
  active: boolean;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  workoutDays: WorkoutDay[];
}

export interface WorkoutDay {
  id: string;
  workoutPlanId: string;
  dayOfWeek: number;
  title: string;
  isRestDay: boolean;
  exercises: Exercise[];
  completions?: WorkoutCompletion[];
}

export interface Exercise {
  id: string;
  workoutDayId: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
  youtubeUrl?: string;
  orderIndex: number;
}

export interface WorkoutCompletion {
  id: string;
  userId: string;
  workoutDayId: string;
  completedAt: string;
  durationMinutes?: number;
  feedback?: string;
  workoutDay?: { title: string; dayOfWeek: number };
}

export interface MealPlan {
  id: string;
  userId: string;
  weekStart: string;
  breakfast: MealSection;
  lunch: MealSection;
  dinner: MealSection;
  snacks: MealSection;
  groceries: string[];
  calories: number;
  notes?: string;
  createdAt: string;
}

export interface MealSection {
  items: string[];
  calories: number;
}

export interface NutritionTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterLiters: number;
  notes?: string;
}

export interface AIMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  messages: AIMessage[];
}

export interface UserRequest {
  id: string;
  userId: string;
  category: 'WORKOUT_MODIFICATION' | 'NUTRITION_REQUEST' | 'INJURY_UPDATE' | 'GENERAL';
  subject: string;
  body: string;
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED';
  adminReply?: string;
  resolvedAt?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface WeightLog {
  id: string;
  userId: string;
  date: string;
  weight: number;
  note?: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  weekOf: string;
  energy: number;
  sleepHours: number;
  stress: number;
  adherence: number;
  notes?: string;
}

export interface AccountabilitySubscription {
  id: string;
  userId: string;
  active: boolean;
  tier: string;
  stripeCustomerId?: string;
}

export interface AIDocument {
  id: string;
  title: string;
  type: 'KNOWLEDGE_BASE' | 'NUTRITION_GUIDE';
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: Role };
  isNewUser?: boolean;
  needsOnboarding?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { page?: number; limit?: number; total?: number };
}
