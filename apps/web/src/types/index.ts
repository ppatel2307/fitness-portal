/**
 * Shared TypeScript types for the frontend
 */

export type Role = 'ADMIN' | 'CLIENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
  clientProfile?: ClientProfile;
}

export interface ClientProfile {
  id: string;
  userId: string;
  height?: number;
  goal?: string;
  notes?: string;
  profilePhotoUrl?: string;
  bannerPhotoUrl?: string;
  timezone?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export interface Exercise {
  id: string;
  workoutDayId: string;
  name: string;
  sets: number;
  reps: string;
  rpe?: number;
  weight?: string;
  restSeconds?: number;
  notes?: string;
  videoUrl?: string;
  orderIndex: number;
}

export interface WorkoutDay {
  id: string;
  workoutPlanId: string;
  dayOfWeek: number;
  title: string;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  clientId: string;
  title: string;
  weekStart?: string;
  active: boolean;
  workoutDays: WorkoutDay[];
  client?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WorkoutCompletion {
  id: string;
  clientId: string;
  workoutDayId: string;
  completedAt: string;
  comment?: string;
}

export interface NutritionTarget {
  id: string;
  clientId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterLiters: number;
  notes?: string;
}

export interface FoodLog {
  id: string;
  clientId: string;
  date: string;
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeightLog {
  id: string;
  clientId: string;
  date: string;
  weight: number;
  note?: string;
  photoUrl?: string;
}

export interface CheckIn {
  id: string;
  clientId: string;
  weekOf: string;
  energy: number;
  sleepHours: number;
  stress: number;
  adherence: number;
  notes?: string;
  client?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audienceType: 'ALL' | 'SPECIFIC';
  createdAt: string;
  recipients?: { id: string; name: string }[];
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  category: 'NUTRITION' | 'FORM' | 'MINDSET' | 'OTHER';
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AdminDashboardStats {
  totalClients: number;
  workoutsThisWeek: number;
  pendingCheckIns: number;
  latestCompletions: Array<WorkoutCompletion & { clientName: string }>;
  recentCheckIns: CheckIn[];
}

export interface ClientStats {
  weightTrend: WeightLog[];
  nutritionTrend: Array<{
    date: string;
    _sum: {
      calories: number | null;
      protein: number | null;
    };
  }>;
  weeklyWorkoutsCompleted: number;
  latestCheckIn?: CheckIn;
}

export interface ClientOverview {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  goal?: string;
  hasWorkoutPlan: boolean;
  workoutPlanTitle?: string;
  hasNutritionTargets: boolean;
  latestWeight?: number;
  latestWeightDate?: string;
  lastCheckIn?: string;
  lastAdherence?: number;
}
